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
    const body = BodySchema.parse(await req.json());
    const { session, method } = await createSessionWithDraft(body);
    return NextResponse.json({ id: session.id, method });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 400 });
  }
}
