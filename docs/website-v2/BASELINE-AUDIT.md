# Website V2 baseline audit

## Repository and deployment baseline

- Repository: `Forger-Digital-Solutions/forger-digital-solutions.github.io`
- Production domain: `https://forgerdigitalsolutions.com`
- V2 branch: `feature/fds-website-v2`
- Starting commit: `d931201edd8570013b5e8c630060d88b5a7a72b3`
- Site framework: Astro, built as a static site.
- GitHub Pages publishing: GitHub Actions through `.github/workflows/deploy.yml`; the workflow builds `dist` and deploys it with `actions/deploy-pages`.
- Hosting recovery: the production outage was repaired in the preceding recovery work and verified against the live domain. The recovery commit above is the V2 base. V2 changes are local to this feature branch and have not been deployed.

## Architecture inventory

| Area | Canonical location | Responsibility |
|---|---|---|
| Routes and page shells | `src/pages/` | Astro routes for the homepage, projects, products, notes, support, and policy pages |
| Project records | `src/data/projects.ts` | Public portfolio descriptions, statuses, routes, and project-page sections |
| Product facts | `src/data/manifest.ts`, `src/data/products.ts` | Availability, release, integrity, and capability facts |
| Ecosystem diagrams | `src/data/ecosystem.ts`, `src/components/FDSEcosystem.astro`, `src/components/OneFDSEcosystem.astro` | Portfolio relationships and visual presentation |
| Kayla knowledge | `src/data/kayla/`, `src/lib/kayla/` | Local answers, retrieval, conversation handling, and claim verification |
| Editorial notes | `src/content/notes/` | Dated engineering and project history |
| Quality gates | `test/`, `test/e2e/`, `scripts/`, `.github/workflows/deploy.yml` | Unit, browser, content, knowledge, security, build, and link checks |

The Git repository contains the Astro application, public assets, content, deployment workflow, and tests. This V2 work does not depend on the former `FDSWebsite` directory. The repository is the source of truth.

## Routes and source integrity

The canonical current project routes are `/projects/codeforge`, `/projects/forgerems`, `/projects/forge-control`, `/projects/dead-trails-west`, `/projects/kayla-ai-publisher`, `/projects/we-the-people`, and `/projects/farmstand-finder`. The generated homepage is `dist/index.html`.

No source-loss event was found in the recovery work preceding this migration. The V2 change removes retired entries from the current public portfolio; it does not recreate the application or erase Git history. Historical GEMS notes remain in source as drafts/superseded records and are excluded from production note routes.

## State at this audit

The V2 working tree is uncommitted on `feature/fds-website-v2`. Production remains on the recovery baseline. Do not describe V2 as live until an approved pull request is merged and the resulting Pages deployment and custom domain are checked.
