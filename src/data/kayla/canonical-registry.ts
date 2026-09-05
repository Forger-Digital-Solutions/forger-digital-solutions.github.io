import { projects } from '../projects';
import { products } from '../products';
import { gems } from '../gems';
import { statusMeta } from '../status';
import { siteConfig } from '../../config/site';
import { canonicalRelations, deniedRelations } from './semantic-relations';
import { projectAvailability, standaloneDownloads } from './availability';
import { sha256 } from '../../lib/kayla/hash';
import type { ProjectStatusValue } from '../../types';

/**
 * Canonical Knowledge Registry for Kayla.
 *
 * This module is the single read-only, typed abstraction exposing published FDS
 * facts to Kayla Copilot, drift validators, and the production Worker.
 *
 * It does NOT create a second database or copy strings. Every field is either
 * read directly or derived from the repository's canonical owners:
 *   - src/data/projects.ts   -> project identity, status, routes, descriptions
 *   - src/data/products.ts   -> released/downloadable software & versions
 *   - src/data/gems.ts       -> GEMS family lineages & research metadata
 *   - src/data/status.ts     -> status semantics & descriptions
 *   - src/config/site.ts     -> site URLs, founder, donation channels
 *   - semantic-relations.ts  -> explicit allowed and denied relationships
 */

export interface CanonicalEntity {
  id: string;
  kind: 'project' | 'product' | 'gem' | 'company' | 'assistant' | 'page';
  name: string;
  shortName?: string;
  status?: string;
  category?: string;
  route?: string;
  downloadable: boolean;
  releaseVersion?: string;
  downloadRoute?: string;
  githubUrl?: string;
  docsUrl?: string;
  tags: string[];
}

export interface CanonicalStatusEntry {
  status: ProjectStatusValue;
  short: string;
  description: string;
  projects: string[];
}

export interface CanonicalReleaseMetadata {
  productId: string;
  name: string;
  version: string;
  status: string;
  platform: string[];
  downloadUrl: string;
  docsUrl?: string;
  releaseNotesUrl?: string;
}

export interface CanonicalExternalLink {
  id: string;
  label: string;
  url: string;
  kind: 'github' | 'release' | 'donation' | 'social' | 'contact';
}

/** Canonical internal routes published on the site. */
export const CANONICAL_INTERNAL_ROUTES = [
  '/',
  '/projects',
  '/projects/codeforge',
  '/projects/gems-training-grounds',
  '/projects/kyrablox',
  '/projects/kayla-ai-publisher',
  '/projects/we-the-people',
  '/projects/farmstand-finder',
  '/forged',
  '/about',
  '/technology',
  '/lab',
  '/notes',
  '/support',
  '/support/hardware',
  '/community-impact',
  '/faq',
  '/privacy',
  '/terms'
] as const;

/** Canonical external links verified against siteConfig and product records. */
export const CANONICAL_EXTERNAL_LINKS: CanonicalExternalLink[] = [
  { id: 'github-org', label: 'GitHub Organization', url: siteConfig.githubUrl, kind: 'github' },
  { id: 'github-codeforge', label: 'CodeForge Repository', url: 'https://github.com/Forger-Digital-Solutions/CodeForge', kind: 'github' },
  { id: 'github-forgerems', label: 'ForgerEMS Repository', url: 'https://github.com/forger-digital-solutions/ForgerEMS', kind: 'github' },
  { id: 'codeforge-release-latest', label: 'CodeForge Latest Release', url: 'https://github.com/Forger-Digital-Solutions/CodeForge/releases/latest', kind: 'release' },
  { id: 'forgerems-releases', label: 'ForgerEMS Releases', url: 'https://github.com/Forger-Digital-Solutions/ForgerEMS/releases', kind: 'release' },
  { id: 'support-cashapp', label: 'Cash App', url: `https://cash.app/${siteConfig.cashAppHandle}`, kind: 'donation' },
  { id: 'support-kofi', label: 'Ko-fi', url: 'https://ko-fi.com/forgerdigitalsolutions', kind: 'donation' }
];

/** Canonical entities mapped from primary owners. */
function buildCanonicalEntities(): CanonicalEntity[] {
  const result: CanonicalEntity[] = [];

  // Company
  result.push({
    id: 'fds',
    kind: 'company',
    name: siteConfig.name,
    route: '/about',
    downloadable: false,
    tags: ['fds', 'company', 'forger digital solutions']
  });

  // Assistant
  result.push({
    id: 'kayla-copilot',
    kind: 'assistant',
    name: 'Kayla Copilot',
    route: '/',
    downloadable: false,
    tags: ['kayla copilot', 'assistant', 'guide']
  });

  // Projects
  for (const p of projects) {
    const avail = projectAvailability.find((a) => a.slug === p.slug);
    result.push({
      id: p.slug,
      kind: 'project',
      name: p.name,
      shortName: p.shortName,
      status: p.status,
      category: p.category,
      route: `/projects/${p.slug}`,
      downloadable: Boolean(avail?.publiclyDownloadable),
      releaseVersion: avail?.releaseVersion,
      downloadRoute: avail?.officialDownloadRoute,
      githubUrl: p.githubUrl,
      docsUrl: p.documentationUrl,
      tags: p.tags
    });
  }

  // Standalone products (e.g. ForgerEMS)
  for (const s of standaloneDownloads) {
    const prod = products.find((item) => item.slug === s.slug);
    if (prod) {
      result.push({
        id: prod.slug,
        kind: 'product',
        name: prod.name,
        status: prod.status,
        category: prod.category,
        route: '/forged',
        downloadable: true,
        releaseVersion: prod.version,
        downloadRoute: prod.downloadUrl,
        docsUrl: prod.docsUrl,
        tags: [prod.category.toLowerCase(), ...prod.platform.map(plat => plat.toLowerCase())]
      });
    }
  }

  // GEMS research lineages
  for (const g of gems) {
    result.push({
      id: `gem-${g.key}`,
      kind: 'gem',
      name: g.name,
      status: g.state,
      category: 'Research Lineage',
      route: '/projects/gems-training-grounds',
      downloadable: false,
      tags: [g.key, 'gem', 'gems', 'research', g.role.toLowerCase()]
    });
  }

  // Core pages
  const pageEntries: { id: string; name: string; route: string }[] = [
    { id: 'forged', name: 'Forged', route: '/forged' },
    { id: 'lab', name: 'Lab', route: '/lab' },
    { id: 'notes', name: 'Notes', route: '/notes' },
    { id: 'technology', name: 'Technology', route: '/technology' },
    { id: 'support', name: 'Support', route: '/support' },
    { id: 'about', name: 'About', route: '/about' },
    { id: 'projects', name: 'Projects', route: '/projects' }
  ];

  for (const pg of pageEntries) {
    result.push({
      id: pg.id,
      kind: 'page',
      name: pg.name,
      route: pg.route,
      downloadable: false,
      tags: [pg.id, 'page']
    });
  }

  return result;
}

export const CANONICAL_ENTITIES = buildCanonicalEntities();

/** Derived release metadata from products.ts */
export const CANONICAL_RELEASES: CanonicalReleaseMetadata[] = products
  .filter((p): p is typeof p & { downloadUrl: string; version: string } => Boolean(p.downloadUrl && p.version && !p.comingSoon))
  .map((p) => ({
    productId: p.slug,
    name: p.name,
    version: p.version,
    status: p.status,
    platform: p.platform,
    downloadUrl: p.downloadUrl,
    docsUrl: p.docsUrl,
    releaseNotesUrl: p.releaseNotesUrl
  }));

/** Lookup an entity by its stable canonical ID. */
export function getCanonicalEntity(id: string): CanonicalEntity | undefined {
  return CANONICAL_ENTITIES.find((e) => e.id === id);
}

/**
 * Returns a complete, deterministic, JSON-serializable representation of all
 * public canonical knowledge.
 */
export function getCanonicalKnowledgeManifest() {
  return {
    schemaVersion: '1.0.0',
    entities: CANONICAL_ENTITIES.map((e) => ({
      id: e.id,
      kind: e.kind,
      name: e.name,
      status: e.status ?? null,
      route: e.route ?? null,
      downloadable: e.downloadable,
      releaseVersion: e.releaseVersion ?? null,
      downloadRoute: e.downloadRoute ?? null
    })),
    releases: CANONICAL_RELEASES.map((r) => ({
      productId: r.productId,
      name: r.name,
      version: r.version,
      status: r.status,
      downloadUrl: r.downloadUrl
    })),
    projects: projects.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      status: p.status,
      category: p.category,
      route: `/projects/${p.slug}`,
      githubUrl: p.githubUrl ?? null,
      websiteUrl: p.websiteUrl ?? null,
      documentationUrl: p.documentationUrl ?? null
    })),
    products: products.map((p) => ({
      slug: p.slug,
      name: p.name,
      version: p.version ?? null,
      status: p.status,
      pricingModel: p.pricingModel,
      downloadUrl: p.downloadUrl ?? null,
      docsUrl: p.docsUrl ?? null,
      projectSlug: p.projectSlug ?? null
    })),
    gems: gems.map((g) => ({
      key: g.key,
      id: `gem-${g.key}`,
      name: g.name,
      role: g.role,
      state: g.state,
      notClaimed: g.notClaimed
    })),
    statuses: Object.entries(statusMeta).map(([status, meta]) => ({
      status,
      short: meta.short,
      description: meta.description
    })),
    routes: [...CANONICAL_INTERNAL_ROUTES],
    relations: canonicalRelations.map((r) => ({
      subject: r.subject,
      predicate: r.predicate,
      object: r.object
    })),
    deniedRelations: deniedRelations.map((d) => ({
      subject: d.subject,
      predicate: d.predicate,
      object: d.object,
      reason: d.reason
    }))
  };
}

/**
 * Computes a deterministic, 16-character SHA-256 hex digest representing the
 * exact state of public canonical knowledge.
 */
let cachedKnowledgeVersion: string | null = null;

export function getCanonicalKnowledgeVersion(): string {
  if (cachedKnowledgeVersion) return cachedKnowledgeVersion;
  const manifest = getCanonicalKnowledgeManifest();
  const serialized = JSON.stringify(manifest);
  cachedKnowledgeVersion = sha256(serialized).slice(0, 16);
  return cachedKnowledgeVersion;
}

/** Reset cached knowledge version (used in tests that inject mutations). */
export function resetKnowledgeVersionCache(): void {
  cachedKnowledgeVersion = null;
}
