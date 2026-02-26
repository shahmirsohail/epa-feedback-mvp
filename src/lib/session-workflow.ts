import { deidentify } from "@/lib/deid";
import { buildHeuristicDraft, type FeedbackDraft } from "@/lib/draft";
import { matchEPA, inferEntrustment } from "@/lib/epa";
import { analyzeWithLLM } from "@/lib/llm";
import { prisma } from "@/lib/prisma";
import { sendDraftEmail } from "@/lib/email";

export type CreateSessionInput = {
  residentName: string;
  residentEmail: string;
  attendingName: string;
  attendingEmail: string;
  context?: string;
  transcript: string;
};

export const SESSION_EMAIL_CREATED = "created" as const;
export const SESSION_EMAIL_PENDING = "email_pending" as const;
export const SESSION_EMAIL_FAILED = "email_failed" as const;
export const SESSION_EMAIL_SENT = "email_sent" as const;

export const SESSION_EMAIL_STATES = {
  created: SESSION_EMAIL_CREATED,
  emailPending: SESSION_EMAIL_PENDING,
  emailFailed: SESSION_EMAIL_FAILED,
  emailSent: SESSION_EMAIL_SENT
} as const;

export type SessionEmailState =
  | typeof SESSION_EMAIL_CREATED
  | typeof SESSION_EMAIL_PENDING
  | typeof SESSION_EMAIL_FAILED
  | typeof SESSION_EMAIL_SENT;

export async function createSessionWithDraft(input: CreateSessionInput) {
  const de = deidentify(input.transcript);

  const llm = await analyzeWithLLM({ transcriptDeId: de.deidentified, context: input.context || null });

  let mappedEpaConfidence = 0.0;
  let entrustment = "Support";
  let entrustmentConfidence = 0.0;
  let draft: FeedbackDraft;

  if (llm) {
    mappedEpaConfidence = llm.epa_confidence;
    entrustment = llm.entrustment_level;
    entrustmentConfidence = llm.entrustment_confidence;
    draft = {
      meta: {
        method: "llm",
        epa_rationale: llm.epa_rationale,
        secondary_epa_ids: llm.secondary_epa_ids,
        epa_confidence: llm.epa_confidence,
        entrustment_confidence: llm.entrustment_confidence
      },
      epaId: llm.primary_epa_id,
      entrustment: llm.entrustment_level,
      strengths: llm.strengths,
      improvements: llm.improvements,
      nextSteps: llm.next_steps,
      evidenceQuotes: llm.evidence_quotes,
      summaryComment: llm.summary_comment
    };
  } else {
    const epaMatch = await matchEPA(de.deidentified);
    const ent = inferEntrustment(de.deidentified);
    mappedEpaConfidence = epaMatch.confidence;
    entrustment = ent.level;
    entrustmentConfidence = ent.confidence;
    draft = buildHeuristicDraft({
      transcriptDeId: de.deidentified,
      epaId: epaMatch.epaId,
      entrustment: ent.level,
      epaConfidence: mappedEpaConfidence,
      entrustmentConfidence
    });
  }

  const session = await prisma.session.create({
    data: {
      residentName: input.residentName,
      residentEmail: input.residentEmail,
      attendingName: input.attendingName,
      attendingEmail: input.attendingEmail,
      context: input.context || null,
      transcriptRaw: input.transcript,
      transcriptDeId: de.deidentified,
      redactionReport: JSON.stringify({ redactions: de.redactions }),
      mappedEpaId: null,
      mappedEpaConfidence,
      entrustment,
      entrustmentConfidence,
      draftJson: JSON.stringify(draft),
      emailStatus: SESSION_EMAIL_CREATED,
      emailError: null
    }
  });

  const method: "llm" | "heuristic" = llm ? "llm" : "heuristic";
  return { session, draft, method };
}

export async function emailSessionDraft(sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Not found");

  await prisma.session.update({
    where: { id: session.id },
    data: {
      emailStatus: SESSION_EMAIL_PENDING,
      emailError: null
    }
  });

  const draft = JSON.parse(session.draftJson) as FeedbackDraft;
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  await sendDraftEmail({
    to: session.attendingEmail,
    residentName: session.residentName,
    attendingName: session.attendingName,
    sessionId: session.id,
    draft,
    appBaseUrl
  });

  const now = new Date();
  await prisma.session.update({
    where: { id: session.id },
    data: {
      approved: true,
      approvedAt: session.approvedAt ?? now,
      emailSent: true,
      emailSentAt: now,
      emailStatus: SESSION_EMAIL_SENT,
      emailError: null
    }
  });
}

export async function createAndEmailSessionDraft(input: CreateSessionInput) {
  const { session, draft, method } = await createSessionWithDraft(input);

  try {
    await emailSessionDraft(session.id);
    return {
      id: session.id,
      method,
      draftCreated: true,
      emailed: true,
      emailError: null,
      emailStatus: SESSION_EMAIL_SENT,
      draft
    };
  } catch (error: any) {
    const emailError = error?.message ?? "Unknown email error";
    await prisma.session.update({
      where: { id: session.id },
      data: {
        emailSent: false,
        emailSentAt: null,
        emailStatus: SESSION_EMAIL_FAILED,
        emailError
      }
    });

    return {
      id: session.id,
      method,
      draftCreated: true,
      emailed: false,
      emailError,
      emailStatus: SESSION_EMAIL_FAILED,
      draft
    };
  }
}
