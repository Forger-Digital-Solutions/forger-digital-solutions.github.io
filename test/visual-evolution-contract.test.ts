import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { projects } from '../src/data/projects';

const portfolio = readFileSync(new URL('../src/components/PortfolioArchitecture.astro', import.meta.url), 'utf8');
const showcases = readFileSync(new URL('../src/components/ProductShowcase.astro', import.meta.url), 'utf8');
const homepage = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const projectPage = readFileSync(new URL('../src/pages/projects/[slug].astro', import.meta.url), 'utf8');

describe('product portfolio visual contract', () => {
  it('keeps distinct product relationships and derives project status from the manifest', () => {
    expect(portfolio).toContain("name: 'Engineering'");
    expect(portfolio).toContain("name: 'Orchestration'");
    expect(portfolio).toContain("name: 'Original games'");
    expect(portfolio).toContain("name: 'Technical utilities'");
    expect(portfolio).toContain('manifestByProjectSlug[project.slug]?.canonicalStatus');
    expect(portfolio).toContain('CodeForge architecture');
    expect(portfolio).toContain('project: null');
  });

  it('preserves the current seven-project catalog and omits retired catalog entries', () => {
    expect(projects.map((project) => project.slug)).toEqual([
      'codeforge',
      'forgerems',
      'forge-control',
      'dead-trails-west',
      'kayla-ai-publisher',
      'we-the-people',
      'farmstand-finder',
    ]);
    expect(homepage).not.toMatch(/GEMS|KyraBlox|Training Grounds/);
  });

  it('keeps the Hub and flagship ecosystem technologies distinct and availability-qualified across their pages', () => {
    const pagesById: Record<string, string> = {
      alexandrite: readFileSync(new URL('../src/pages/models/alexandrite.astro', import.meta.url), 'utf8'),
      hackmanite: readFileSync(new URL('../src/pages/models/hackmanite/index.astro', import.meta.url), 'utf8'),
      cinnabar: readFileSync(new URL('../src/pages/models/cinnabar/index.astro', import.meta.url), 'utf8'),
      jaspilite: readFileSync(new URL('../src/pages/products/jaspilite.astro', import.meta.url), 'utf8'),
      battleverse: readFileSync(new URL('../src/pages/products/battleverse/index.astro', import.meta.url), 'utf8'),
      'state-lines': readFileSync(new URL('../src/pages/studio/state-lines.astro', import.meta.url), 'utf8'),
    };

    expect(homepage).toContain("getRegistryEntry('studio-intelligence-hub')");
    expect(homepage).toContain('<StatusPill');
    for (const [id, content] of Object.entries(pagesById)) {
      expect(content, `${id} page`).toContain(`getRegistryEntry('${id}')`);
    }
    expect(pagesById['state-lines']).toMatch(/Concept Art/i);
  });

  it('labels conceptual art and unverified integrations instead of presenting them as evidence', () => {
    expect(showcases).toContain('illustrative design visualization, not a product screenshot');
    expect(showcases).toContain('Potential integrations, not verified as working');
    expect(showcases).toContain('not gameplay footage');
    expect(projectPage).toContain('integrations are not claimed as shipped');
    expect(projectPage).toContain('The visual is an architecture sketch, not a screenshot or proof of implemented behavior.');
    expect(projectPage).toContain('not a gameplay capture');
  });
});
