# FDS visual recovery — local review

## Verdict

`FDS_VISUAL_RECOVERY_PARTIAL`. The approved CodeForge atom silhouette and four faceted GEMS cores are restored, the eight real product paths stay individually inspectable, responsive/reduced-motion captures are complete, and the requested regression suites pass. The inherited geometry certificate still records a small label-to-core-aura graze and intentional tag occlusion, and the new trace shows higher cumulative raster time despite fewer raster calls. Those residuals are documented below.

## Root cause and correction

The `c1402be` iteration made the eight true product paths read as an always-on orbit web and presented the GEMS lineages as generic module boxes. The three crossing CodeForge electron planes that carry the approved silhouette were missing, and ambient strokes could compete with the product geometry.

The ecosystem now has three restrained electron scaffold planes behind the actual product paths. Each product still uses its own certified `node.orbit.path`; that same path drives its painted SVG rail, moving body `offset-path`, and identity tag motion. At rest, product rail/accent opacity is `.02`/`.018`; the selected path rises to `.78`/`.72` on hover, keyboard focus, or tap. The central core link sits behind orbiting targets so it cannot intercept them. A local scene scrim masks page ambience behind this diagram.

GEMS now shows a central Training Grounds processor, four distinct faceted gemstone cores with canonical name, role, lineage ID, and `RESEARCH` state, and one conduit per gemstone. Hover/focus highlights its own gem, port, and conduit. The seven learning stages remain around the processor. Mobile uses the processor, a 2×2 gem layout, and the numbered stage list. No synthetic metrics were added. The unrelated Kayla component was not edited.

## Geometry and line bleed

- Eight distinct product paths and an exact 1080-second master cycle remain in place.
- Full-cycle shell sweep: 0 of 28 product pairs overlap; minimum shell gap is +3.535 scene units at 763.078 seconds. Six pairs approach within 5 units.
- Label-to-label minimum is +1.74u, own-shell minimum +0.50u, and bounds minimum +2.81u. The inherited certificate records one label grazing the abstract core aura by 0.66u for 8.7% of the cycle; visual review found the tag on empty space. Tags intentionally paint below planet bodies, so a moving body can occlude another tag as a depth cue.
- The colored relation spokes and GEMS field-link strokes are absent from the protected diagrams. Sparse calibration points and the site's low-level cosmic background remain.

## Performance traces

Same Chromium 151.0.7922.34, 1440×900 viewport, 2.5s idle, 2s trace, and 1s settle settings. The “before” values are the single sample in `../visual-lock-2026-09-29/performance-before.json`; “after” values are medians of three samples in `performance-after.json`. The earlier GEMS trace recorded zero paint/raster events, so it is not comparable to the active GEMS diagram.

| State | Task before → after (s) | Raster before → after (ms / calls) | Paint before → after (ms / calls) | Long tasks |
|---|---:|---:|---:|---:|
| Homepage hero | 0.42 → 0.36 | 96.01/251 → 311.03/129 | 36.23/84 → 26.93/42 | 0 → 0 |
| Ecosystem | 0.41 → 0.37 | 188.72/257 → 312.37/146 | 34.18/84 → 29.00/48 | 0 → 0 |
| GEMS | 0.01 → 0.59* | 0/0 → 33.49/218* | 0/0 → 49.79/270* | 0 → 0 |
| Kayla closed | 0.42 → 0.36 | 97.85/215 → 286.61/132 | 35.32/68 → 28.14/44 | 0 → 0 |
| Kayla open | 0.52 → 0.36 | 104.34/190 → 281.13/128 | 31.67/62 → 25.29/42 | 0 → 0 |
| Kayla streaming | 0.54 → 0.52 | 162.47/319 → 544.85/204 | 46.19/88 → 36.50/56 | 0 → 0 |

`*` The before trace did not capture GEMS work; the after trace does. Comparable states had lower task duration and fewer paint/raster calls, but cumulative raster duration rose. These trace totals can vary with the machine and the before run has only one sample; further raster profiling remains an open optimization item.

## Responsive captures

The 74 PNGs cover 1920, 1599, 1440, 1280, 768, and 390px: default ecosystem/GEMS, four product-hover states, four gemstone-focus states, and reduced-motion views at every width, plus the source mark and comparison image. The capture-only harness hides the fixed Kayla launcher so it does not cover screenshots; this does not change site or Kayla behavior.

- [CodeForge source mark vs. restored ecosystem](reference/codeforge-vs-ecosystem.png)
- [1440px ecosystem default](responsive/1440/homepage-default.png)
- [1440px GEMS default](responsive/1440/gems-default.png)
- [390px GEMS with Topaz focused](focus/390/gems-topaz.png)
- Full capture manifest: `capture.json`

## Verification

- Astro check: 116 files, 0 errors, 0 warnings, 1 pre-existing deprecation hint in `src/pages/forged.astro` (`document.execCommand`).
- Astro build: passed, 29 pages.
- Vitest: 62 files, 1,050 passed.
- Chromium E2E: 155 passed and 26 intentionally skipped. A first full run used `127.0.0.1` where one URL assertion expects `localhost`; the lone mismatch passed when rerun with the expected host. The focused GEMS visual/responsive suite passed 6/6.
- Content: 7 projects and 6 notes valid. Kayla drift/freshness: 0 errors and 0 warnings. Knowledge inventory: 0 broken references. Golden queries: 345/345 (100%). Internal links: 1,256 across 29 pages, 0 broken.
- The local `npm.ps1` shim points to a missing global npm CLI, so the equivalent direct Node/Astro/Vitest commands were used.
- The full E2E set included ecosystem geometry and reduced motion, GEMS responsive and accessibility, site-release, Kayla, CodeForge auth, support dialog, visitor counter, and animation lifecycle coverage.

## Changed files

- `src/components/FDSEcosystem.astro`
- `src/components/GemsLearningSystem.astro`
- `test/e2e/gems-visual-responsive.spec.ts`
- `test/ecosystem-orbits.test.ts`
- `test/gems-learning-visual.test.ts`
- `test/visual-evolution-contract.test.ts`
- `scripts/capture-visual-recovery.mjs`
- This report, the capture manifest, 74 PNG captures, and the after-performance JSON.

## Local state and deployment

Starting point: branch `main`, `c1402be` (`Lock true orbit rails and GEMS lineage modules`), with four local commits ahead of origin. The recovery is saved in a local commit above that starting point. The corrected preview remains available at `http://127.0.0.1:4337`.

NOT PUSHED — NOT DEPLOYED — AWAITING VISUAL APPROVAL
