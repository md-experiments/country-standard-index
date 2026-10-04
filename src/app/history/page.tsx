import Link from "next/link";
import { MultiCountryHistory } from "@/components/MultiCountryHistory";
import { getMeta, getSummary } from "@/lib/data";
import { fmt1, fmtDelta } from "@/lib/format";
import type { SummaryCountry } from "@/lib/types";

export const metadata = { title: "History · Country Standard Index" };

type Mover = { c: SummaryCountry; delta: number };

function Movers({ list, title, baseYear, year, bi, yi }: { list: Mover[]; title: string; baseYear: number; year: number; bi: number; yi: number }) {
  return (
    <div className="card p-4">
      <h3 className="font-medium mb-2">{title}</h3>
      <table className="data tnum">
        <thead>
          <tr>
            <th>Country</th>
            <th>{baseYear}</th>
            <th>{year}</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {list.map(({ c, delta }) => (
            <tr key={c.iso3}>
              <td>
                <Link href={`/country/${c.iso3}`} className="font-medium hover:underline">
                  {c.name}
                </Link>
              </td>
              <td className="text-secondary">{fmt1(c.index[bi])}</td>
              <td className="text-secondary">{fmt1(c.index[yi])}</td>
              <td className={delta > 0 ? "text-good" : "text-bad"}>{fmtDelta(delta)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function HistoryPage() {
  const summary = getSummary();
  const meta = getMeta();
  const years = summary.years;
  const yi = years.indexOf(summary.rankingYear);
  const baseYear = Math.max(years[0], summary.rankingYear - 14);
  const bi = years.indexOf(baseYear);
  const ranked = summary.countries.filter((c) => c.rank[yi] != null);
  const top = [...ranked].sort((a, b) => (a.rank[yi] as number) - (b.rank[yi] as number)).slice(0, 5).map((c) => c.iso3);
  const movers = ranked
    .filter((c) => c.index[bi] != null && c.coverage[bi] >= meta.minCoverage * 100)
    .map((c) => ({ c, delta: (c.index[yi] as number) - (c.index[bi] as number) }))
    .sort((a, b) => b.delta - a.delta);
  const data = Object.fromEntries(summary.countries.map((c) => [c.iso3, c.index]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">How the index has moved</h1>
        <p className="text-sm text-secondary max-w-2xl mt-1">
          Because goalposts are fixed across years, a line going up means the country&apos;s own official numbers improved. The median of all ranked
          countries is shown for reference. Add any country to compare.
        </p>
      </div>
      <section className="card p-4">
        <MultiCountryHistory
          years={years}
          options={summary.countries.map((c) => ({ iso3: c.iso3, name: c.name }))}
          data={data}
          defaultSelected={top}
          reference={{ name: "World median", values: summary.worldMedian.index }}
          caption="Country Standard Index, 0–100"
        />
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <Movers list={movers.slice(0, 12)} title={`Largest gains, ${baseYear}–${summary.rankingYear}`} baseYear={baseYear} year={summary.rankingYear} bi={bi} yi={yi} />
        <Movers list={[...movers].reverse().slice(0, 12)} title={`Largest declines, ${baseYear}–${summary.rankingYear}`} baseYear={baseYear} year={summary.rankingYear} bi={bi} yi={yi} />
      </section>
      <p className="text-xs text-muted">Only countries with at least {Math.round(meta.minCoverage * 100)}% indicator coverage in both years are included in the movers tables.</p>
    </div>
  );
}
