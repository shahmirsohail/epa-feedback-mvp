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

  // Audio
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioBlob]);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickRecordingMimeType();
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      chunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        const finalMimeType = mr.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMimeType });

        if (blob.size === 0) {
          setError("Recording was empty. Please record for at least 1–2 seconds and try again.");
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const ext = extFromMimeType(finalMimeType);
        const file = new File([blob], `recording.${ext}`, { type: finalMimeType });
        setAudioBlob(blob);
        setAudioFile(file);
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start(250);
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (e: any) {
      setError(e?.message || "Microphone permission denied or unavailable.");
    }
  }

  function stopRecording() {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      try {
        mr.requestData();
      } catch {}
      mr.stop();
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
      if (!data.text) setError("Transcription returned empty text. Try a clearer recording or check your OpenAI key/model.");
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ residentName, residentEmail, attendingName, attendingEmail, context, transcript })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      window.location.href = `/sessions/${data.id}`;
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">New feedback session</h1>

      <div className="p-4 rounded border bg-slate-50 text-sm space-y-1">
        <div className="font-semibold">Audio workflow (MVP v2)</div>
        <div>1) Record audio (or upload an audio file) → 2) Transcribe → 3) Create draft.</div>
        <div className="text-xs text-slate-600">
          Transcription requires an OpenAI API key in <code>.env</code>.
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Resident name</label>
            <input className="w-full border rounded p-2" value={residentName} onChange={e=>setResidentName(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium">Resident email</label>
            <input className="w-full border rounded p-2" value={residentEmail} onChange={e=>setResidentEmail(e.target.value)} required type="email" />
          </div>
          <div>
            <label className="text-sm font-medium">Attending name</label>
            <input className="w-full border rounded p-2" value={attendingName} onChange={e=>setAttendingName(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium">Attending email</label>
            <input className="w-full border rounded p-2" value={attendingEmail} onChange={e=>setAttendingEmail(e.target.value)} required type="email" />
          </div>
          <div>
            <label className="text-sm font-medium">Context (optional)</label>
            <input className="w-full border rounded p-2" value={context} onChange={e=>setContext(e.target.value)} placeholder="ED / CTU / clinic / etc" />
          </div>
        </div>

        <section className="border rounded p-3 space-y-3">
          <div className="font-semibold">Audio</div>
          <div className="flex flex-wrap gap-2 items-center">
            {!recording ? (
              <button type="button" onClick={startRecording} className="px-3 py-1.5 rounded bg-slate-900 text-white text-sm">
                Start recording
              </button>
            ) : (
              <button type="button" onClick={stopRecording} className="px-3 py-1.5 rounded bg-red-700 text-white text-sm">
                Stop
              </button>
            )}

            <label className="px-3 py-1.5 rounded border text-sm cursor-pointer">
              Upload audio
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setAudioBlob(f);
                  setAudioFile(f);
                  setError(null);
                }}
              />
            </label>

            <button
              type="button"
              disabled={!audioBlob || busy}
              onClick={transcribeAudio}
              className="px-3 py-1.5 rounded bg-blue-700 text-white text-sm disabled:opacity-50"
            >
              {busy ? "Working..." : "Transcribe"}
            </button>
          </div>

          {audioUrl && (
            <audio controls src={audioUrl} className="w-full" />
          )}

          <div className="text-xs text-slate-600">
            Tip: keep recordings under ~10 minutes for the MVP (large files may fail).
          </div>
        </section>

        <div>
          <label className="text-sm font-medium">Transcript (auto-filled after transcription, or paste/edit)</label>
          <textarea
            className="w-full border rounded p-2 h-56 font-mono text-xs"
            value={transcript}
            onChange={e=>setTranscript(e.target.value)}
            required
            placeholder="After transcription, edit the text here if needed..."
          />
        </div>

        {error && <div className="text-sm text-red-700">{error}</div>}

        <button disabled={busy} className="px-4 py-2 rounded bg-emerald-700 text-white disabled:opacity-50">
          {busy ? "Creating..." : "Create draft"}
        </button>
      </form>
    </main>
  );
}

