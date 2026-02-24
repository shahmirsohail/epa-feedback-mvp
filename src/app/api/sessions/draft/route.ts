import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { EntrustmentSchema } from "@/lib/epa";

const DraftSchema = z.object({
  meta: z.any().optional(),
  epaId: z.string().nullable(),
  entrustment: EntrustmentSchema,
  strengths: z.array(z.string()).min(1),
  improvements: z.array(z.string()).min(1),
  nextSteps: z.array(z.string()).min(1),
  evidenceQuotes: z.array(z.string()).min(0),
  summaryComment: z.string().min(5)
});

const BodySchema = z.object({
  id: z.string().min(1),
  mappedEpaId: z.string().nullable(),
  mappedEpaConfidence: z.number().min(0).max(1).optional(),
  entrustment: EntrustmentSchema,
  entrustmentConfidence: z.number().min(0).max(1).optional(),
  draft: DraftSchema
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());

    const session = await prisma.session.findUnique({ where: { id: body.id } });
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (session.approved) return NextResponse.json({ error: "Cannot edit after approval" }, { status: 400 });

    await prisma.session.update({
      where: { id: body.id },
      data: {
        mappedEpaId: body.mappedEpaId,
        mappedEpaConfidence: body.mappedEpaConfidence ?? session.mappedEpaConfidence,
        entrustment: body.entrustment,
        entrustmentConfidence: body.entrustmentConfidence ?? session.entrustmentConfidence,
        draftJson: JSON.stringify(body.draft)
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Bad request" }, { status: 400 });
  }
}
