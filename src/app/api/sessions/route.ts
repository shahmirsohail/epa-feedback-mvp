import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { deidentify } from "@/lib/deid";
import { matchEPA, inferEntrustment } from "@/lib/epa";
import { buildHeuristicDraft } from "@/lib/draft";
import { analyzeWithLLM } from "@/lib/llm";

const BodySchema = z.object({
  residentName: z.string().min(1),
  residentEmail: z.string().email(),
  attendingName: z.string().min(1),
  attendingEmail: z.string().email(),
  context: z.string().optional(),
  transcript: z.string().min(20)
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());

    const de = deidentify(body.transcript);

    // Try LLM analysis first (if OPENAI_API_KEY set), otherwise fall back to heuristics
    const llm = await analyzeWithLLM({ transcriptDeId: de.deidentified, context: body.context || null });

    let mappedEpaId: string | null = null;
    let mappedEpaConfidence = 0.0;
    let entrustment = "Support";
    let entrustmentConfidence = 0.0;
    let draft: any = null;

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
        epaId: mappedEpaId,
        entrustment: ent.level,
        epaConfidence: mappedEpaConfidence,
        entrustmentConfidence
      });
    }

    // EPA catalog is now JSON-backed, so avoid relying on DB-side EPA foreign keys.
    const session = await prisma.session.create({
      data: {
        residentName: body.residentName,
        residentEmail: body.residentEmail,
        attendingName: body.attendingName,
        attendingEmail: body.attendingEmail,
        context: body.context || null,
        transcriptRaw: body.transcript,
        transcriptDeId: de.deidentified,
        redactionReport: JSON.stringify({ redactions: de.redactions }),
        mappedEpaId: null,
        mappedEpaConfidence,
        entrustment,
        entrustmentConfidence,
        draftJson: JSON.stringify(draft)
      }
    });

    return NextResponse.json({ id: session.id, method: llm ? "llm" : "heuristic" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 400 });
  }
}
