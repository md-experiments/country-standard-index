// Server-side loaders for the pre-computed data in /data (built by scripts/build-index.mjs).
import fs from "node:fs";
import path from "node:path";
import type { CountryDetail, IndicatorFile, Meta, Summary } from "./types";

const DATA = path.join(process.cwd(), "data");
const read = <T,>(p: string): T => JSON.parse(fs.readFileSync(path.join(DATA, p), "utf8")) as T;

let metaCache: Meta | null = null;
let summaryCache: Summary | null = null;

export function getMeta(): Meta {
  return (metaCache ??= read<Meta>("meta.json"));
}
export function getSummary(): Summary {
  return (summaryCache ??= read<Summary>("summary.json"));
}
export function getCountry(iso3: string): CountryDetail | null {
  const p = path.join(DATA, "countries", `${iso3}.json`);
  return fs.existsSync(p) ? read<CountryDetail>(path.join("countries", `${iso3}.json`)) : null;
}
export function getIndicatorFile(id: string): IndicatorFile | null {
  const p = path.join(DATA, "indicators", `${id}.json`);
  return fs.existsSync(p) ? read<IndicatorFile>(path.join("indicators", `${id}.json`)) : null;
}
export function listCountryCodes(): string[] {
  return fs.readdirSync(path.join(DATA, "countries")).map((f) => f.replace(/\.json$/, ""));
}
