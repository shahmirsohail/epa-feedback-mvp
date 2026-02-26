import { NextResponse } from "next/server";
import { z } from "zod";
import { createAndEmailSessionDraft } from "@/lib/session-workflow";

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
    const result = await createAndEmailSessionDraft(body);

    return NextResponse.json({
      id: result.id,
      method: result.method,
      draftCreated: result.draftCreated,
      emailed: result.emailed,
      emailError: result.emailError,
      emailStatus: result.emailStatus
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 400 });
  }
}
