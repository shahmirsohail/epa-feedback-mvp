import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";

export const runtime = "nodejs";

type RoleInference = {
  diarizedTranscript: string;
  attendingConfidence: number;
  residentConfidence: number;
  notes: string;
};

function safeJsonParse<T>(content: string): T {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? content.slice(start, end + 1) : content;
  return JSON.parse(candidate) as T;
}

async function inferSpeakerRoles(params: { transcript: string; client: ReturnType<typeof getOpenAIClient> }) {
  const model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
  const prompt = [
    "You are given a raw transcript from a 2-person feedback conversation between an Attending physician and a Resident.",
    "Your task is to infer likely turn boundaries and label each line as either 'Attending:' or 'Resident:'.",
    "Be conservative: if uncertain, still pick the most likely role and mention uncertainty in notes.",
    "Do not add clinical details. Preserve original meaning and wording as much as possible.",
    "Output ONLY valid JSON with keys:",
    '{"diarizedTranscript": string, "attendingConfidence": number 0-1, "residentConfidence": number 0-1, "notes": string}',
    "",
    "Raw transcript:",
    params.transcript
  ].join("\n");

  const completion = await params.client.chat.completions.create({
    model,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You are a careful clinical documentation assistant. Return strictly valid JSON with no markdown fences or extra keys."
      },
      { role: "user", content: prompt }
    ]
  });

  const content = completion.choices?.[0]?.message?.content ?? "";
  const parsed = safeJsonParse<RoleInference>(content);

  const diarizedTranscript = String(parsed.diarizedTranscript ?? "").trim();
  const attendingConfidence = Number(parsed.attendingConfidence);
  const residentConfidence = Number(parsed.residentConfidence);
  const notes = String(parsed.notes ?? "").trim();

  if (!diarizedTranscript) return null;

  return {
    diarizedTranscript,
    attendingConfidence: Number.isFinite(attendingConfidence)
      ? Math.max(0, Math.min(1, attendingConfidence))
      : 0.5,
    residentConfidence: Number.isFinite(residentConfidence)
      ? Math.max(0, Math.min(1, residentConfidence))
      : 0.5,
    notes
  };
}

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
    const text = (res as any).text ?? "";

    let roleInference: RoleInference | null = null;
    if (text.trim().length >= 20) {
      try {
        roleInference = await inferSpeakerRoles({ transcript: text, client });
      } catch {
        roleInference = null;
      }
    }

    return NextResponse.json({
      text,
      diarizedText: roleInference?.diarizedTranscript ?? text,
      speakerInference: roleInference
        ? {
            attendingConfidence: roleInference.attendingConfidence,
            residentConfidence: roleInference.residentConfidence,
            notes: roleInference.notes
          }
        : null
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Transcription failed" }, { status: 500 });
  }
}
