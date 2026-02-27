"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    const raw = sessionStorage.getItem("latestDraftResult");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as StoredDraftResult;
      setPayload(parsed);
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

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Draft generated</h1>
        <p className="text-sm text-slate-600">
          Method: <span className="font-medium">{result.method}</span>
        </p>
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

      <section className="rounded border p-4 space-y-3">
        <div>
          <div className="text-sm text-slate-600">Resident</div>
          <div className="font-medium">{payload.residentName} ({payload.residentEmail})</div>
        </div>
        <div>
          <div className="text-sm text-slate-600">Attending</div>
          <div className="font-medium">{payload.attendingName} ({payload.attendingEmail})</div>
        </div>
        <div>
          <div className="text-sm text-slate-600">EPA</div>
          <div className="font-medium">{result.draft.epaId ?? "Not confidently matched"}</div>
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
      </section>

      <div className="flex gap-2">
        <Link href="/upload" className="inline-block px-4 py-2 rounded bg-slate-900 text-white text-sm">
          Create another draft
        </Link>
      </div>
    </main>
  );
}
