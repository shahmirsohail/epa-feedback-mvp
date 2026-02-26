import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getEpaFromDraft(draftJson: string): string {
  try {
    return JSON.parse(draftJson)?.epaId || "—";
  } catch {
    return "—";
  }
}

export default async function SessionsPage() {
  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Sessions</h1>
      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-2">Created</th>
              <th className="p-2">Resident</th>
              <th className="p-2">EPA</th>
              <th className="p-2">Entrustment</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">{new Date(s.createdAt).toLocaleString()}</td>
                <td className="p-2">
                  <a className="font-medium" href={`/sessions/${s.id}`}>{s.residentName}</a>
                  <div className="text-xs text-slate-600">Resident: {s.residentEmail}</div>
                  <div className="text-xs text-slate-600">Attending: {s.attendingEmail}</div>
                </td>
                <td className="p-2">{s.mappedEpaId ?? getEpaFromDraft(s.draftJson)}</td>
                <td className="p-2">{s.entrustment}</td>
                <td className="p-2">
                  {s.emailSent ? "Emailed" : "Draft"}
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr><td className="p-4 text-slate-600" colSpan={5}>No sessions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
