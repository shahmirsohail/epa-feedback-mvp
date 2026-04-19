import { Entrustment, EpaMatch, matchEPA, inferEntrustment } from "./epa";

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

export async function buildDraft(transcript: string): Promise<{ draft: FeedbackDraft; epaMatch: EpaMatch }> {
  const epaMatch = await matchEPA(transcript);
  const { level, confidence } = inferEntrustment(transcript);

  const draft: FeedbackDraft = {
    meta: {
      method: "heuristic",
      epa_confidence: epaMatch.confidence,
      entrustment_confidence: confidence
    },
    epaId: epaMatch.epaId,
    entrustment: level,
    strengths: ["[Auto-detected: review transcript for specific strengths]"],
    improvements: ["[Auto-detected: review transcript for specific improvements]"],
    nextSteps: ["[Review transcript and add specific next steps]"],
    evidenceQuotes: [],
    summaryComment:
      "Draft generated without AI analysis — please review and edit before sending."
  };

  return { draft, epaMatch };
}
