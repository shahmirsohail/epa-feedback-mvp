import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionWithDraft, emailSessionDraft } from "@/lib/session-workflow";

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
    const { session, method } = await createSessionWithDraft(body);
    await emailSessionDraft(session.id);

    return NextResponse.json({ id: session.id, method, emailed: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 400 });
  }
}
