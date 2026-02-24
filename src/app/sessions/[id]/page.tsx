import { prisma } from "@/lib/prisma";
import DraftEditor from "./DraftEditor";

export const dynamic = "force-dynamic";

function prettyJson(s: string) {
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
}

export default async function SessionPage({ params }: { params: { id: string }}) {
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: { epa: true }
  });
  if (!session) return <main>Not found</main>;

  const epas = await prisma.ePA.findMany({ orderBy: { id: "asc" } });
  const draft = JSON.parse(session.draftJson);
  const meta = draft?.meta || {};
  const method = meta.method || "heuristic";

  return (
    <main className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Session</h1>
          <div className="text-sm text-slate-600">{new Date(session.createdAt).toLocaleString()}</div>
          <div className="mt-2 text-sm">
            <div><span className="font-medium">Resident:</span> {session.residentName} <span className="text-slate-600">({session.residentEmail})</span></div>
            <div><span className="font-medium">Attending:</span> {session.attendingName}</div>
            {session.context && <div><span className="font-medium">Context:</span> {session.context}</div>}
          </div>
        </div>

        <div className="p-3 border rounded bg-slate-50 text-sm min-w-[280px] space-y-1">
          <div className="font-semibold">Auto-analysis</div>
          <div className="text-xs text-slate-600">Method: <span className="font-medium">{method === "llm" ? "AI (LLM) draft" : "Heuristic draft"}</span></div>
          <div><span className="font-medium">EPA:</span> {session.mappedEpaId ?? "Unmapped"} {session.mappedEpaConfidence != null ? <span className="text-xs text-slate-600">(conf {Number(session.mappedEpaConfidence).toFixed(2)})</span> : null}</div>
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
          <div className="text-xs text-slate-600">
            Status: {session.approved ? (session.emailSent ? "Approved + emailed" : "Approved") : "Draft (not approved)"}
          </div>

          <div className="pt-2 flex gap-2 flex-wrap">
            {!session.approved && (
              <form action="/api/sessions/approve" method="POST">
                <input type="hidden" name="id" value={session.id} />
                <button className="px-3 py-1.5 rounded bg-emerald-700 text-white text-sm">Approve</button>
              </form>
            )}
            {session.approved && !session.emailSent && (
              <form action="/api/sessions/email" method="POST">
                <input type="hidden" name="id" value={session.id} />
                <button className="px-3 py-1.5 rounded bg-blue-700 text-white text-sm">Send email</button>
              </form>
            )}
          </div>
        </div>
      </div>

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
        initialMappedEpaId={session.mappedEpaId}
        initialMappedEpaConfidence={session.mappedEpaConfidence}
        initialEntrustment={session.entrustment as any}
        initialEntrustmentConfidence={session.entrustmentConfidence}
        initialDraft={draft}
        disabled={session.approved}
      />

      <details className="border rounded p-3">
        <summary className="cursor-pointer font-semibold">Raw transcript (debugging; avoid storing PHI in real use)</summary>
        <pre className="text-xs whitespace-pre-wrap mt-2">{session.transcriptRaw}</pre>
      </details>
    </main>
  );
}
