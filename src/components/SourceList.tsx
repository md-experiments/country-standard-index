import { ROLE_LABEL } from "@/lib/links";
import type { Indicator } from "@/lib/types";

/**
 * Full provenance for one indicator: the exact place we downloaded it from, the chain of
 * organisations behind it with what each contributes, and the publisher's own source statement.
 */
export function SourceList({ indicator, compact = false }: { indicator: Indicator; compact?: boolean }) {
  const pf = indicator.pulledFrom;
  const multi = indicator.sources.length > 1;
  return (
    <div className={`space-y-2 ${compact ? "text-xs" : "text-sm"}`}>
      <div>
        <div className="text-xs text-muted">Downloaded from</div>
        <a href={pf.url} target="_blank" rel="noreferrer" className="underline break-all">
          {pf.name}
        </a>
        <span className="text-muted">
          {" "}
          ·{" "}
          <a href={pf.page} target="_blank" rel="noreferrer" className="underline">
            series page
          </a>
          {pf.metadataUrl && (
            <>
              {" "}
              ·{" "}
              <a href={pf.metadataUrl} target="_blank" rel="noreferrer" className="underline">
                metadata
              </a>
            </>
          )}
          {indicator.stats.sourceLastUpdated ? ` · source updated ${indicator.stats.sourceLastUpdated}` : ""} · fetched {indicator.stats.fetchedAt}
        </span>
      </div>
      <div>
        <div className="text-xs text-muted">{multi ? "Built from several sources, each contributing as follows" : "Built from one source"}</div>
        <ul className={`${multi ? "list-disc ml-4" : ""} space-y-1`}>
          {indicator.sources.map((s) => (
            <li key={s.url + s.name}>
              <a href={s.url} target="_blank" rel="noreferrer" className="underline font-medium">
                {s.name}
              </a>{" "}
              <span className="badge">{ROLE_LABEL[s.role] ?? s.role}</span>
              <span className="text-secondary"> — {s.contribution}</span>
            </li>
          ))}
        </ul>
      </div>
      {indicator.official.sourceOrganization && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted">Source statement as published by the data provider (verbatim)</summary>
          <p className="mt-1 text-secondary whitespace-pre-line">{indicator.official.sourceOrganization}</p>
          {indicator.official.sourceNote && <p className="mt-1 text-secondary">{indicator.official.sourceNote}</p>}
        </details>
      )}
    </div>
  );
}
