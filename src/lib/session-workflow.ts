import { deidentify } from "@/lib/deid";
import { type FeedbackDraft, buildDraft } from "@/lib/draft";
import { analyzeWithLLM } from "@/lib/llm";
import { prisma } from "@/lib/prisma";
import { sendDraftEmail } from "@/lib/email";

const SESSION_EMAIL_STATES = {
  emailPending: "email_pending",
  emailSent: "email_sent"
} as const;

export type CreateSessionInput = {
  residentName: string;
  residentEmail: string;
  attendingName: string;
  attendingEmail: string;
  context?: string;
  transcript: string;
};

export type DraftOnlyInput = Omit<CreateSessionInput, "residentEmail">;

function scrubDraftFields(draft: FeedbackDraft): FeedbackDraft {
  const s = (text: string) => deidentify(text).deidentified;
  return {
    ...draft,
    strengths: draft.strengths.map(s),
    improvements: draft.improvements.map(s),
    nextSteps: draft.nextSteps.map(s),
    evidenceQuotes: draft.evidenceQuotes.map(s),
    summaryComment: s(draft.summaryComment),
    meta: {
      ...draft.meta,
      ...(draft.meta.epa_rationale && { epa_rationale: s(draft.meta.epa_rationale) })
    }
  };
}


export async function createDraftFromTranscript(input: DraftOnlyInput) {
  const de = deidentify(input.transcript);

  let llm = null;
  try {
    llm = await analyzeWithLLM({ transcriptDeId: de.deidentified, context: input.context || null });
  } catch {
    // Network unavailable or API error — fall through to heuristic
  }

  if (llm) {
    const draft: FeedbackDraft = scrubDraftFields({
      meta: {
        method: "llm",
        insufficient_evidence: llm.insufficient_evidence,
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
    });

    return {
      deidentifiedTranscript: de.deidentified,
      redactions: de.redactions,
      mappedEpaId: llm.primary_epa_id,
      mappedEpaConfidence: llm.epa_confidence,
      entrustment: llm.entrustment_level,
      entrustmentConfidence: llm.entrustment_confidence,
      draft,
      method: "llm" as const
    };
  }

  // Heuristic fallback when OpenAI is unavailable
  const { draft: hDraft, epaMatch } = await buildDraft(de.deidentified);
  const scrubbedHDraft = scrubDraftFields(hDraft);

  return {
    deidentifiedTranscript: de.deidentified,
    redactions: de.redactions,
    mappedEpaId: epaMatch.epaId,
    mappedEpaConfidence: epaMatch.confidence,
    entrustment: scrubbedHDraft.entrustment,
    entrustmentConfidence: scrubbedHDraft.meta.entrustment_confidence ?? 0.5,
    draft: scrubbedHDraft,
    method: "heuristic" as const
  };
}

export async function createSessionWithDraft(input: CreateSessionInput) {
  const generated = await createDraftFromTranscript(input);

  const session = await prisma.session.create({
    data: {
      residentName: input.residentName,
      residentEmail: input.residentEmail,
      attendingName: input.attendingName,
      attendingEmail: input.attendingEmail,
      context: input.context || null,
      transcriptRaw: input.transcript,
      transcriptDeId: generated.deidentifiedTranscript,
      redactionReport: JSON.stringify({ redactions: generated.redactions }),
      mappedEpaId: generated.mappedEpaId,
      mappedEpaConfidence: generated.mappedEpaConfidence,
      entrustment: generated.entrustment,
      entrustmentConfidence: generated.entrustmentConfidence,
      draftJson: JSON.stringify(generated.draft)
    }
  });

  return { session, draft: generated.draft, method: generated.method };
}

export async function emailSessionDraft(sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Not found");

  await prisma.session.update({
    where: { id: session.id },
    data: {
      emailStatus: SESSION_EMAIL_STATES.emailPending,
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
      emailStatus: SESSION_EMAIL_STATES.emailSent,
      emailError: null
    }
  });
}
