import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionWithDraft } from "@/lib/session-workflow";

const BodySchema = z.object({
  attendingName: z.string({ required_error: "Attending name is required." }).trim().min(1, "Attending name is required."),
  attendingEmail: z
    .string({ required_error: "Attending email is required." })
    .trim()
    .email("Attending email must be a valid email address."),
  residentName: z.string({ required_error: "Resident name is required." }).trim().min(1, "Resident name is required."),
  transcript: z
    .string({ required_error: "Transcript is required." })
    .trim()
    .min(20, "Transcript must be at least 20 characters.")
});

export async function POST(req: Request) {
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request body.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const body = parsed.data;

    const de = deidentify(body.transcript);

    // Try LLM analysis first (if OPENAI_API_KEY set), otherwise fall back to heuristics
    const llm = await analyzeWithLLM({ transcriptDeId: de.deidentified, context: null });

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
        residentEmail: "",
        attendingName: body.attendingName,
        attendingEmail: body.attendingEmail,
        context: null,
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
