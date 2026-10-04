// Fetches the non-World-Bank series: UNDP HDR composite time series (mean years of
// schooling, HDI) and the V-Dem freedom of expression index (via Our World in Data).
// Writes data/raw/{UNDP_MYS,UNDP_HDI,VDEM_FREEXPR}.json in the same shape as the WB files.
import fs from "node:fs/promises";
import path from "node:path";
import { YEAR_START, YEAR_END } from "./indicators.mjs";

const RAW = path.resolve("data/raw");
const countries = JSON.parse(await fs.readFile(path.join(RAW, "countries.json"), "utf8"));
const valid = new Set(countries.map((c) => c.iso3));
const today = new Date().toISOString().slice(0, 10);

function parseCsv(text) {
  // minimal RFC4180 parser (handles quoted commas)
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== "\r") field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

function write(id, name, series, meta) {
  const n = Object.values(series).reduce((a, s) => a + Object.keys(s).length, 0);
  console.log(`${id.padEnd(20)} ${String(n).padStart(6)} obs, ${Object.keys(series).length} countries`);
  return fs.writeFile(path.join(RAW, `${id}.json`), JSON.stringify({ id, name, fetchedAt: today, ...meta, series }));
}

// ---- UNDP HDR 2025 composite indices time series ----
const HDR_URL = "https://hdr.undp.org/sites/default/files/2025_HDR/HDR25_Composite_indices_complete_time_series.csv";
const hdr = parseCsv(await fetchText(HDR_URL));
const header = hdr[0];
const col = (n) => header.indexOf(n);
const mys = {}, hdi = {};
for (const r of hdr.slice(1)) {
  const iso = r[col("iso3")];
  if (!valid.has(iso)) continue;
  for (let y = YEAR_START; y <= YEAR_END; y++) {
    const m = r[col(`mys_${y}`)], h = r[col(`hdi_${y}`)];
    if (m !== undefined && m !== "") (mys[iso] ??= {})[y] = +m;
    if (h !== undefined && h !== "") (hdi[iso] ??= {})[y] = +h;
  }
}
await write("UNDP_MYS", "Mean years of schooling (years)", mys, { sourceUrl: HDR_URL, sourceLastUpdated: "HDR 2025" });
await write("UNDP_HDI", "Human Development Index (value)", hdi, { sourceUrl: HDR_URL, sourceLastUpdated: "HDR 2025" });

// ---- V-Dem freedom of expression (OWID grapher export) ----
const VDEM_URL = "https://ourworldindata.org/grapher/freedom-of-expression-index.csv?v=1&csvType=full&useColumnShortNames=true";
const vd = parseCsv(await fetchText(VDEM_URL));
const vh = vd[0];
const ci = vh.indexOf("code"), yi = vh.indexOf("year"), vi = vh.findIndex((h) => h.startsWith("freeexpr"));
const fx = {};
for (const r of vd.slice(1)) {
  const iso = r[ci], y = +r[yi], v = r[vi];
  if (!valid.has(iso) || y < YEAR_START || y > YEAR_END || v === "") continue;
  (fx[iso] ??= {})[y] = +v;
}
await write("VDEM_FREEXPR", "Freedom of expression and alternative sources of information index (V-Dem)", fx, { sourceUrl: VDEM_URL, sourceLastUpdated: "V-Dem v15 via OWID" });
