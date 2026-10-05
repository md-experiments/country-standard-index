// Sanity check: recompute every stored score from the raw value and the published goalposts using
// the shared scoring module, and confirm it matches what the app shows. Also prints, per indicator,
// the native scale, transform, direction, goalposts in both units, and how many values were clipped.
// Usage: node scripts/verify-scores.mjs
import fs from "node:fs";
import path from "node:path";
import { explain, transformFormula } from "../src/lib/scoring.mjs";

const DATA = path.resolve("data");
const meta = JSON.parse(fs.readFileSync(path.join(DATA, "meta.json"), "utf8"));
const files = fs.readdirSync(path.join(DATA, "countries"));

let checked = 0, mismatches = 0;
const stats = Object.fromEntries(meta.indicators.map((i) => [i.id, { n: 0, clip0: 0, clip100: 0, minRaw: Infinity, maxRaw: -Infinity, dirOk: true }]));
const examples = [];
for (const f of files) {
  const c = JSON.parse(fs.readFileSync(path.join(DATA, "countries", f), "utf8"));
  for (const ind of meta.indicators) {
    const s = c.indicators[ind.id];
    const st = stats[ind.id];
    let prev = null;
    for (let yi = 0; yi < meta.years.length; yi++) {
      const raw = s.raw[yi], stored = s.score[yi];
      if (raw == null) { if (stored != null) { mismatches++; console.log(`!! ${c.iso3} ${ind.id} ${meta.years[yi]}: score without raw`); } continue; }
      const e = explain(ind, ind.goalposts, raw);
      checked++;
      st.n++;
      st.minRaw = Math.min(st.minRaw, raw); st.maxRaw = Math.max(st.maxRaw, raw);
      if (e.clippedAt === 0) st.clip0++;
      if (e.clippedAt === 100) st.clip100++;
      if (e == null || Math.abs(e.score - stored) > 0.1) { // raw is stored to 5 s.f. and score to 0.1
        mismatches++;
        if (mismatches < 20) console.log(`!! ${c.iso3} ${ind.id} ${meta.years[yi]}: raw ${raw} → recomputed ${e?.score?.toFixed(2)} but stored ${stored}`);
      }
      // direction sanity: a strictly better raw value must never get a lower score
      if (prev && prev.raw !== raw) {
        const betterRaw = ind.direction === "higher" ? raw > prev.raw : raw < prev.raw;
        if (betterRaw && e.score < prev.score - 1e-9) st.dirOk = false;
        if (!betterRaw && e.score > prev.score + 1e-9) st.dirOk = false;
      }
      prev = { raw, score: e.score };
      if (c.iso3 === "NOR" && yi === meta.years.indexOf(meta.rankingYear)) examples.push({ ind, e, raw });
    }
  }
}

console.log(`\nChecked ${checked} country-year values across ${meta.indicators.length} indicators: ${mismatches} mismatches.`);
console.log(mismatches ? "FAILED" : "OK — every stored score equals score(raw) with the published transform, goalposts, direction and clipping.\n");

console.log("Per-indicator scoring summary");
console.log("indicator            dir    transform           goalposts raw (0→100)            goalposts transformed    observed raw range        clipped@0 clipped@100 monotone");
for (const ind of meta.indicators) {
  const g = ind.goalposts, st = stats[ind.id];
  const f = (v) => (Math.abs(v) >= 1000 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(3));
  console.log(
    ind.id.padEnd(20), ind.direction.padEnd(6), transformFormula(ind.transform).padEnd(19),
    `${f(g.worst)} → ${f(g.best)}`.padEnd(32),
    `${f(ind.direction === "higher" ? g.lowT : g.highT)} → ${f(ind.direction === "higher" ? g.highT : g.lowT)}`.padEnd(24),
    `${f(st.minRaw)} … ${f(st.maxRaw)}`.padEnd(25),
    String(st.clip0).padStart(9), String(st.clip100).padStart(11), st.dirOk ? "  yes" : "  NO!",
  );
}

console.log(`\nWorked examples, Norway ${meta.rankingYear}:`);
for (const { ind, e, raw } of examples) {
  const g = ind.goalposts;
  const steps = [
    `${raw} ${ind.unit} (native scale: ${ind.nativeScale})`,
    ind.transform ? `${transformFormula(ind.transform)} = ${e.transformed.toFixed(4)}` : null,
    `position between goalposts (${g.lowT.toFixed(3)} … ${g.highT.toFixed(3)}) = ${e.position.toFixed(4)}`,
    e.flipped ? `lower is better, flip: 1 − ${e.position.toFixed(4)} = ${e.oriented.toFixed(4)}` : null,
    e.clippedAt != null ? `outside 0–1, clipped to ${e.clippedAt / 100}` : null,
    `× 100 = ${e.score.toFixed(1)}`,
  ].filter(Boolean);
  console.log(`  ${ind.name}: ${steps.join("  →  ")}`);
}
const dirFail = meta.indicators.filter((i) => !stats[i.id].dirOk).map((i) => i.id);
if (dirFail.length) console.log(`\n!! direction not monotone for: ${dirFail.join(", ")}`);
process.exit(mismatches || dirFail.length ? 1 : 0);
