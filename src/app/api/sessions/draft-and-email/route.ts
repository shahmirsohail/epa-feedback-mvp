import { NextResponse } from "next/server";
import { z } from "zod";
import { createDraftFromTranscript } from "@/lib/session-workflow";
import { EmailSetupError, sendDraftEmail } from "@/lib/email";

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

    try {
      await sendDraftEmail({
        to: body.attendingEmail,
        residentName: body.residentName,
        attendingName: body.attendingName,
        draft: generated.draft
      });

      return NextResponse.json({ method: generated.method, emailed: true, epaId: generated.mappedEpaId });
    } catch (e: any) {
      if (e instanceof EmailSetupError) {
        return NextResponse.json({
          method: generated.method,
          emailed: false,
          epaId: generated.mappedEpaId,
          warning: e.message
        });
      }
      throw e;
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 400 });
  }
}
