"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { exampleTranscripts } from "@/data/example-transcripts";

function extFromMimeType(mimeType: string | undefined) {
  if (!mimeType) return "webm";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

function pickRecordingMimeType() {
  const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

  for (const mimeType of preferred) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return undefined;
}

type DraftPhase = "idle" | "transcribing" | "creating";

export default function UploadPage() {
  const [residentName, setResidentName] = useState("");
  const [attendingName, setAttendingName] = useState("");
  const [attendingEmail, setAttendingEmail] = useState("");
  const [residentEmail, setResidentEmail] = useState("");
  const [transcript, setTranscript] = useState("");
  const [draftPhase, setDraftPhase] = useState<DraftPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedExampleId, setSelectedExampleId] = useState("");

  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const selectedExample = useMemo(
    () => exampleTranscripts.find((example) => example.id === selectedExampleId) ?? null,
    [selectedExampleId]
  );

  useEffect(() => {
    if (!audioBlob) {
      setAudioUrl(null);
      return;
    }

    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioBlob]);

  async function startRecording() {
    setError(null);
    setSuccess(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickRecordingMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalMimeType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMimeType });

        if (blob.size === 0) {
          setError("We could not hear anything in that recording. Please try again and speak for a few seconds.");
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const ext = extFromMimeType(finalMimeType);
        const file = new File([blob], `recording.${ext}`, { type: finalMimeType });
        setAudioBlob(blob);
        setAudioFile(file);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("We could not access your microphone. Please allow microphone access or upload an audio file.");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.requestData();
      } catch {}
      recorder.stop();
    }

    setRecording(false);
  }

  async function transcribeAudio() {
    if (!audioBlob) {
      throw new Error("Please record or upload audio before creating a draft.");
    }

    const fd = new FormData();
    const fallbackMimeType = audioBlob.type || "audio/webm";
    const fallbackExt = extFromMimeType(fallbackMimeType);
    const file = audioFile ?? new File([audioBlob], `feedback.${fallbackExt}`, { type: fallbackMimeType });
    fd.append("audio", file, file.name);

    const res = await fetch("/api/transcribe", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "We could not turn your audio into text. Please try again.");

    const nextTranscript = (data.text || "").trim();
    if (!nextTranscript) {
      throw new Error("We could not hear enough to create text. Please try a clearer recording.");
    }

    setTranscript(nextTranscript);
    return nextTranscript;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const trimmedTranscript = transcript.trim();
      const nextTranscript = trimmedTranscript
        ? trimmedTranscript
        : (() => {
            setDraftPhase("transcribing");
            return transcribeAudio();
          })();
      const resolvedTranscript = await nextTranscript;

      setDraftPhase("creating");
      const res = await fetch("/api/sessions/draft-and-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ residentName, residentEmail, attendingName, attendingEmail, transcript: resolvedTranscript })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");

      if (data.emailed) {
        setSuccess(`Draft generated (${data.method}) and emailed to ${attendingEmail}.`);
      } else {
        setSuccess(`Draft generated (${data.method}). Email was skipped: ${data.warning || "Email is not configured."}`);
      }

      setTranscript("");
      setAudioBlob(null);
      setAudioFile(null);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
      setDraftPhase("idle");
      return;
    }

    setDraftPhase("idle");
  }

  const isWorking = draftPhase !== "idle";
  const canDraft = Boolean(attendingName && attendingEmail && residentName && residentEmail && (transcript.trim() || audioBlob));

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">New feedback session</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <section className="space-y-3 border rounded p-3">
          <div className="font-semibold">Step 1: Who is this for?</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Your name</label>
              <input className="w-full border rounded p-2" value={attendingName} onChange={(e) => setAttendingName(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium">Resident name</label>
              <input className="w-full border rounded p-2" value={residentName} onChange={(e) => setResidentName(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium">Resident email</label>
              <input className="w-full border rounded p-2" value={residentEmail} onChange={e=>setResidentEmail(e.target.value)} required type="email" />
            </div>
            <div>
              <label className="text-sm font-medium">Your email</label>
              <input
                className="w-full border rounded p-2"
                value={attendingEmail}
                onChange={(e) => setAttendingEmail(e.target.value)}
                required
                type="email"
              />
            </div>
          </div>
        </section>

        <section className="border rounded p-3 space-y-3">
          <div className="font-semibold">Step 2: Record (optional)</div>
          <div className="flex flex-wrap gap-2 items-center">
            {!recording ? (
              <button type="button" onClick={startRecording} className="px-4 py-2 rounded bg-slate-900 text-white text-sm font-medium">
                Record
              </button>
            ) : (
              <button type="button" onClick={stopRecording} className="px-4 py-2 rounded bg-red-700 text-white text-sm font-medium">
                Stop
              </button>
            )}

            <label className="px-3 py-1.5 rounded border text-sm cursor-pointer text-slate-700">
              Upload audio instead
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setAudioBlob(file);
                  setAudioFile(file);
                  setError(null);
                }}
              />
            </label>
          </div>

          {audioUrl && <audio controls src={audioUrl} className="w-full" />}

          <div className="text-xs text-slate-600">If transcript text is empty, we will auto-transcribe your recording in Step 3.</div>
        </section>

        <section className="space-y-2 border rounded p-3">
          <div className="font-semibold">Step 3: Transcript + Draft</div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Load an example transcript</label>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                className="border rounded p-2 text-sm min-w-[260px]"
                value={selectedExampleId}
                onChange={(e) => setSelectedExampleId(e.target.value)}
              >
                <option value="">Choose an example…</option>
                {exampleTranscripts.map((example) => (
                  <option key={example.id} value={example.id}>
                    {example.label} ({example.expectedEpa})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="px-3 py-1.5 rounded border text-sm"
                onClick={() => {
                  if (!selectedExample) return;
                  setTranscript(selectedExample.transcript);
                  setError(null);
                }}
                disabled={!selectedExample}
              >
                Use selected example
              </button>
            </div>
            {selectedExample ? (
              <div className="text-xs text-slate-600">Expected EPA direction: {selectedExample.expectedEpa}</div>
            ) : null}
          </div>

          <label className="text-sm font-medium">Transcript</label>
          <textarea
            className="h-56 w-full rounded border p-2 font-mono text-xs"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste a transcript, load an example above, or leave blank to auto-fill from audio."
          />

          {draftPhase === "transcribing" && <div className="text-sm text-slate-700">Transcribing…</div>}
          {draftPhase === "creating" && <div className="text-sm text-slate-700">Creating draft…</div>}
          {error && <div className="text-sm text-red-700">{error}</div>}
          {success && <div className="text-sm text-emerald-700">{success}</div>}

          <button disabled={!canDraft || isWorking} className="px-4 py-2 rounded bg-emerald-700 text-white disabled:opacity-50">
            {isWorking ? "Creating + emailing..." : "Create draft + email attending"}
          </button>
        </section>
      </form>
    </main>
  );
}
