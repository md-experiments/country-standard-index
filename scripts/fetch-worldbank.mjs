// Pulls every indicator in scripts/indicators.mjs from the World Bank API v2
// and writes one JSON file per indicator to data/raw/.
// Usage: node scripts/fetch-worldbank.mjs [--only ID,ID]
import fs from "node:fs/promises";
import path from "node:path";
import { INDICATORS, CONTEXT_INDICATORS, NON_WORLDBANK, YEAR_START, YEAR_END } from "./indicators.mjs";

const RAW = path.resolve("data/raw");
await fs.mkdir(RAW, { recursive: true });

const only = process.argv.includes("--only")
  ? process.argv[process.argv.indexOf("--only") + 1].split(",")
  : null;
// --meta-only: refresh the World Bank source statements in existing raw files without re-downloading data
const metaOnly = process.argv.includes("--meta-only");

async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
    }
  }
}

// Country list (excluding aggregates such as "World", "Euro area")
const cj = await getJson("https://api.worldbank.org/v2/country?format=json&per_page=400");
const countries = cj[1]
  .filter((c) => c.region.value !== "Aggregates")
  .map((c) => ({
    iso3: c.id,
    iso2: c.iso2Code,
    name: c.name.trim(),
    region: c.region.value.trim(),
    regionId: c.region.id,
    income: c.incomeLevel.value.trim(),
    incomeId: c.incomeLevel.id,
    capital: c.capitalCity,
  }));
await fs.writeFile(path.join(RAW, "countries.json"), JSON.stringify(countries, null, 1));
const valid = new Set(countries.map((c) => c.iso3));
console.log(`countries: ${countries.length}`);

const all = [...INDICATORS, ...CONTEXT_INDICATORS];
for (const ind of all) {
  if (NON_WORLDBANK.has(ind.id)) continue;
  if (only && !only.includes(ind.id)) continue;
  // Official source statement from the World Bank's indicator metadata
  const mj = await getJson(`https://api.worldbank.org/v2/indicator/${ind.id}?format=json`);
  const md = mj[1]?.[0] ?? {};
  const metadata = {
    name: md.name ?? ind.name,
    sourceOrganization: md.sourceOrganization ?? null,
    sourceNote: md.sourceNote ?? null,
    database: md.source?.value ?? null,
    metadataUrl: `https://api.worldbank.org/v2/indicator/${ind.id}?format=json`,
  };
  const url = `https://api.worldbank.org/v2/country/all/indicator/${ind.id}?format=json&date=${YEAR_START}:${YEAR_END}&per_page=20000`;
  const file = path.join(RAW, `${ind.id}.json`);
  if (metaOnly) {
    const existing = JSON.parse(await fs.readFile(file, "utf8"));
    await fs.writeFile(file, JSON.stringify({ ...existing, fetchUrl: url, metadata }));
    console.log(`${ind.id.padEnd(20)} metadata updated`);
    continue;
  }
  const j = await getJson(url);
  if (!j[1]) {
    console.error(`!! ${ind.id}: no data`, JSON.stringify(j).slice(0, 200));
    continue;
  }
  const series = {};
  let n = 0;
  for (const row of j[1]) {
    const iso = row.countryiso3code;
    if (!valid.has(iso) || row.value === null) continue;
    (series[iso] ??= {})[row.date] = row.value;
    n++;
  }
  const out = {
    id: ind.id,
    name: j[1][0]?.indicator?.value ?? ind.name,
    sourceLastUpdated: j[0].lastupdated,
    fetchedAt: new Date().toISOString().slice(0, 10),
    fetchUrl: url,
    metadata,
    series,
  };
  await fs.writeFile(path.join(RAW, `${ind.id}.json`), JSON.stringify(out));
  const years = new Set(j[1].filter((r) => r.value !== null && valid.has(r.countryiso3code)).map((r) => r.date));
  console.log(`${ind.id.padEnd(20)} ${String(n).padStart(6)} obs, ${Object.keys(series).length} countries, years ${Math.min(...years)}–${Math.max(...years)}`);
}
