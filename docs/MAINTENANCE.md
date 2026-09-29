# FDS Website — Maintenance Policy

The site is live, stable, accessible, and release-certified. This file tells future
agents what is frozen, what is normal maintenance, and the minimum gate that proves
a routine change did not break the site.

## Frozen — change only with concrete evidence of a regression

- **Atomic ecosystem** (`src/components/FDSEcosystem.astro`, `src/data/ecosystem.ts`):
  1080s master cycle, +3.535u shell clearance, 0/28 unclearable pairs, label
  clearances +1.74/+0.50/+2.80u, 8 orbital planes, CSS `offset-path` only.
  No runtime solver, no physics, no `requestAnimationFrame` orbit engine.
- **Performance architecture**: offscreen pause, hidden-tab pause, reduced-motion
  suspension, static noise asset, no continuous blur/drop-shadow rasterization.
  Production steady state: 0 long tasks.
- **CodeForge auth origin handling** (`src/pages/codeforge/sign-in.astro`): return
  URL derives from the serving origin; hostile `return`/`next`/`redirect` query
  params cannot override it.
- **Kayla architecture**: truthful status, knowledge validation, streaming, idle
  lifecycle, keyboard access. Do not reopen without a demonstrated defect.

## Normal maintenance

Copy, versions, statuses, links, release data, accessibility corrections,
screenshots, notes posts. Single source of truth for product facts is
`src/data/manifest.ts` — update it first and let derived surfaces follow.

## Active product sync

When a product repo ships (CodeForge, ForgerEMS, KyraBlox, GEMS, Kayla Publisher,
We The People, FarmStand Finder), the **product repository is the truth** — change
the website to match, never the reverse. After a release ships, run:

```
node scripts/product-truth-sync.mjs   # manifest vs live GitHub Releases + stray version literals
node scripts/verify-production.cjs    # post-deploy route/marker/archive canary
```

Existing CI drift guards already cover manifest↔project status agreement,
archive integrity vs real bytes, obsolete-claim bans, checkout exposure, and
Kayla knowledge consistency — keep them green rather than duplicating them.

## Maintenance canary (run for routine changes)

```
npm run check        # astro diagnostics
npm test             # vitest, incl. content-consistency + archive + Kayla drift guards
npm run build        # 29 pages
npm run validate     # content + knowledge + golden queries + internal links
```

Targeted Playwright suites (release-critical, ecosystem-orbit, perf-lifecycle,
codeforge-auth, support-dialog, visitor-counter, Kayla widget) when a change
touches their surface — not for copy/version updates.

## Do not require

The forensic performance campaign, orbit-geometry solver runs, or full visual
screenshot campaigns for routine maintenance. Those are certification tools for
architectural changes.
