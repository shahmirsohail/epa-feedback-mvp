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

export type DraftOnlyInput = Omit<CreateSessionInput, "residentEmail">;

export async function createDraftFromTranscript(input: DraftOnlyInput) {
  const de = deidentify(input.transcript);

  const llm = await analyzeWithLLM({ transcriptDeId: de.deidentified, context: input.context || null });

  let mappedEpaId: string | null = null;
  let mappedEpaConfidence = 0.0;
  let entrustment = "Support";
  let entrustmentConfidence = 0.0;
  let draft: FeedbackDraft;

  if (llm) {
    mappedEpaId = llm.primary_epa_id;
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
    mappedEpaId = epaMatch.epaId;
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

  const method: "llm" | "heuristic" = llm ? "llm" : "heuristic";

  return {
    deidentifiedTranscript: de.deidentified,
    redactions: de.redactions,
    mappedEpaId,
    mappedEpaConfidence,
    entrustment,
    entrustmentConfidence,
    draft,
    method
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
      emailSentAt: now
    }
  });
}
