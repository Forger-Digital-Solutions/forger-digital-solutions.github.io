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

This runs Astro's type/content checks, verifies every configured certification PDF exists, and creates a production build.

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
}
```

3. Build and deploy.

## Adding a certification

1. Copy the public PDF into:
   ```
   public/certifications/
   ```

2. Add its metadata to `src/data/certifications.ts`:
```typescript
{
  title: "Certification Title",
  issuer: "Issuing Organization",
  date: "2024-01-01",
  description: "Brief description",
  category: "Technical",
  pdf: "/certifications/filename.pdf"
}
```

3. Run the complete validation:
   ```bash
   npm run validate
   ```

4. Verify locally with `npm run dev` if needed.

5. Commit and push. GitHub Pages deployment publishes it automatically.

> **Security Warning**: Files placed in `public/certifications/` are publicly accessible after deployment. Do not publish certificates containing private identification numbers, a home address, private account data, signatures not intended for publication, QR codes exposing private information, or other personally sensitive identifiers.

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
│   ├── certifications/    # Upload certification PDFs here
│   ├── images/            # Project images and assets
│   └── robots.txt         # Search engine configuration
├── src/
│   ├── components/        # Reusable UI components
│   ├── config/            # Site-wide configuration
│   ├── data/              # Project and certification data
│   ├── layouts/           # Page layouts
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
