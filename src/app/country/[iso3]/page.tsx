import Link from "next/link";
import { notFound } from "next/navigation";
import { CountryDrilldown } from "@/components/CountryDrilldown";
import { getCountry, getMeta, getSummary, listCountryCodes } from "@/lib/data";
import { fmt1, fmtPop } from "@/lib/format";

export const dynamicParams = false;
export function generateStaticParams() {
  return listCountryCodes().map((iso3) => ({ iso3 }));
}
export async function generateMetadata({ params }: { params: Promise<{ iso3: string }> }) {
  const { iso3 } = await params;
  const c = getCountry(iso3);
  return { title: c ? `${c.name} · Country Standard Index` : "Country" };
}

export default async function CountryPage({ params }: { params: Promise<{ iso3: string }> }) {
  const { iso3 } = await params;
  const country = getCountry(iso3);
  if (!country) notFound();
  const meta = getMeta();
  const summary = getSummary();
  const yi = meta.years.indexOf(meta.rankingYear);
  const hdiYears = meta.years.filter((_, i) => country.hdi[i] != null);
  const hdiLatestYi = hdiYears.length ? meta.years.indexOf(hdiYears[hdiYears.length - 1]) : -1;
  const hdiRank = hdiLatestYi >= 0 ? country.hdiRank[hdiLatestYi] : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-xs text-muted hover:text-primary">
          ← Ranking
        </Link>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{country.name}</h1>
          <span className="text-sm text-secondary">
            {country.region} · {country.income} · pop. {fmtPop(country.population)}
          </span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label={`Index, ${meta.rankingYear}`} value={fmt1(country.index[yi])} sub="out of 100" />
        <Stat label="Rank" value={country.rank[yi] != null ? `${country.rank[yi]}` : "–"} sub={country.rank[yi] != null ? `of ${meta.countriesRanked} ranked` : `not ranked (coverage ${country.coverage[yi]}%)`} />
        <Stat label="Indicator coverage" value={`${country.coverage[yi]}%`} sub={`${Math.round((country.coverage[yi] / 100) * meta.indicators.length)} of ${meta.indicators.length} indicators`} />
        <Stat label="UNDP HDI (cross-check)" value={hdiLatestYi >= 0 ? (country.hdi[hdiLatestYi] as number).toFixed(3) : "–"} sub={hdiLatestYi >= 0 ? `${meta.years[hdiLatestYi]} value${hdiRank ? `, HDI rank ${hdiRank}` : ""} (HDR 2025)` : "not covered by UNDP"} />
      </div>
      <CountryDrilldown country={country} meta={meta} worldMedian={summary.worldMedian} />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
