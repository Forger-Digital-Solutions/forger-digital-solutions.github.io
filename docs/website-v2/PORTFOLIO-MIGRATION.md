# Portfolio and product-presentation overhaul

## Portfolio model

The homepage presents a portfolio relationship map instead of the former orbit visualization. It groups CodeForge and its Forge AAA architecture, the separate Forge Control project, Dead Trails West, and ForgerEMS by their distinct roles. The map derives availability labels from canonical project and manifest data and links to the existing project routes. The remaining catalog entries stay discoverable in the additional-development row and project directory.

Forge AAA is nested under CodeForge, never represented as a separate release. Forge Control remains a distinct active-development project. Dead Trails West is a private game project. ForgerEMS remains a public preview with its existing release and video experience.

## Evidence-aware product stories

- CodeForge's actual v0.2.0 interface image is labeled as a released product screenshot.
- Forge AAA and Forge Control use explanatory diagrams labeled as architecture/development direction, not screenshots or proof of shipped integrations.
- Dead Trails West uses original CSS setting art labeled as illustrative, not gameplay footage. The repository has no approved gameplay screenshot.
- ForgerEMS keeps its preview poster, existing release links, and click-to-load video facade.
- Owner-reported test summaries and unverified V23/provider integration claims remain explicitly qualified.

The project detail routes add focused CodeForge/Forge AAA, Forge Control, and Dead Trails West showcases while retaining their canonical sections, availability metadata, release paths, related links, and structured data.

## Retired entries and history

- GEMS / Training Grounds and KyraBlox are excluded from the current product catalog and visitor-facing recommendations.
- Historical names remain in Git history, source notes, and negative/safeguard tests where needed to preserve provenance and prevent false current claims.
- Superseded notes are drafts and are excluded from production notes routes.

## Compatibility and deployment

The Astro static-site architecture, existing GitHub Pages Actions workflow, product routes, CodeForge/ForgerEMS release links, Kayla, support pages, and security gates remain in place. This work is on `feature/fds-website-v2` and is reviewed through pull request #3. It is not merged or deployed.
