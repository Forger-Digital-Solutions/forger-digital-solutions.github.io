import { describe, it, expect } from 'vitest';
import { runDriftCheck, formatActionableDriftMessage } from '../src/data/kayla/drift-detector';
import { projects } from '../src/data/projects';
import { products } from '../src/data/products';
import { gems } from '../src/data/gems';
import { statusMeta } from '../src/data/status';
import { canonicalRelations, deniedRelations } from '../src/data/kayla/semantic-relations';
import { releases } from '../src/data/kayla/releases';
import { getAllDocuments } from '../src/data/kayla/retrieval';
import { CANONICAL_INTERNAL_ROUTES } from '../src/data/kayla/canonical-registry';
import { resolveEntityWithContext } from '../src/data/kayla/entities';
import { sha256 } from '../src/lib/kayla/hash';

describe('Phase 10 — Intentional Knowledge Drift Mutations', () => {
  it('detects a mutated/stale release version', () => {
    const mutatedProducts = products.map(p =>
      p.slug === 'codeforge' ? { ...p, version: 'v0.9.9' } : p
    );

    const report = runDriftCheck({ products: mutatedProducts });
    expect(report.passed).toBe(false);
    const issue = report.errors.find(e => e.code === 'VERSION_METADATA_MISMATCH');
    expect(issue).toBeDefined();
    expect(issue?.entity).toBe('codeforge');
    expect(issue?.expected).toBe('v0.9.9');
    expect(issue?.actual).toBe('v0.2.0');

    const formatted = formatActionableDriftMessage(issue!);
    expect(formatted).toContain('KAYLA_CANONICAL_DRIFT');
    expect(formatted).toContain('VERSION_METADATA_MISMATCH');
    expect(formatted).toContain('v0.9.9');
  });

  it('detects an unknown or typo project status', () => {
    const mutatedProjects = projects.map(p =>
      p.slug === 'kyrablox' ? { ...p, status: 'IN_PROGRESS' as any } : p
    );

    const report = runDriftCheck({ projects: mutatedProjects });
    expect(report.passed).toBe(false);
    const issue = report.errors.find(e => e.code === 'UNKNOWN_PROJECT_STATUS');
    expect(issue).toBeDefined();
    expect(issue?.entity).toBe('kyrablox');
    expect(issue?.actual).toBe('IN_PROGRESS');
  });

  it('detects a missing or changed project route', () => {
    // Remove /projects/codeforge from canonical internal routes
    const mutatedRoutes = CANONICAL_INTERNAL_ROUTES.filter(r => r !== '/projects/codeforge');

    const report = runDriftCheck({ internalRoutes: mutatedRoutes });
    expect(report.passed).toBe(false);
    const issue = report.errors.find(e => e.code === 'MISSING_PROJECT_ROUTE');
    expect(issue).toBeDefined();
    expect(issue?.entity).toBe('codeforge');
    expect(issue?.expected).toBe('/projects/codeforge');
  });

  it('detects when a project marked RELEASED has no download URL', () => {
    const mutatedProducts = products.map(p =>
      p.slug === 'codeforge' ? { ...p, downloadUrl: undefined } : p
    );

    const report = runDriftCheck({ products: mutatedProducts });
    expect(report.passed).toBe(false);
    const issue = report.errors.find(e => e.code === 'RELEASED_PROJECT_MISSING_DOWNLOAD_URL');
    expect(issue).toBeDefined();
    expect(issue?.entity).toBe('codeforge');
  });

  it('detects when a RESEARCH project is improperly marked downloadable', () => {
    const mutatedProducts = [
      ...products,
      {
        name: 'GEMS Download',
        slug: 'gems-training-grounds',
        tagline: 'Research',
        description: 'Research',
        category: 'AI',
        platform: ['Linux'],
        status: 'released' as const,
        pricingModel: 'free' as const,
        downloadUrl: 'https://github.com/Forger-Digital-Solutions/fake-download'
      }
    ];

    const report = runDriftCheck({ products: mutatedProducts });
    expect(report.passed).toBe(false);
    const issue = report.errors.find(e => e.code === 'RESEARCH_PROJECT_CANNOT_BE_DOWNLOADABLE');
    expect(issue).toBeDefined();
    expect(issue?.entity).toBe('gems-training-grounds');
  });

  it('detects when a PRIVATE DEVELOPMENT project has a public download route', () => {
    const mutatedProducts = [
      ...products,
      {
        name: 'We The People',
        slug: 'we-the-people',
        tagline: 'Civic',
        description: 'Civic',
        category: 'Civic',
        platform: ['Web'],
        status: 'released' as const,
        pricingModel: 'free' as const,
        downloadUrl: 'https://github.com/Forger-Digital-Solutions/fake-wtp'
      }
    ];

    const report = runDriftCheck({ products: mutatedProducts });
    expect(report.passed).toBe(false);
    const issue = report.errors.find(e => e.code === 'PRIVATE_DEV_CANNOT_BE_DOWNLOADABLE');
    expect(issue).toBeDefined();
    expect(issue?.entity).toBe('we-the-people');
  });

  it('detects an invalid relation subject or object entity', () => {
    const mutatedRelations = [
      ...canonicalRelations,
      {
        subject: 'invented-nonexistent-project',
        predicate: 'part-of' as const,
        object: 'fds',
        source: 'test'
      }
    ];

    const report = runDriftCheck({ canonicalRelations: mutatedRelations });
    expect(report.passed).toBe(false);
    const issue = report.errors.find(e => e.code === 'INVALID_RELATION_SUBJECT');
    expect(issue).toBeDefined();
    expect(issue?.entity).toBe('invented-nonexistent-project');
  });

  it('detects a collision between allowed and denied relations', () => {
    // Inject "gem-sapphire powers codeforge" into canonical relations (which is denied)
    const mutatedRelations = [
      ...canonicalRelations,
      {
        subject: 'gem-sapphire',
        predicate: 'powers' as const,
        object: 'codeforge',
        source: 'test assertion'
      }
    ];

    const report = runDriftCheck({ canonicalRelations: mutatedRelations });
    expect(report.passed).toBe(false);
    const issue = report.errors.find(e => e.code === 'CONTRADICTORY_RELATION');
    expect(issue).toBeDefined();
    expect(issue?.message).toContain('powers');
  });

  it('detects a missing retrieval document for a public project', () => {
    const allDocs = getAllDocuments();
    // Filter out all documents referencing kyrablox
    const mutatedDocs = allDocs.filter(d => d.entityId !== 'kyrablox' && d.id !== 'app-kyrablox');

    const report = runDriftCheck({ retrievalDocs: mutatedDocs });
    expect(report.passed).toBe(false);
    const issue = report.errors.find(e => e.code === 'MISSING_RETRIEVAL_DOCUMENT' && e.entity === 'kyrablox');
    expect(issue).toBeDefined();
  });

  it('detects a missing retrieval document for a GEMS lineage', () => {
    const allDocs = getAllDocuments();
    // Filter out all documents referencing gem-garnet
    const mutatedDocs = allDocs.filter(d => d.entityId !== 'gem-garnet' && d.id !== 'gem-garnet');

    const report = runDriftCheck({ retrievalDocs: mutatedDocs });
    expect(report.passed).toBe(false);
    const issue = report.errors.find(e => e.code === 'MISSING_RETRIEVAL_DOCUMENT' && e.entity === 'gem-garnet');
    expect(issue).toBeDefined();
  });

  it('disambiguates ambiguous alias "Kayla" using query keywords, page context, and history', () => {
    // 1. Explicit assistant query
    const assistantResult = resolveEntityWithContext('Who are you Kayla?');
    expect(assistantResult).toBe('kayla-copilot');

    // 2. Explicit publisher query
    const publisherResult = resolveEntityWithContext('What is the Kayla manuscript tool for books?');
    expect(publisherResult).toBe('kayla-ai-publisher');

    // 3. Page context disambiguation
    const pageResult = resolveEntityWithContext('Tell me about Kayla', {
      route: '/projects/kayla-ai-publisher',
      pageType: 'project',
      entity: 'kayla-ai-publisher'
    });
    expect(pageResult).toBe('kayla-ai-publisher');

    // 4. Conversation history disambiguation
    const historyResult = resolveEntityWithContext('How does Kayla handle chapters?', undefined, [
      { role: 'user', content: 'I am writing a novel.' },
      { role: 'assistant', content: 'FDS is developing publishing tools.' }
    ]);
    expect(historyResult).toBe('kayla-ai-publisher');
  });

  it('proves deterministic knowledge hash changes when canonical facts change', () => {
    const manifestA = {
      version: 'v0.2.0',
      projects: ['codeforge', 'kyrablox']
    };
    const hashA = sha256(JSON.stringify(manifestA)).slice(0, 16);

    const manifestB = {
      version: 'v0.2.1', // modified version
      projects: ['codeforge', 'kyrablox']
    };
    const hashB = sha256(JSON.stringify(manifestB)).slice(0, 16);

    expect(hashA).not.toBe(hashB);
    expect(hashA).toHaveLength(16);
    expect(hashB).toHaveLength(16);
  });
});
