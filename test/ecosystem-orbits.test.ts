import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildEllipsePath, ecosystemPlanets } from '../src/data/ecosystem';

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

  it('uses a native code-forging emblem in the redesigned Core', () => {
    expect(component).toContain('class="core__forge-mark"');
    expect(component).toContain('class="core__code-bracket"');
    expect(component).toContain('class="core__anvil"');
    expect(component).toContain('class="core__aperture"');
  });

  it('freezes path movement at configured positions for reduced motion', () => {
    expect(component).toContain('@media (prefers-reduced-motion: reduce)');
    expect(component).toContain('.planet-motion { animation: none; offset-distance: var(--orbit-start); will-change: auto; }');
    expect(component).not.toContain('requestAnimationFrame');
  });
});
