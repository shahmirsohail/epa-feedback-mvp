import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";

export const runtime = "nodejs"; // needs node runtime for file handling

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing audio file field 'audio'." }, { status: 400 });
    }

    const model = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";

    // OpenAI SDK accepts Web File in Node 18+ (Next.js runtime=nodejs)
    const client = getOpenAIClient();
    const res = await client.audio.transcriptions.create({
      file,
      model
    });

    // res.text is the transcript
    return NextResponse.json({ text: (res as any).text ?? "" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Transcription failed" }, { status: 500 });
  }
}
