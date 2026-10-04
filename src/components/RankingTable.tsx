"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ComponentDot, ScoreBar } from "@/components/ScoreBar";
import { WeightsPanel } from "@/components/WeightsPanel";
import { fmt1, fmtDelta, fmtPop } from "@/lib/format";
import { computeIndex, contributions, defaultWeights, type Weights } from "@/lib/index-math";
import type { Meta, Summary } from "@/lib/types";

type SortKey = "rank" | "name" | "index" | "delta" | "coverage" | `c:${string}`;

export function RankingTable({ summary, meta }: { summary: Summary; meta: Meta }) {
  const years = summary.years;
  const [year, setYear] = useState(summary.rankingYear);
  const [weights, setWeights] = useState<Weights>(() => defaultWeights(meta.components));
  const [region, setRegion] = useState("all");
  const [minPop, setMinPop] = useState(0);
  const [includeLow, setIncludeLow] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "rank", dir: 1 });

  const yi = years.indexOf(year);
  const baseYi = years.indexOf(Math.max(years[0], year - 10));
  const regions = useMemo(() => Array.from(new Set(summary.countries.map((c) => c.region))).sort(), [summary]);

  const rows = useMemo(() => {
    const all = summary.countries
      .map((c) => {
        const index = computeIndex(c, yi, meta.components, weights, meta.minComponents);
        const base = computeIndex(c, baseYi, meta.components, weights, meta.minComponents);
        return {
          c,
          index,
          delta: index != null && base != null ? index - base : null,
          coverage: c.coverage[yi],
          carried: c.carriedShare[yi],
          parts: contributions(c, yi, meta.components, weights),
          ranked: index != null && c.coverage[yi] >= meta.minCoverage * 100,
        };
      })
      .filter((r) => r.index != null);
    const ranked = all.filter((r) => r.ranked).sort((a, b) => (b.index as number) - (a.index as number));
    const rankOf = new Map(ranked.map((r, i) => [r.c.iso3, i + 1]));
    return all
      .map((r) => ({ ...r, rank: rankOf.get(r.c.iso3) ?? null }))
      .filter((r) => includeLow || r.ranked)
      .filter((r) => region === "all" || r.c.region === region)
      .filter((r) => (r.c.population ?? 0) >= minPop)
      .filter((r) => !q || r.c.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => {
        const k = sort.key;
        const get = (r: typeof a): number | string => {
          if (k === "rank") return r.rank ?? 9999;
          if (k === "name") return r.c.name;
          if (k === "index") return r.index ?? -1;
          if (k === "delta") return r.delta ?? -999;
          if (k === "coverage") return r.coverage;
          return r.c.components[k.slice(2)][yi] ?? -1;
        };
        const va = get(a), vb = get(b);
        return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
      });
  }, [summary, meta, weights, yi, baseYi, includeLow, region, minPop, q, sort]);

  const th = (key: SortKey, label: React.ReactNode, title?: string) => (
    <th
      title={title}
      onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((s.dir * -1) as 1 | -1) : key === "name" || key === "rank" ? 1 : -1 }))}
      className="cursor-pointer select-none hover:text-primary"
    >
      {label}
      {sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
    </th>
  );

  const nRanked = rows.filter((r) => r.rank != null).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Year</span>
          <select value={year} onChange={(e) => setYear(+e.target.value)} className="card px-2 py-1">
            {[...years].reverse().map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Region</span>
          <select value={region} onChange={(e) => setRegion(e.target.value)} className="card px-2 py-1">
            <option value="all">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Population</span>
          <select value={minPop} onChange={(e) => setMinPop(+e.target.value)} className="card px-2 py-1">
            <option value={0}>Any size</option>
            <option value={1e6}>≥ 1 million</option>
            <option value={5e6}>≥ 5 million</option>
            <option value={2e7}>≥ 20 million</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Search</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Country" className="card px-2 py-1 w-40" />
        </label>
        <label className="flex items-center gap-2 pb-1 text-secondary">
          <input type="checkbox" checked={includeLow} onChange={(e) => setIncludeLow(e.target.checked)} />
          Include countries with &lt; {Math.round(meta.minCoverage * 100)}% indicator coverage (unranked)
        </label>
      </div>

      <WeightsPanel components={meta.components} weights={weights} onChange={setWeights} />

      <p className="text-xs text-muted">
        {nRanked} countries ranked for {year}
        {region !== "all" || minPop > 0 || q ? " (filtered)" : ""}. Click a column to sort; click a country to break its
        score down by component and indicator. “Δ 10y” is the change in index points versus {years[baseYi]}.
      </p>

      <div className="overflow-x-auto card">
        <table className="data tnum">
          <thead>
            <tr>
              {th("rank", "#")}
              {th("name", "Country")}
              {th("index", "Index", "0–100; bar segments show each component's contribution in points")}
              {meta.components.map((k) => (
                <th key={k.id} title={k.name} onClick={() => setSort((s) => ({ key: `c:${k.id}`, dir: s.key === `c:${k.id}` ? ((s.dir * -1) as 1 | -1) : -1 }))} className="cursor-pointer select-none hover:text-primary">
                  <ComponentDot id={k.id} size={8} /> {k.short}
                  {sort.key === `c:${k.id}` ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
                </th>
              ))}
              {th("delta", "Δ 10y")}
              {th("coverage", "Data", "Share of the 28 indicators available for this country-year; share of those carried forward from an earlier year")}
              <th>Pop.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.c.iso3}>
                <td className="text-muted">{r.rank ?? "–"}</td>
                <td>
                  <Link href={`/country/${r.c.iso3}`} className="text-primary hover:underline font-medium">
                    {r.c.name}
                  </Link>
                  <div className="text-[11px] text-muted">{r.c.region}</div>
                </td>
                <td style={{ minWidth: 220 }}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold w-10 text-right">{fmt1(r.index)}</span>
                    <div className="flex-1">
                      <ScoreBar parts={r.parts} components={meta.components} />
                    </div>
                  </div>
                </td>
                {meta.components.map((k) => (
                  <td key={k.id} className="text-secondary">
                    {r.c.components[k.id][yi] == null ? <span className="text-muted">–</span> : Math.round(r.c.components[k.id][yi] as number)}
                  </td>
                ))}
                <td className={r.delta == null ? "text-muted" : r.delta > 0 ? "text-good" : r.delta < 0 ? "text-bad" : ""}>{fmtDelta(r.delta)}</td>
                <td className="text-muted text-xs">
                  {r.coverage}%{r.carried ? <span title="share of available indicators carried forward from an earlier year"> · {r.carried}% carried</span> : ""}
                </td>
                <td className="text-muted text-xs">{fmtPop(r.c.population)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
