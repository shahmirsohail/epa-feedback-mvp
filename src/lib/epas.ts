import epas from "@/data/epas.json";

export type EpaCatalogItem = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
};

export function getEpas(): EpaCatalogItem[] {
  return epas as EpaCatalogItem[];
}
