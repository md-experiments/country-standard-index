import Link from "next/link";
import { notFound } from "next/navigation";
import { ComponentRanking } from "@/components/ComponentRanking";
import { ComponentDot } from "@/components/ScoreBar";
import { getIndicatorFile, getMeta, getSummary } from "@/lib/data";
import type { Series } from "@/lib/types";

export const dynamicParams = false;
export function generateStaticParams() {
  return getMeta().components.map((c) => ({ id: c.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getMeta().components.find((k) => k.id === id);
  return { title: c ? `${c.name} · Country Standard Index` : "Component" };
}

export default async function ComponentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meta = getMeta();
  const component = meta.components.find((c) => c.id === id);
  if (!component) notFound();
  const indicators = meta.indicators.filter((i) => i.component === id);
  const summary = getSummary();
  const indicatorScores: Record<string, Record<string, Series>> = {};
  for (const ind of indicators) {
    const f = getIndicatorFile(ind.id);
    indicatorScores[ind.id] = f ? Object.fromEntries(Object.entries(f.countries).map(([iso, v]) => [iso, v.score])) : {};
  }
  return (
    <div className="space-y-6">
      <div>
        <Link href="/components" className="text-xs text-muted hover:text-primary">
          ← Components
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          <ComponentDot id={component.id} size={14} /> {component.name}
        </h1>
        <p className="text-sm text-secondary max-w-2xl mt-1">{component.description}</p>
        <ul className="mt-2 text-sm text-secondary flex flex-wrap gap-x-4 gap-y-1">
          {indicators.map((i) => (
            <li key={i.id}>
              <Link href={`/indicator/${i.id}`} className="hover:underline">
                {i.name}
              </Link>
              {i.kind === "proxy" && <span className="badge badge-proxy ml-1">proxy</span>}
            </li>
          ))}
        </ul>
      </div>
      <ComponentRanking component={component} indicators={indicators} summary={summary} indicatorScores={indicatorScores} />
    </div>
  );
}
