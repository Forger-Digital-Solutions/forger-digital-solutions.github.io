# forger-digital-solutions.github.io

The official public website for **Forger Digital Solutions** (FDS).

## What this repository is

This is the source code for the FDS public website hosted at https://forger-digital-solutions.github.io

## Local development

```bash
npm install
npm run dev
```

Your site will be available at http://localhost:4321

## Production build

```bash
npm run build
```

This creates a production-ready site in the `dist/` directory.

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
  status: "ACTIVE DEVELOPMENT", // or "ACTIVE RESEARCH", "PRIVATE DEVELOPMENT", etc.
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

## Updating support link

The Ko-fi support URL is defined in `src/config/site.ts`:

```typescript
export const siteConfig = {
  // ...
  supportUrl: "https://ko-fi.com/forgerdigitalsolutions"
};
```

Update the `supportUrl` value to change the support button destination.

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

## License

MIT
