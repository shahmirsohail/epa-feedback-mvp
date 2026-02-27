import { Entrustment } from "./epa";

export type FeedbackDraft = {
  meta: {
    method: "llm" | "heuristic";
    insufficient_evidence?: boolean;
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

function shortQuotedFragment(sentence: string) {
  const cleaned = sentence.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  const withoutSpeaker = cleaned.replace(/^[A-Za-z ]{2,20}:\s*/, "").trim();
  const fragment = withoutSpeaker.length > 80 ? `${withoutSpeaker.slice(0, 77).trim()}...` : withoutSpeaker;
  return `“${fragment}”`;
}

function categorizeEvidence(evidenceQuotes: string[]) {
  const strengths: string[] = [];
  const improvements: string[] = [];

  for (const quote of evidenceQuotes) {
    const lc = quote.toLowerCase();
    const fragment = shortQuotedFragment(quote);
    if (!fragment) continue;

    if (/good|great|strong|well|nice|clear|excellent|appropriate|escalat|organized|thorough/.test(lc)) {
      strengths.push(`You ${fragment}, which showed effective clinical judgment and communication.`);
      continue;
    }

    if (/need|should|consider|next time|improv|missed|earlier|late|unclear|prompt|step in/.test(lc)) {
      improvements.push(`You noted ${fragment}; make this more explicit and actionable in real time.`);
      continue;
    }

    if (strengths.length <= improvements.length) {
      strengths.push(`You highlighted ${fragment}, which is a concrete strength to keep building.`);
    } else {
      improvements.push(`You mentioned ${fragment}; tighten this further with clear contingency planning.`);
    }
  }

  return {
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 3)
  };
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
  const categorized = categorizeEvidence(evidenceQuotes);

  const fallbackStrengths = evidenceQuotes
    .slice(0, 2)
    .map((quote) => shortQuotedFragment(quote))
    .filter((quote): quote is string => Boolean(quote))
    .map((quote) => `You described ${quote} and linked it to patient care priorities.`);
  const fallbackImprovements = evidenceQuotes
    .slice(0, 2)
    .map((quote) => shortQuotedFragment(quote))
    .filter((quote): quote is string => Boolean(quote))
    .map((quote) => `You said ${quote}; next time, add a clearer if/then escalation plan.`);

  const strengthsBase = categorized.strengths.length ? categorized.strengths : fallbackStrengths;
  const improvementsBase = categorized.improvements.length ? categorized.improvements : fallbackImprovements;

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
