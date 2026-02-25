import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const input = form.get("audio");
    if (!(input instanceof File)) {
      return NextResponse.json({ error: "Missing audio file field 'audio'." }, { status: 400 });
    }

    const model = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";
    const client = getOpenAIClient();
    const res = await client.audio.transcriptions.create({ file: input, model });

    return NextResponse.json({ text: (res as any).text ?? "" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Transcription failed" }, { status: 500 });
  }
}
