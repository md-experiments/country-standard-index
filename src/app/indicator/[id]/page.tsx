import Link from "next/link";
import { notFound } from "next/navigation";
import { IndicatorRanking } from "@/components/IndicatorRanking";
import { ComponentDot } from "@/components/ScoreBar";
import { SourceList } from "@/components/SourceList";
import { ScoreExplainer } from "@/components/ScoreExplainer";
import { getIndicatorFile, getMeta, getSummary } from "@/lib/data";

export const dynamicParams = false;
export function generateStaticParams() {
  return getMeta().indicators.map((i) => ({ id: i.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const i = getMeta().indicators.find((k) => k.id === id);
  return { title: i ? `${i.name} · Country Standard Index` : "Indicator" };
}

export default async function IndicatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meta = getMeta();
  const indicator = meta.indicators.find((i) => i.id === id);
  const file = getIndicatorFile(id);
  if (!indicator || !file) notFound();
  const component = meta.components.find((c) => c.id === indicator.component)!;
  const summary = getSummary();
  const g = indicator.goalposts;
  return (
    <div className="space-y-6">
      <div>
        <Link href={`/component/${component.id}`} className="text-xs text-muted hover:text-primary">
          ← <ComponentDot id={component.id} size={8} /> {component.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{indicator.name}</h1>
        <p className="text-sm text-secondary">{indicator.unit}</p>
        <div className="mt-2 flex gap-2">
          <span className={`badge ${indicator.kind === "proxy" ? "badge-proxy" : ""}`}>{indicator.kind === "proxy" ? "proxy measure" : "direct measure"}</span>
          <span className="badge">{indicator.sourceType === "statistical" ? "statistical agency data" : indicator.sourceType === "modelled" ? "modelled estimate" : "expert assessment"}</span>
          <span className="badge">{indicator.direction === "higher" ? "higher is better" : "lower is better"}</span>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 text-sm">
        <div className="card p-4 space-y-2">
          <div>
            <div className="text-xs text-muted">What it measures</div>
            {indicator.measures}
          </div>
          {indicator.note && (
            <div>
              <div className="text-xs text-muted">Note</div>
              {indicator.note}
            </div>
          )}
        </div>
        <div className="card p-4 space-y-2">
          <div className="text-xs text-muted">From published value to score</div>
          <ScoreExplainer indicator={indicator} />
          <div className="text-xs text-muted">
            Goalposts come from {g.pooledObservations.toLocaleString("en-US")} observed country-years since {meta.years[0]}. Coverage: {indicator.stats.countriesWithData} countries ·{" "}
            {indicator.stats.observedCountryYears.toLocaleString("en-US")} observed country-years · {indicator.stats.carriedCountryYears.toLocaleString("en-US")} carried forward (max {indicator.maxCarry} years) · last year with ≥100 countries observed:{" "}
            {indicator.stats.latestYearWithBroadCoverage}. Open any country row below to see this calculation applied to its value.
          </div>
        </div>
      </div>
      <section className="card p-4">
        <h2 className="font-medium mb-2">Where the numbers come from</h2>
        <SourceList indicator={indicator} />
        <p className="text-xs text-muted mt-2">Every country row below has a “verify” link to this series filtered to that country, so each value can be checked against the source.</p>
      </section>
      <IndicatorRanking indicator={indicator} file={file} summary={summary} />
    </div>
  );
}
