"use client";
import { useState } from "react";
import { ComponentDot } from "@/components/ScoreBar";
import { defaultWeights, type Weights } from "@/lib/index-math";
import type { Component } from "@/lib/types";

export function WeightsPanel({ components, weights, onChange }: { components: Component[]; weights: Weights; onChange: (w: Weights) => void }) {
  const [open, setOpen] = useState(false);
  const total = components.reduce((a, c) => a + (weights[c.id] ?? 0), 0);
  const isDefault = components.every((c) => weights[c.id] === c.weight);
  return (
    <div className="card p-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-sm font-medium text-primary">
          {open ? "▾" : "▸"} Component weights {isDefault ? "(equal)" : "(custom)"}
        </button>
        {!isDefault && (
          <button type="button" className="text-xs text-secondary hover:text-primary" onClick={() => onChange(defaultWeights(components))}>
            Reset to equal weights
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          {components.map((c) => {
            const w = weights[c.id] ?? 0;
            return (
              <label key={c.id} className="text-xs text-secondary">
                <div className="flex justify-between">
                  <span>
                    <ComponentDot id={c.id} size={8} /> {c.name}
                  </span>
                  <span className="tnum">{total ? Math.round((w / total) * 100) : 0}%</span>
                </div>
                <input type="range" min={0} max={3} step={0.25} value={w} onChange={(e) => onChange({ ...weights, [c.id]: +e.target.value })} className="w-full" />
              </label>
            );
          })}
          <p className="sm:col-span-2 lg:col-span-4 text-xs text-muted">
            The index is the weighted mean of the component scores; a component set to 0 is ignored. Default weights are equal because there is no
            official basis for preferring one dimension over another; the weights are the one judgement call in this index, so they are yours to make.
          </p>
        </div>
      )}
    </div>
  );
}
