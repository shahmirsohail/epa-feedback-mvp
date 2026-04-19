import { Entrustment } from "./epa";

export type FeedbackDraft = {
  meta: {
    method: "llm";
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
