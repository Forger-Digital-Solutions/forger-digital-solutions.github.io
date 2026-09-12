import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const homepage = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const header = readFileSync(new URL('../src/components/Header.astro', import.meta.url), 'utf8');
const ecosystem = readFileSync(new URL('../src/components/FDSEcosystem.astro', import.meta.url), 'utf8');
const cosmicBackdrop = readFileSync(new URL('../src/components/CosmicBackdrop.astro', import.meta.url), 'utf8');

describe('homepage ecosystem UI contract', () => {
  it('removes the standalone FDS header text while preserving the wordmark', () => {
    expect(header).not.toContain('class="logo-text"');
    expect(header).toContain('class="logo-system">Forger Digital Solutions</span>');
  });

  it('leads with a company-positioned hero, not the wordmark alone', () => {
    expect(homepage).not.toContain('hero__wordmark');
    expect(homepage).toContain('FDS SYSTEMS // ONLINE');
    expect(homepage).toContain('class="accent">FORGER</span>');
    expect(homepage).toContain('class="silver">DIGITAL</span>');
    expect(homepage).toContain('class="accent">SOLUTIONS</span>');
    // The hero headline states what FDS builds; support is not a hero CTA.
    expect(homepage).toContain('AI systems and software built to do real work.');
    expect(homepage).toContain('Explore Products');
    expect(homepage).toContain('Get CodeForge');
    expect(homepage).not.toContain('hero__support');
  });

  it('renders the canonical product status strip', () => {
    expect(homepage).toContain('status-strip__list');
    expect(homepage).toContain('statusStripEntries');
    expect(homepage).toContain('canonicalStatusLabels');
  });

  it('renders Ecosystem 2.0 around the FDS core', () => {
    expect(homepage).toContain('<FDSEcosystem />');
    expect(ecosystem).toContain('FDS CORE');
    expect(ecosystem).toContain('THE COMPANY AT THE CENTER');
    expect(ecosystem).not.toContain('fds-logo.png');
    expect(ecosystem).toContain('ecosystemNodes.map');
    expect(ecosystem).toContain('class="planet-motion"');
    expect(ecosystem).toContain('class="planet__character"');
    expect(ecosystem).toContain('node.character');
  });

  it('keeps motion optional and the cosmic environment decorative', () => {
    expect(ecosystem).toContain('@media (prefers-reduced-motion: reduce)');
    expect(cosmicBackdrop).toContain('aria-hidden="true"');
    expect(cosmicBackdrop).toContain('mask-image: linear-gradient');
    expect(cosmicBackdrop).toContain('@media (prefers-reduced-motion: reduce)');
    expect(cosmicBackdrop.match(/constellation--featured/g)?.length).toBeGreaterThanOrEqual(2);
    expect(cosmicBackdrop.match(/constellation__node--beacon/g)?.length).toBeGreaterThanOrEqual(5);
  });
});
