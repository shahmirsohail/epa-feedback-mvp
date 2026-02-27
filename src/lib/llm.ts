import { z } from "zod";
import { getOpenAIClient } from "./openai";
import { EntrustmentSchema } from "./epa";
import { getEpas } from "./epas";

const AnalysisSchema = z.object({
  primary_epa_id: z.string().nullable(),
  secondary_epa_ids: z.preprocess(
    (value) => (value == null ? [] : value),
    z.array(z.string()).max(2)
  ),
  epa_confidence: z.number().min(0).max(1),
  epa_rationale: z.string().max(400),

  entrustment_level: EntrustmentSchema,
  entrustment_confidence: z.number().min(0).max(1),

  strengths: z.array(z.string()).min(0).max(6),
  improvements: z.array(z.string()).min(0).max(6),
  next_steps: z.array(z.string()).min(0).max(6),
  evidence_quotes: z.array(z.string()).min(0).max(6),
  summary_comment: z.string().min(20).max(1200),
  insufficient_evidence: z.boolean(),
  insufficient_evidence_reason: z.string().max(400)
});

export type LlmAnalysis = z.infer<typeof AnalysisSchema>;

function safeJsonParse(s: string) {
  // Extract first JSON object if model includes extra text
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const candidate = s.slice(start, end + 1);
    return JSON.parse(candidate);
  }
  return JSON.parse(s);
}

function referencesTranscriptPhrase(text: string, transcript: string) {
  const normalizedTranscript = transcript.toLowerCase();
  const quotedPhrases = Array.from(text.matchAll(/["'“”‘’]([^"'“”‘’]{3,})["'“”‘’]/g))
    .map((match) => match[1].trim().toLowerCase())
    .filter(Boolean);

  if (quotedPhrases.length === 0) {
    return false;
  }

  return quotedPhrases.some((phrase) => normalizedTranscript.includes(phrase));
}

export async function analyzeWithLLM(params: { transcriptDeId: string; context?: string | null }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
  const client = getOpenAIClient();

  const epas = getEpas().sort((a, b) => a.id.localeCompare(b.id));
  const epaList = epas.map(e => ({
    id: e.id,
    title: e.title,
    description: e.description
  }));

  const system = [
    "You are helping an attending physician draft a resident EPA assessment from a FEEDBACK conversation transcript.",
    "This output is a DRAFT only. The attending will review/edit and must approve before sending.",
    "You must be conservative: if unsure about the EPA mapping, set primary_epa_id = null and lower confidence.",
    "Every strength and improvement must be directly supported by a verbatim quote from the transcript; if not supported, omit it.",
    "If transcript lacks specific feedback content, return primary_epa_id = null, low confidence, and a summary stating insufficient evidence.",
    "Do not invent patient identifiers; transcript is de-identified already.",
    "Return ONLY valid JSON matching the required schema."
  ].join(" ");

  const user = [
    "Task: (1) map the transcript to the best matching EPA from the list, (2) suggest an entrustment level, and (3) draft feedback.",
    "",
    "Entrustment scale (choose one):",
    "- Intervention: attending must step in / take over for safety or completeness",
    "- Direction: frequent prompting or close direction needed",
    "- Support: needs intermittent support/check-ins but can proceed",
    "- Autonomy: can perform independently in routine cases; minimal oversight",
    "- Excellence: consistently above expected; could coach others",
    "",
    "Context (optional): " + (params.context || "unknown"),
    "",
    "EPA LIST (closed set):",
    JSON.stringify(epaList, null, 2),
    "",
    "Transcript (de-identified):",
    params.transcriptDeId,
    "",
    "Output JSON fields required:",
    "{",
    '  "primary_epa_id": string|null,',
    '  "secondary_epa_ids": string[<=2],',
    '  "epa_confidence": number 0-1,',
    '  "epa_rationale": string (<=400 chars),',
    '  "entrustment_level": "Intervention"|"Direction"|"Support"|"Autonomy"|"Excellence",',
    '  "entrustment_confidence": number 0-1,',
    '  "strengths": string[] (0-6 concise bullets; each bullet must include >=1 short transcript quote),',
    '  "improvements": string[] (0-6 concise bullets; actionable; each bullet must include >=1 short transcript quote),',
    '  "next_steps": string[] (0-6 concrete next-time steps),',
    '  "evidence_quotes": string[] (0-6 short verbatim excerpts from transcript supporting your suggestions),',
    '  "summary_comment": string (20-1200 chars; fair, specific, non-judgmental).',
    '  "insufficient_evidence": boolean,',
    '  "insufficient_evidence_reason": string (<=400 chars; explain what was missing).',
    "}",
    "",
    "Return JSON only."
  ].join("\n");

  const resp = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });

  const content = resp.choices?.[0]?.message?.content ?? "";
  const parsed = safeJsonParse(content);
  const analysis = AnalysisSchema.parse(parsed);

  // If EPA id not in list, coerce to null
  const epaIds = new Set(epas.map(e => e.id));
  if (analysis.primary_epa_id && !epaIds.has(analysis.primary_epa_id)) {
    analysis.primary_epa_id = null;
    analysis.epa_confidence = Math.min(analysis.epa_confidence, 0.4);
  }
  analysis.secondary_epa_ids = analysis.secondary_epa_ids.filter(id => epaIds.has(id));

  const originalImprovementCount = analysis.improvements.length;
  analysis.improvements = analysis.improvements.filter(improvement =>
    referencesTranscriptPhrase(improvement, params.transcriptDeId)
  );

  if (analysis.improvements.length < originalImprovementCount) {
    analysis.epa_confidence = Math.min(analysis.epa_confidence, 0.35);
    analysis.entrustment_confidence = Math.min(analysis.entrustment_confidence, 0.35);
  }

  if (
    analysis.improvements.length === 0 &&
    analysis.strengths.length === 0 &&
    analysis.evidence_quotes.length === 0
  ) {
    analysis.insufficient_evidence = true;
    if (!analysis.insufficient_evidence_reason.trim()) {
      analysis.insufficient_evidence_reason = "Transcript lacks specific, quoteable feedback content.";
    }
    analysis.primary_epa_id = null;
    analysis.epa_confidence = Math.min(analysis.epa_confidence, 0.3);
    analysis.entrustment_confidence = Math.min(analysis.entrustment_confidence, 0.3);
    if (!/insufficient evidence/i.test(analysis.summary_comment)) {
      analysis.summary_comment = `${analysis.summary_comment} Insufficient evidence in transcript to provide specific grounded feedback.`.trim();
    }
  }

  return analysis;
}
