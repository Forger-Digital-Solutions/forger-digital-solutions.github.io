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

  it('removes the standalone hero FDS heading but preserves system status and hero branding', () => {
    expect(homepage).not.toContain('hero__wordmark');
    expect(homepage).toContain('FDS SYSTEMS // ONLINE');
    expect(homepage).toContain('class="accent">FORGER</span>');
    expect(homepage).toContain('class="silver">DIGITAL</span>');
    expect(homepage).toContain('class="accent">SOLUTIONS</span>');
  });

  it('renders the ecosystem without reusing the center logo image', () => {
    expect(homepage).toContain('<FDSEcosystem />');
    expect(ecosystem).toContain('FDS CORE');
    expect(ecosystem).not.toContain('fds-logo.png');
    expect(ecosystem).toContain('ecosystemPlanets.map');
    expect(ecosystem).toContain('class="planet-motion"');
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
