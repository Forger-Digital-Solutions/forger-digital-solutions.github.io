# forger-digital-solutions.github.io

The official public website for **Forger Digital Solutions** (FDS).

## What this repository is

This is the source code for the FDS public website hosted at https://forgerdigitalsolutions.com

## Local development

```bash
npm install
npm run dev
```

### Kayla local preview

For a browser session that includes the real local Kayla Worker, set the free-route
credentials and rate-limit salt in the ignored `worker/.dev.vars`, then run:

```bash
npm run dev:kayla
```

This starts the site at `http://127.0.0.1:4337` and the local Worker at
`http://127.0.0.1:8788`. It only stops stale Astro/Wrangler processes that belong
to this checkout; another application using either port causes it to stop with a
clear message instead.

Your site will be available at http://localhost:4321

## Production build

```bash
npm run build
```

This creates a production-ready site in the `dist/` directory.

### CodeForge identity entry point

`/codeforge/sign-in` is a static, GitHub-only entry point for CodeForge Cloud. It sends the browser
to the public Cloud start endpoint with an exact return URL; it never contains OAuth client secrets,
access tokens, or repository credentials. Set `PUBLIC_CODEFORGE_AUTH_URL` at build time only when
the Cloud API is not `https://cloud.forgerdigitalsolutions.com`.

After building, run `npm run codeforge:secret-scan` to audit generated output for privileged OAuth
configuration and credential-like values. Browser identity login and GitHub App repository access
are intentionally separate authorities.

## Validation

```bash
npm run validate
```

This runs content validation (`scripts/validate-content.mjs`), Astro's type/content
checks, and a production build. The content check catches duplicate project/note
slugs, note→project relations that point at a missing project, invalid note dates,
and project media references whose files don't exist under `public/`.

Run the content check on its own with:

```bash
npm run validate:content
```

## Preview

```bash
npm run preview
```

Preview your production build locally.

## Adding a project

1. Edit `src/data/projects.ts`

2. Add a new project object with the following structure:
```typescript
{
  id: "project-id",
  slug: "project-id",
  name: "Project Name",
  category: "Category Name",
  summary: "Short public summary...",
  description: "Project description...",
  status: "ACTIVE DEVELOPMENT", // or "RESEARCH", "PRIVATE DEVELOPMENT", "PREVIEW / BETA", etc.
  featured: false,
  tags: ["tag1", "tag2"],
  focusAreas: ["Area one", "Area two"],   // optional
  building: ["What we're building..."],    // optional — "What We're Building" section
  roadmap: "High-level direction.",        // optional — feeds homepage "What's Ahead"
  accentColor: "#2f6bff",                   // optional — per-project accent
  visualStyle: "nodes",                     // optional — nodes|blocks|manuscript|civic|map
}
```

Status meanings are centralized in `src/data/status.ts`. Each project renders a
distinct abstract FDS visual identity (`src/components/ProjectVisual.astro`) chosen
by `visualStyle`; this is also the fallback when a project has no real screenshot.

3. Build and deploy.

## Adding project media

Real screenshots are optional. Every project page looks complete without them (it
falls back to the abstract FDS visual). To add real media, drop files under the
project's folder in `public/images/projects/<project>/` and reference them from
`src/data/projects.ts`:

```typescript
heroImage: {
  src: "/images/projects/kyrablox/editor-preview.webp",
  alt: "KyraBlox development interface"
},
gallery: [
  {
    src: "/images/projects/kyrablox/editor-preview.webp",
    alt: "KyraBlox development interface",
    caption: "Development preview"
  }
]
```

Prefer `.webp` at reasonable dimensions. An optional per-project social image can be
set with `ogImage: "/images/og/projects/<project>.png"` (falls back to the global
FDS OG image otherwise).

**Before adding any screenshot, make sure it does not expose:** API keys, local
usernames or file paths, private repositories, email addresses, cloud account IDs, or
any hidden project information. Do not add AI-generated fake product screenshots —
abstract FDS artwork is fine; fabricated UI of a nonexistent product is not.

## Founder photo

The About page shows a real founder photo when one is configured, and a clean `ES`
monogram fallback otherwise. To use a photo, place it at
`public/images/brand/edward-schmidt.png` and set it in `src/config/site.ts`:

```typescript
authorImage: "/images/brand/edward-schmidt.png"
```

Leave `authorImage` empty (`""`) to render the monogram fallback instead. The page is
designed to look intentional either way.

## Adding a Note (public engineering log)

Notes live in `src/content/notes/*.md` and are **public**. Create a Markdown file with
frontmatter:

```markdown
---
title: "Note title"
description: "One-line summary."
date: 2026-08-22            # YYYY-MM-DD (rendered in UTC)
category: "Research"        # Research | Development | Milestone | Release | Infrastructure | Website
projectSlug: "gems-training-grounds"   # optional — links the note to a project
tags: ["GEMS", "Research"]
draft: false                # drafts are hidden in production builds
---

Note body in Markdown.
```

When `projectSlug` matches a project, the note gets a project badge and appears under
that project's **Latest Project Updates**. Notes are curated writing — do not paste raw
commit messages, private phase reports, secrets, or internal architecture into them.

## Support & social configuration

All support methods and social accounts are centralized in `src/config/site.ts`.
The UI (header, footer, `/support`, the first-visit support dialog) reads from
this one file — nothing is hardcoded in components.

### Adding or changing a social account

Edit `src/config/site.ts`:

```typescript
githubUrl: "https://github.com/forger-digital-solutions",
youtubeUrl: "https://www.youtube.com/@Forger_Digital_Solutions",
discordUrl: "https://discord.gg/…",
linkedinUrl: "https://www.linkedin.com/in/…",
tiktokUrl: "",   // empty = TikTok stays hidden everywhere on the site
```

To enable TikTok, set `tiktokUrl` to the **real** profile URL, e.g.
`"https://www.tiktok.com/@forgerdigitalsolutions"` — only once that handle is
confirmed by the founder. While it is empty, every social slot (header icons,
footer links) simply omits TikTok. Never invent a username. The content
validator accepts an empty value but rejects a non-empty value that isn't a
`tiktok.com` URL.

### Updating Cash App

```typescript
cashAppHandle: "$ForgerDigital",
cashAppUrl: "https://cash.app/$ForgerDigital",
```

Both fields must stay consistent (`https://cash.app/$Handle`). The handle is
shown visibly on `/support` with a copy-to-clipboard button, and used by the
first-visit support dialog.

### Adding Ko-fi

```typescript
kofiUrl: "https://ko-fi.com/forgerdigitalsolutions",
```

`supportUrl` is kept as a legacy alias of the Ko-fi URL for existing
components. If `kofiUrl` were ever emptied, Ko-fi CTAs disappear gracefully —
the validator treats it as optional-but-validated.

### Hardware donation email

Hardware donations never publish a physical address. The CTA on
`/support/hardware` builds a `mailto:` from the public support email plus the
prefilled subject/body:

```typescript
supportEmail: "forgerdigisolsupport@gmail.com",
hardwareDonationSubject: "FDS Hardware Donation",
hardwareDonationBody: `…`,   // asks for device/model, specs, condition,
                             // approximate location, shipping possibility
```

### Activating community funding later

Community-project funding is **disabled** and must stay separate from FDS
development/hardware support. Before exposing any community-funding CTA:

1. A real mechanism must exist (dedicated account, fiscal sponsorship, etc.).
2. Set `communityFundingUrl` to the live contribution destination.
3. Only then flip `communityFundingActive` to `true`.
4. Wallet transparency fields (`communityWalletAddress`, `-Network`,
   `-Type`, `-Threshold`) must be either all populated or all empty — partial
   configuration fails validation. Do not publish any wallet data until it is
   real and intended to be public; do not select a multisig threshold until
   the signer setup actually exists.
5. `communityLedgerUrl` can be added whenever a public ledger exists.

**Never commit** crypto private keys, seed phrases, payment secrets, API keys,
or private/home addresses — not in config, not anywhere. The site needs no
secrets to run any of these features.

## Project structure

```
├── public/
│   ├── images/
│   │   ├── brand/         # Logo + founder photo
│   │   ├── projects/      # Per-project media (screenshots, etc.)
│   │   └── og/            # Social share images
│   ├── favicon.svg
│   ├── favicon.ico
│   └── robots.txt         # Search engine configuration
├── scripts/
│   └── validate-content.mjs  # Content validation (slugs, relations, media)
├── src/
│   ├── components/        # Reusable UI components
│   ├── config/            # Site-wide configuration
│   ├── content/notes/     # Public engineering-log notes (Markdown)
│   ├── data/              # Project, status, technology, and lab data
│   ├── layouts/           # Page layouts
│   ├── lib/               # Content helpers
│   ├── pages/             # Route pages
│   └── styles/            # Global styles
├── .github/
│   └── workflows/         # GitHub Actions
├── astro.config.mjs       # Astro configuration
├── package.json
└── tsconfig.json
```

## Deployment

This site is automatically deployed via GitHub Actions when changes are pushed to the main branch. The workflow is defined in `.github/workflows/deploy.yml`.

## GitHub-first development

The GitHub repository is the source of truth; development does not depend on the original `FDSWebsite` folder or a full checkout on the owner's Windows drive. When GitHub Codespaces is available for the repository, open a Codespace from `main`, create a feature branch, and use its terminal for the project commands above. For lightweight edits, `github.dev` can edit files in a branch, but it does not provide the terminal needed to run the full validation suite.

Open a pull request into `main` for each change. The deployment workflow runs its dependency security gate, production build/unit gates, and Playwright browser certification on pull requests; the Pages deploy job is skipped for pull requests. Merge only after those checks pass. A push to `main` then runs the same gates and publishes the tested `dist/` site through GitHub Actions. No Pages credentials or Cloudflare Worker secrets are needed to build the static website.

Protect `main` in repository settings: require pull requests, require the `Dependency Security Gate`, `Unit, Kayla Gates & Production Build`, and `Playwright Browser Certification` checks, dismiss stale approvals after new commits, require conversation resolution, and block force pushes and branch deletion. Keep administrators subject to these rules where practical. Git history and GitHub Actions are not independent backups; periodically mirror the repository or create an encrypted `git bundle` backup in storage outside the GitHub organization, and verify that a restore works.

## License

MIT
