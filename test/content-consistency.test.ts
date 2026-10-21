import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { projects } from '../src/data/projects';
import { products } from '../src/data/products';
import { productManifest, statusStripEntries, manifestByProjectSlug } from '../src/data/manifest';
import { projectTechnologies } from '../src/data/technology';
import { ecosystemNodes } from '../src/data/ecosystem';
import { codeForgePlans } from '../src/data/codeforge-plans';

const repoRoot = new URL('..', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, repoRoot), 'utf8');

const page = (path: string) => read(`src/pages/${path}`);
const homepage = page('index.astro');
const projectsPage = page('projects.astro');
const forgedPage = page('forged.astro');
const faqPage = page('faq.astro');
const footer = read('src/components/Footer.astro');
const header = read('src/components/Header.astro');

/** Every current public project, by slug. */
const projectSlugs = projects.map((p) => p.slug);

describe('content consistency guards (Phase 28)', () => {
  it('has a canonical manifest entry for every public project', () => {
    for (const slug of projectSlugs) {
      expect(manifestByProjectSlug[slug], `project ${slug} must exist in the manifest`).toBeDefined();
    }
  });

  it('derives every project status from the canonical manifest', () => {
    for (const project of projects) {
      const entry = manifestByProjectSlug[project.slug];
      expect(entry).toBeDefined();
      const expected = entry!.canonicalStatus;
      const actual = project.status;
      const matches =
        (expected === 'public-release' && actual === 'RELEASED') ||
        (expected === 'public-preview' && actual === 'PREVIEW / BETA') ||
        (expected === 'active-development' && actual === 'ACTIVE DEVELOPMENT') ||
        (expected === 'active-ai-research' && actual === 'RESEARCH') ||
        (expected === 'private-development' && actual === 'PRIVATE DEVELOPMENT') ||
        (expected === 'concept' && actual === 'CONCEPT');
      expect(matches, `${project.slug}: project status "${actual}" must match manifest status "${expected}"`).toBe(true);
    }
  });

  it('derives every product status from the canonical manifest', () => {
    for (const product of products) {
      const entry = productManifest.find((m) => m.id === product.slug);
      expect(entry).toBeDefined();
      expect(product.version).toBe(entry!.version);
      expect(product.tagline).toBe(entry!.tagline);
    }
  });

  it('includes ForgerEMS everywhere the current lineup is enumerated', () => {
    expect(products.some((p) => p.slug === 'forgerems')).toBe(true);
    expect(projects.some((p) => p.slug === 'forgerems')).toBe(true);
    expect(manifestByProjectSlug['forgerems']).toBeDefined();
    expect(statusStripEntries.some((e) => e.id === 'forgerems')).toBe(true);
    expect(ecosystemNodes.some((n) => n.id === 'forgerems')).toBe(true);
    expect(faqPage).toContain('ForgerEMS');
    expect(footer).toContain('/projects/forgerems');
    expect(read('src/data/kayla/canonical-registry.ts')).toContain('/projects/forgerems');
  });

  it('keeps the homepage status strip fed from the manifest', () => {
    expect(homepage).toContain('statusStripEntries');
    expect(homepage).toContain('canonicalStatusLabels');
    expect(statusStripEntries.map((e) => e.id)).toEqual(['codeforge', 'forgerems', 'forge-control', 'dead-trails-west']);
  });

  it('keeps retired projects out of the current public catalog and navigation', () => {
    for (const retired of ['gems-training-grounds', 'kyrablox']) {
      expect(projectSlugs).not.toContain(retired);
      expect(manifestByProjectSlug[retired]).toBeUndefined();
      expect(ecosystemNodes.some((node) => node.href === `/projects/${retired}`)).toBe(false);
    }
    expect(homepage).not.toMatch(/GEMS|KyraBlox|Training Grounds/);
    expect(header).not.toMatch(/GEMS|KyraBlox|Training Grounds/);
    expect(footer).not.toMatch(/GEMS|KyraBlox|Training Grounds/);
  });

  it('keeps historical GEMS notes marked as superseded instead of current status', () => {
    const sources = [
      read('src/content/notes/gems-foundation-strategy.md'),
      read('src/content/notes/gems-training-and-evaluation.md')
    ];
    for (const source of sources) {
      expect(source).toMatch(/draft:\s*true/i);
    }
  });

  it('does not describe Dead Trails West simulation work as verified', () => {
    const entry = manifestByProjectSlug['dead-trails-west']!;
    const manifestCopy = [
      entry.oneLineDescription,
      entry.developmentStatus,
      ...entry.capabilities,
      ...entry.limitations,
      ...entry.nonClaims,
    ].join(' ');
    const technologyCopy = projectTechnologies.find((item) => item.system === 'Dead Trails West')!.purpose;

    for (const copy of [manifestCopy, technologyCopy, faqPage, page('lab.astro')]) {
      expect(copy).not.toMatch(/partially verified|partial verification/i);
    }
    expect(manifestCopy).toContain('not been independently verified');
    expect(technologyCopy).toContain('not been independently verified');
    expect(faqPage).toContain('has not been independently verified here');
  });

  it('keeps CodeForge commercial plan names from drifting', () => {
    expect(codeForgePlans.map((p) => p.id)).toEqual(['free', 'expanded']);
    for (const plan of codeForgePlans) {
      if (plan.status !== 'active') {
        expect(plan.checkoutEnabled).toBe(false);
        expect(plan.price).toBeNull();
      }
    }
  });

  it('exposes no active checkout for unreleased plans', () => {
    const upgradePage = read('src/pages/codeforge/upgrade.astro');
    expect(upgradePage).not.toContain('Checkout Session Received');
    expect(upgradePage).toContain('no checkout or');
  });

  it('gives every download an appropriate public status', () => {
    for (const product of products) {
      expect(product.downloadUrl, `${product.slug} download must exist`).toBeDefined();
      expect(['released', 'public-beta']).toContain(product.status);
    }
  });

  it('links every ecosystem node to a real project route', () => {
    for (const node of ecosystemNodes) {
      const slug = node.href.replace('/projects/', '');
      expect(projectSlugs, `${node.href} must be a real route`).toContain(slug);
    }
  });

  it('renders project archives with full checksums and no forbidden formats', () => {
    expect(forgedPage).toContain('Download ZIP');
    expect(forgedPage).toContain('Copy SHA-256');
    const serializedManifest = JSON.stringify(productManifest);
    expect(serializedManifest).not.toMatch(/\.(rar|7z|tar|tar\.gz|tgz)/);
  });

  it('marks superseded notes and keeps historical GEMS framing out of current status', () => {
    const strategyNote = read('src/content/notes/gems-foundation-strategy.md');
    expect(strategyNote).toContain('state: "superseded"');
    expect(strategyNote).toContain('Historical note');
  });

  it('keeps support secondary on the homepage', () => {
    // R4.2H-R2: the first-visit support dialog is mounted on the homepage again
    // (60% scroll trigger, 24-hour dismissal dedupe, dismissible overlay) after
    // being accidentally dropped during the Phase 28 content reconciliation.
    // Support still gets no primary-navigation slot, and the quiet closing
    // note remains the always-visible support surface.
    expect(homepage).toContain('SupportDialog');
    expect(homepage).not.toContain('Help independent work continue');
    // Support routes remain reachable but as a quiet closing note.
    expect(homepage).toContain('href="/support"');
  });

  it('navigates company-first without the old nav labels', () => {
    expect(header).toContain("label: 'Products'");
    expect(header).toContain("label: 'CodeForge'");
    expect(header).toContain("label: 'Forge Control'");
    expect(header).toContain("label: 'Dead Trails West'");
    expect(header).toContain("label: 'Releases'");
    expect(header).toContain("label: 'Engineering'");
    expect(header).toContain('Get CodeForge');
    expect(header).not.toContain(">Forged<\n");
    expect(header).not.toContain('Support FDS');
  });

  it('keeps the We The People Library positioning consistent', () => {
    const wtp = projects.find((p) => p.slug === 'we-the-people')!;
    expect(wtp.name).toBe('We The People Library');
    expect(wtp.category).toBe('Offline Knowledge Platform');
  });

  it('uses Local Discovery (never Foraging) as the public taxonomy', () => {
    expect(projects.find((p) => p.slug === 'farmstand-finder')!.ecosystem).toBe('Local Discovery');
    const ecosystemData = read('src/data/ecosystem.ts');
    expect(ecosystemData).not.toMatch(/name: 'FORAGING'/);
  });
});
