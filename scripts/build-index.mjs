// Computes the Country Standard Index from data/raw/*.json and writes:
//   data/summary.json            index + component scores per country per year (small; drives ranking & history)
//   data/countries/{ISO3}.json   full indicator detail per country (drives country drill-down)
//   data/indicators/{ID}.json    one indicator across all countries (drives indicator drill-down)
//   data/meta.json               catalogue, goalposts, coverage statistics, build info
//
// Method (see README / Methodology page):
//   1. Carry forward the last observation up to `maxCarry` years; flag it.
//   2. Transform (log / log1p / clamp / cap) where the catalogue says so.
//   3. Goalposts = 2.5th and 97.5th percentile of all OBSERVED country-years 2000–latest (pooled),
//      fixed across years so a country's score changes only when its own numbers change.
//   4. Score = 100 × (value − worst goalpost) / (best − worst), clipped to 0–100.
//   5. Component = simple mean of its available indicator scores; index = weighted mean of
//      available components (needs ≥ 5 of 7). Coverage is reported everywhere.
import fs from "node:fs/promises";
import path from "node:path";
import { COMPONENTS, INDICATORS, CONTEXT_INDICATORS, YEAR_START } from "./indicators.mjs";

const RAW = path.resolve("data/raw");
const OUT = path.resolve("data");
const YEAR_LAST = 2024; // 2025 is still mostly unreported at build time
const YEARS = Array.from({ length: YEAR_LAST - YEAR_START + 1 }, (_, i) => YEAR_START + i);
const MIN_COMPONENTS = 5;
const MIN_COVERAGE = 0.7; // share of indicators available for a country to be ranked

const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
const sig = (x) => (x == null ? null : +x.toPrecision(5));

const countries = JSON.parse(await fs.readFile(path.join(RAW, "countries.json"), "utf8"));
const raw = {};
for (const ind of [...INDICATORS, ...CONTEXT_INDICATORS]) {
  raw[ind.id] = JSON.parse(await fs.readFile(path.join(RAW, `${ind.id}.json`), "utf8"));
}

const transform = (t, v) => {
  switch (t) {
    case "log": return v > 0 ? Math.log(v) : null;
    case "log1p": return v >= 0 ? Math.log1p(v) : null;
    case "clamp0": return Math.max(0, v);
    case "cap100": return Math.min(100, v);
    default: return v;
  }
};
const untransform = (t, v) => {
  switch (t) {
    case "log": return Math.exp(v);
    case "log1p": return Math.expm1(v);
    default: return v;
  }
};
const percentile = (sorted, p) => {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};

// ---- 1-4: per-indicator scores ----
// filled[ind][iso] = YEARS.map(y => ({raw, obsYear, score}) | null)
const filled = {};
const goalposts = {};
const indStats = {};
for (const ind of INDICATORS) {
  const series = raw[ind.id].series;
  const pooled = [];
  for (const iso in series) for (const y in series[iso]) {
    if (+y >= YEAR_START && +y <= YEAR_LAST) {
      const t = transform(ind.transform, series[iso][y]);
      if (t != null && Number.isFinite(t)) pooled.push(t);
    }
  }
  pooled.sort((a, b) => a - b);
  const lo = percentile(pooled, 0.025), hi = percentile(pooled, 0.975);
  goalposts[ind.id] = {
    lowT: lo, highT: hi,
    low: untransform(ind.transform, lo), high: untransform(ind.transform, hi),
    worst: ind.direction === "higher" ? untransform(ind.transform, lo) : untransform(ind.transform, hi),
    best: ind.direction === "higher" ? untransform(ind.transform, hi) : untransform(ind.transform, lo),
    pooledObservations: pooled.length,
  };
  filled[ind.id] = {};
  let observed = 0, carried = 0;
  const obsCountByYear = Object.fromEntries(YEARS.map((y) => [y, 0]));
  for (const c of countries) {
    const s = series[c.iso3] ?? {};
    let last = null;
    const arr = YEARS.map((y) => {
      if (s[y] != null) { last = { v: s[y], y }; observed++; obsCountByYear[y]++; }
      else if (last && y - last.y > ind.maxCarry) last = null;
      if (!last) return null;
      const t = transform(ind.transform, last.v);
      if (t == null || !Number.isFinite(t)) return null;
      let sc = (t - lo) / (hi - lo);
      if (ind.direction === "lower") sc = 1 - sc;
      sc = Math.min(1, Math.max(0, sc)) * 100;
      if (last.y !== y) carried++;
      return { raw: last.v, obsYear: last.y, score: sc };
    });
    if (arr.some(Boolean)) filled[ind.id][c.iso3] = arr;
  }
  indStats[ind.id] = {
    countriesWithData: Object.keys(filled[ind.id]).length,
    observedCountryYears: observed,
    carriedCountryYears: carried,
    latestYearWithBroadCoverage: Math.max(...YEARS.filter((y) => obsCountByYear[y] >= 100), YEAR_START),
    observedByYear: obsCountByYear,
    sourceLastUpdated: raw[ind.id].sourceLastUpdated ?? null,
    fetchedAt: raw[ind.id].fetchedAt ?? null,
  };
}

// ---- 5: components and index ----
const compInds = Object.fromEntries(COMPONENTS.map((c) => [c.id, INDICATORS.filter((i) => i.component === c.id).map((i) => i.id)]));

const summaryCountries = [];
const detail = {};
for (const c of countries) {
  const comps = {}; // id -> number[] by year
  const compCov = {};
  for (const comp of COMPONENTS) {
    comps[comp.id] = YEARS.map((_, yi) => {
      const vals = compInds[comp.id].map((id) => filled[id][c.iso3]?.[yi]?.score).filter((v) => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    });
    compCov[comp.id] = YEARS.map((_, yi) => compInds[comp.id].filter((id) => filled[id][c.iso3]?.[yi]).length);
  }
  const index = YEARS.map((_, yi) => {
    let num = 0, den = 0, n = 0;
    for (const comp of COMPONENTS) {
      const v = comps[comp.id][yi];
      if (v != null) { num += comp.weight * v; den += comp.weight; n++; }
    }
    return n >= MIN_COMPONENTS ? num / den : null;
  });
  const coverage = YEARS.map((_, yi) => INDICATORS.filter((i) => filled[i.id][c.iso3]?.[yi]).length / INDICATORS.length);
  const carriedShare = YEARS.map((y, yi) => {
    const avail = INDICATORS.filter((i) => filled[i.id][c.iso3]?.[yi]);
    return avail.length ? avail.filter((i) => filled[i.id][c.iso3][yi].obsYear !== y).length / avail.length : null;
  });
  const pop = raw["SP.POP.TOTL"].series[c.iso3] ?? {};
  const popLatest = Object.keys(pop).length ? pop[Math.max(...Object.keys(pop).map(Number))] : null;
  const hdi = raw["UNDP_HDI"].series[c.iso3] ?? {};

  summaryCountries.push({
    iso3: c.iso3, iso2: c.iso2, name: c.name, region: c.region, income: c.income,
    population: popLatest,
    index: index.map(r1),
    components: Object.fromEntries(COMPONENTS.map((k) => [k.id, comps[k.id].map(r1)])),
    coverage: coverage.map((v) => Math.round(v * 100)),
    carriedShare: carriedShare.map((v) => (v == null ? null : Math.round(v * 100))),
  });

  detail[c.iso3] = {
    ...c, population: popLatest,
    hdi: YEARS.map((y) => (hdi[y] != null ? r3(hdi[y]) : null)),
    index: index.map(r1),
    coverage: coverage.map((v) => Math.round(v * 100)),
    components: Object.fromEntries(COMPONENTS.map((k) => [k.id, { score: comps[k.id].map(r1), indicatorsAvailable: compCov[k.id] }])),
    indicators: Object.fromEntries(INDICATORS.map((i) => {
      const arr = filled[i.id][c.iso3];
      const rawSeries = raw[i.id].series[c.iso3] ?? {};
      return [i.id, {
        score: YEARS.map((_, yi) => r1(arr?.[yi]?.score)),
        raw: YEARS.map((_, yi) => sig(arr?.[yi]?.raw)),
        obsYear: YEARS.map((_, yi) => arr?.[yi]?.obsYear ?? null),
        // every observation we have for this country, including years outside the scored window
        observations: Object.entries(rawSeries).map(([y, v]) => [+y, sig(v)]).sort((a, b) => a[0] - b[0]),
      }];
    })),
  };
}

// ---- ranks per year (among countries with an index) ----
const ranks = {}; // iso3 -> number[]|null
for (const yi of YEARS.keys()) {
  const list = summaryCountries.filter((c) => c.index[yi] != null && c.coverage[yi] >= MIN_COVERAGE * 100).sort((a, b) => b.index[yi] - a.index[yi]);
  list.forEach((c, i) => { (ranks[c.iso3] ??= YEARS.map(() => null))[yi] = i + 1; });
}
for (const c of summaryCountries) c.rank = ranks[c.iso3] ?? YEARS.map(() => null);
// HDI rank per year (UNDP cross-check), among countries with an HDI value
const hdiRanks = {};
for (const yi of YEARS.keys()) {
  const list = Object.values(detail).filter((d) => d.hdi[yi] != null).sort((a, b) => b.hdi[yi] - a.hdi[yi]);
  list.forEach((d, i) => { (hdiRanks[d.iso3] ??= YEARS.map(() => null))[yi] = i + 1; });
}
for (const iso in detail) detail[iso].hdiRank = hdiRanks[iso] ?? YEARS.map(() => null);
for (const iso in detail) detail[iso].rank = ranks[iso] ?? YEARS.map(() => null);

// ---- pick the ranking year: latest year where most indicators are still broadly OBSERVED ----
const broad = YEARS.filter((y) => INDICATORS.filter((i) => indStats[i.id].observedByYear[y] >= 100).length >= INDICATORS.length * 0.6);
const rankingYear = Math.max(...broad);
const countriesRanked = summaryCountries.filter((c) => c.rank[YEARS.indexOf(rankingYear)] != null).length;

const meta = {
  builtAt: new Date().toISOString().slice(0, 10),
  years: YEARS,
  rankingYear,
  countriesRanked,
  minComponents: MIN_COMPONENTS,
  minCoverage: MIN_COVERAGE,
  components: COMPONENTS.map((c) => ({ ...c, indicators: compInds[c.id] })),
  indicators: INDICATORS.map((i) => ({ ...i, goalposts: goalposts[i.id], stats: indStats[i.id] })),
  context: CONTEXT_INDICATORS,
};

// ---- world median reference series (among ranked countries) ----
const median = (xs) => { const a = xs.filter((v) => v != null).sort((x, y) => x - y); if (!a.length) return null; const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const worldMedian = {
  index: YEARS.map((_, yi) => r1(median(summaryCountries.filter((c) => c.rank[yi] != null).map((c) => c.index[yi])))),
  components: Object.fromEntries(COMPONENTS.map((k) => [k.id, YEARS.map((_, yi) => r1(median(summaryCountries.filter((c) => c.rank[yi] != null).map((c) => c.components[k.id][yi]))))])),
};

await fs.mkdir(path.join(OUT, "countries"), { recursive: true });
await fs.mkdir(path.join(OUT, "indicators"), { recursive: true });
await fs.writeFile(path.join(OUT, "summary.json"), JSON.stringify({ years: YEARS, rankingYear, worldMedian, countries: summaryCountries }));
await fs.writeFile(path.join(OUT, "meta.json"), JSON.stringify(meta, null, 1));
for (const iso in detail) await fs.writeFile(path.join(OUT, "countries", `${iso}.json`), JSON.stringify(detail[iso]));
for (const ind of INDICATORS) {
  const per = {};
  for (const c of countries) {
    const arr = filled[ind.id][c.iso3];
    if (!arr) continue;
    per[c.iso3] = { score: arr.map((v) => r1(v?.score)), raw: arr.map((v) => sig(v?.raw)), obsYear: arr.map((v) => v?.obsYear ?? null) };
  }
  await fs.writeFile(path.join(OUT, "indicators", `${ind.id}.json`), JSON.stringify({ id: ind.id, years: YEARS, countries: per }));
}

// ---- console report ----
console.log(`Ranking year ${rankingYear}: ${countriesRanked} countries ranked`);
const yi = YEARS.indexOf(rankingYear);
console.log("Top 20:");
summaryCountries.filter((c) => c.rank[yi] != null).sort((a, b) => a.rank[yi] - b.rank[yi]).slice(0, 20)
  .forEach((c, i) => console.log(`${String(i + 1).padStart(3)}. ${c.name.padEnd(28)} ${c.index[yi].toFixed(1)}  cov ${c.coverage[yi]}%  carried ${c.carriedShare[yi]}%  ` + COMPONENTS.map((k) => `${k.short} ${c.components[k.id][yi]?.toFixed(0) ?? "–"}`).join(" ")));
console.log("\nGoalposts (worst → best in raw units):");
for (const i of INDICATORS) console.log(`${i.id.padEnd(20)} ${goalposts[i.id].worst.toPrecision(4)} → ${goalposts[i.id].best.toPrecision(4)}   ${i.unit}   [countries ${indStats[i.id].countriesWithData}, carried ${indStats[i.id].carriedCountryYears}/${indStats[i.id].carriedCountryYears + indStats[i.id].observedCountryYears}, latest broad year ${indStats[i.id].latestYearWithBroadCoverage}]`);
