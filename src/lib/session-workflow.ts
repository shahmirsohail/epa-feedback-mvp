import { deidentify } from "@/lib/deid";
import { buildHeuristicDraft, type FeedbackDraft } from "@/lib/draft";
import { matchEPA, inferEntrustment } from "@/lib/epa";
import { analyzeWithLLM } from "@/lib/llm";
import { prisma } from "@/lib/prisma";
import { sendDraftEmail } from "@/lib/email";
import { getEpas } from "@/lib/epas";

const TRANSCRIPT_MIN_WORDS = 40;
const TRANSCRIPT_MIN_CLINICAL_TERMS = 3;
const TRANSCRIPT_MAX_REPETITION_RATIO = 0.35;

const CLINICAL_ACTION_TERMS = [
  "assess", "assessment", "diagnosis", "differential", "plan", "management",
  "treatment", "medication", "dose", "follow-up", "handover", "handoff", "escalate",
  "consult", "investigation", "labs", "imaging", "history", "exam", "communication",
  "safety", "prioritize", "reassess", "monitor", "document", "discharge", "admit",
  "resuscitation", "procedure", "interpret", "counsel", "consent"
];

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

export function isTranscriptSufficientForDraft(transcript: string) {
  const words = transcript
    .toLowerCase()
    .match(/[a-z0-9'-]+/g) ?? [];

  const totalWordCount = words.length;
  const uniqueWordCount = new Set(words).size;
  const repetitionRatio = totalWordCount === 0 ? 1 : 1 - uniqueWordCount / totalWordCount;

  const distinctClinicalTerms = new Set(
    CLINICAL_ACTION_TERMS.filter((term) => transcript.toLowerCase().includes(term))
  );

  const sufficient =
    totalWordCount >= TRANSCRIPT_MIN_WORDS &&
    distinctClinicalTerms.size >= TRANSCRIPT_MIN_CLINICAL_TERMS &&
    repetitionRatio <= TRANSCRIPT_MAX_REPETITION_RATIO;

  return {
    sufficient,
    totalWordCount,
    distinctClinicalTermCount: distinctClinicalTerms.size,
    repetitionRatio
  };
}

function buildInsufficientEvidenceDraft(): FeedbackDraft {
  return {
    meta: {
      method: "heuristic",
      insufficient_evidence: true,
      epa_confidence: 0,
      entrustment_confidence: 0.2
    },
    epaId: null,
    entrustment: "Support",
    strengths: [],
    improvements: ["Provide a longer transcript with specific behaviors, decisions, and clinical actions discussed."],
    nextSteps: ["Re-run draft generation after adding concrete examples from the feedback conversation."],
    evidenceQuotes: [],
    summaryComment:
      "The transcript did not include enough specific feedback detail to draft an EPA assessment reliably. Please provide a longer, more specific transcript before finalizing."
  };
}

export async function createDraftFromTranscript(input: DraftOnlyInput) {
  const de = deidentify(input.transcript);
  const adequacy = isTranscriptSufficientForDraft(de.deidentified);

  if (!adequacy.sufficient) {
    const draft = buildInsufficientEvidenceDraft();
    return {
      deidentifiedTranscript: de.deidentified,
      redactions: de.redactions,
      mappedEpaId: null,
      mappedEpaConfidence: 0,
      entrustment: "Support",
      entrustmentConfidence: 0.2,
      draft,
      method: "heuristic" as const
    };
  }

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
    };
  } else {
    const epaMatch = await matchEPA(de.deidentified);
    mappedEpaId = validateEpaId(epaMatch.epaId);
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


function validateEpaId(epaId: string | null | undefined): string | null {
  const epas = getEpas();
  if (!epaId) return null;
  const exists = epas.some((epa) => epa.id === epaId);
  return exists ? epaId : null;
}
