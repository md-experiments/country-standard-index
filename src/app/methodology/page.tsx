import Link from "next/link";
import { ComponentDot } from "@/components/ScoreBar";
import { getMeta } from "@/lib/data";
import { fmtRaw } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/links";

export const metadata = { title: "Methodology · Country Standard Index" };

const PROPOSALS: { gap: string; status: string; proposal: string }[] = [
  {
    gap: "Housing affordability (rent or house price relative to income)",
    status: "No official series covers all countries. OECD publishes price-to-income and rent-to-income ratios for ~45 economies; Eurostat publishes the housing-cost-overburden rate for the EU. Crowd-sourced sites are not official and are excluded.",
    proposal:
      "Use the ICP household-consumption price level (included) as the general cost-of-living signal. Proxy for housing specifically: OECD price-to-income where published; elsewhere, the ratio of GNI per capita to the price level index, with a flag that it is a proxy. Add OECD/Eurostat series as optional indicators that score only where they exist.",
  },
  {
    gap: "Share of adults with a university degree (where UNESCO attainment data are missing or stale)",
    status: "SE.TER.CUAT.BA.ZS is observed only in census or survey years; many countries have no observation in the last 8 years.",
    proposal:
      "Proxy from the education component itself: countries that score high on tertiary gross enrolment and mean years of schooling will, after a lag, have a high share of graduates. Concretely, use tertiary enrolment lagged five years (the typical time from enrolment to degree) as a stand-in, or UNDP mean years of schooling of 13+ as a threshold for degree-level attainment, and label the value as a proxy.",
  },
  {
    gap: "Healthcare waiting times and ease of getting an appointment",
    status: "Only the OECD publishes waiting-time statistics, for a subset of members and procedures.",
    proposal: "Physicians per 1,000 and the UHC service coverage index (both included) stand in. Where OECD waiting-time data exist they could be added as an optional indicator with the same fixed-goalpost scoring.",
  },
  {
    gap: "Job vacancies / ease of finding a job",
    status: "Vacancy rates are published by Eurostat, the US BLS and a few others; there is no global series.",
    proposal: "The unemployment, youth unemployment and employment-to-population ratios (ILO modelled, all countries) are the available official measures; vulnerable employment stands in for job quality.",
  },
  {
    gap: "Freedom of expression in the ~40 small states not covered by V-Dem",
    status: "V-Dem covers 173 of the 217 World Bank economies. The WGI Voice & Accountability estimate covers 206.",
    proposal: "The freedom component falls back to the WGI estimate alone for those countries, and the coverage figure on the country page shows that one indicator is missing.",
  },
  {
    gap: "Crime other than homicide (assault, theft, perceived safety)",
    status: "Reported-crime statistics are not comparable across countries because of differences in reporting and legal definitions; victimisation surveys exist for a few dozen countries.",
    proposal: "Intentional homicide (UNODC) is the only comparable crime series and is used; the WGI political stability estimate adds the political-violence dimension. The Gallup World Poll 'feel safe walking alone at night' question would be the natural addition but is not open data.",
  },
  {
    gap: "Values for the most recent year",
    status: "Most series are published with a one to two year lag; governance and labour series are the quickest.",
    proposal: "The last observation is carried forward for a limited number of years (set per indicator) and every carried value is flagged, with the share of carried values shown next to each score.",
  },
];

export default function MethodologyPage() {
  const meta = getMeta();
  const byComp = Object.fromEntries(meta.components.map((c) => [c.id, c]));
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Methodology</h1>
        <p className="text-sm text-secondary mt-1">Everything on this site is reproducible from the scripts in the repository. Data built {meta.builtAt}.</p>
      </div>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium text-lg">1. What the index is</h2>
        <p>
          The Country Standard Index is a single 0–100 score per country per year that summarises quality of life along {meta.components.length} components:
          affordability and income, health and healthcare access, jobs, education, safety, freedom, and environment and infrastructure. It is built only
          from published statistics ({meta.indicators.length} indicators), with no survey of opinion run by us and no hand-adjusted values.
        </p>
        <p>
          It is designed to be decomposed. Every country page shows the index, the contribution of each component in index points, the indicators
          inside each component, and the raw official series with the year each value was observed.
        </p>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium text-lg">2. Structure and weights</h2>
        <p>
          Index = Σ (w<sub>c</sub> × component<sub>c</sub>) ÷ Σ w<sub>c</sub> over the components that have data (at least {meta.minComponents} of{" "}
          {meta.components.length} are required). Component = simple mean of its available indicator scores. Default weights are equal; there is no
          official basis for weighting one dimension of life above another, so the ranking page lets you set your own.
        </p>
        <div className="card overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Component</th>
                <th>Weight</th>
                <th>Indicators</th>
              </tr>
            </thead>
            <tbody>
              {meta.components.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/component/${c.id}`} className="hover:underline">
                      <ComponentDot id={c.id} /> {c.name}
                    </Link>
                  </td>
                  <td className="tnum">{c.weight}</td>
                  <td className="text-secondary">{c.indicators.map((id) => meta.indicators.find((i) => i.id === id)?.name).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium text-lg">3. Scoring each indicator</h2>
        <ol className="list-decimal ml-5 space-y-1">
          <li>
            <strong>Transform.</strong> Income, infant mortality, homicide and PM2.5 are log-transformed so that differences at the low end count more
            than the same absolute difference at the high end. Inflation below zero is set to zero; gross tertiary enrolment is capped at 100%.
          </li>
          <li>
            <strong>Goalposts.</strong> For each indicator the worst and best goalposts are the 2.5th and 97.5th percentiles of all observed
            country-years from {meta.years[0]} to {meta.years[meta.years.length - 1]}, pooled. They are the same for every year, which is what makes
            history meaningful: a country&apos;s score moves only when its own numbers move. The 2.5/97.5 trim stops one extreme country-year (a
            hyperinflation, a war) from compressing everyone else into a narrow band.
          </li>
          <li>
            <strong>Score.</strong> 100 × (value − worst) ÷ (best − worst), clipped to 0–100, with the direction flipped for indicators where lower
            is better.
          </li>
        </ol>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium text-lg">4. Missing data</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>
            <strong>Carry-forward.</strong> If a year has no published value, the most recent observation is carried forward for at most{" "}
            <em>maxCarry</em> years (2–10 depending on how often the source publishes; see table). Every carried value is flagged on the country and
            indicator pages, and each score shows what share of its inputs is carried.
          </li>
          <li>
            <strong>Missing indicators.</strong> A component is computed from whichever of its indicators are available; the country page shows
            “n/m indicators”. A country needs at least {meta.minComponents} components to get an index, and at least {Math.round(meta.minCoverage * 100)}% of all
            indicators to be ranked. Countries below that threshold still have a score, shown with a warning, and can be included from the ranking
            page.
          </li>
          <li>
            <strong>Nothing is imputed from other countries.</strong> We never fill a country&apos;s gap with a regional average; the gap stays visible.
          </li>
        </ul>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium text-lg">5. Indicators and sources</h2>
        <p className="text-secondary">
          Every series links to two places: <em>downloaded from</em> is the exact URL our pipeline fetched (the closest point to the number on this
          site), and <em>built from</em> is the chain of organisations behind it. Where a value is assembled from several sources, each entry says what
          that source contributes; the indicator page also shows the data provider&apos;s own source statement verbatim, and every country row has a
          link to the series filtered to that country.
        </p>
        <p className="text-secondary">
          Type: <em>direct</em> measures the thing itself; <em>proxy</em> stands in for something not measured consistently across countries. Source
          type: <em>statistical</em> = counts, registers or household surveys compiled by statistical agencies; <em>modelled</em> = statistical estimates
          (ILO, UN IGME, GBD) that fill gaps between reported years; <em>expert</em> = assessments aggregated from expert and survey sources (WGI, V-Dem).
        </p>
        <div className="card overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Indicator</th>
                <th>Component</th>
                <th>Type</th>
                <th>Better</th>
                <th>Goalposts (0 → 100)</th>
                <th>Countries</th>
                <th>Carried</th>
                <th>Max carry</th>
                <th>Downloaded from</th>
                <th>Built from</th>
              </tr>
            </thead>
            <tbody>
              {meta.indicators.map((i) => (
                <tr key={i.id}>
                  <td>
                    <Link href={`/indicator/${i.id}`} className="font-medium hover:underline">
                      {i.name}
                    </Link>
                    <div className="text-[11px] text-muted">
                      {i.id} · {i.unit}
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    <ComponentDot id={i.component} size={8} /> {byComp[i.component].short}
                  </td>
                  <td className="whitespace-nowrap">
                    <span className={`badge ${i.kind === "proxy" ? "badge-proxy" : ""}`}>{i.kind}</span> <span className="badge">{i.sourceType}</span>
                  </td>
                  <td>{i.direction}</td>
                  <td className="tnum whitespace-nowrap">
                    {fmtRaw(i.goalposts.worst)} → {fmtRaw(i.goalposts.best)}
                  </td>
                  <td className="tnum">{i.stats.countriesWithData}</td>
                  <td className="tnum">{Math.round((100 * i.stats.carriedCountryYears) / (i.stats.carriedCountryYears + i.stats.observedCountryYears))}%</td>
                  <td className="tnum">{i.maxCarry} y</td>
                  <td className="text-xs" style={{ minWidth: 160 }}>
                    <a href={i.pulledFrom.url} target="_blank" rel="noreferrer" className="underline">
                      {i.pulledFrom.name}
                    </a>
                    <div className="text-muted">
                      <a href={i.pulledFrom.page} target="_blank" rel="noreferrer" className="underline">
                        series page
                      </a>
                      {i.stats.sourceLastUpdated ? ` · updated ${i.stats.sourceLastUpdated}` : ""}
                    </div>
                  </td>
                  <td className="text-xs" style={{ minWidth: 260 }}>
                    <ul className={i.sources.length > 1 ? "list-disc ml-3 space-y-0.5" : ""}>
                      {i.sources.map((src) => (
                        <li key={src.url + src.name}>
                          <a href={src.url} target="_blank" rel="noreferrer" className="underline">
                            {src.name}
                          </a>{" "}
                          <span className="text-muted">({ROLE_LABEL[src.role]})</span>
                          {i.sources.length > 1 ? <span className="text-muted"> — {src.contribution}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          Not scored but shown for cross-checking:{" "}
          {meta.context.map((c, i) => (
            <span key={c.id}>
              {i > 0 ? "; " : ""}
              <a href={c.url} target="_blank" rel="noreferrer" className="underline">
                {c.name}
              </a>{" "}
              ({c.source})
            </span>
          ))}
          .
        </p>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium text-lg">6. Where official numbers are missing, and proposed proxies</h2>
        <div className="space-y-3">
          {PROPOSALS.map((p) => (
            <div key={p.gap} className="card p-3">
              <div className="font-medium">{p.gap}</div>
              <div className="text-secondary mt-1">
                <strong className="text-primary">Status:</strong> {p.status}
              </div>
              <div className="text-secondary mt-1">
                <strong className="text-primary">Proposed proxy:</strong> {p.proposal}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium text-lg">7. Known limitations</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>Equal weights are a choice, not a finding. Use the sliders to test how sensitive the ranking is.</li>
          <li>Governance and freedom indicators are expert assessments, not counts. They are the standard sources (used by the UN, EU and World Bank) but carry a standard error; the WGI publish it.</li>
          <li>Small states have thin data and are easily unranked; this is a data limitation, not a judgement about them.</li>
          <li>Carry-forward keeps recent years comparable but means that a country&apos;s latest score can be partly last year&apos;s. The carried share is always shown.</li>
          <li>National averages hide inequality within countries; the Gini index is the only distributional measure included.</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium text-lg">8. Reproducing the data</h2>
        <pre className="card p-3 text-xs overflow-x-auto">{`npm run data:fetch   # pull all series from the World Bank API, UNDP and OWID into data/raw/
npm run data:build   # compute scores, components, index, ranks → data/*.json
npm run build        # build the site`}</pre>
        <p className="text-secondary">The indicator catalogue (ids, directions, transforms, carry limits, sources) is a single file, scripts/indicators.mjs; add a row there and re-run to extend the index.</p>
      </section>
    </div>
  );
}
