import Link from "next/link";
import { RankingTable } from "@/components/RankingTable";
import { getMeta, getSummary } from "@/lib/data";

export default function Home() {
  const summary = getSummary();
  const meta = getMeta();
  const yi = summary.years.indexOf(summary.rankingYear);
  const top = summary.countries.filter((c) => c.rank[yi] != null).sort((a, b) => (a.rank[yi] as number) - (b.rank[yi] as number)).slice(0, 3);
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Where is quality of life highest?</h1>
          <p className="mt-2 text-sm text-secondary max-w-2xl">
            One score per country per year, 0–100, built only from published statistics: {meta.indicators.length} indicators in{" "}
            {meta.components.length} components, each tracked back to {meta.years[0]}. Every number can be opened up: index → component →
            indicator → the official series it came from. Where no official number exists, the page says so instead of guessing.
          </p>
          <p className="mt-2 text-xs text-muted">
            Data built {meta.builtAt}. Ranking year {summary.rankingYear} is the latest year in which most indicators are still broadly observed;
            later values are mostly carried forward and flagged as such. <Link href="/methodology" className="underline">Methodology</Link>.
          </p>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Top of the {summary.rankingYear} ranking</div>
          <ol className="mt-2 space-y-1">
            {top.map((c) => (
              <li key={c.iso3} className="flex justify-between text-sm">
                <Link href={`/country/${c.iso3}`} className="hover:underline">
                  {c.rank[yi]}. {c.name}
                </Link>
                <span className="font-semibold tnum">{c.index[yi]?.toFixed(1)}</span>
              </li>
            ))}
          </ol>
          <div className="mt-2 text-xs text-muted">{meta.countriesRanked} countries ranked</div>
        </div>
      </section>
      <RankingTable summary={summary} meta={meta} />
    </div>
  );
}
