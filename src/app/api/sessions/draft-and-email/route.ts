import { NextResponse } from "next/server";
import { z } from "zod";
import { createDraftFromTranscript } from "@/lib/session-workflow";
import { sendDraftEmail } from "@/lib/email";

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
    const generated = await createDraftFromTranscript(body);
    let emailed = false;
    let emailError: string | null = null;

    try {
      await sendDraftEmail({
        to: body.attendingEmail,
        residentName: body.residentName,
        attendingName: body.attendingName,
        draft: generated.draft
      });
      emailed = true;
    } catch (error: any) {
      emailError = error?.message ?? "Email failed";
    }

    return NextResponse.json({
      method: generated.method,
      emailed,
      emailError,
      epaId: generated.mappedEpaId,
      draft: generated.draft
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 400 });
  }
}
