import { NextResponse } from "next/server";
import { z } from "zod";
import { createDraftFromTranscript, createSessionWithDraft } from "@/lib/session-workflow";
import { sendDraftEmail } from "@/lib/email";

const BodySchema = z.object({
  attendingName: z.string({ required_error: "Attending name is required." }).trim().min(1, "Attending name is required."),
  attendingEmail: z
    .string({ required_error: "Attending email is required." })
    .trim()
    .email("Attending email must be a valid email address."),
  residentName: z.string({ required_error: "Resident name is required." }).trim().min(1, "Resident name is required."),
  residentEmail: z
    .string({ required_error: "Resident email is required." })
    .trim()
    .email("Resident email must be a valid email address."),
  transcript: z
    .string({ required_error: "Transcript is required." })
    .trim()
    .min(20, "Transcript must be at least 20 characters.")
});

function isDatabaseFileError(error: unknown) {
  const message = String((error as any)?.message ?? "");
  return message.includes("Unable to open the database file");
}

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());

    try {
      const { session, method } = await createSessionWithDraft(body);
      return NextResponse.json({ id: session.id, method });
    } catch (error) {
      if (!isDatabaseFileError(error)) throw error;

      const generated = await createDraftFromTranscript(body);
      await sendDraftEmail({
        to: body.attendingEmail,
        residentName: body.residentName,
        attendingName: body.attendingName,
        draft: generated.draft
      });

      return NextResponse.json({
        id: null,
        method: generated.method,
        warning: "Database is unavailable, but the draft email was still sent."
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 400 });
  }
}
