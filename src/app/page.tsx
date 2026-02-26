export default function Page() {
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">What this prototype does</h1>
      <ul className="list-disc pl-5 space-y-2">
        <li>Create a feedback session by pasting a transcript (audio upload is optional in this MVP).</li>
        <li>Automatically de-identifies common PHI patterns (best-effort).</li>
        <li>Maps the session to a closed set of EPAs (FOD/COD) and proposes an entrustment level.</li>
        <li>Generates a draft feedback form for attending review.</li>
        <li>After approval, emails the pre-filled EPA to the attending.</li>
      </ul>
      <div className="p-4 rounded border bg-slate-50">
        <div className="font-semibold">Start here</div>
        <div className="mt-1">
          Go to <a href="/upload">New session</a> to create your first draft.
        </div>
      </div>
    </main>
  );
}
