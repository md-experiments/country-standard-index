import Link from "next/link";
import { ComponentDot } from "@/components/ScoreBar";
import { getMeta } from "@/lib/data";

export const metadata = { title: "Components · Country Standard Index" };

export default function ComponentsPage() {
  const meta = getMeta();
  const byId = Object.fromEntries(meta.indicators.map((i) => [i.id, i]));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">The seven components</h1>
      <p className="text-sm text-secondary max-w-2xl">
        Each component is the simple mean of its indicator scores. Open a component to rank countries on it and follow its history; open an
        indicator to see the raw official series behind the score.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {meta.components.map((c) => (
          <div key={c.id} className="card p-4">
            <Link href={`/component/${c.id}`} className="font-medium hover:underline">
              <ComponentDot id={c.id} /> {c.name}
            </Link>
            <p className="text-xs text-secondary mt-1">{c.description}</p>
            <ul className="mt-2 text-sm space-y-1">
              {c.indicators.map((id) => (
                <li key={id} className="flex justify-between gap-2">
                  <Link href={`/indicator/${id}`} className="hover:underline">
                    {byId[id].name}
                  </Link>
                  <span className="text-xs text-muted whitespace-nowrap">
                    {byId[id].kind === "proxy" ? <span className="badge badge-proxy">proxy</span> : null} {byId[id].stats.countriesWithData} countries
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
