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

  strengths: z.array(z.string()).max(6),
  improvements: z.array(z.string()).max(6),
  next_steps: z.array(z.string()).max(6),
  evidence_quotes: z.array(z.string()).max(6),
  summary_comment: z.string().min(20).max(1200)
}).superRefine((data, ctx) => {
  if (data.insufficient_evidence) return;

  if (data.strengths.length < 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["strengths"], message: "At least 2 strengths required unless insufficient_evidence is true." });
  }
  if (data.improvements.length < 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["improvements"], message: "At least 2 improvements required unless insufficient_evidence is true." });
  }
  if (data.next_steps.length < 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["next_steps"], message: "At least 2 next steps required unless insufficient_evidence is true." });
  }
  if (data.evidence_quotes.length < 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["evidence_quotes"], message: "At least 2 evidence quotes required unless insufficient_evidence is true." });
  }
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
  const epaList = epas.map(e => ({
    id: e.id,
    title: e.title,
    description: e.description
  }));

  const system = [
    "You are helping an attending physician draft a resident EPA assessment from a FEEDBACK conversation transcript.",
    "This output is a DRAFT only. The attending will review/edit and must approve before sending.",
    "You must be conservative: if unsure about the EPA mapping, set primary_epa_id = null and lower confidence.",
    "If the transcript lacks specific evidence, set insufficient_evidence = true and keep evidence-related arrays sparse (including empty arrays).",
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
    '  "insufficient_evidence": boolean,',
    '  "primary_epa_id": string|null,',
    '  "secondary_epa_ids": string[<=2],',
    '  "epa_confidence": number 0-1,',
    '  "epa_rationale": string (<=400 chars),',
    '  "entrustment_level": "Intervention"|"Direction"|"Support"|"Autonomy"|"Excellence",',
    '  "entrustment_confidence": number 0-1,',
    '  "strengths": string[] (2-6 concise bullets; allow 0 when insufficient_evidence=true),',
    '  "improvements": string[] (2-6 concise bullets; actionable; allow 0 when insufficient_evidence=true),',
    '  "next_steps": string[] (2-6 concrete next-time steps; allow 0 when insufficient_evidence=true),',
    '  "evidence_quotes": string[] (2-6 short verbatim excerpts from transcript; allow 0 when insufficient_evidence=true),',
    '  "summary_comment": string (20-1200 chars; fair, specific, non-judgmental).',
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

  return analysis;
}
