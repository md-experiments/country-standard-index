// Client-side recomputation of the index for user-chosen component weights.
// Mirrors scripts/build-index.mjs: weighted mean of available components, needs >= minComponents.
import type { Component, SummaryCountry } from "./types";

export type Weights = Record<string, number>;

export function defaultWeights(components: Component[]): Weights {
  return Object.fromEntries(components.map((c) => [c.id, c.weight]));
}

export function computeIndex(
  c: SummaryCountry,
  yi: number,
  components: Component[],
  weights: Weights,
  minComponents: number,
): number | null {
  let num = 0, den = 0, n = 0;
  for (const comp of components) {
    const v = c.components[comp.id][yi];
    const w = weights[comp.id] ?? 0;
    if (v != null) {
      n++;
      num += w * v;
      den += w;
    }
  }
  if (n < minComponents || den === 0) return null;
  return num / den;
}

/** Contribution of each component to the index, in index points (sums to the index). */
export function contributions(
  c: { components: Record<string, (number | null)[]> },
  yi: number,
  components: Component[],
  weights: Weights,
): { id: string; points: number; score: number; share: number }[] {
  const avail = components.filter((k) => c.components[k.id][yi] != null && (weights[k.id] ?? 0) > 0);
  const den = avail.reduce((a, k) => a + (weights[k.id] ?? 0), 0);
  if (!den) return [];
  return avail.map((k) => {
    const share = (weights[k.id] ?? 0) / den;
    const score = c.components[k.id][yi] as number;
    return { id: k.id, score, share, points: share * score };
  });
}
