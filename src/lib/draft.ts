import { Entrustment } from "./epa";

export type FeedbackDraft = {
  meta: {
    method: "llm" | "heuristic";
    epa_rationale?: string;
    secondary_epa_ids?: string[];
    epa_confidence?: number;
    entrustment_confidence?: number;
  };
  epaId: string | null;
  entrustment: Entrustment;
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  evidenceQuotes: string[];
  summaryComment: string;
};

function pickEvidence(text: string) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 30 && s.length <= 180);

  const ranked = sentences.filter(s =>
    /good|great|strong|well|needs|next time|consider|should|improve|step in|prompt/i.test(s)
  );
  const src = ranked.length ? ranked : sentences;
  return src.slice(0, 3);
}

export function buildHeuristicDraft(params: {
  transcriptDeId: string;
  epaId: string | null;
  entrustment: Entrustment;
  epaConfidence?: number;
  entrustmentConfidence?: number;
}): FeedbackDraft {
  const { transcriptDeId, epaId, entrustment } = params;
  const evidenceQuotes = pickEvidence(transcriptDeId);

  const strengthsBase = [
    "Communicated a clear problem representation and differential.",
    "Prioritized patient safety and escalated appropriately when needed.",
    "Demonstrated organized clinical reasoning and follow-through."
  ];
  const improvementsBase = [
    "Tighten the assessment by explicitly stating the leading diagnosis and why.",
    "Be explicit about contingency planning and when to re-assess/escalate.",
    "Use closed-loop communication during handover/consults to confirm shared understanding."
  ];

  const nextSteps = [
    "Before the next case, write a 1–2 sentence problem representation and top 3 differential, then compare to staff feedback.",
    "Practice a structured plan: immediate actions, investigations, treatments, and clear 'if/then' reassessment triggers.",
    "Ask for one targeted feedback point linked to this EPA at the end of the next shift/rounds."
  ];

  const summaryComment =
    `Draft mapped to ${epaId ?? "an EPA (not confidently matched)"} with an entrustment rating of ${entrustment}. ` +
    `This is a draft for attending review—please edit for accuracy, context, and fairness before sending.`;

  return {
    meta: { method: "heuristic", epa_confidence: params.epaConfidence, entrustment_confidence: params.entrustmentConfidence },
    epaId,
    entrustment,
    strengths: strengthsBase,
    improvements: improvementsBase,
    nextSteps,
    evidenceQuotes,
    summaryComment
  };
}
