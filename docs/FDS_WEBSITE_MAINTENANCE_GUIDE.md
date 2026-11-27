# FDS Website Maintenance Guide — Operation Digital Forge II

> **Audience:** Executive owner, engineering contributors, and future autonomous coding agents
> **Canonical Governance:** [`DESIGN.md`](../DESIGN.md) · [`BRAND_GUIDELINES.md`](../BRAND_GUIDELINES.md) · [`docs/FDS_PUBLICATION_GOVERNANCE.md`](./FDS_PUBLICATION_GOVERNANCE.md)
> **Last Updated:** 2026-11-26

---

## 1. Single-Source-of-Truth Data Files

Avoid editing hardcoded status badges, routes, or solution summaries across multiple `.astro` files. Update the structured data layer first:

| Data File | What It Controls | Validation Script |
| :--- | :--- | :--- |
| `content/public-status/registry.json` | All 14 technology/model/product lifecycle statuses, availability badges, verified capabilities, limitations, non-claims, and Kayla retrieval entries | `npm run validate:content` + `npm run kayla:knowledge-check` |
| `content/solutions/solutions.json` | 3 commercial markets, 6 audience solution pages (`/solutions/[slug]/`), 5 personalization layers, Hackmanite 10-role & Cinnabar 8-role workforces, BattleVerse illustrative Arena scenarios, Jaspilite 5-tier provider ladder, Alexandrite 7-stage pipeline, and 6 `/contact/` inquiry tracks | `npm test` (`test/operation-digital-forge-ii.test.ts`) |
| `content/evaluations/evaluations.json` | 11 mandatory benchmark fields, website engineering baselines, and future authorized model benchmark exports | `npm run validate` |
| `content/publications/updates.json` | Newsroom dispatches (`/news/`) | `npm run validate` |
| `src/data/manifest.ts` | Legacy software versions, SHA-256 digests (`ForgerEMS`, `CodeForge`), and status strip metadata | `test/content-consistency.test.ts` |
| `src/data/kayla/*` + `test/kayla/golden-queries.json` | Kayla Copilot canonical answers, safe actions, routes (`62`), and golden regression suite (`365` queries) | `npm run kayla:golden` + `npm test` |

---

## 2. How to Publish New Private Research, Models, or Builds Safely

When local engineering milestones (`Hackmanite S22`, `Cinnabar Oracle` confirmation evals, `Jaspilite` signed installer, `BattleVerse` live release, or `State Lines` official media) are ready for publication:

1. **Generate Sanitized Exports:** Produce the sanitized JSON/Markdown artifacts specified in [`docs/FDS_PRIVATE_EXPORT_REQUIREMENTS.md`](./FDS_PRIVATE_EXPORT_REQUIREMENTS.md) with zero local paths (`Z:\`, `C:\Users\`), credentials, or customer data.
2. **Update `registry.json` & `evaluations.json`:** Transition `development_status` and `availability` only to schema-approved enum values in `docs/FDS_MODEL_STATUS_SCHEMA.json`. Attach all 11 mandatory benchmark disclosure fields before publishing any numeric model score.
3. **Update Visual Assets Responsibly:** Optimize new photography/screenshots to dual-width WebP (`1600px` desktop + `800px` `-sm.webp` mobile) under `public/images/forge/`, add provenance entries to `BRAND_GUIDELINES.md`, and label concept art vs. real software output accurately.
4. **Update Kayla & Golden Queries:** Confirm `src/data/kayla/answers.ts` and `test/kayla/golden-queries.json` reflect the newly verified release, and verify `npm run kayla:golden` stays at `100%` Tier 1.
5. **Run the Mandatory Local Pre-Push Gate:**
   ```bash
   npm audit --audit-level=high
   npm audit --omit=dev --audit-level=high
   pnpm --dir worker audit --audit-level high
   npm test
   npm run kayla:deploy:check
   npm run worker:build
   npm run validate
   npm run kayla:secret-scan
   npm run test:e2e
   ```

---

## 3. Adding or Updating Commercial Pricing (Owner Approval Gate)

Unapproved internal pricing hypotheses and revenue projections are intentionally blocked from public pages by `scripts/validate-content.mjs` and `test/operation-digital-forge-ii.test.ts`. When the executive owner formally approves commercial pricing tiers:
1. Document owner sign-off in the release PR description.
2. Add approved tiers cleanly into `content/solutions/solutions.json` with explicit billing/currency disclosures and real payment/contract links (never fake checkout buttons).
3. Update `test/operation-digital-forge-ii.test.ts` to assert exact approved tier values while continuing to block unapproved legacy internal forecast strings.

---

## 4. Preserving Visual & Accessibility Governance

Before merging any UI change:
- Verify contrast (`>= 4.5:1` normal text, `>= 3.0:1` large text/UI) against `DESIGN.md` tokens.
- Verify `0px` horizontal overflow across `360px` to `2560px` and `0` critical/serious `@axe-core/playwright` WCAG 2.2 AA violations.
- Verify `prefers-reduced-motion: reduce` leaves every section visible (`opacity: 1`).
- Never introduce external font CDNs, third-party analytics trackers, fake forms, or copyrighted franchise artwork.
