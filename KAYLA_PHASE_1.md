# Kayla Copilot — Phase 1 Documentation

## How Kayla v0.1 Works

Kayla Copilot v0.1 is a client-side, knowledge-only assistant embedded in the FDS website. It requires no external AI provider, no vector database, and no streaming API calls.

### Architecture

1. **Knowledge Layer** (`src/data/kayla/`) — structured, public-only data derived from the existing site config, projects, products, and pages.
2. **Search Layer** (`src/lib/kayla/`) — lightweight keyword search with weighted scoring, aliases, and fallback answer synthesis.
3. **Action Layer** (`src/lib/kayla/actions.ts`) — an allow-listed action system that only performs pre-approved navigation.
4. **UI Layer** (`src/components/KaylaCopilot.astro` + `KaylaCopilot.ts`) — a floating launcher and chat panel with mobile-responsive behavior.

### Page Context

Every page injects a `window.__KAYLA_PAGE_CONTEXT__` object so Kayla can prioritize results relevant to the current page (e.g., showing app details when viewing a project page).

### No External AI

All answers are synthesized from structured knowledge. Recognized common questions return pre-composed answers. All other queries run through a local keyword search over the knowledge index.

---

## Knowledge Structure

```
src/data/kayla/
  types.ts              — shared interfaces
  index.ts              — master index, search provider, known answers
  company/
    fds.ts              — public FDS knowledge
    founder.ts          — public founder profile
  apps/
    index.ts            — app registry, aliases, resolver
    forgerems.ts        — ForgerEMS-specific knowledge and download resolver
  roadmap.ts            — normalized roadmap from projects
  community.ts          — community initiatives and donation info
  support.ts            — support contacts and FAQ
  ecosystem/
    forged.ts           — Forged storefront data
  downloads.ts          — structured download registry
```

### Single Source of Truth

Kayla reuses existing site data (`siteConfig`, `projects`, `products`, `labPrinciples`, `statusMeta`, `technologyCategories`) instead of duplicating it. Derived knowledge (aliases, normalized roadmap, download registry) is generated from these sources.

---

## How to Add a New App

1. Add the project to `src/data/projects.ts` (or product to `src/data/products.ts`).
2. The `apps` registry in `src/data/kayla/apps/index.ts` automatically picks it up via `mapProject` / `mapProduct`.
3. Add aliases in `appAliases` if users might search by shorthand names.
4. If the app needs special knowledge beyond what the generic mapper provides, add a dedicated file under `src/data/kayla/apps/` and import it in `src/data/kayla/index.ts`.

---

## How to Update ForgerEMS

ForgerEMS knowledge lives in two places:

1. **Product data** — `src/data/products.ts` (version, downloadUrl, docsUrl, platform, status).
2. **Kayla knowledge** — `src/data/kayla/apps/forgerems.ts` and the auto-generated entry in `src/data/kayla/downloads.ts`.

To update:
- Edit `src/data/products.ts` with the new version and download path.
- Place the new installer in `public/downloads/forger-ems/`.
- Update `src/data/kayla/apps/forgerems.ts` if the description or docs URL changes.
- The download registry (`downloads.ts`) auto-updates on next build.

---

## How to Add a Download

1. Add a `downloadUrl` to the product in `src/data/products.ts`.
2. Place the file in `public/downloads/`.
3. `src/data/kayla/downloads.ts` maps products with `downloadUrl` into the Kayla download registry automatically.

---

## How to Update Founder Information

Edit `src/data/kayla/company/founder.ts`. Only public-safe fields are included (name, role, publicBio, publicStory, vision, publicLinks). Do not add private data.

---

## How to Update Roadmap

Edit the `roadmap` field on individual projects in `src/data/projects.ts`. The `src/data/kayla/roadmap.ts` file normalizes these into the Kayla roadmap structure automatically.

---

## How to Update Community Content

- **Donations / Support** — `src/config/site.ts` (cashAppHandle, kofiUrl, supportEmail, etc.).
- **Hardware donations** — `src/config/site.ts` (hardwareDonationSubject, hardwareDonationBody, hardwareExamples).
- **Community initiatives** — `src/data/kayla/community.ts`.
- **Community-impact page copy** — `src/pages/community-impact.astro`.

---

## How Local Search Works

1. User submits a query.
2. The `LocalKaylaProvider.search()` method checks `knownAnswer()` for recognized common questions.
3. If no known answer matches, the query is tokenized and scored against all indexed documents.
4. Scoring weights: exact match (+10), prefix match (+5), substring match with minimum length (+2).
5. Results are sorted by score and the top 5 are returned.
6. If no results score above zero, a "not found" message is returned.

### Aliases

`src/data/kayla/apps/index.ts` exports `appAliases` and `resolveAppId()`. Aliases map shorthand search terms to canonical app IDs (e.g., "ems" -> "forgerems").

---

## How Phase 2 Can Plug Into the Knowledge Provider

Phase 2 should replace or wrap `LocalKaylaProvider` with a real AI-backed provider while keeping the same interface:

```ts
interface KaylaKnowledgeProvider {
  search(query: string): Promise<KaylaKnowledgeResult[]>;
}
```

The UI layer (`KaylaCopilot.ts`) calls `provider.search(query)` and renders `KaylaKnowledgeResult[]`. It does not care whether the provider uses local search, an LLM API, or a hybrid approach.

To add streaming or RAG later:
1. Create a new provider class implementing `KaylaKnowledgeProvider`.
2. Keep `KaylaSafeAction` and `KaylaKnowledgeResult` shapes stable.
3. Replace `createProvider()` in `KaylaCopilot.ts` with the new provider instantiation.
4. The action system (`executeAction`) and page context (`readGlobalContext`) remain unchanged.

---

## Security Boundary

The knowledge system only indexes explicitly listed data files:
- `src/config/site.ts`
- `src/data/projects.ts`
- `src/data/products.ts`
- `src/data/lab.ts`
- `src/data/status.ts`
- `src/data/technology.ts`
- `src/content/notes/**/*.md`

It does **not** blindly index:
- `.env` or `.env.*`
- `*.pem`, `*.key`
- `credentials*`, `secret*`, `token*`
- `node_modules/`, `.git/`, `private/`, `internal/`
- logs containing secrets

The action system only accepts allow-listed action types and rejects `javascript:` and `data:` URLs.

---

## Accessibility

- Launcher and panel use semantic `button`, `aside`, `role="dialog"`, `aria-label`, `aria-expanded`, `aria-controls`, `aria-modal`.
- Escape key closes the panel.
- Focus moves to the input when the panel opens.
- `prefers-reduced-motion` disables transitions.
- Touch targets are >= 44px.
- Mobile uses a bottom sheet with `env(safe-area-inset-bottom)`.

---

## Performance

- Kayla is rendered in `BaseLayout` but its client module only initializes on `DOMContentLoaded`.
- The full knowledge index is bundled with the client script (acceptable for the current data size; Phase 2 can lazy-load if needed).
- No external dependencies beyond the existing site bundle.
