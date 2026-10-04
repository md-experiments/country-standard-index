"use client";
import { useMemo, useState } from "react";
import { TimeSeriesChart } from "@/components/TimeSeriesChart";

interface Props {
  years: number[];
  options: { iso3: string; name: string }[];
  data: Record<string, (number | null)[]>;
  observed?: Record<string, (boolean | null)[]>;
  defaultSelected: string[];
  reference?: { name: string; values: (number | null)[] };
  yDomain?: [number | "auto", number | "auto"];
  caption?: string;
  formatValue?: (v: number) => string;
  max?: number;
}

const SLOTS = 7;

/** Compare up to seven countries. Each selected country keeps its colour slot until it is removed (colour follows the entity). */
export function MultiCountryHistory({ years, options, data, observed, defaultSelected, reference, yDomain, caption, formatValue, max = SLOTS }: Props) {
  const [slots, setSlots] = useState<(string | null)[]>(() => {
    const s: (string | null)[] = Array(max).fill(null);
    defaultSelected.slice(0, max).forEach((iso, i) => (s[i] = iso));
    return s;
  });
  const [q, setQ] = useState("");
  const nameOf = useMemo(() => Object.fromEntries(options.map((o) => [o.iso3, o.name])), [options]);
  const matches = q ? options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase()) && !slots.includes(o.iso3)).slice(0, 8) : [];
  const add = (iso: string) => {
    const i = slots.indexOf(null);
    if (i === -1) return;
    setSlots((s) => s.map((v, j) => (j === i ? iso : v)));
    setQ("");
  };
  const remove = (iso: string) => setSlots((s) => s.map((v) => (v === iso ? null : v)));
  const series = slots.flatMap((iso, i) => (iso && data[iso] ? [{ id: iso, name: nameOf[iso] ?? iso, color: `var(--s${i + 1})`, values: data[iso], observed: observed?.[iso] }] : []));
  if (reference) series.push({ id: "ref", name: reference.name, color: "var(--c-reference)", values: reference.values, observed: undefined, reference: true } as (typeof series)[number] & { reference: boolean });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {slots.map((iso, i) =>
          iso ? (
            <button key={iso} type="button" onClick={() => remove(iso)} className="border hairline rounded-full px-2 py-0.5 flex items-center gap-1 text-secondary hover:text-primary" title="Remove">
              <span style={{ width: 12, height: 2, background: `var(--s${i + 1})`, display: "inline-block" }} /> {nameOf[iso] ?? iso} ×
            </button>
          ) : null,
        )}
        {slots.includes(null) && (
          <div className="relative">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add a country…" className="card px-2 py-1 w-44 text-sm" />
            {matches.length > 0 && (
              <ul className="absolute z-10 mt-1 card w-56 max-h-56 overflow-auto text-sm">
                {matches.map((o) => (
                  <li key={o.iso3}>
                    <button type="button" onClick={() => add(o.iso3)} className="w-full text-left px-2 py-1 hover:bg-surface-2">
                      {o.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <TimeSeriesChart years={years} series={series} yDomain={yDomain} caption={caption} formatValue={formatValue} height={300} />
    </div>
  );
}
