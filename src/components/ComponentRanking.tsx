"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MultiCountryHistory } from "@/components/MultiCountryHistory";
import type { Component, Indicator, Series, Summary } from "@/lib/types";

export function ComponentRanking({
  component,
  indicators,
  summary,
  indicatorScores,
}: {
  component: Component;
  indicators: Indicator[];
  summary: Summary;
  indicatorScores: Record<string, Record<string, Series>>; // indicatorId -> iso3 -> score by year
}) {
  const years = summary.years;
  const [year, setYear] = useState(summary.rankingYear);
  const yi = years.indexOf(year);
  const rows = useMemo(
    () =>
      summary.countries
        .filter((c) => c.components[component.id][yi] != null)
        .map((c) => ({ c, score: c.components[component.id][yi] as number, n: indicators.filter((i) => indicatorScores[i.id][c.iso3]?.[yi] != null).length }))
        .sort((a, b) => b.score - a.score),
    [summary, component.id, yi, indicators, indicatorScores],
  );
  const data = useMemo(() => Object.fromEntries(summary.countries.map((c) => [c.iso3, c.components[component.id]])), [summary, component.id]);
  const top5 = rows.filter((r) => r.c.rank[yi] != null).slice(0, 5).map((r) => r.c.iso3);

  return (
    <div className="space-y-6">
      <section className="card p-4">
        <h2 className="font-medium mb-1">History</h2>
        <MultiCountryHistory
          years={years}
          options={summary.countries.map((c) => ({ iso3: c.iso3, name: c.name }))}
          data={data}
          defaultSelected={top5}
          reference={{ name: "World median", values: summary.worldMedian.components[component.id] }}
          caption={`${component.name}: component score, 0–100`}
        />
      </section>
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Ranking on this component</h2>
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
        <p className="text-xs text-muted mb-2">Component score and the score of each indicator in it (0–100). Countries with partial indicator coverage are included but marked.</p>
        <div className="overflow-x-auto">
          <table className="data tnum">
            <thead>
              <tr>
                <th>#</th>
                <th>Country</th>
                <th>Score</th>
                {indicators.map((i) => (
                  <th key={i.id} title={i.name}>
                    <Link href={`/indicator/${i.id}`} className="hover:underline">
                      {i.name.length > 28 ? i.name.slice(0, 26) + "…" : i.name}
                    </Link>
                  </th>
                ))}
                <th>Overall rank</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.c.iso3}>
                  <td className="text-muted">{i + 1}</td>
                  <td>
                    <Link href={`/country/${r.c.iso3}`} className="font-medium hover:underline">
                      {r.c.name}
                    </Link>
                    {r.n < indicators.length && <span className="ml-1 text-[11px] text-muted">({r.n}/{indicators.length} indicators)</span>}
                  </td>
                  <td className="font-semibold">{Math.round(r.score)}</td>
                  {indicators.map((ind) => {
                    const v = indicatorScores[ind.id][r.c.iso3]?.[yi];
                    return (
                      <td key={ind.id} className="text-secondary">
                        {v == null ? <span className="text-muted">–</span> : Math.round(v)}
                      </td>
                    );
                  })}
                  <td className="text-muted">{r.c.rank[yi] ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
