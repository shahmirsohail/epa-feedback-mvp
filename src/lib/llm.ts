import { z } from "zod";
import { getOpenAIClient } from "./openai";
import { EntrustmentSchema } from "./epa";
import { getEpas } from "./epas";

const AnalysisSchema = z.object({
  insufficient_evidence: z.boolean().default(false),
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

export async function analyzeWithLLM(params: { transcriptDeId: string; context?: string | null }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
  const client = getOpenAIClient();

  const epas = getEpas().sort((a, b) => a.id.localeCompare(b.id));
  const epaList = epas.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description
  }));

  const system = [
    "You are helping an attending physician draft a resident EPA assessment from a FEEDBACK conversation transcript.",
    "This output is a DRAFT only. The attending will review/edit and must approve before sending.",
    "You must be conservative: if unsure about the EPA mapping, set primary_epa_id = null and lower confidence.",
    'Every strength and improvement bullet MUST embed at least one short verbatim quote in double-quotes from the transcript, e.g.: \'You said "I started with airway and circulation" which showed safe prioritization.\' Omit any bullet you cannot ground with a direct quote. Also populate evidence_quotes with the same verbatim excerpts.',
    "If transcript lacks specific clinical feedback content (e.g. it is social chitchat, fewer than 50 words, or no clinical actions are described), set insufficient_evidence=true, primary_epa_id=null, and leave strengths/improvements/evidence_quotes empty.",
    "Never include patient names, dates, locations, MRNs, or any identifying information in any output field. All output must be de-identified.",
    "Return ONLY valid JSON matching the required schema."
  ].join(" ");

  const user = [
    "Task: (1) map the transcript to the best matching EPA from the list, (2) suggest an entrustment level, and (3) draft feedback.",
    "",
    "Entrustment scale — pick the level that best matches the attending's explicit assessment of the resident:",
    "- Intervention: attending physically took over or had to intervene for patient safety; resident was not safe to continue.",
    "- Direction: attending had to provide explicit step-by-step guidance throughout; resident could not proceed without constant prompting.",
    "- Support: resident managed the situation but needed intermittent guidance or check-ins at key decision points.",
    "- Autonomy: resident performed independently with minimal oversight; attending observed but did not need to direct.",
    "- Excellence: resident performed consistently above expected level; attending explicitly states no improvements, calls the performance exemplary, or says the resident could teach peers.",
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
    '  "insufficient_evidence": boolean,',
    '  "primary_epa_id": string|null,',
    '  "secondary_epa_ids": string[<=2],',
    '  "epa_confidence": number 0-1,',
    '  "epa_rationale": string (<=400 chars),',
    '  "entrustment_level": "Intervention"|"Direction"|"Support"|"Autonomy"|"Excellence",',
    '  "entrustment_confidence": number 0-1,',
    '  "strengths": string[] (0-6 concise bullets; each bullet MUST embed a verbatim quote in double-quotes from the transcript),',
    '  "improvements": string[] (0-6 concise bullets; actionable; each bullet MUST embed a verbatim quote in double-quotes from the transcript),',
    '  "next_steps": string[] (0-6 concrete next-time steps),',
    '  "evidence_quotes": string[] (0-6 short verbatim excerpts from transcript supporting your suggestions),',
    '  "summary_comment": string (20-1200 chars; fair, specific, non-judgmental).',
    '  "insufficient_evidence_reason": string (<=400 chars; explain what was missing).',
    "}",
    "",
    "Return JSON only."
  ].join("\n");

  const resp = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });

  const content = resp.choices?.[0]?.message?.content ?? "";
  const parsed = safeJsonParse(content);
  const analysis = AnalysisSchema.parse(parsed);

  // If EPA id not in list, coerce to null
  const epaIds = new Set(epas.map((e) => e.id));
  if (analysis.primary_epa_id && !epaIds.has(analysis.primary_epa_id)) {
    analysis.primary_epa_id = null;
    analysis.epa_confidence = Math.min(analysis.epa_confidence, 0.4);
  }
  analysis.secondary_epa_ids = analysis.secondary_epa_ids.filter((id) => epaIds.has(id));

  // Backfill evidence_quotes from inline verbatim quotes embedded in bullet text.
  // The LLM often puts quotes in the bullets themselves but leaves this array empty.
  if (analysis.evidence_quotes.length === 0) {
    const inlineQuotePattern = /"([^"]{10,200})"/g;
    const bulletText = [...analysis.strengths, ...analysis.improvements].join(" ");
    const extracted: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = inlineQuotePattern.exec(bulletText)) !== null) {
      extracted.push(m[1]);
    }
    analysis.evidence_quotes = extracted.slice(0, 6);
  }

  if (analysis.improvements.length > 0 && analysis.strengths.length === 0) {
    analysis.epa_confidence = Math.min(analysis.epa_confidence, 0.3);
    analysis.entrustment_confidence = Math.min(analysis.entrustment_confidence, 0.3);
  }

  if (analysis.strengths.length > 0 && analysis.improvements.length === 0) {
    analysis.epa_confidence = Math.min(analysis.epa_confidence, 0.3);
    analysis.entrustment_confidence = Math.min(analysis.entrustment_confidence, 0.3);
  }

  // Flag insufficient evidence when no quoteable content could be grounded at all,
  // or when the transcript is very short (< 40 words) and produced no evidence.
  const wordCount = params.transcriptDeId.trim().split(/\s+/).length;
  const noGroundedContent =
    analysis.strengths.length === 0 &&
    analysis.improvements.length === 0 &&
    analysis.evidence_quotes.length === 0;
  const tooShort = wordCount < 40 && analysis.evidence_quotes.length === 0;

  if (noGroundedContent || tooShort) {
    analysis.insufficient_evidence = true;
    if (!analysis.insufficient_evidence_reason.trim()) {
      analysis.insufficient_evidence_reason = "Transcript lacks specific, quoteable clinical feedback content.";
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
