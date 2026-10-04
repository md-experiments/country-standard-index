# Country Standard Index

A transparent, reproducible quality-of-life index across countries, with full history and drill-down from the
headline score to the official series behind every number.

**Live app:** deploy to Vercel (see below). **Stack:** Next.js (App Router, static generation), Tailwind, Recharts.

## What it does

- One score per country per year (0–100) from 2000 onwards, built from 28 indicators in 7 components:
  affordability & income, health & healthcare access, jobs & employment, education level & access,
  safety & security, freedom & voice, environment & infrastructure.
- Every score can be opened: **index → component → indicator → raw official series**, each with a history chart and a
  table view. Component contributions are shown as stacked index points.
- Component weights are adjustable on the ranking page (default: equal); the index recomputes live.
- Missing data is never hidden: values carried forward from an earlier year are flagged, the share of carried
  inputs is shown next to every score, and countries with thin data are listed but unranked.
- Where no official number exists (housing affordability, waiting times, vacancy rates, …) the methodology page
  says so and proposes a proxy.

## Data sources (all official / recognised statistical series)

| Source | Used for |
|---|---|
| World Bank World Development Indicators (API v2) | income, prices, inflation, Gini, life expectancy, UHC coverage, physicians, out-of-pocket health spending, infant mortality, ILO labour series, UNESCO attainment & enrolment, learning-adjusted years of school, UNODC homicide, PM2.5, water, electricity, internet, population |
| World Bank Worldwide Governance Indicators (via WDI) | political stability, rule of law, voice & accountability, control of corruption |
| UNDP Human Development Report 2025 | mean years of schooling; HDI (shown as a cross-check, not scored) |
| V-Dem Institute v15 (via Our World in Data) | freedom of expression & alternative sources of information |

The full catalogue (ids, direction, transform, carry limit, source URL, what each one measures) is in
[`scripts/indicators.mjs`](scripts/indicators.mjs). Add a row there and re-run the pipeline to extend the index.

## Method in brief

1. **Carry-forward:** the last published observation is carried forward up to `maxCarry` years (2–10, per indicator) and flagged.
2. **Transform:** log for income, infant mortality, homicide and PM2.5; inflation floored at 0; gross enrolment capped at 100.
3. **Goalposts:** 2.5th / 97.5th percentile of all observed country-years 2000–2024, pooled and fixed across years, so a
   country's score only moves when its own numbers move.
4. **Score:** 100 × (value − worst) / (best − worst), clipped to 0–100.
5. **Aggregation:** component = mean of available indicator scores; index = weighted mean of available components
   (≥ 5 of 7 required). Countries need ≥ 70 % indicator coverage to be ranked.

Full details, every goalpost and coverage statistic, and the proxy proposals are on the Methodology page of the app.

## Running locally

```bash
npm install
npm run dev          # http://localhost:3000
```

The computed data is committed under `data/`, so the site builds without network access.

## Refreshing the data

```bash
npm run data:fetch   # World Bank API + UNDP + OWID → data/raw/
npm run data:build   # scores, components, index, ranks → data/summary.json, data/meta.json, data/countries/, data/indicators/
# or both:
npm run data:refresh
```

The build script prints the top 20 and every goalpost so a refresh can be sanity-checked before committing.

## Deploying on Vercel

Import the repository in Vercel; it is detected as a Next.js project and needs no configuration or environment
variables. All pages are pre-rendered at build time from the committed `data/` directory.

## Repository layout

```
scripts/indicators.mjs        indicator & component catalogue (the single place to change the index)
scripts/fetch-worldbank.mjs   World Bank API fetch
scripts/fetch-supplementary.mjs  UNDP + V-Dem fetch
scripts/build-index.mjs       scoring, aggregation, ranks, output files
data/raw/                     fetched series, one file per indicator
data/                         computed outputs used by the app
src/app/                      pages: ranking, country, components, component, indicator, history, methodology
src/components/               charts, tables, drill-down UI
src/lib/                      types, loaders, index maths shared by build and client
```
