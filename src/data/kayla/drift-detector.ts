import { projects as defaultProjects } from '../projects';
import { products as defaultProducts } from '../products';
import { gems as defaultGems } from '../gems';
import { statusMeta as defaultStatusMeta } from '../status';
import { siteConfig as defaultSiteConfig } from '../../config/site';
import {
  canonicalRelations as defaultCanonicalRelations,
  deniedRelations as defaultDeniedRelations,
  type CanonicalRelation,
  type DeniedRelation
} from './semantic-relations';
import {
  downloadableNow as defaultDownloadableNow
} from './availability';
import { releases as defaultReleases } from './releases';
import {
  CANONICAL_INTERNAL_ROUTES,
  CANONICAL_EXTERNAL_LINKS,
  getCanonicalKnowledgeVersion,
  CANONICAL_ENTITIES
} from './canonical-registry';
import { getAllDocuments, type KaylaDocument } from './retrieval';
import { buildTaskPlan } from '../../lib/kayla/task-planner';
import type { VisitorGoal } from './goals';

export interface DriftIssue {
  code: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  entity?: string;
  field?: string;
  expected?: string;
  actual?: string;
  message: string;
  action: string;
}

export interface EntityCoverageItem {
  id: string;
  kind: string;
  name: string;
  canonical: boolean;
  retrieval: boolean;
  source: boolean;
  action: boolean;
  status: string;
  downloadable: boolean;
  version?: string;
}

export interface DriftReport {
  passed: boolean;
  knowledgeVersion: string;
  errors: DriftIssue[];
  warnings: DriftIssue[];
  infos: DriftIssue[];
  inventory: {
    entities: number;
    projects: number;
    products: number;
    gems: number;
    statuses: number;
    routes: number;
    relations: number;
    deniedRelations: number;
    releases: number;
    retrievalDocs: number;
    externalLinks: number;
    taskGoals: number;
  };
  coverageMatrix: EntityCoverageItem[];
}

export interface DriftDetectorOptions {
  projects?: typeof defaultProjects;
  products?: typeof defaultProducts;
  gems?: typeof defaultGems;
  statusMeta?: typeof defaultStatusMeta;
  siteConfig?: typeof defaultSiteConfig;
  canonicalRelations?: CanonicalRelation[];
  deniedRelations?: DeniedRelation[];
  releases?: typeof defaultReleases;
  retrievalDocs?: KaylaDocument[];
  internalRoutes?: readonly string[];
}

/**
 * Validates canonical public knowledge against all drift rules.
 * Supports custom data options for intentional drift / mutation testing.
 */
export function runDriftCheck(options: DriftDetectorOptions = {}): DriftReport {
  const projects = options.projects ?? defaultProjects;
  const products = options.products ?? defaultProducts;
  const gems = options.gems ?? defaultGems;
  const statusMeta = options.statusMeta ?? defaultStatusMeta;
  const siteConfig = options.siteConfig ?? defaultSiteConfig;
  const canonicalRelations = options.canonicalRelations ?? defaultCanonicalRelations;
  const deniedRelations = options.deniedRelations ?? defaultDeniedRelations;
  const releases = options.releases ?? defaultReleases;
  const retrievalDocs = options.retrievalDocs ?? getAllDocuments();
  const internalRoutes = options.internalRoutes ?? CANONICAL_INTERNAL_ROUTES;

  const errors: DriftIssue[] = [];
  const warnings: DriftIssue[] = [];
  const infos: DriftIssue[] = [];

  void siteConfig;

  const addError = (issue: Omit<DriftIssue, 'severity'>) => {
    errors.push({ ...issue, severity: 'ERROR' });
  };
  const addWarning = (issue: Omit<DriftIssue, 'severity'>) => {
    warnings.push({ ...issue, severity: 'WARNING' });
  };
  void addWarning;

  // 1. ENTITY INTEGRITY
  const entityIds = new Set<string>();
  for (const p of projects) {
    if (entityIds.has(p.slug)) {
      addError({
        code: 'DUPLICATE_ENTITY_ID',
        entity: p.slug,
        field: 'slug',
        expected: 'unique entity ID',
        actual: `duplicate ID ${p.slug}`,
        message: `Project ${p.name} has duplicate ID ${p.slug}`,
        action: 'Ensure each project has a globally unique slug in src/data/projects.ts'
      });
    }
    entityIds.add(p.slug);
  }

  for (const prod of products) {
    if (!projects.some(p => p.slug === (prod.projectSlug || prod.slug))) {
      if (entityIds.has(prod.slug)) {
        addError({
          code: 'DUPLICATE_ENTITY_ID',
          entity: prod.slug,
          field: 'slug',
          expected: 'unique entity ID',
          actual: `duplicate ID ${prod.slug}`,
          message: `Standalone product ${prod.name} has duplicate ID ${prod.slug}`,
          action: 'Ensure standalone products have unique slugs in src/data/products.ts'
        });
      }
      entityIds.add(prod.slug);
    }
  }

  for (const g of gems) {
    const gemId = `gem-${g.key}`;
    if (entityIds.has(gemId)) {
      addError({
        code: 'DUPLICATE_ENTITY_ID',
        entity: gemId,
        field: 'key',
        expected: 'unique entity ID',
        actual: `duplicate ID ${gemId}`,
        message: `GEMS lineage ${g.name} has duplicate key ${g.key}`,
        action: 'Ensure each GEMS lineage has a unique key in src/data/gems.ts'
      });
    }
    entityIds.add(gemId);
  }

  // 2. STATUS CONSISTENCY
  const recognizedStatuses = new Set(Object.keys(statusMeta));
  for (const p of projects) {
    if (!recognizedStatuses.has(p.status)) {
      addError({
        code: 'UNKNOWN_PROJECT_STATUS',
        entity: p.slug,
        field: 'status',
        expected: `one of [${Array.from(recognizedStatuses).join(', ')}]`,
        actual: p.status,
        message: `Project ${p.name} has unrecognized status "${p.status}"`,
        action: `Update status in src/data/projects.ts or define semantics in src/data/status.ts`
      });
    }
  }

  for (const [statusKey, meta] of Object.entries(statusMeta)) {
    if (!meta.short?.trim() || !meta.description?.trim()) {
      addError({
        code: 'MISSING_STATUS_SEMANTICS',
        entity: statusKey,
        field: 'statusMeta',
        expected: 'non-empty short and description',
        actual: JSON.stringify(meta),
        message: `Status "${statusKey}" lacks valid short summary or description`,
        action: 'Add concise definition and description in src/data/status.ts'
      });
    }
  }

  // 3. ROUTE INTEGRITY
  const routeSet = new Set(internalRoutes);
  for (const p of projects) {
    const expectedRoute = `/projects/${p.slug}`;
    if (!routeSet.has(expectedRoute)) {
      addError({
        code: 'MISSING_PROJECT_ROUTE',
        entity: p.slug,
        field: 'route',
        expected: expectedRoute,
        actual: 'route not present in canonical routes',
        message: `Project ${p.name} specifies route ${expectedRoute} which is missing from canonical routes`,
        action: `Add ${expectedRoute} to CANONICAL_INTERNAL_ROUTES and ensure page exists in src/pages/projects/`
      });
    }
  }

  // 4. AVAILABILITY CONSISTENCY
  for (const p of projects) {
    const prod = products.find(entry => entry.slug === p.slug || entry.projectSlug === p.slug);
    const isDownloadable = Boolean(prod?.downloadUrl && !prod.comingSoon);

    if (p.status === 'RESEARCH' && isDownloadable) {
      addError({
        code: 'RESEARCH_PROJECT_CANNOT_BE_DOWNLOADABLE',
        entity: p.slug,
        field: 'status / downloadUrl',
        expected: 'research projects must not have active public downloads',
        actual: `status is RESEARCH but downloadUrl exists: ${prod?.downloadUrl}`,
        message: `Research project ${p.name} is marked with an active download URL`,
        action: 'Remove downloadUrl or change project status if officially released'
      });
    }

    if (p.status === 'PRIVATE DEVELOPMENT' && isDownloadable) {
      addError({
        code: 'PRIVATE_DEV_CANNOT_BE_DOWNLOADABLE',
        entity: p.slug,
        field: 'status / downloadUrl',
        expected: 'private development projects must not have public downloads',
        actual: `status is PRIVATE DEVELOPMENT but downloadUrl exists: ${prod?.downloadUrl}`,
        message: `Private development project ${p.name} has a public download URL`,
        action: 'Remove downloadUrl from src/data/products.ts'
      });
    }

    if (p.status === 'RELEASED' && !prod?.downloadUrl) {
      addError({
        code: 'RELEASED_PROJECT_MISSING_DOWNLOAD_URL',
        entity: p.slug,
        field: 'downloadUrl',
        expected: 'valid download route for released software',
        actual: 'no downloadUrl found in products.ts',
        message: `Project ${p.name} is marked RELEASED but has no downloadUrl in products.ts`,
        action: 'Add official download route in src/data/products.ts'
      });
    }
  }

  // 5. RELEASE METADATA CONSISTENCY
  for (const prod of products) {
    if (prod.downloadUrl && !prod.comingSoon) {
      const release = releases.find(r => r.appId === prod.slug);
      if (!release) {
        addError({
          code: 'DOWNLOADABLE_PRODUCT_MISSING_RELEASE',
          entity: prod.slug,
          field: 'releases',
          expected: `KaylaRelease entry for ${prod.slug}`,
          actual: 'none found',
          message: `Product ${prod.name} has downloadUrl but no entry in releases.ts`,
          action: 'Ensure releases.ts derives from products.ts for all downloadable items'
        });
      } else {
        if (prod.version && release.version !== prod.version) {
          addError({
            code: 'VERSION_METADATA_MISMATCH',
            entity: prod.slug,
            field: 'version',
            expected: prod.version,
            actual: release.version,
            message: `Version mismatch for ${prod.name}: products.ts says "${prod.version}", releases.ts says "${release.version}"`,
            action: 'Derive release.version directly from products.ts'
          });
        }
        if (prod.downloadUrl && !release.downloads?.includes(prod.downloadUrl)) {
          addError({
            code: 'DOWNLOAD_ROUTE_MISMATCH',
            entity: prod.slug,
            field: 'downloadUrl',
            expected: prod.downloadUrl,
            actual: release.downloads?.[0] || 'none',
            message: `Download URL mismatch for ${prod.name}`,
            action: 'Align release.downloads with products.ts downloadUrl'
          });
        }
      }
    }
  }

  // 6. EXTERNAL LINK CONSISTENCY
  for (const link of CANONICAL_EXTERNAL_LINKS) {
    if (link.kind === 'github') {
      if (!link.url.toLowerCase().includes('github.com/forger-digital-solutions')) {
        addError({
          code: 'INVALID_EXTERNAL_GITHUB_LINK',
          entity: link.id,
          field: 'url',
          expected: 'official Forger Digital Solutions GitHub organization URL',
          actual: link.url,
          message: `External GitHub link ${link.label} does not point to official FDS org`,
          action: 'Correct URL to official GitHub repository or org'
        });
      }
    }
  }

  // 7. SEMANTIC RELATIONSHIP INTEGRITY
  const validSubjectsAndObjects = new Set([...entityIds, 'fds', 'kayla-copilot', 'forged']);
  const seenRelations = new Set<string>();

  for (const rel of canonicalRelations) {
    const key = `${rel.subject}:${rel.predicate}:${rel.object}`;
    seenRelations.add(key);

    if (!validSubjectsAndObjects.has(rel.subject)) {
      addError({
        code: 'INVALID_RELATION_SUBJECT',
        entity: rel.subject,
        field: 'canonicalRelations.subject',
        expected: 'valid canonical entity ID',
        actual: rel.subject,
        message: `Canonical relation has unknown subject "${rel.subject}"`,
        action: 'Ensure relation subjects reference known canonical entities'
      });
    }

    if (!validSubjectsAndObjects.has(rel.object)) {
      addError({
        code: 'INVALID_RELATION_OBJECT',
        entity: rel.object,
        field: 'canonicalRelations.object',
        expected: 'valid canonical entity ID',
        actual: rel.object,
        message: `Canonical relation has unknown object "${rel.object}"`,
        action: 'Ensure relation objects reference known canonical entities'
      });
    }
  }

  for (const denied of deniedRelations) {
    if (!validSubjectsAndObjects.has(denied.subject)) {
      addError({
        code: 'INVALID_DENIED_RELATION_SUBJECT',
        entity: denied.subject,
        field: 'deniedRelations.subject',
        expected: 'valid canonical entity ID',
        actual: denied.subject,
        message: `Denied relation has unknown subject "${denied.subject}"`,
        action: 'Ensure denied relation subjects reference known canonical entities'
      });
    }

    if (!validSubjectsAndObjects.has(denied.object)) {
      addError({
        code: 'INVALID_DENIED_RELATION_OBJECT',
        entity: denied.object,
        field: 'deniedRelations.object',
        expected: 'valid canonical entity ID',
        actual: denied.object,
        message: `Denied relation has unknown object "${denied.object}"`,
        action: 'Ensure denied relation objects reference known canonical entities'
      });
    }

    // INTERSECTION CHECK: Denied and Allowed relations cannot collide!
    const key = `${denied.subject}:${denied.predicate}:${denied.object}`;
    if (seenRelations.has(key)) {
      addError({
        code: 'CONTRADICTORY_RELATION',
        entity: `${denied.subject} -> ${denied.object}`,
        field: 'canonicalRelations vs deniedRelations',
        expected: 'disjoint sets',
        actual: `predicate "${denied.predicate}" is both allowed and denied`,
        message: `Relationship "${denied.subject}" ${denied.predicate} "${denied.object}" exists in BOTH canonicalRelations and deniedRelations`,
        action: 'Remove the false claim from canonicalRelations or adjust deniedRelations'
      });
    }
  }

  // 8. RETRIEVAL COVERAGE
  for (const p of projects) {
    const hasDoc = retrievalDocs.some(d => d.entityId === p.slug || d.id === `app-${p.slug}`);
    if (!hasDoc) {
      addError({
        code: 'MISSING_RETRIEVAL_DOCUMENT',
        entity: p.slug,
        field: 'retrieval',
        expected: `at least one retrieval document for project ${p.slug}`,
        actual: 'none found',
        message: `Public project ${p.name} has no retrieval document in KNOWLEDGE_BASE`,
        action: 'Ensure retrieval.ts indexes all projects dynamically from apps'
      });
    }
  }

  for (const g of gems) {
    const gemId = `gem-${g.key}`;
    const hasDoc = retrievalDocs.some(d => d.id === gemId || d.entityId === gemId);
    if (!hasDoc) {
      addError({
        code: 'MISSING_RETRIEVAL_DOCUMENT',
        entity: gemId,
        field: 'retrieval',
        expected: `at least one retrieval document for GEMS lineage ${g.name}`,
        actual: 'none found',
        message: `GEMS lineage ${g.name} has no retrieval document in KNOWLEDGE_BASE`,
        action: 'Ensure retrieval.ts indexes all GEMS lineages from gems.ts'
      });
    }
  }

  // 9. RETRIEVAL DUPLICATION
  const seenDocIds = new Set<string>();
  for (const doc of retrievalDocs) {
    if (seenDocIds.has(doc.id)) {
      addError({
        code: 'DUPLICATE_RETRIEVAL_DOC_ID',
        entity: doc.id,
        field: 'doc.id',
        expected: 'unique document ID',
        actual: `duplicate ID ${doc.id}`,
        message: `Retrieval document ID "${doc.id}" is duplicated`,
        action: 'Ensure all documents in KNOWLEDGE_BASE have unique IDs'
      });
    }
    seenDocIds.add(doc.id);
  }

  // 10. FORGED SYNCHRONIZATION
  const downloadableProducts = products.filter(p => !p.comingSoon && Boolean(p.downloadUrl));
  for (const dp of downloadableProducts) {
    const isAvailable = defaultDownloadableNow().some(item => item.name.toLowerCase() === dp.name.toLowerCase());
    if (!isAvailable) {
      addError({
        code: 'FORGED_AVAILABILITY_DESYNC',
        entity: dp.slug,
        field: 'downloadableNow',
        expected: `${dp.name} listed in downloadableNow()`,
        actual: 'not present',
        message: `Product ${dp.name} has downloadUrl but does not appear in downloadableNow()`,
        action: 'Ensure availability.ts projectAvailability and standaloneDownloads derive cleanly'
      });
    }
  }

  // 11. TASK PLANNER ROUTE & GOAL INTEGRITY (Phase 11 Part 51 & Part 72)
  const goalRepresentativeQueries: Record<VisitorGoal, string> = {
    EXPLORE_FDS: "Where should I start if I'm new?",
    EXPLORE_PROJECTS: "Show me all the projects FDS is building",
    FIND_RELEASED_SOFTWARE: "What can I actually download today?",
    FIND_DEVELOPER_PROJECTS: "I'm a software developer. What should I look at?",
    EXPLORE_AI_RESEARCH: "Tell me about your AI research",
    COMPARE_PROJECTS: "Show me the difference between the projects",
    LEARN_PROJECT_STATUS: "What's public versus still being built?",
    DOWNLOAD_SOFTWARE: "Where do I download CodeForge?",
    VIEW_RELEASE: "Where can I see what FDS has released?",
    LEARN_GEMS: "How does GEMS work?",
    FIND_COMMUNITY_PROJECT: "I'm looking for something community-focused",
    SUPPORT_FDS: "How can I support FDS?",
    DONATE_HARDWARE: "I have old computer hardware I want to donate",
    FOLLOW_FDS: "Where can I follow FDS?",
    LEARN_ABOUT_FDS: "What is the story behind FDS?",
    FIND_TECHNOLOGY_INFO: "What tech stack does FDS use?",
    FIND_LAB_INFO: "What is happening in the Lab?",
    UNKNOWN: "What is the weather outside?"
  };

  for (const [goal, sampleQuery] of Object.entries(goalRepresentativeQueries)) {
    const plan = buildTaskPlan(sampleQuery);
    if (!plan.recommendedActions || plan.recommendedActions.length === 0) {
      if (goal !== 'UNKNOWN') {
        addError({
          code: 'TASK_GOAL_MISSING_ACTIONS',
          entity: goal,
          field: 'recommendedActions',
          expected: 'at least one recommended action for supported goal',
          actual: '0 actions returned',
          message: `Goal ${goal} has no recommended actions in task plan`,
          action: 'Ensure task planner produces safe actions for this goal'
        });
      }
    }

    for (const act of plan.recommendedActions || []) {
      if (act.href && act.href.startsWith('/')) {
        const norm = act.href.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
        if (!routeSet.has(norm)) {
          addError({
            code: 'TASK_PLANNER_STALE_ROUTE',
            entity: goal,
            field: 'action.href',
            expected: `route present in internalRoutes: ${norm}`,
            actual: act.href,
            message: `Task plan for goal "${goal}" references route "${act.href}" which does not exist in canonical internal routes`,
            action: 'Update task plan destination or register new route in CANONICAL_INTERNAL_ROUTES'
          });
        }
      }
    }

    for (const src of plan.recommendedSources || []) {
      if (src.route && src.route.startsWith('/')) {
        const norm = src.route.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
        if (!routeSet.has(norm)) {
          addError({
            code: 'TASK_PLANNER_STALE_ROUTE',
            entity: goal,
            field: 'source.route',
            expected: `route present in internalRoutes: ${norm}`,
            actual: src.route,
            message: `Task plan for goal "${goal}" references source route "${src.route}" which does not exist in canonical internal routes`,
            action: 'Update task plan source or register new route in CANONICAL_INTERNAL_ROUTES'
          });
        }
      }
    }
  }

  // Build Coverage Matrix (Part 72)
  const coverageMatrix: EntityCoverageItem[] = CANONICAL_ENTITIES.map((e) => {
    const hasRetrieval = retrievalDocs.some(d => d.entityId === e.id || d.id === `app-${e.id}` || d.id === e.id || d.id.startsWith(`${e.id}-`) || (e.route && d.route === e.route));
    const hasSource = e.route !== undefined;
    const hasAction = e.kind === 'project' || e.kind === 'product';
    return {
      id: e.id,
      kind: e.kind,
      name: e.name,
      canonical: true,
      retrieval: hasRetrieval,
      source: hasSource,
      action: hasAction,
      status: e.status || 'N/A',
      downloadable: e.downloadable,
      version: e.releaseVersion
    };
  });

  const knowledgeVersion = getCanonicalKnowledgeVersion();

  return {
    passed: errors.length === 0,
    knowledgeVersion,
    errors,
    warnings,
    infos,
    inventory: {
      entities: CANONICAL_ENTITIES.length,
      projects: projects.length,
      products: products.length,
      gems: gems.length,
      statuses: recognizedStatuses.size,
      routes: internalRoutes.length,
      relations: canonicalRelations.length,
      deniedRelations: deniedRelations.length,
      releases: releases.length,
      retrievalDocs: retrievalDocs.length,
      externalLinks: CANONICAL_EXTERNAL_LINKS.length,
      taskGoals: Object.keys(goalRepresentativeQueries).length
    },
    coverageMatrix
  };
}

/**
 * Formats a single drift issue into an actionable message matching Phase 10 Part 8 specification.
 */
export function formatActionableDriftMessage(issue: DriftIssue): string {
  return [
    '--------------------------------------------------------',
    'KAYLA_CANONICAL_DRIFT',
    `Code:     ${issue.code}`,
    issue.entity ? `Entity:   ${issue.entity}` : null,
    issue.field ? `Field:    ${issue.field}` : null,
    issue.expected ? `Expected: ${issue.expected}` : null,
    issue.actual ? `Actual:   ${issue.actual}` : null,
    `Message:  ${issue.message}`,
    `Action:   ${issue.action}`,
    '--------------------------------------------------------'
  ].filter(Boolean).join('\n');
}
