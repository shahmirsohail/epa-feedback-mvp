import { prisma } from "./prisma";
import { z } from "zod";

export const EntrustmentSchema = z.enum([
  "Intervention",
  "Direction",
  "Support",
  "Autonomy",
  "Excellence"
]);

export type Entrustment = z.infer<typeof EntrustmentSchema>;

export type EpaMatch = {
  epaId: string | null;
  confidence: number;
  top3: Array<{ epaId: string; score: number }>;
};

function normalize(s: string) {
  return s.toLowerCase();
}

function scoreKeywords(text: string, keywords: string[]) {
  const t = normalize(text);
  let score = 0;
  for (const k of keywords) {
    const kk = normalize(k);
    if (!kk.trim()) continue;
    // simple contains scoring; boosts multi-word matches
    if (t.includes(kk)) score += kk.includes(" ") ? 2 : 1;
  }
  return score;
}

export async function matchEPA(text: string): Promise<EpaMatch> {
  const epas = await prisma.ePA.findMany();
  const scored = epas.map((e) => {
    const keywords: string[] = JSON.parse(e.keywords || "[]");
    const s = scoreKeywords(text, keywords) + scoreKeywords(text, [e.title, e.description]);
    return { epaId: e.id, score: s };
  }).sort((a,b) => b.score - a.score);

  const top3 = scored.slice(0,3);
  const best = top3[0];
  if (!best || best.score <= 0) return { epaId: null, confidence: 0.2, top3 };

  // confidence heuristic: relative separation
  const second = top3[1]?.score ?? 0;
  const conf = Math.max(0.3, Math.min(0.95, (best.score - second + 1) / (best.score + 2)));
  return { epaId: best.epaId, confidence: conf, top3 };
}

export function inferEntrustment(text: string): { level: Entrustment; confidence: number; signals: string[] } {
  const t = normalize(text);
  const signals: string[] = [];
  let score = 0; // higher => more autonomous

  const down = [
    ["i had to step in", -3],
    ["i had to take over", -3],
    ["needs constant", -2],
    ["unsafe", -4],
    ["not ready", -3],
    ["required prompting", -2],
    ["missed", -1],
    ["didn't recognize", -2],
    ["needs direct supervision", -3],
    ["i corrected", -2]
  ] as const;

  const up = [
    ["independently", 3],
    ["excellent", 4],
    ["great job", 2],
    ["strong", 2],
    ["appropriate plan", 2],
    ["good judgement", 3],
    ["safe", 2],
    ["well done", 2],
    ["handled", 2],
    ["autonomous", 4],
    ["minimal prompting", 2]
  ] as const;

  for (const [phrase, delta] of down) {
    if (t.includes(phrase)) { score += delta; signals.push(`- ${phrase}`); }
  }
  for (const [phrase, delta] of up) {
    if (t.includes(phrase)) { score += delta; signals.push(`+ ${phrase}`); }
  }

  // Map score to 5-point entrustment scale
  let level: Entrustment = "Support";
  if (score <= -4) level = "Intervention";
  else if (score <= -1) level = "Direction";
  else if (score <= 2) level = "Support";
  else if (score <= 5) level = "Autonomy";
  else level = "Excellence";

  const confidence = Math.max(0.35, Math.min(0.9, 0.55 + score * 0.05));
  return { level, confidence, signals: signals.slice(0, 8) };
}
