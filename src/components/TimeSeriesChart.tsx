"use client";
import { useId, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ChartSeries {
  id: string;
  name: string;
  /** CSS colour (use var(--c-…) / var(--sN)) */
  color: string;
  values: (number | null)[];
  /** when provided, a dot is drawn only at these indices (e.g. observed years) */
  observed?: (boolean | null)[];
  dashed?: boolean;
  /** draw as a thin reference line */
  reference?: boolean;
}

interface Props {
  years: number[];
  series: ChartSeries[];
  yDomain?: [number | "auto", number | "auto"];
  unit?: string;
  height?: number;
  formatValue?: (v: number) => string;
  /** label under the chart, e.g. "Score, 0–100" */
  caption?: string;
}

const defaultFmt = (v: number) => (Number.isInteger(v) || Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));

/**
 * One-axis line chart: 2px lines, hairline horizontal grid, crosshair tooltip listing every series,
 * legend for >= 2 series, and a table view twin so no value is gated behind hover.
 */
export function TimeSeriesChart({ years, series, yDomain = [0, 100], unit, height = 240, formatValue = defaultFmt, caption }: Props) {
  const [table, setTable] = useState(false);
  const id = useId();
  const data = years.map((y, i) => {
    const row: Record<string, number | null> = { year: y };
    for (const s of series) row[s.id] = s.values[i] ?? null;
    return row;
  });
  const visible = series.filter((s) => s.values.some((v) => v != null));
  if (!visible.length) return <p className="text-sm text-muted py-6">No data for this series.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted">{caption ?? (unit ? `${unit}` : "")}</span>
        <button
          type="button"
          onClick={() => setTable((t) => !t)}
          className="text-xs text-secondary hover:text-primary border hairline rounded px-2 py-0.5"
          aria-pressed={table}
        >
          {table ? "Chart" : "Table"}
        </button>
      </div>
      {table ? (
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="data tnum">
            <thead>
              <tr>
                <th>Year</th>
                {visible.map((s) => (
                  <th key={s.id}>{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.year as number}>
                  <td>{r.year}</td>
                  {visible.map((s) => (
                    <td key={s.id}>{r[s.id] == null ? "–" : formatValue(r[s.id] as number)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="0" />
              <XAxis dataKey="year" tickLine={false} axisLine={false} ticks={years.filter((y) => y % 2 === 0)} interval="preserveStartEnd" minTickGap={16} />
              <YAxis domain={yDomain} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => formatValue(v)} />
              <Tooltip
                cursor={{ strokeWidth: 1 }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="card px-3 py-2 text-xs shadow-sm">
                      <div className="text-muted mb-1">{label}</div>
                      {payload
                        .filter((p) => p.value != null)
                        .map((p) => (
                          <div key={String(p.dataKey)} className="flex items-center gap-2">
                            <span style={{ width: 12, height: 2, background: p.stroke as string, display: "inline-block" }} />
                            <span className="font-semibold text-primary tnum">{formatValue(p.value as number)}</span>
                            <span className="text-secondary">{p.name}</span>
                          </div>
                        ))}
                    </div>
                  ) : null
                }
              />
              {visible.length > 1 && (
                <Legend
                  iconType="plainline"
                  wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
                  formatter={(v) => <span style={{ color: "var(--text-secondary)" }}>{v}</span>}
                />
              )}
              {visible.map((s) => (
                <Line
                  key={s.id}
                  id={`${id}-${s.id}`}
                  type="monotone"
                  dataKey={s.id}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={s.reference ? 1.5 : 2}
                  strokeDasharray={s.dashed || s.reference ? "4 3" : undefined}
                  connectNulls={false}
                  isAnimationActive={false}
                  dot={
                    s.observed
                      ? (props: { cx?: number; cy?: number; index?: number }) =>
                          s.observed?.[props.index ?? -1] && props.cx != null && props.cy != null ? (
                            <circle key={props.index} cx={props.cx} cy={props.cy} r={4} fill={s.color} stroke="var(--surface-1)" strokeWidth={2} />
                          ) : (
                            <g key={props.index} />
                          )
                      : false
                  }
                  activeDot={{ r: 5, stroke: "var(--surface-1)", strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
