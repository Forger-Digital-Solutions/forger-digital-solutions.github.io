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

  it('keeps the five homepage showcases distinct and availability-qualified', () => {
    for (const id of ['codeforge-showcase', 'forge-control-showcase', 'forge-aaa-showcase', 'dead-trails-showcase', 'forgerems-showcase']) {
      expect(homepage).toContain(`id="${id}"`);
    }
    expect(homepage).toContain('Released · v0.2.0');
    expect(homepage).toContain('Active development · no public release');
    expect(homepage).toContain('Private development · no public playable build');
    expect(homepage).toContain('Public preview · v1.2.4-preview.1');
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
