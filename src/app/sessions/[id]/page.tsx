import { prisma } from "@/lib/prisma";
import { getEpas } from "@/lib/epas";
import DraftEditor from "./DraftEditor";

export const dynamic = "force-dynamic";

function prettyJson(s: string) {
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
}

export default async function SessionPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { emailed?: string; email_failed?: string };
}) {
  const session = await prisma.session.findUnique({
    where: { id: params.id }
  });
  if (!session) return <main>Not found</main>;

  const epas = getEpas().sort((a, b) => a.id.localeCompare(b.id));
  const draft = JSON.parse(session.draftJson);
  const meta = draft?.meta || {};
  const method = meta.method || "heuristic";
  const justEmailed = searchParams?.emailed === "1";
  const justFailedEmail = searchParams?.email_failed === "1";
  const insufficientEvidence = meta?.insufficient_evidence === true;

  return (
    <main className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Session</h1>
          <div className="text-sm text-slate-600">{new Date(session.createdAt).toLocaleString()}</div>
          <div className="mt-2 text-sm">
            <div><span className="font-medium">Resident:</span> {session.residentName} <span className="text-slate-600">({session.residentEmail})</span></div>
            <div><span className="font-medium">Attending:</span> {session.attendingName} <span className="text-slate-600">({session.attendingEmail})</span></div>
            {session.context && <div><span className="font-medium">Context:</span> {session.context}</div>}
          </div>
        </div>

        <div className="p-3 border rounded bg-slate-50 text-sm min-w-[280px] space-y-1">
          <div className="font-semibold">Auto-analysis</div>
          <div className="text-xs text-slate-600">Method: <span className="font-medium">{method === "llm" ? "AI (LLM) draft" : "Heuristic draft"}</span></div>
          <div><span className="font-medium">EPA:</span> {session.mappedEpaId ?? draft?.epaId ?? "Unmapped"} {session.mappedEpaConfidence != null ? <span className="text-xs text-slate-600">(conf {Number(session.mappedEpaConfidence).toFixed(2)})</span> : null}</div>
          {meta.epa_rationale && (
            <div className="text-xs text-slate-700">
              <span className="font-medium">Rationale:</span> {meta.epa_rationale}
            </div>
          )}
          {Array.isArray(meta.secondary_epa_ids) && meta.secondary_epa_ids.length > 0 && (
            <div className="text-xs text-slate-700">
              <span className="font-medium">Alternates:</span> {meta.secondary_epa_ids.join(", ")}
            </div>
          )}
          <div><span className="font-medium">Entrustment:</span> {session.entrustment} <span className="text-xs text-slate-600">(conf {Number(session.entrustmentConfidence).toFixed(2)})</span></div>

          {session.emailStatus === "email_sent" ? (
            <div className="mt-2 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
              {justEmailed ? "Draft emailed successfully. " : "Draft already emailed. "}
              {session.emailSentAt ? `Sent ${new Date(session.emailSentAt).toLocaleString()}.` : ""}
            </div>
          ) : session.emailStatus === "email_failed" ? (
            <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800 space-y-2">
              <div>{justFailedEmail ? "Draft created, but email failed to send." : "Email send failed for this draft."}</div>
              {session.emailError ? <div className="text-red-700">Error: {session.emailError}</div> : null}
              <form action="/api/sessions/email" method="POST">
                <input type="hidden" name="id" value={session.id} />
                <button className="px-2 py-1 rounded bg-red-700 text-white" type="submit">Retry email send</button>
              </form>
            </div>
          ) : (
            <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 space-y-2">
              <div>Draft is ready but has not been emailed yet.</div>
              <form action="/api/sessions/email" method="POST">
                <input type="hidden" name="id" value={session.id} />
                <button className="px-2 py-1 rounded bg-amber-700 text-white" type="submit">Send draft email</button>
              </form>
            </div>
          )}
        </div>
      </div>


      {insufficientEvidence ? (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This transcript appears to have insufficient specific feedback to draft reliably. Please add a longer, specific transcript (with concrete observations and actions) before finalizing or emailing.
        </div>
      ) : null}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <div className="font-semibold mb-2">De-identified transcript</div>
          <pre className="text-xs whitespace-pre-wrap">{session.transcriptDeId}</pre>
        </div>
        <div className="border rounded p-3">
          <div className="font-semibold mb-2">Redaction report</div>
          <pre className="text-xs whitespace-pre-wrap">{prettyJson(session.redactionReport)}</pre>
        </div>
      </section>

      <DraftEditor
        sessionId={session.id}
        epas={epas.map(e => ({ id: e.id, title: e.title, description: e.description }))}
        initialMappedEpaId={session.mappedEpaId ?? draft?.epaId ?? null}
        initialMappedEpaConfidence={session.mappedEpaConfidence}
        initialEntrustment={session.entrustment as any}
        initialEntrustmentConfidence={session.entrustmentConfidence}
        initialDraft={draft}
        disabled={session.emailSent}
      />

      <details className="border rounded p-3">
        <summary className="cursor-pointer font-semibold">Raw transcript (debugging; avoid storing PHI in real use)</summary>
        <pre className="text-xs whitespace-pre-wrap mt-2">{session.transcriptRaw}</pre>
      </details>
    </main>
  );
}
