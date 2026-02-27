"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatEpaLabel } from "@/lib/epa-label";

const GENERATED_DRAFT_STORAGE_KEY = "latestDraftResultGeneratedDraft";

type StoredDraftResult = {
  residentName: string;
  residentEmail: string;
  attendingName: string;
  attendingEmail: string;
  transcript: string;
  result: {
    method: "llm" | "heuristic";
    emailed: boolean;
    emailError: string | null;
    epaId: string | null;
    draft: {
      meta?: {
        insufficient_evidence?: boolean;
      };
      epaId: string | null;
      entrustment: string;
      strengths: string[];
      improvements: string[];
      nextSteps: string[];
      evidenceQuotes: string[];
      summaryComment: string;
    };
  };
};

export default function UploadResultPage() {
  const [payload, setPayload] = useState<StoredDraftResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const updateDraftInPayload = (nextDraft: StoredDraftResult["result"]["draft"]) => {
    setPayload((current) => {
      if (!current) return current;
      return {
        ...current,
        result: {
          ...current.result,
          draft: nextDraft,
        },
      };
    });
  };

  const saveDraftLocally = () => {
    if (!payload) return;
    sessionStorage.setItem("latestDraftResult", JSON.stringify(payload));
    setIsEditing(false);
  };

  const resetToGeneratedDraft = () => {
    if (!payload) return;
    const rawGeneratedDraft = sessionStorage.getItem(GENERATED_DRAFT_STORAGE_KEY);
    if (!rawGeneratedDraft) return;

    try {
      const generatedDraft = JSON.parse(rawGeneratedDraft) as StoredDraftResult["result"]["draft"];
      const nextPayload: StoredDraftResult = {
        ...payload,
        result: {
          ...payload.result,
          draft: generatedDraft,
        },
      };
      setPayload(nextPayload);
      sessionStorage.setItem("latestDraftResult", JSON.stringify(nextPayload));
      setIsEditing(false);
    } catch {
      // Keep current edits if generated draft storage is invalid.
    }
  };

  useEffect(() => {
    const raw = sessionStorage.getItem("latestDraftResult");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as StoredDraftResult;
      setPayload(parsed);

      const hasGeneratedDraft = sessionStorage.getItem(GENERATED_DRAFT_STORAGE_KEY);
      if (!hasGeneratedDraft) {
        sessionStorage.setItem(GENERATED_DRAFT_STORAGE_KEY, JSON.stringify(parsed.result.draft));
      }
    } catch {
      setPayload(null);
    }
  }, []);

  if (!payload) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-bold">No draft found</h1>
        <p className="text-sm text-slate-600">Create a new draft first and this page will show the generated output.</p>
        <Link href="/upload" className="inline-block px-4 py-2 rounded bg-slate-900 text-white text-sm">
          Back to new session
        </Link>
      </main>
    );
  }

  const { result } = payload;

  const insufficientEvidence = result.draft.meta?.insufficient_evidence === true;

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Draft generated</h1>
        <p className="text-sm text-slate-600">
          Method: <span className="font-medium">{result.method}</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">Prototype mode: edits on this page are saved in this browser session only.</p>
      </div>

      {result.emailed ? (
        <div className="rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Email sent to {payload.attendingEmail}.
        </div>
      ) : (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Email was not sent: {result.emailError || "Unknown email error"}
        </div>
      )}


      {insufficientEvidence ? (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This transcript appears too short or non-specific to draft reliable EPA feedback. Please provide a longer transcript with concrete clinical decisions/actions before finalizing.
        </div>
      ) : null}

      <section className="rounded border p-4 space-y-3">
        <div>
          <div className="text-sm text-slate-600">Resident</div>
          <div className="font-medium">{payload.residentName} ({payload.residentEmail})</div>
        </div>
        <div>
          <div className="text-sm text-slate-600">Attending</div>
          <div className="font-medium">{payload.attendingName} ({payload.attendingEmail})</div>
        </div>
        {isEditing ? (
          <>
            <div>
              <label htmlFor="epa-id" className="text-sm text-slate-600">EPA</label>
              <input
                id="epa-id"
                type="text"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={result.draft.epaId ?? ""}
                onChange={(event) =>
                  updateDraftInPayload({
                    ...result.draft,
                    epaId: event.target.value.trim() === "" ? null : event.target.value,
                  })
                }
              />
            </div>
            <div>
              <label htmlFor="entrustment" className="text-sm text-slate-600">Entrustment</label>
              <input
                id="entrustment"
                type="text"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={result.draft.entrustment}
                onChange={(event) =>
                  updateDraftInPayload({
                    ...result.draft,
                    entrustment: event.target.value,
                  })
                }
              />
            </div>
            <div>
              <label htmlFor="summary" className="text-sm text-slate-600">Summary</label>
              <textarea
                id="summary"
                className="mt-1 min-h-24 w-full rounded border px-3 py-2 text-sm"
                value={result.draft.summaryComment}
                onChange={(event) =>
                  updateDraftInPayload({
                    ...result.draft,
                    summaryComment: event.target.value,
                  })
                }
              />
            </div>

            <div>
              <label htmlFor="strengths" className="font-medium">Strengths (one per line)</label>
              <textarea
                id="strengths"
                className="mt-1 min-h-24 w-full rounded border px-3 py-2 text-sm"
                value={result.draft.strengths.join("\n")}
                onChange={(event) =>
                  updateDraftInPayload({
                    ...result.draft,
                    strengths: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                  })
                }
              />
            </div>

            <div>
              <label htmlFor="improvements" className="font-medium">Areas to improve (one per line)</label>
              <textarea
                id="improvements"
                className="mt-1 min-h-24 w-full rounded border px-3 py-2 text-sm"
                value={result.draft.improvements.join("\n")}
                onChange={(event) =>
                  updateDraftInPayload({
                    ...result.draft,
                    improvements: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                  })
                }
              />
            </div>

            <div>
              <label htmlFor="next-steps" className="font-medium">Next steps (one per line)</label>
              <textarea
                id="next-steps"
                className="mt-1 min-h-24 w-full rounded border px-3 py-2 text-sm"
                value={result.draft.nextSteps.join("\n")}
                onChange={(event) =>
                  updateDraftInPayload({
                    ...result.draft,
                    nextSteps: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                  })
                }
              />
            </div>

            <div>
              <label htmlFor="evidence" className="font-medium">Evidence quotes (one per line)</label>
              <textarea
                id="evidence"
                className="mt-1 min-h-24 w-full rounded border px-3 py-2 text-sm"
                value={result.draft.evidenceQuotes.join("\n")}
                onChange={(event) =>
                  updateDraftInPayload({
                    ...result.draft,
                    evidenceQuotes: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                  })
                }
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="text-sm text-slate-600">EPA</div>
              <div className="font-medium">{formatEpaLabel(result.draft.epaId)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Entrustment</div>
              <div className="font-medium">{result.draft.entrustment}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Summary</div>
              <p>{result.draft.summaryComment}</p>
            </div>

            <div>
              <div className="font-medium">Strengths</div>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {result.draft.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="font-medium">Areas to improve</div>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {result.draft.improvements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="font-medium">Next steps</div>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {result.draft.nextSteps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            {result.draft.evidenceQuotes.length > 0 ? (
              <div>
                <div className="font-medium">Evidence quotes</div>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {result.draft.evidenceQuotes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </section>

      <div className="flex gap-2">
        {isEditing ? (
          <>
            <button type="button" className="px-4 py-2 rounded bg-emerald-700 text-white text-sm" onClick={saveDraftLocally}>
              Save locally
            </button>
            <button type="button" className="px-4 py-2 rounded border text-sm" onClick={resetToGeneratedDraft}>
              Reset to generated draft
            </button>
            <button type="button" className="px-4 py-2 rounded border text-sm" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="px-4 py-2 rounded border text-sm" onClick={() => setIsEditing(true)}>
            Edit
          </button>
        )}
        <Link href="/upload" className="inline-block px-4 py-2 rounded bg-slate-900 text-white text-sm">
          Create another draft
        </Link>
      </div>
    </main>
  );
}
