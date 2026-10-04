// The one place where a raw value becomes a 0–100 score. Used by the build pipeline
// (scripts/build-index.mjs), by the UI (ScoreExplainer) and by scripts/verify-scores.mjs.

/** @param {string|null} t @param {number} v */
export function transform(t, v) {
  switch (t) {
    case "log": return v > 0 ? Math.log(v) : null;
    case "log1p": return v >= 0 ? Math.log1p(v) : null;
    case "clamp0": return Math.max(0, v);
    case "cap100": return Math.min(100, v);
    default: return v;
  }
}

/** @param {string|null} t @param {number} v */
export function untransform(t, v) {
  switch (t) {
    case "log": return Math.exp(v);
    case "log1p": return Math.expm1(v);
    default: return v;
  }
}

/** Human-readable formula for the transform step. */
export function transformFormula(t) {
  switch (t) {
    case "log": return "ln(value)";
    case "log1p": return "ln(1 + value)";
    case "clamp0": return "max(0, value)";
    case "cap100": return "min(100, value)";
    default: return "value (no transform)";
  }
}

/** Why the transform is applied. */
export function transformReason(t) {
  switch (t) {
    case "log": return "so that equal ratios count equally: going from 1,000 to 2,000 scores the same as 20,000 to 40,000";
    case "log1p": return "log scale that also accepts zero";
    case "clamp0": return "negative values are set to zero and not rewarded";
    case "cap100": return "values above 100 are treated as 100";
    default: return null;
  }
}

/**
 * Full scoring breakdown for one raw value.
 * @param {{direction:"higher"|"lower", transform:string|null}} ind
 * @param {{lowT:number, highT:number}} gp goalposts in transformed units (2.5th / 97.5th percentile)
 * @param {number} raw
 */
export function explain(ind, gp, raw) {
  const t = transform(ind.transform, raw);
  if (t == null || !Number.isFinite(t)) return null;
  const position = (t - gp.lowT) / (gp.highT - gp.lowT); // 0 at low goalpost, 1 at high goalpost
  const oriented = ind.direction === "lower" ? 1 - position : position;
  const clipped = Math.min(1, Math.max(0, oriented));
  return {
    raw,
    transformed: t,
    position,
    flipped: ind.direction === "lower",
    oriented,
    clippedAt: oriented < 0 ? 0 : oriented > 1 ? 100 : null,
    score: clipped * 100,
  };
}

/** @param {{direction:"higher"|"lower", transform:string|null}} ind @param {{lowT:number, highT:number}} gp @param {number} raw */
export function score(ind, gp, raw) {
  return explain(ind, gp, raw)?.score ?? null;
}
