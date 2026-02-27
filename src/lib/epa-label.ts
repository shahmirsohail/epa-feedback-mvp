import { getEpas } from "@/lib/epas";

const EPA_TITLE_BY_ID = new Map(getEpas().map((epa) => [epa.id, epa.title]));

export function formatEpaLabel(epaId: string | null | undefined): string {
  if (!epaId) return "Not confidently matched";
  const epaTitle = EPA_TITLE_BY_ID.get(epaId);
  return epaTitle ? `${epaId} — ${epaTitle}` : epaId;
}

