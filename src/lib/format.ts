export const fmt1 = (v: number | null | undefined) => (v == null ? "–" : v.toFixed(1));
export const fmt0 = (v: number | null | undefined) => (v == null ? "–" : Math.round(v).toLocaleString("en-US"));
export const fmtPop = (v: number | null | undefined) => {
  if (v == null) return "–";
  if (v >= 1e9) return (v / 1e9).toFixed(2) + " bn";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + " m";
  if (v >= 1e3) return (v / 1e3).toFixed(0) + " k";
  return String(v);
};
export const fmtRaw = (v: number | null | undefined) => {
  if (v == null) return "–";
  const a = Math.abs(v);
  if (a >= 10000) return Math.round(v).toLocaleString("en-US");
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  if (a >= 1) return v.toFixed(2);
  return v.toFixed(3);
};
export const fmtDelta = (v: number | null | undefined) => (v == null ? "–" : (v > 0 ? "+" : "") + v.toFixed(1));
export const slug = (s: string) => s;
