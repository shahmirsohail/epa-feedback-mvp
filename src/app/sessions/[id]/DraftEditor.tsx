"use client";

import { useMemo, useState } from "react";

type EPAItem = { id: string; title: string; description: string };
type Draft = {
  meta?: any;
  epaId: string | null;
  entrustment: "Intervention"|"Direction"|"Support"|"Autonomy"|"Excellence";
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  evidenceQuotes: string[];
  summaryComment: string;
};

function linesToArray(s: string) {
  return s
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(Boolean);
}

function arrayToLines(a: string[]) {
  return (a || []).join("\n");
}

export default function DraftEditor(props: {
  sessionId: string;
  epas: EPAItem[];
  initialMappedEpaId: string | null;
  initialMappedEpaConfidence: number | null;
  initialEntrustment: Draft["entrustment"];
  initialEntrustmentConfidence: number | null;
  initialDraft: Draft;
  disabled: boolean;
}) {
  const [mappedEpaId, setMappedEpaId] = useState<string | null>(props.initialMappedEpaId);
  const [entrustment, setEntrustment] = useState<Draft["entrustment"]>(props.initialEntrustment);
  const [strengthsText, setStrengthsText] = useState(arrayToLines(props.initialDraft.strengths));
  const [improvementsText, setImprovementsText] = useState(arrayToLines(props.initialDraft.improvements));
  const [nextStepsText, setNextStepsText] = useState(arrayToLines(props.initialDraft.nextSteps));
  const [evidenceText, setEvidenceText] = useState(arrayToLines(props.initialDraft.evidenceQuotes));
  const [summaryComment, setSummaryComment] = useState(props.initialDraft.summaryComment || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const epaTitle = useMemo(() => {
    if (!mappedEpaId) return "Unmapped";
    return props.epas.find(e => e.id === mappedEpaId)?.title ?? mappedEpaId;
  }, [mappedEpaId, props.epas]);

  async function save() {
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      const draft: Draft = {
        ...props.initialDraft,
        epaId: mappedEpaId,
        entrustment,
        strengths: linesToArray(strengthsText),
        improvements: linesToArray(improvementsText),
        nextSteps: linesToArray(nextStepsText),
        evidenceQuotes: linesToArray(evidenceText),
        summaryComment
      };

      const res = await fetch("/api/sessions/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: props.sessionId,
          mappedEpaId,
          mappedEpaConfidence: props.initialMappedEpaConfidence ?? undefined,
          entrustment,
          entrustmentConfidence: props.initialEntrustmentConfidence ?? undefined,
          draft
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setOk("Saved. Refreshing…");
      window.location.reload();
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border rounded p-3 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">Draft feedback form (editable)</div>
          <div className="text-xs text-slate-600">
            EPA: <span className="font-medium">{epaTitle}</span> • Entrustment: <span className="font-medium">{entrustment}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={props.disabled || saving}
          className="px-3 py-1.5 rounded bg-slate-900 text-white text-sm disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save edits"}
        </button>
      </div>

      {props.disabled && (
        <div className="text-sm text-amber-800 bg-amber-50 border rounded p-2">
          This session has already been emailed, so editing is locked.
        </div>
      )}
      {err && <div className="text-sm text-red-700">{err}</div>}
      {ok && <div className="text-sm text-emerald-700">{ok}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">EPA</label>
          <select
            className="w-full border rounded p-2 text-sm"
            value={mappedEpaId ?? ""}
            onChange={(e) => setMappedEpaId(e.target.value ? e.target.value : null)}
            disabled={props.disabled}
          >
            <option value="">Unmapped</option>
            {props.epas.map(e => (
              <option key={e.id} value={e.id}>{e.id} — {e.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Entrustment</label>
          <select
            className="w-full border rounded p-2 text-sm"
            value={entrustment}
            onChange={(e) => setEntrustment(e.target.value as Draft["entrustment"])}
            disabled={props.disabled}
          >
            <option value="Intervention">Intervention</option>
            <option value="Direction">Direction</option>
            <option value="Support">Support</option>
            <option value="Autonomy">Autonomy</option>
            <option value="Excellence">Excellence</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Strengths (one per line)</label>
          <textarea className="w-full border rounded p-2 h-36 text-sm" value={strengthsText} onChange={e=>setStrengthsText(e.target.value)} disabled={props.disabled} />
        </div>
        <div>
          <label className="text-sm font-medium">Improvements (one per line)</label>
          <textarea className="w-full border rounded p-2 h-36 text-sm" value={improvementsText} onChange={e=>setImprovementsText(e.target.value)} disabled={props.disabled} />
        </div>
        <div>
          <label className="text-sm font-medium">Next steps (one per line)</label>
          <textarea className="w-full border rounded p-2 h-36 text-sm" value={nextStepsText} onChange={e=>setNextStepsText(e.target.value)} disabled={props.disabled} />
        </div>
        <div>
          <label className="text-sm font-medium">Evidence quotes (one per line)</label>
          <textarea className="w-full border rounded p-2 h-36 text-sm" value={evidenceText} onChange={e=>setEvidenceText(e.target.value)} disabled={props.disabled} />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Summary comment</label>
        <textarea className="w-full border rounded p-2 h-32 text-sm" value={summaryComment} onChange={e=>setSummaryComment(e.target.value)} disabled={props.disabled} />
      </div>

      <details className="border rounded p-3 bg-slate-50">
        <summary className="cursor-pointer text-sm font-medium">Model details</summary>
        <pre className="text-xs mt-2 whitespace-pre-wrap">{JSON.stringify(props.initialDraft.meta ?? {}, null, 2)}</pre>
      </details>
    </section>
  );
}
