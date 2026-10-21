# Website V2 baseline and recovery audit

## Repository and deployment boundary

- Repository: `Forger-Digital-Solutions/forger-digital-solutions.github.io`
- Production domain: `https://forgerdigitalsolutions.com`
- Recovery baseline: `d931201edd8570013b5e8c630060d88b5a7a72b3`
- V2 branch: `feature/fds-website-v2`
- Pull request: #3, targeting `main`; it must be reviewed and approved before merge.
- Framework: Astro, built as a static site.
- GitHub Pages: deployed by GitHub Actions from the `dist` artifact using `actions/deploy-pages`.

The earlier recovery audit found the repository's website sources intact and identified GitHub Pages configuration—not deletion of a local `FDSWebsite` folder—as the outage cause. Recovery restored Actions-based publishing and the public custom-domain site, then checked the live baseline at commit `d931201`. The V2 work is source-only until the pull request is approved and merged; successful local builds or pull-request checks do not prove production availability. No DNS, Pages setting, Cloudflare service, or production deployment has been changed by this branch.

## Architecture inventory

| Area | Canonical location | Responsibility |
|---|---|---|
| Routes and shared shell | `src/pages/`, `src/layouts/BaseLayout.astro` | Static routes, metadata, shared navigation, footer, and page shell |
| Canonical projects and status | `src/data/projects.ts`, `src/data/manifest.ts`, `src/data/products.ts` | Product scope, public availability, release facts, and project-page content |
| Homepage portfolio map | `src/components/PortfolioArchitecture.astro` | Product relationships and availability labels derived from project and manifest records |
| Product presentation | `src/components/ProductShowcase.astro`, `src/pages/projects/[slug].astro` | Release imagery and explicitly illustrative product architecture studies |
| Kayla knowledge | `src/data/kayla/`, `src/lib/kayla/` | Local answers, retrieval, conversation handling, and claim verification |
| Editorial notes | `src/content/notes/` | Published engineering notes; draft/superseded notes remain source history |
| Quality and deployment gates | `test/`, `test/e2e/`, `scripts/`, `.github/workflows/deploy.yml` | Unit, browser, content, knowledge, security, build, link, and deployment checks |

## Routes and source integrity

The current project catalog has seven routes: `/projects/codeforge`, `/projects/forgerems`, `/projects/forge-control`, `/projects/dead-trails-west`, `/projects/kayla-ai-publisher`, `/projects/we-the-people`, and `/projects/farmstand-finder`. The static build generates `dist/index.html` and all seven project pages.

The repository contains the Astro application, public assets, notes, deployment workflow, and tests; the V2 work does not depend on the former local `FDSWebsite` directory. No source-loss event was identified during recovery. Retired GEMS / Training Grounds and KyraBlox records are not part of the current project catalog; historical material remains in Git and superseded research notes are excluded from production routes.

## Evidence limits

Forge Control V23 certification, working provider integrations, and public release are not independently verified. Dead Trails West has no gameplay screenshots in this repository; its public illustration is labeled as CSS concept art, and owner-reported scenario tests are not full-game certification. Do not present these limitations as production failures or silently promote them to verified product capabilities.

## Current state

The V2 pull request is not a production deployment. Keep the Pages workflow, artifact, protected production configuration, and DNS settings unchanged unless the owner explicitly approves a separate action. Record the exact branch commit, refreshed check results, and merge/deployment evidence in the final handoff after validation.
