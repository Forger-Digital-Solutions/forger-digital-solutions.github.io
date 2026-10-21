import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const homepage = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const header = readFileSync(new URL('../src/components/Header.astro', import.meta.url), 'utf8');
const portfolioMap = readFileSync(new URL('../src/components/PortfolioArchitecture.astro', import.meta.url), 'utf8');
const productShowcase = readFileSync(new URL('../src/components/ProductShowcase.astro', import.meta.url), 'utf8');
const cosmicBackdrop = readFileSync(new URL('../src/components/CosmicBackdrop.astro', import.meta.url), 'utf8');

describe('homepage product presentation contract', () => {
  it('keeps the company wordmark and exposes product routes in primary navigation', () => {
    expect(header).toContain('class="logo-system">Forger Digital Solutions</span>');
    for (const route of ['/projects', '/projects/codeforge', '/projects/forge-control', '/projects/dead-trails-west', '/forged']) {
      expect(header).toContain(route);
    }
  });

  it('leads with the studio mission and product-specific calls to action', () => {
    expect(homepage).toContain('Build the tools.<br />Build the worlds.');
    expect(homepage).toContain('FDS // INDEPENDENT STUDIO');
    expect(homepage).toContain('Explore Products');
    expect(homepage).toContain('Get CodeForge');
    expect(homepage).not.toContain('hero__support');
  });

  it('renders the canonical product status strip and portfolio relationship map', () => {
    expect(homepage).toContain('statusStripEntries');
    expect(homepage).toContain('canonicalStatusLabels');
    expect(homepage).toContain('<PortfolioArchitecture />');
    expect(portfolioMap).toContain('manifestByProjectSlug');
    expect(portfolioMap).toContain('Forge AAA');
    expect(portfolioMap).toContain('/projects/codeforge#forge-aaa');
  });

  it('features current products while labeling development and illustrative work', () => {
    for (const id of ['codeforge-showcase', 'forge-control-showcase', 'forge-aaa-showcase', 'dead-trails-showcase', 'forgerems-showcase']) {
      expect(homepage).toContain(`id="${id}"`);
    }
    expect(homepage).toContain('Owner-reported tests');
    expect(homepage).toContain('V23 certification');
    expect(productShowcase).toContain('not a product screenshot');
    expect(productShowcase).toContain('Potential integrations · unverified');
    expect(productShowcase).toContain('not gameplay footage');
  });

  it('keeps ambient decoration nonessential and reduced-motion aware', () => {
    expect(cosmicBackdrop).toContain('aria-hidden="true"');
    expect(cosmicBackdrop).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
