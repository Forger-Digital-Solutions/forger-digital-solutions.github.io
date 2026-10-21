# Portfolio migration

## Intended public portfolio

The homepage, project catalog, navigation, ecosystem diagrams, and Kayla's visitor-facing recommendations now emphasize CodeForge / Forge AAA, Forge Control, and Dead Trails West. The remaining current project entries are preserved in the seven-project catalog; this is a portfolio reorganization, not a replacement site.

## Retired entries and history

- GEMS / Training Grounds and KyraBlox were removed from the current project records, generated project routes, and current recommendations.
- Direct legacy-name queries receive a current-portfolio response linking to `/projects`; old facts are not promoted as present-day product status.
- Internal verifier safeguards may still recognize historical names to reject fabricated downloads, benchmarks, or relationships. This is defensive validation, not a public catalog entry.
- Superseded GEMS notes remain in the repository for historical provenance, marked `draft: true` and `state: "superseded"`. Production note listings and static detail routes both exclude drafts.
- Forge AAA is represented as a CodeForge architecture workstream, not a standalone product.
- Forge Control copy remains limited to verified public facts.

## Implementation surfaces

The migration updates canonical project and manifest data, project routes, homepage and informational copy, navigation, ecosystem rendering, Kayla's knowledge and response checks, generated-route expectations, and the Kayla golden-query suite. Tests retain coverage for retired-name safeguards while asserting the new public behavior.

## Compatibility and deployment

The static Astro architecture, existing release links, current products, support pages, and the recovered GitHub Pages workflow are retained. A pull request review and owner-approved merge are required before production changes. The V2 branch has not been deployed.
