import generatedArchives from './generated-archives.json';

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

export type ProductGroup = 'build' | 'intelligence' | 'create' | 'knowledge';

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
      'v0.2.0 is released for Windows 10/11 x64 as installer and portable builds. Active development continues on a separate line.',
    currentFocus:
      '8-Bit dynamic model routing and failover, ForgeGreen runtime efficiency, cloud services, and deeper repository intelligence.',
    version: 'v0.2.0',
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
    releaseUrl: 'https://github.com/Forger-Digital-Solutions/CodeForge/releases/latest',
    githubUrl: 'https://github.com/Forger-Digital-Solutions/CodeForge',
    docsUrl: 'https://github.com/Forger-Digital-Solutions/CodeForge#readme',
    archive: generated('codeforge'),
    lastVerified: VERIFIED,
  },
  {
    id: 'forgerems',
    name: 'ForgerEMS',
    shortName: 'ForgerEMS',
    group: 'build',
    category: 'Technician Workbench',
    tagline: 'Windows technician workbench for diagnostics, maintenance, and repair.',
    oneLineDescription:
      'USB toolkit creation, drive validation, USB and port intelligence, system information, driver guidance, and local-first Kyra assistance in one Windows application.',
    canonicalStatus: 'public-preview',
    developmentStatus:
      'v1.2.3-preview.1 is a public preview. Features and packaging may change between preview builds.',
    currentFocus: 'Technician workflows, recovery tooling, and repair-oriented utilities.',
    version: 'v1.2.3-preview.1',
    homepageStrip: true,
    capabilities: [
      'USB toolkit creation',
      'Drive validation',
      'USB and port intelligence',
      'System information',
      'Driver guidance',
      'Local-first Kyra assistance',
    ],
    limitations: ['Windows only', 'Public preview; capabilities may change between builds'],
    nonClaims: ['Preview software is not presented as a final release'],
    technologies: ['Windows', 'USB tooling', 'Diagnostics'],
    projectUrl: '/projects/forgerems',
    releaseUrl: 'https://github.com/Forger-Digital-Solutions/ForgerEMS/releases',
    githubUrl: 'https://github.com/Forger-Digital-Solutions/ForgerEMS',
    docsUrl: 'https://github.com/Forger-Digital-Solutions/ForgerEMS',
    archive: archiveNotPublished(
      'not-published',
      'Repository is publicly viewable, but the ForgerEMS license is proprietary and forbids redistribution; a source archive is not distributed.'
    ),
    lastVerified: VERIFIED,
  },
  {
    id: 'gems',
    name: 'GEMS',
    shortName: 'GEMS',
    group: 'intelligence',
    category: 'AI Model Research',
    tagline: 'Specialized intelligence research, advanced through Training Grounds.',
    oneLineDescription:
      'A family of AI research lineages — Topaz, Sapphire, Peridot, and Garnet — developed and evaluated through the Training Grounds process.',
    canonicalStatus: 'active-ai-research',
    developmentStatus:
      'Active research program. Curriculum, post-training, evaluation, and checkpoint work run through Training Grounds; no GEMS model is publicly released.',
    currentFocus:
      'Specialization on strong foundations where appropriate, governed advancement through Training Grounds evaluation.',
    homepageStrip: true,
    capabilities: [
      'Curriculum-driven specialization',
      'Model post-training',
      'Candidate training and evaluation',
      'Failure diagnosis and remediation',
      'Controlled advancement and promotion',
    ],
    limitations: [
      'No GEMS model is publicly released or downloadable',
      'No protected or internal benchmark numbers are published',
    ],
    nonClaims: [
      'No GEM is presented as a shipping model in any FDS product',
      'Not a claim of parity with frontier models',
    ],
    technologies: ['Python', 'Model post-training', 'Evaluation systems', 'CUDA/GPU environments'],
    projectUrl: '/projects/gems-training-grounds',
    archive: archiveNotPublished(
      'private',
      'Private AI research; model weights, training data, and source are not public.'
    ),
    lastVerified: VERIFIED,
  },
  {
    id: 'training-grounds',
    name: 'Training Grounds',
    shortName: 'Training Grounds',
    group: 'intelligence',
    category: 'AI Evaluation Environment',
    tagline: 'The governed environment that teaches, evaluates, and advances GEMS lineages.',
    oneLineDescription:
      'Curriculum creation, candidate training, evaluation, failure diagnosis, remediation, and advancement for GEMS research lineages.',
    canonicalStatus: 'active-ai-research',
    developmentStatus:
      'Active as the operational research environment of the GEMS program.',
    capabilities: [
      'Curriculum creation',
      'Model post-training',
      'Candidate training',
      'Evaluation, including protected evaluation where appropriate',
      'Failure diagnosis and remediation',
      'Advancement and promotion',
      'Specialization',
      'Architecture experimentation',
    ],
    limitations: ['An internal research process; not a public product or service'],
    nonClaims: ['Evaluation outcomes and protected benchmark numbers are not published'],
    technologies: ['Evaluation systems', 'Curriculum systems', 'Held-out evaluation'],
    projectUrl: '/projects/gems-training-grounds',
    archive: archiveNotPublished(
      'private',
      'Private research infrastructure; evaluation and curriculum systems are not public.'
    ),
    lastVerified: VERIFIED,
  },
  {
    id: 'kyrablox',
    name: 'KyraBlox',
    shortName: 'KyraBlox',
    group: 'create',
    category: 'Project-Aware Game Development',
    tagline: 'Project-aware game development assistance, Roblox-first.',
    oneLineDescription:
      'Understands the game project — scripts, engine state, plans, approvals, and validation — and proposes bounded changes the creator approves.',
    canonicalStatus: 'active-development',
    homepageStrip: true,
    developmentStatus:
      'Private 0.3.0-preview.2 development line. No public release or download is currently available.',
    currentFocus: 'Deeper live engine validation, provider certification, and focused-agent packaging.',
    capabilities: [
      'Project and file inspection',
      'Gameplay and system planning',
      'Bounded script proposals with exact diff review',
      'Testing and validation',
      'Rollback and recovery state',
    ],
    limitations: [
      'Roblox has the deepest current integration; live mutation requires a paired Studio session',
      'Unreal has a fixture-validated bridge and plugin without certified live editor mutation',
      'Unity and Godot paths currently support planning or file-oriented work',
    ],
    nonClaims: [
      'No public KyraBlox release or download is currently available',
      'GEMS production integration is not claimed',
    ],
    technologies: ['Roblox', 'Unreal Engine', 'Unity', 'Godot'],
    projectUrl: '/projects/kyrablox',
    archive: archiveNotPublished('private', 'Private development; source is not public.'),
    lastVerified: VERIFIED,
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
  intelligence: { title: 'Intelligence & Research', short: 'INTELLIGENCE', blurb: 'Specialized model research and evaluation.' },
  create: { title: 'Create', short: 'CREATE', blurb: 'Tools for game development and publishing.' },
  knowledge: { title: 'Knowledge & Community', short: 'KNOWLEDGE', blurb: 'Practical information and local discovery.' },
};

export function manifestEntriesByGroup(group: ProductGroup): ProductManifestEntry[] {
  return productManifest.filter((entry) => entry.group === group);
}
