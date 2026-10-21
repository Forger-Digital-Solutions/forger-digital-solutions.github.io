# Website V2 design system

## Direction

The V2 homepage is product-led: a clear studio statement, a relationship map, focused product showcases, evidence-aware development status, and secondary company information. The existing FDS dark/blue identity, Inter typography, Astro shell, shared navigation, and responsive component approach remain in use; the old homepage orbital composition is no longer the primary portfolio visualization.

## Reusable surfaces

- `Header.astro` exposes Products, CodeForge, Forge Control, Dead Trails West, Releases, Engineering, and Company. The mobile navigation retains the secondary route list.
- `PortfolioArchitecture.astro` groups the seven current projects and the CodeForge/Forge AAA relationship; project status labels derive from canonical manifest records.
- `ProductShowcase.astro` supports the released CodeForge screenshot, ForgerEMS preview media, and labeled conceptual architecture/setting illustrations.
- `src/pages/projects/[slug].astro` adds bespoke Forge AAA, Forge Control, and Dead Trails West detail treatments without replacing canonical status, release, related-link, or project-section content.
- `Footer.astro` keeps project, company, developer, social, and legal navigation.
- `BaseLayout.astro` retains metadata, skip navigation, reduced-motion-aware reveals, the background, and Kayla.

## Design and accessibility constraints

- A product screenshot must be genuine media. CSS diagrams and setting studies must identify themselves as illustrative and never imply gameplay, shipped integrations, or certification.
- Keep status and release facts sourced from canonical project/product records; active development is not availability.
- Preserve keyboard focus, meaningful link names, semantic headings, 360px–wide mobile layouts, reduced-motion support, and the existing ForgerEMS video facade.
- Avoid continuous animation in the portfolio map and product showcase; keep existing ambient animation lifecycle and reduced-motion gates.
- Use the existing font, color, radius, and spacing tokens. `global.css` provides shared responsive type, focus, and anchor-target behavior.

## Verification approach

Run the updated Playwright map and project-showcase gates at narrow phone, phone, tablet, desktop, and wide-desktop widths. Check overflow, keyboard navigation, accessible status/link text, and serious axe violations. Also run the retained release, support-dialog, ForgerEMS video, Kayla shell, reduced-motion, and page-visibility tests. Local visual review is not production certification.
