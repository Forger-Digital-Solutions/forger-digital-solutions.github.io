import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildEllipsePath, ecosystemCharacterMap, ecosystemPlanets } from '../src/data/ecosystem';

const component = readFileSync(new URL('../src/components/FDSEcosystem.astro', import.meta.url), 'utf8');

describe('FDS ecosystem orbital model', () => {
  it('defines one unique, fixed orbit for each of the eight ecosystem planets', () => {
    expect(ecosystemPlanets).toHaveLength(8);
    expect(new Set(ecosystemPlanets.map((planet) => planet.id)).size).toBe(8);
    expect(new Set(ecosystemPlanets.map((planet) => planet.orbit.path)).size).toBe(8);
    expect(ecosystemPlanets.every((planet) => planet.orbit.path.startsWith('M ') && planet.orbit.path.endsWith(' Z'))).toBe(true);
  });

  it('gives planets independent timings, starting positions, and directions', () => {
    expect(new Set(ecosystemPlanets.map((planet) => planet.orbit.duration)).size).toBe(8);
    expect(new Set(ecosystemPlanets.map((planet) => planet.orbit.start)).size).toBe(8);
    expect(new Set(ecosystemPlanets.map((planet) => planet.orbit.direction)).size).toBe(2);
  });

  it('generates deterministic closed ellipse paths', () => {
    expect(buildEllipsePath(268, 116, -16)).toBe(buildEllipsePath(268, 116, -16));
    expect(buildEllipsePath(268, 116, -16)).not.toBe(buildEllipsePath(268, 116, -15));
  });

  it('only links planets to existing internal site routes', () => {
    expect(ecosystemPlanets.every((planet) => planet.href.startsWith('/'))).toBe(true);
    expect(ecosystemPlanets.map((planet) => planet.href)).toEqual(expect.arrayContaining([
      '/projects/gems-training-grounds',
      '/projects/kayla-ai-publisher',
      '/projects/kyrablox',
      '/projects/farmstand-finder',
      '/projects/we-the-people',
      '/forged',
      '/projects',
      '/technology'
    ]));
  });

  it('uses the same generated path for the visible rail and CSS motion path', () => {
    expect(component).toContain('d={planet.orbit.path}');
    expect(component).toContain('--orbit-path:path("${planet.orbit.path}")');
    expect(component).toContain('offset-path: var(--orbit-path)');
    expect(component).toContain('offset-rotate: 0deg');
    expect(component).toContain('.orbit-path { stroke: var(--planet-color)');
  });

  it('uses the canonical static CodeForge emblem in the Core', () => {
    expect(component).toContain('href="/images/codeforge/codeforge-icon.svg?v=codeforge-r1"');
    expect(component).toContain('class="core__emblem"');
    expect(component).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(component).not.toContain('<CodeForgeEmblem');
    expect(component).toContain('class="core__emblem-halo"');
    // The retired generic anvil/brackets mark must not return.
    expect(component).not.toContain('core__anvil');
    expect(component).not.toContain('core__code-bracket');
  });

  it('renders the 8-Bit character family inside the celestial bodies with accessible labels', () => {
    expect(component).toContain('class="planet__character"');
    expect(component).toContain('href={planet.character}');
    expect(component).toContain('aria-hidden="true"');
    expect(component).toContain('class="planet__tag"');
    expect(component).toContain('class="planet__label"');
  });

  it('verifies that every configured ecosystem planet has an optimized, non-empty 8-Bit asset', () => {
    expect(ecosystemPlanets).toHaveLength(8);
    for (const planet of ecosystemPlanets) {
      expect(planet.character).toMatch(/^\/images\/ecosystem\/8bit\/.+-8bit\.webp$/);
      const diskPath = new URL(`../public${planet.character}`, import.meta.url);
      expect(existsSync(diskPath), `Asset must exist on disk: ${planet.character}`).toBe(true);
      const stat = statSync(diskPath);
      expect(stat.size).toBeGreaterThan(5000);
    }
  });

  it('maintains a deterministic system -> 8bit character mapping contract', () => {
    expect(ecosystemCharacterMap).toBeDefined();
    for (const planet of ecosystemPlanets) {
      expect(ecosystemCharacterMap[planet.id]).toBe(planet.character);
    }
    // Also covers forgerems technician workbench
    expect(ecosystemCharacterMap['forgerems']).toBe('/images/ecosystem/8bit/forgerems-8bit.webp');
  });

  it('freezes path movement at configured positions for reduced motion', () => {
    expect(component).toContain('@media (prefers-reduced-motion: reduce)');
    expect(component).toContain('.planet-motion { animation: none; offset-distance: var(--orbit-start); will-change: auto; }');
    expect(component).toContain('.planet__character { transition: none; transform: none; }');
    expect(component).not.toContain('requestAnimationFrame');
  });
});
