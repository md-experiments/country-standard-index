"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MultiCountryHistory } from "@/components/MultiCountryHistory";
import { fmtRaw } from "@/lib/format";
import type { Indicator, IndicatorFile, Summary } from "@/lib/types";

export function IndicatorRanking({ indicator, file, summary }: { indicator: Indicator; file: IndicatorFile; summary: Summary }) {
  const years = summary.years;
  const [year, setYear] = useState(summary.rankingYear);
  const [mode, setMode] = useState<"raw" | "score">("raw");
  const yi = years.indexOf(year);
  const nameOf = useMemo(() => Object.fromEntries(summary.countries.map((c) => [c.iso3, c])), [summary]);
  const rows = useMemo(
    () =>
      Object.entries(file.countries)
        .filter(([, v]) => v.score[yi] != null)
        .map(([iso, v]) => ({ iso, name: nameOf[iso]?.name ?? iso, raw: v.raw[yi] as number, score: v.score[yi] as number, obs: v.obsYear[yi] as number }))
        .sort((a, b) => b.score - a.score || (indicator.direction === "higher" ? b.raw - a.raw : a.raw - b.raw)),
    [file, yi, nameOf, indicator.direction],
  );
  const raw = useMemo(() => Object.fromEntries(Object.entries(file.countries).map(([iso, v]) => [iso, v.raw])), [file]);
  const score = useMemo(() => Object.fromEntries(Object.entries(file.countries).map(([iso, v]) => [iso, v.score])), [file]);
  const observed = useMemo(() => Object.fromEntries(Object.entries(file.countries).map(([iso, v]) => [iso, v.obsYear.map((o, i) => o === years[i])])), [file, years]);
  const top5 = rows.filter((r) => nameOf[r.iso]?.rank[yi] != null).slice(0, 5).map((r) => r.iso);
  const missing = summary.countries.filter((c) => !file.countries[c.iso3] || file.countries[c.iso3].score[yi] == null);

  return (
    <div className="space-y-6">
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h2 className="font-medium">History</h2>
          <div className="flex gap-2 text-xs">
            {(["raw", "score"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setMode(k)} className={`border hairline rounded px-2 py-0.5 ${mode === k ? "bg-surface-2 text-primary" : "text-secondary"}`}>
                {k === "raw" ? `Value (${indicator.unit})` : "Score (0–100)"}
              </button>
            ))}
          </div>
        </div>
        <MultiCountryHistory
          key={mode}
          years={years}
          options={summary.countries.map((c) => ({ iso3: c.iso3, name: c.name }))}
          data={mode === "raw" ? raw : score}
          observed={mode === "raw" ? observed : undefined}
          defaultSelected={top5}
          yDomain={mode === "raw" ? ["auto", "auto"] : [0, 100]}
          formatValue={mode === "raw" ? (v) => fmtRaw(v) : undefined}
          caption={mode === "raw" ? "Dots mark years with a published observation; flat stretches are carried forward." : "Score relative to fixed goalposts, 0–100"}
        />
      </section>
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Countries ranked on this indicator</h2>
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
        <p className="text-xs text-muted mb-2">
          {rows.length} countries have a usable value for {year} ({rows.filter((r) => r.obs !== year).length} carried forward from an earlier year); {missing.length} have none within {indicator.maxCarry} years.
        </p>
        <div className="overflow-x-auto">
          <table className="data tnum">
            <thead>
              <tr>
                <th>#</th>
                <th>Country</th>
                <th>Value</th>
                <th>Observed</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.iso}>
                  <td className="text-muted">{i + 1}</td>
                  <td>
                    <Link href={`/country/${r.iso}`} className="font-medium hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td>{fmtRaw(r.raw)}</td>
                  <td className="text-xs">{r.obs === year ? <span className="text-secondary">{r.obs}</span> : <span className="badge badge-carried">carried from {r.obs}</span>}</td>
                  <td className="font-semibold">{Math.round(r.score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {missing.length > 0 && (
          <details className="mt-3 text-xs text-muted">
            <summary className="cursor-pointer">No official value for {year}: {missing.length} countries</summary>
            <p className="mt-1">{missing.map((c) => c.name).join(", ")}</p>
          </details>
        )}
      </section>
    </div>
  );
}
