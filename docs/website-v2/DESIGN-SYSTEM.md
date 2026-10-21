# Website V2 design system

## Direction

The migration retains the existing Astro design system and FDS visual identity. It changes portfolio hierarchy and copy rather than replacing the site's layout, interaction model, or component architecture.

## Reusable surfaces

- `src/components/Header.astro` and `Footer.astro` provide shared site navigation.
- `FDSEcosystem.astro` and `OneFDSEcosystem.astro` render portfolio relationships from ecosystem data.
- Project cards and detail pages use `src/data/projects.ts` as their source.
- Kayla's widget remains on the existing components and interaction path.

## Design constraints

- Keep the established typography, color tokens, spacing, responsive breakpoints, and reduced-motion behavior in `src/styles/global.css` and existing components.
- Keep visual and ecosystem data sourced from canonical records; do not restore diagram elements for retired portfolio entries.
- Preserve keyboard access, focus behavior, touch layouts, and accessible labels.
- Avoid unverified capability badges or product integrations. Forge Control's visual/copy treatment must not imply a public release.
- Keep CodeForge, ForgerEMS, and their release paths distinct from unreleased project descriptions.

## Verification

Run the content consistency, ecosystem geometry, visual evolution, responsive browser, and accessibility tests after design changes. Use the existing Playwright configuration and capture evidence for failures; do not use production as a preview environment.
