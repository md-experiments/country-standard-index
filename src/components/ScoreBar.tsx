import type { Component } from "@/lib/types";

/**
 * Stacked contribution bar: each segment's width is the component's contribution in index points
 * (weight share × component score), so the full bar length equals the index. 2px surface gaps.
 */
export function ScoreBar({
  parts,
  components,
  max = 100,
  height = 10,
}: {
  parts: { id: string; points: number; score: number; share: number }[];
  components: Component[];
  max?: number;
  height?: number;
}) {
  const byId = Object.fromEntries(components.map((c) => [c.id, c]));
  return (
    <div className="flex w-full" style={{ height, gap: 2 }} aria-hidden>
      {components
        .map((c) => parts.find((p) => p.id === c.id))
        .filter((p): p is NonNullable<typeof p> => !!p && p.points > 0)
        .map((p) => (
          <div
            key={p.id}
            title={`${byId[p.id].name}: ${p.points.toFixed(1)} pts (score ${p.score.toFixed(0)} × weight ${(p.share * 100).toFixed(0)}%)`}
            style={{
              width: `${(p.points / max) * 100}%`,
              background: `var(--c-${p.id})`,
              borderRadius: 2,
            }}
          />
        ))}
    </div>
  );
}

export function ComponentDot({ id, size = 10 }: { id: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block rounded-full align-middle"
      style={{ width: size, height: size, background: `var(--c-${id})` }}
    />
  );
}
