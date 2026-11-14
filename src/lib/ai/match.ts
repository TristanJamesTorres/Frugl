import type { Hints, VisionResult } from './types';

export type CatalogModel = {
  id: string;
  brand: string;
  series: string;
  model_number: string | null;
  cpu: string | null;
  gpu: string | null;
  screen_size: number | null;
  default_ram: string | null;
  default_storage: string | null;
};

export type Candidate = { modelId: string; score: number; brand: string; series: string; modelNumber: string | null };

export const norm = (s?: string | null) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const tokens = (s?: string | null) => (s ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

export function modelLabel(m: { series: string; model_number: string | null }) {
  return m.model_number ? m.series + ' (' + m.model_number + ')' : m.series;
}

export function rankCandidates(catalog: CatalogModel[], vision: VisionResult, hints: Hints = {}): Candidate[] {
  const texts = [hints.modelNumber, vision.modelNumber, ...vision.visibleText].map(norm).filter((t) => t.length > 0);
  const brand = norm(hints.brand || vision.brand);
  const want = new Set(tokens(hints.series || vision.series));

  const scored = catalog.map((m) => {
    const num = norm(m.model_number);
    let score = 0;
    if (num.length >= 4 && texts.some((t) => t.includes(num))) {
      score = 1; // exact model number found on a label or typed by the seller
    } else {
      const have = tokens(m.series);
      const matched = have.filter((t) => want.has(t)).length;
      if (matched > 0) {
        const overlap = matched / Math.max(have.length, want.size);
        score = (brand && brand === norm(m.brand) ? 0.4 : 0) + overlap * 0.6;
      }
    }
    return { modelId: m.id, score: Math.round(score * 100) / 100, brand: m.brand, series: m.series, modelNumber: m.model_number };
  });

  return scored.filter((c) => c.score >= 0.3).sort((a, b) => b.score - a.score).slice(0, 5);
}

export function hasClearLead(candidates: Candidate[], minimumGap = 0.15): boolean {
  const [top, second] = candidates;
  return Boolean(top && top.score >= 0.6 && (!second || top.score - second.score >= minimumGap));
}

// Agreement between the photo and the catalog raises confidence; disagreement lowers it.
export function combineConfidence(vision: VisionResult, candidates: Candidate[], hints: Hints = {}): number {
  const top = candidates[0];
  if (!top) return Math.min(vision.confidence, 0.4);
  let c = vision.confidence;
  if (top.score >= 1) c = Math.max(c, 0.9);
  else c = Math.min(c, 0.45 + top.score * 0.4);
  if (hints.brand && vision.brand && norm(hints.brand) !== norm(vision.brand)) c = Math.min(c, 0.6);
  return Math.round(c * 1000) / 1000;
}
