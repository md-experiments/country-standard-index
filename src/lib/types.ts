export type Direction = "higher" | "lower";
export type Kind = "official" | "proxy";
export type SourceType = "statistical" | "modelled" | "expert";

export interface Component {
  id: string;
  name: string;
  short: string;
  color: string;
  colorDark: string;
  description: string;
  weight: number;
  indicators: string[];
}

export interface Goalposts {
  lowT: number;
  highT: number;
  low: number;
  high: number;
  worst: number;
  best: number;
  pooledObservations: number;
}

export interface IndicatorStats {
  countriesWithData: number;
  observedCountryYears: number;
  carriedCountryYears: number;
  latestYearWithBroadCoverage: number;
  observedByYear: Record<string, number>;
  sourceLastUpdated: string | null;
  fetchedAt: string | null;
}

export interface Indicator {
  id: string;
  component: string;
  name: string;
  unit: string;
  direction: Direction;
  transform: string | null;
  maxCarry: number;
  kind: Kind;
  sourceType: SourceType;
  source: string;
  sourceUrl: string;
  measures: string;
  note?: string;
  goalposts: Goalposts;
  stats: IndicatorStats;
}

export interface Meta {
  builtAt: string;
  years: number[];
  rankingYear: number;
  countriesRanked: number;
  minComponents: number;
  minCoverage: number;
  components: Component[];
  indicators: Indicator[];
  context: { id: string; name: string; source: string }[];
}

export type Series = (number | null)[];

export interface SummaryCountry {
  iso3: string;
  iso2: string;
  name: string;
  region: string;
  income: string;
  population: number | null;
  index: Series;
  components: Record<string, Series>;
  coverage: number[];
  carriedShare: Series;
  rank: Series;
}

export interface Summary {
  years: number[];
  rankingYear: number;
  worldMedian: { index: Series; components: Record<string, Series> };
  countries: SummaryCountry[];
}

export interface IndicatorSeries {
  score: Series;
  raw: Series;
  obsYear: Series;
  observations: [number, number][];
}

export interface CountryDetail {
  iso3: string;
  iso2: string;
  name: string;
  region: string;
  regionId: string;
  income: string;
  incomeId: string;
  capital: string;
  population: number | null;
  hdi: Series;
  hdiRank: Series;
  index: Series;
  rank: Series;
  coverage: number[];
  components: Record<string, { score: Series; indicatorsAvailable: number[] }>;
  indicators: Record<string, IndicatorSeries>;
}

export interface IndicatorFile {
  id: string;
  years: number[];
  countries: Record<string, { score: Series; raw: Series; obsYear: Series }>;
}
