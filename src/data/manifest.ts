import generatedArchives from './generated-archives.json' with { type: 'json' };

/**
 * FDS CANONICAL PRODUCT MANIFEST
 *
 * This file is the single source of truth for public product/project facts that
 * repeat across the website: statuses, taglines, categories, capabilities,
 * limitations, non-claims, technologies, links, and archive integrity data.
 * Pages, cards, the ecosystem, the status strip, and Kayla's knowledge base
 * should derive repeated truths from here instead of restating them by hand.
 *
 * Rules:
 * - publicStatus uses canonical values; `projectStatus` mapping feeds legacy
 *   ProjectStatusValue consumers without letting statuses drift.
 * - `nonClaims` exist so the site can state what a product does NOT do.
 * - Archive records are only published when a real artifact exists; the
 *   archive manifest (src/data/generated-archives.json) is generated from the
 *   actual bytes by scripts/generate-project-archives.mjs and verified in tests.
 * - Do not invent versions, prices, partners, or availability here.
 */

export type ProductGroup = 'build' | 'create' | 'knowledge';

/** Canonical public statuses. `label` is the display wording used site-wide. */
export type CanonicalStatus =
  | 'public-release'
  | 'public-preview'
  | 'active-development'
  | 'active-ai-research'
  | 'private-development'
  | 'concept';

export const canonicalStatusLabels: Record<CanonicalStatus, string> = {
  'public-release': 'Public Release',
  'public-preview': 'Public Preview',
  'active-development': 'Active Development',
  'active-ai-research': 'Active AI Research',
  'private-development': 'Private Development',
  concept: 'Concept',
};

/** Maps canonical statuses onto the legacy ProjectStatusValue enum. */
export const canonicalToProjectStatus: Record<
  CanonicalStatus,
  'RELEASED' | 'PREVIEW / BETA' | 'ACTIVE DEVELOPMENT' | 'RESEARCH' | 'PRIVATE DEVELOPMENT' | 'CONCEPT'
> = {
  'public-release': 'RELEASED',
  'public-preview': 'PREVIEW / BETA',
  'active-development': 'ACTIVE DEVELOPMENT',
  'active-ai-research': 'RESEARCH',
  'private-development': 'PRIVATE DEVELOPMENT',
  concept: 'CONCEPT',
};

/** Publication state of a project's source/project archive. */
export type ArchiveStatus = 'public' | 'not-published' | 'private' | 'not-applicable';

export interface ArchiveRecord {
  available: boolean;
  /** Why the archive is or is not published; the site fails closed when uncertain. */
  status: ArchiveStatus;
  /** One-line policy reason, shown in the Releases archive status table. */
  policy?: string;
  filename?: string;
  url?: string;
  sha256?: string;
  sizeBytes?: number;
  sourceCommit?: string;
  sourceRef?: string;
  verifiedAt?: string;
}

export interface ProductManifestEntry {
  id: string;
  name: string;
  shortName: string;
  /** Conceptual layer used by the ecosystem and portfolio grouping. */
  group: ProductGroup;
  category: string;
  tagline: string;
  oneLineDescription: string;
  canonicalStatus: CanonicalStatus;
  /** One-line statement of where development currently stands. */
  developmentStatus: string;
  /** Short statement of the current engineering focus (not necessarily shipped). */
  currentFocus?: string;
  version?: string;
  /** Public release distribution can be paused without erasing release history. */
  distributionPaused?: boolean;
  distributionNotice?: string;
  /** Ordered nodes for the homepage product-status strip. */
  homepageStrip?: boolean;
  capabilities: string[];
  limitations: string[];
  /** Explicit statements of what this product does not do or is not. */
  nonClaims: string[];
  technologies: string[];
  projectUrl?: string;
  releaseUrl?: string;
  githubUrl?: string;
  docsUrl?: string;
  archive: ArchiveRecord;
  /** Date the manifest facts for this entry were last reconciled. */
  lastVerified: string;
}

/**
 * Archive records for projects without a published source archive. Publication
 * requires an approved public release state: repository visibility alone is not
 * authorization — licensing and project policy decide (fail closed).
 */
const archiveNotPublished = (status: ArchiveStatus, policy: string): ArchiveRecord => ({
  available: false,
  status,
  policy,
});

const generated = (id: string): ArchiveRecord => {
  const record = generatedArchives.archives.find((a) => a.id === id);
  if (!record) return archiveNotPublished('not-published', 'No generated archive exists for this project yet.');
  return {
    available: true,
    status: 'public',
    filename: record.filename,
    url: record.url,
    sha256: record.sha256,
    sizeBytes: record.sizeBytes,
    sourceCommit: record.sourceCommit,
    sourceRef: record.sourceRef,
    verifiedAt: record.generatedAt,
  };
};

const VERIFIED = '2026-09-12';

export const productManifest: ProductManifestEntry[] = [
  {
    id: 'codeforge',
    name: 'CodeForge',
    shortName: 'CodeForge',
    group: 'build',
    category: 'Autonomous Software Engineering',
    tagline: 'Free-first autonomous software engineering for Windows, CLI, and editors.',
    oneLineDescription:
      'Inspects repositories, plans engineering work, edits code through controlled tools, runs checks, and reviews the result while refusing paid inference.',
    canonicalStatus: 'public-release',
    developmentStatus:
      'The last version listed on this website was v0.2.0 for Windows 10/11 x64. Installer and portable downloads are temporarily paused while the release is updated; active development continues on a separate line.',
    currentFocus:
      'Forge AAA architecture, model-routing reliability, runtime efficiency, and deeper repository intelligence.',
    version: 'v0.2.0',
    distributionPaused: true,
    distributionNotice: 'CodeForge downloads are temporarily paused while the release is updated. This website does not provide the current installer.',
    homepageStrip: true,
    capabilities: [
      'Repository understanding and inspection',
      'Autonomous task planning',
      'Tool execution under governance',
      'Controlled code editing',
      'Testing and verification',
      'Review of its own work',
      'Developer approvals and steering',
      'Multiple verified zero-cost model providers through dynamic routing',
      'Windows desktop, CLI, and VS Code surfaces from one runtime',
    ],
    limitations: [
      'Windows 10/11 x64 only in the current release',
      'Builds are unsigned; Windows may show an unknown-publisher warning',
      'Free provider capacity can be quota-limited; unlimited model availability is not promised',
    ],
    nonClaims: [
      'Never silently falls back to paid inference',
      'Does not run local LLMs',
      'Does not promise unlimited model availability',
    ],
    technologies: ['TypeScript', 'Node.js', 'Electron', 'React', 'SQLite', 'Git', 'VS Code'],
    projectUrl: '/projects/codeforge',
    githubUrl: 'https://github.com/Forger-Digital-Solutions/CodeForge',
    docsUrl: 'https://github.com/Forger-Digital-Solutions/CodeForge#readme',
    archive: generated('codeforge'),
    lastVerified: '2026-10-19',
  },
  {
    id: 'forgerems',
    name: 'ForgerEMS',
    shortName: 'ForgerEMS',
    group: 'build',
    category: 'Technician Workbench',
    tagline: 'Windows technician workbench for diagnostics, maintenance, and repair.',
    oneLineDescription:
      'USB toolkit creation, drive validation, USB and port intelligence, system information, driver guidance, and local-first diagnostics in one Windows application.',
    canonicalStatus: 'public-preview',
    developmentStatus:
      'v1.2.4-preview.1 is a public preview. Features and packaging may change between preview builds.',
    currentFocus: 'Technician workflows, recovery tooling, and repair-oriented utilities.',
    version: 'v1.2.4-preview.1',
    homepageStrip: true,
    capabilities: [
      'USB toolkit creation',
      'Drive validation',
      'USB and port intelligence',
      'System information',
      'Driver Hub / vendor guidance',
      'Local-first diagnostics',
      'Portable and installer Windows packaging',
    ],
    limitations: [
      'Windows only',
      'Public preview; capabilities may change between builds',
      'v1.2.4-preview.1 binaries are unsigned; Windows SmartScreen may warn',
      'Installer lifecycle certification is not complete',
    ],
    nonClaims: [
      'Preview software is not presented as a final release',
      'Not certified as production-ready or Microsoft Verified',
    ],
    technologies: ['Windows', 'USB tooling', 'Diagnostics', 'WPF', '.NET 8'],
    projectUrl: '/projects/forgerems',
    releaseUrl: 'https://github.com/Forger-Digital-Solutions/ForgerEMS/releases/tag/v1.2.4-preview.1',
    githubUrl: 'https://github.com/Forger-Digital-Solutions/ForgerEMS',
    docsUrl: 'https://github.com/Forger-Digital-Solutions/ForgerEMS#readme',
    archive: archiveNotPublished(
      'not-published',
      'Repository is publicly viewable, but the ForgerEMS license is proprietary and forbids redistribution; a source archive is not distributed.'
    ),
    lastVerified: '2026-10-08',
  },
  {
    id: 'forge-control',
    name: 'Forge Control',
    shortName: 'Forge Control',
    group: 'build',
    category: 'Engineering Governance',
    tagline: 'A separate FDS development effort focused on governed software delivery.',
    oneLineDescription:
      'Forge Control is in active development; no public release, integration, or specific user-facing capability is verified for this website.',
    canonicalStatus: 'active-development',
    developmentStatus: 'Active development; implementation details and integrations are not publicly verified.',
    currentFocus: 'Product definition and implementation.',
    homepageStrip: true,
    capabilities: [],
    limitations: [
      'No public release or download is available',
      'Specific integrations and user-facing capabilities have not been verified from an accessible source repository',
    ],
    nonClaims: [
      'No live service or public integration is claimed',
      'No specific feature is represented as shipped',
    ],
    technologies: ['Software engineering', 'Governance', 'Verification'],
    projectUrl: '/projects/forge-control',
    archive: archiveNotPublished('private', 'Active development; no public source archive is published.'),
    lastVerified: '2026-10-20',
  },
  {
    id: 'dead-trails-west',
    name: 'Dead Trails West',
    shortName: 'Dead Trails West',
    group: 'create',
    category: 'Historically Grounded Game',
    tagline: 'A historically grounded Western game in active private development.',
    oneLineDescription:
      'A story-driven Western game project targeting Unreal Engine 4.27; owner-reported persistent-world simulation work has not been independently verified for this website.',
    canonicalStatus: 'private-development',
    developmentStatus: 'Private development; no public release or downloadable build is available.',
    currentFocus: 'World simulation, playable systems, and evidence-based Unreal integration.',
    homepageStrip: true,
    capabilities: [
      'An 1882 setting documented in current project records',
      'Unreal Engine 4.27 is the stated target engine',
    ],
    limitations: [
      'No public release or download is available',
      'Persistent-world simulation work and live engine behavior have not been independently verified',
    ],
    nonClaims: [
      'No release date or playable public build is claimed',
      'Owner-reported simulation work is not presented as verified or finished gameplay',
    ],
    technologies: ['Unreal Engine 4.27', 'Blender'],
    projectUrl: '/projects/dead-trails-west',
    githubUrl: 'https://github.com/Forger-Digital-Solutions/DeadTrailsWest',
    docsUrl: 'https://github.com/Forger-Digital-Solutions/DeadTrailsWest',
    archive: archiveNotPublished('private', 'Private game development; source and assets are not distributed from this site.'),
    lastVerified: '2026-10-21',
  },
  {
    id: 'kayla-publisher',
    name: 'Kayla Publisher',
    shortName: 'Kayla',
    group: 'create',
    category: 'Creative Project & Publishing Workspace',
    tagline: 'Creative/publishing software for long-form work.',
    oneLineDescription:
      'A continuous creative workspace for manuscripts, chapters, characters, revision, visual storytelling, and publishing preparation.',
    canonicalStatus: 'active-development',
    developmentStatus: 'In active development. No public release is currently listed.',
    capabilities: [
      'Manuscript structure and organization',
      'Draft and chapter development',
      'Character and continuity tracking',
      'Editing and revision support',
      'Visual storytelling direction',
      'Publishing preparation',
    ],
    limitations: ['No public release is currently listed'],
    nonClaims: [
      'The FDS website assistant is a separate guide — not the Kayla Publisher product',
      'No public availability is claimed',
    ],
    technologies: ['Creative tooling', 'Publishing workflows'],
    projectUrl: '/projects/kayla-ai-publisher',
    archive: archiveNotPublished('private', 'Private development; source is not public.'),
    lastVerified: VERIFIED,
  },
  {
    id: 'we-the-people',
    name: 'We The People Library',
    shortName: 'We The People',
    group: 'knowledge',
    category: 'Offline Knowledge Platform',
    tagline: 'Practical knowledge that stays available offline.',
    oneLineDescription:
      'An offline-first knowledge library designed to keep practical reference material — civics, public information, science, engineering, trades, agriculture, mathematics, and general reference — available when connectivity is not.',
    canonicalStatus: 'private-development',
    developmentStatus:
      'Private development. The platform direction spans offline-first access, local knowledge storage, and structured discovery.',
    capabilities: [
      'Offline-first access',
      'Local knowledge storage',
      'Structured discovery',
      'Source provenance',
      'Reliability and resilience',
    ],
    limitations: [
      'In private development; offline packaging is not presented as complete',
      'Implementation details remain private during active development',
    ],
    nonClaims: ['Offline packages are not claimed as complete'],
    technologies: ['Offline-first architecture', 'Local storage', 'Structured content'],
    projectUrl: '/projects/we-the-people',
    archive: archiveNotPublished('private', 'Private development; source is not public.'),
    lastVerified: VERIFIED,
  },
  {
    id: 'farmstand-finder',
    name: 'FarmStand Finder',
    shortName: 'FarmStand Finder',
    group: 'knowledge',
    category: 'Local Discovery',
    tagline: 'Nearby discovery for local food and the people who grow it.',
    oneLineDescription:
      'Helps people find nearby farms, roadside stands, markets, CSAs, producers, and community gardens with practical details that make a trip worthwhile.',
    canonicalStatus: 'active-development',
    developmentStatus: 'In active development around nearby discovery and producer visibility.',
    capabilities: [
      'Nearby discovery',
      'Farms and growers',
      'Markets and stands',
      'Seasonal availability context',
      'Community listings',
    ],
    limitations: ['Live inventory, payments, and subscription management are not part of the public scope'],
    nonClaims: ['Does not claim live inventory, payments, or subscription management'],
    technologies: ['Local discovery', 'Mapping', 'Community listings'],
    projectUrl: '/projects/farmstand-finder',
    archive: archiveNotPublished('private', 'Private development; source is not public.'),
    lastVerified: VERIFIED,
  },
];

export const manifestById: Record<string, ProductManifestEntry> = Object.fromEntries(
  productManifest.map((entry) => [entry.id, entry])
);

/** Canonical manifest entry for a project slug (projectUrl-derived). */
export const manifestByProjectSlug: Record<string, ProductManifestEntry> = Object.fromEntries(
  productManifest
    .filter((entry) => entry.projectUrl?.startsWith('/projects/'))
    .map((entry) => [entry.projectUrl!.replace('/projects/', ''), entry])
);

/** Ordered entries for the homepage status strip. */
export const statusStripEntries = productManifest.filter((entry) => entry.homepageStrip);

/** Entries grouped by ecosystem layer for the portfolio and Ecosystem 2.0. */
export const groupLabels: Record<ProductGroup, { title: string; short: string; blurb: string }> = {
  build: { title: 'Build & Engineering', short: 'BUILD', blurb: 'Software that plans, edits, tests, and repairs.' },
  create: { title: 'Create', short: 'CREATE', blurb: 'Games and creative products in development.' },
  knowledge: { title: 'Knowledge & Community', short: 'KNOWLEDGE', blurb: 'Practical information and local discovery.' },
};

export function manifestEntriesByGroup(group: ProductGroup): ProductManifestEntry[] {
  return productManifest.filter((entry) => entry.group === group);
}
