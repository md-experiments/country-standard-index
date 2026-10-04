import type { Indicator } from "./types";

/** Links to the closest place where this indicator's values for one country can be checked. */
export function countrySourceLinks(ind: Indicator, c: { iso3: string; iso2: string; name: string }): { label: string; url: string }[] {
  if (ind.pulledFrom.kind === "worldbank") {
    return [
      { label: `World Bank page for ${c.name}`, url: `https://data.worldbank.org/indicator/${ind.id}?locations=${c.iso2}` },
      { label: "raw API response (JSON)", url: `https://api.worldbank.org/v2/country/${c.iso3}/indicator/${ind.id}?format=json&date=2000:2025&per_page=100` },
    ];
  }
  if (ind.id.startsWith("UNDP_")) {
    return [
      { label: `UNDP country page for ${c.name}`, url: `https://hdr.undp.org/data-center/specific-country-data#/countries/${c.iso3}` },
      { label: "HDR time-series CSV (all countries)", url: ind.pulledFrom.url },
    ];
  }
  if (ind.id === "VDEM_FREEXPR") {
    return [
      { label: `Our World in Data table for ${c.name}`, url: `https://ourworldindata.org/grapher/freedom-of-expression-index?tab=table&country=~${c.iso3}` },
      { label: "V-Dem dataset download", url: "https://v-dem.net/data/the-v-dem-dataset/" },
    ];
  }
  return [{ label: "series page", url: ind.pulledFrom.page }];
}

export const ROLE_LABEL: Record<string, string> = {
  compiler: "produces the series",
  primary: "underlying data",
  republisher: "republishes unchanged",
};
