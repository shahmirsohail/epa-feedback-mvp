"use client";

import { useEffect, useRef, useState } from "react";

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
  const preferred = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus"
  ];

  for (const mimeType of preferred) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return undefined;
}

export default function UploadPage() {
  const [residentName, setResidentName] = useState("");
  const [residentEmail, setResidentEmail] = useState("");
  const [attendingName, setAttendingName] = useState("");
  const [attendingEmail, setAttendingEmail] = useState("");
  const [context, setContext] = useState("");
  const [transcript, setTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

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
          setError("Recording was empty. Please record for at least 1-2 seconds and try again.");
          stream.getTracks().forEach((track) => track.stop());
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
    } catch (e: any) {
      setError(e?.message || "Microphone permission denied or unavailable.");
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
    if (!audioBlob) return;

    setBusy(true);
    setError(null);

    try {
      const fd = new FormData();
      const fallbackMimeType = audioBlob.type || "audio/webm";
      const fallbackExt = extFromMimeType(fallbackMimeType);
      const file = audioFile ?? new File([audioBlob], `feedback.${fallbackExt}`, { type: fallbackMimeType });
      fd.append("audio", file, file.name);

      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Transcription failed");

      setTranscript((data.text || "").trim());
      if (!data.text) {
        setError("Transcription returned empty text. Try a clearer recording or check your OpenAI key/model.");
      }
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/sessions/draft-and-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ residentName, residentEmail, attendingName, attendingEmail, context, transcript })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");

      window.location.href = `/sessions/${data.id}?emailed=1`;
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  const canDraft = transcript.trim().length >= 20 && !busy;

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">New feedback session</h1>

      <div className="rounded border bg-slate-50 p-4 text-sm space-y-1">
        <div className="font-semibold">Audio workflow (MVP v2)</div>
        <div>1) Record audio (or upload) -&gt; 2) Transcribe -&gt; 3) Create draft and email.</div>
        <div className="text-xs text-slate-600">
          Transcription requires an OpenAI API key in <code>.env</code>.
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Resident name</label>
            <input className="w-full border rounded p-2" value={residentName} onChange={(e) => setResidentName(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium">Resident email</label>
            <input className="w-full border rounded p-2" value={residentEmail} onChange={(e) => setResidentEmail(e.target.value)} required type="email" />
          </div>
          <div>
            <label className="text-sm font-medium">Attending name</label>
            <input className="w-full border rounded p-2" value={attendingName} onChange={(e) => setAttendingName(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium">Attending email</label>
            <input className="w-full border rounded p-2" value={attendingEmail} onChange={(e) => setAttendingEmail(e.target.value)} required type="email" />
          </div>
          <div>
            <label className="text-sm font-medium">Context (optional)</label>
            <input className="w-full border rounded p-2" value={context} onChange={(e) => setContext(e.target.value)} placeholder="ED / CTU / clinic / etc" />
          </div>
        </div>

        <section className="border rounded p-3 space-y-3">
          <div className="font-semibold">Audio</div>
          <div className="flex flex-wrap items-center gap-2">
            {!recording ? (
              <button type="button" onClick={startRecording} className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white">
                Start recording
              </button>
            ) : (
              <button type="button" onClick={stopRecording} className="rounded bg-red-700 px-3 py-1.5 text-sm text-white">
                Stop
              </button>
            )}

            <label className="cursor-pointer rounded border px-3 py-1.5 text-sm">
              Upload audio
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

            <button
              type="button"
              disabled={!audioBlob || busy}
              onClick={transcribeAudio}
              className="rounded bg-blue-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {busy ? "Working..." : "Transcribe"}
            </button>
          </div>

          {audioUrl ? <audio controls src={audioUrl} className="w-full" /> : null}

          <div className="text-xs text-slate-600">Tip: keep recordings under about 10 minutes for MVP.</div>
        </section>

        <div>
          <label className="text-sm font-medium">Transcript (auto-filled after transcription, or paste/edit)</label>
          <textarea
            className="h-56 w-full rounded border p-2 font-mono text-xs"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            required
            placeholder="After transcription, edit the text here if needed..."
          />
        </div>

        {error ? <div className="text-sm text-red-700">{error}</div> : null}

        <button disabled={!canDraft} className="rounded bg-emerald-700 px-4 py-2 text-white disabled:opacity-50">
          {busy ? "Creating + emailing..." : "Create draft + email attending"}
        </button>
      </form>
    </main>
  );
}
