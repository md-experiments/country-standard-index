"use client";
import Link from "next/link";
import { useState } from "react";
import { ComponentDot, ScoreBar } from "@/components/ScoreBar";
import { TimeSeriesChart } from "@/components/TimeSeriesChart";
import { fmt1, fmtRaw } from "@/lib/format";
import { contributions, defaultWeights } from "@/lib/index-math";
import type { CountryDetail, Meta, Summary } from "@/lib/types";

export function CountryDrilldown({ country, meta, worldMedian }: { country: CountryDetail; meta: Meta; worldMedian: Summary["worldMedian"] }) {
  const years = meta.years;
  const [year, setYear] = useState(meta.rankingYear);
  const [openComp, setOpenComp] = useState<Record<string, boolean>>({});
  const [openInd, setOpenInd] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<Record<string, "raw" | "score">>({});
  const yi = years.indexOf(year);
  const weights = defaultWeights(meta.components);
  const parts = contributions({ components: Object.fromEntries(meta.components.map((k) => [k.id, country.components[k.id].score])) }, yi, meta.components, weights);

  return (
    <div className="space-y-6">
      {/* Overall history */}
      <section className="card p-4">
        <h2 className="font-medium">Index history</h2>
        <p className="text-xs text-muted mb-2">
          Country Standard Index, 0–100, against the median of all ranked countries. Goalposts are fixed across years, so movement reflects the
          country&apos;s own numbers changing, not other countries.
        </p>
        <TimeSeriesChart
          years={years}
          series={[
            { id: "idx", name: country.name, color: "var(--accent)", values: country.index },
            { id: "med", name: "World median", color: "var(--c-reference)", values: worldMedian.index, reference: true },
          ]}
          caption="Index score, 0–100"
        />
      </section>

      {/* Breakdown for a chosen year */}
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">How the score is built</h2>
          <label className="text-xs text-muted flex items-center gap-2">
            Year
            <select value={year} onChange={(e) => setYear(+e.target.value)} className="card px-2 py-1 text-sm text-primary">
              {[...years].reverse().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-3xl font-semibold tnum">{fmt1(country.index[yi])}</span>
          <div className="flex-1">
            <ScoreBar parts={parts} components={meta.components} height={14} />
          </div>
        </div>
        <p className="text-xs text-muted mt-1">
          {country.rank[yi] != null ? `Rank ${country.rank[yi]} in ${year}. ` : country.index[yi] != null ? `Not ranked in ${year} (indicator coverage ${country.coverage[yi]}% is below the ${Math.round(meta.minCoverage * 100)}% threshold). ` : `No index for ${year}: fewer than ${meta.minComponents} components available. `}
          Each bar segment is a component&apos;s contribution in index points (weight share × component score). Click a component to see its history and
          the indicators behind it.
        </p>

        <div className="mt-4 divide-y hairline">
          {meta.components.map((comp) => {
            const score = country.components[comp.id].score;
            const part = parts.find((p) => p.id === comp.id);
            const inds = meta.indicators.filter((i) => i.component === comp.id);
            const open = !!openComp[comp.id];
            return (
              <div key={comp.id} className="py-2">
                <button type="button" onClick={() => setOpenComp((o) => ({ ...o, [comp.id]: !o[comp.id] }))} className="w-full text-left grid grid-cols-[1.2rem_1fr_6rem_6rem_7rem] items-center gap-2 text-sm">
                  <span className="text-muted">{open ? "▾" : "▸"}</span>
                  <span className="font-medium">
                    <ComponentDot id={comp.id} /> {comp.name}
                  </span>
                  <span className="tnum text-right">{score[yi] == null ? <span className="text-muted">no data</span> : <>{Math.round(score[yi] as number)} <span className="text-muted text-xs">/100</span></>}</span>
                  <span className="tnum text-right text-secondary text-xs">{part ? `${part.points.toFixed(1)} pts` : ""}</span>
                  <span className="text-right text-xs text-muted">
                    {country.components[comp.id].indicatorsAvailable[yi]}/{inds.length} indicators
                  </span>
                </button>
                {open && (
                  <div className="mt-3 ml-5 space-y-3">
                    <p className="text-xs text-secondary">{comp.description}</p>
                    <TimeSeriesChart
                      years={years}
                      height={180}
                      series={[
                        { id: comp.id, name: `${comp.short} score`, color: `var(--c-${comp.id})`, values: score },
                        { id: "med", name: "World median", color: "var(--c-reference)", values: worldMedian.components[comp.id], reference: true },
                      ]}
                      caption={`${comp.name}: component score, 0–100 (mean of its indicator scores)`}
                    />
                    <table className="data">
                      <thead>
                        <tr>
                          <th></th>
                          <th>Indicator</th>
                          <th>Value in {year}</th>
                          <th>Observed</th>
                          <th className="text-right">Score</th>
                          <th>Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inds.map((ind) => {
                          const s = country.indicators[ind.id];
                          const raw = s.raw[yi], obs = s.obsYear[yi], sc = s.score[yi];
                          const carried = obs != null && obs !== year;
                          const o = !!openInd[ind.id];
                          const m = mode[ind.id] ?? "raw";
                          const observedFlags = years.map((y) => s.observations.some(([oy]) => oy === y));
                          return (
                            <FragmentRow key={ind.id}>
                              <tr className="cursor-pointer" onClick={() => setOpenInd((x) => ({ ...x, [ind.id]: !x[ind.id] }))}>
                                <td className="text-muted">{o ? "▾" : "▸"}</td>
                                <td>
                                  <div className="font-medium">{ind.name}</div>
                                  <div className="text-[11px] text-muted">{ind.unit}</div>
                                </td>
                                <td className="tnum">{raw == null ? <span className="text-muted">missing</span> : fmtRaw(raw)}</td>
                                <td className="text-xs">
                                  {obs == null ? (
                                    <span className="text-muted">no observation within {ind.maxCarry} years</span>
                                  ) : carried ? (
                                    <span className="badge badge-carried" title={`No ${year} value published; last observation (${obs}) carried forward`}>
                                      carried from {obs}
                                    </span>
                                  ) : (
                                    <span className="text-secondary">{obs}</span>
                                  )}
                                </td>
                                <td className="tnum text-right">{sc == null ? "–" : Math.round(sc)}</td>
                                <td>
                                  <span className={`badge ${ind.kind === "proxy" ? "badge-proxy" : ""}`}>{ind.kind}</span>{" "}
                                  <span className="badge">{ind.sourceType}</span>
                                </td>
                              </tr>
                              {o && (
                                <tr>
                                  <td></td>
                                  <td colSpan={5} className="pb-4">
                                    <div className="text-xs text-secondary mb-2">
                                      <strong className="text-primary">Measures:</strong> {ind.measures}
                                      {ind.note ? <> · {ind.note}</> : null}
                                      <br />
                                      <strong className="text-primary">Source:</strong>{" "}
                                      <a href={ind.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                                        {ind.source}
                                      </a>
                                      {ind.stats.sourceLastUpdated ? ` (updated ${ind.stats.sourceLastUpdated})` : ""} · Goalposts: {fmtRaw(ind.goalposts.worst)} → {fmtRaw(ind.goalposts.best)}{" "}
                                      {ind.unit} ·{" "}
                                      <Link href={`/indicator/${ind.id}`} className="underline">
                                        compare countries
                                      </Link>
                                    </div>
                                    <div className="flex gap-2 mb-1 text-xs">
                                      {(["raw", "score"] as const).map((k) => (
                                        <button key={k} type="button" onClick={() => setMode((x) => ({ ...x, [ind.id]: k }))} className={`border hairline rounded px-2 py-0.5 ${m === k ? "bg-surface-2 text-primary" : "text-secondary"}`}>
                                          {k === "raw" ? `Value (${ind.unit})` : "Score (0–100)"}
                                        </button>
                                      ))}
                                    </div>
                                    {m === "raw" ? (
                                      <TimeSeriesChart
                                        years={years}
                                        height={180}
                                        yDomain={["auto", "auto"]}
                                        formatValue={(v) => fmtRaw(v)}
                                        series={[{ id: ind.id, name: ind.name, color: `var(--c-${comp.id})`, values: s.raw, observed: observedFlags }]}
                                        caption="Dots mark years with a published observation; flat stretches between dots are carried forward."
                                      />
                                    ) : (
                                      <TimeSeriesChart years={years} height={180} series={[{ id: ind.id, name: `${ind.name} score`, color: `var(--c-${comp.id})`, values: s.score }]} caption="Score, 0–100, relative to fixed goalposts" />
                                    )}
                                  </td>
                                </tr>
                              )}
                            </FragmentRow>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {parts.length < meta.components.length && (
          <p className="text-xs text-warn mt-3">
            {meta.components.length - parts.length} component{meta.components.length - parts.length > 1 ? "s have" : " has"} no data for {year}; the index is the weighted mean of the components that do. Missing
            components are listed above with “no data”.
          </p>
        )}
      </section>
    </div>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
