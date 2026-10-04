import { explain, transformFormula, transformReason } from "@/lib/scoring.mjs";
import { fmtRaw } from "@/lib/format";
import type { Indicator } from "@/lib/types";

const f4 = (v: number) => (Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(Math.abs(v) >= 10 ? 2 : 4));

/**
 * Shows exactly how a published value is turned into the 0–100 score: native scale, transform,
 * goalposts in both units, direction flip, clipping. With `raw` it is a worked example for that value;
 * without it, the general recipe for the indicator.
 */
export function ScoreExplainer({ indicator: ind, raw, obsYear, compact = false }: { indicator: Indicator; raw?: number | null; obsYear?: number | null; compact?: boolean }) {
  const g = ind.goalposts;
  const t = ind.transform;
  const lowerBetter = ind.direction === "lower";
  const e = raw != null ? explain(ind, g, raw) : null;
  const worstT = lowerBetter ? g.highT : g.lowT;
  const bestT = lowerBetter ? g.lowT : g.highT;
  const reason = transformReason(t);

  return (
    <div className={`${compact ? "text-xs" : "text-sm"} space-y-1`}>
      <ol className="list-decimal ml-4 space-y-1">
        <li>
          <strong className="text-primary">Published value</strong>
          {e ? (
            <>
              : <span className="tnum font-medium">{fmtRaw(raw)}</span> {ind.unit}
              {obsYear ? ` (observed ${obsYear})` : ""}
            </>
          ) : null}
          . Native scale: {ind.nativeScale}.
        </li>
        <li>
          <strong className="text-primary">Transform</strong>: {transformFormula(t)}
          {reason ? ` — ${reason}` : ""}
          {e && t ? (
            <>
              . Here: <span className="tnum">{f4(e.transformed)}</span>
            </>
          ) : null}
          .
        </li>
        <li>
          <strong className="text-primary">Goalposts</strong> (fixed for all years; 2.5th and 97.5th percentiles of all observed country-years): worst = {fmtRaw(g.worst)}
          {t && t !== "clamp0" && t !== "cap100" ? ` (transformed ${f4(worstT)})` : ""} scores 0, best = {fmtRaw(g.best)}
          {t && t !== "clamp0" && t !== "cap100" ? ` (transformed ${f4(bestT)})` : ""} scores 100.
          {e ? (
            <>
              {" "}
              Position of this value between the low and high goalpost: <span className="tnum">{f4(e.position)}</span>.
            </>
          ) : null}
        </li>
        <li>
          <strong className="text-primary">Direction</strong>:{" "}
          {lowerBetter ? (
            <>
              lower is better, so the position is <em>flipped</em> (1 − position)
              {e ? (
                <>
                  : 1 − {f4(e.position)} = <span className="tnum">{f4(e.oriented)}</span>
                </>
              ) : null}
              .
            </>
          ) : (
            <>higher is better, no flip.</>
          )}
        </li>
        <li>
          <strong className="text-primary">Clip and scale</strong>: anything below the worst goalpost scores 0 and anything above the best scores 100; multiply by 100.
          {e ? (
            <>
              {" "}
              {e.clippedAt != null ? (
                <>
                  This value lies {e.clippedAt === 100 ? "beyond the best" : "beyond the worst"} goalpost, so it is clipped to {e.clippedAt}.
                </>
              ) : null}{" "}
              <strong className="text-primary">Score = {e.score.toFixed(1)}</strong>.
            </>
          ) : null}
        </li>
      </ol>
    </div>
  );
}
