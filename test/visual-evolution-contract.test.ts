import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ecosystemNodes } from '../src/data/ecosystem';
import { gems } from '../src/data/gems';

const ecosystem = readFileSync(new URL('../src/components/FDSEcosystem.astro', import.meta.url), 'utf8');
const connected = readFileSync(new URL('../src/components/OneFDSEcosystem.astro', import.meta.url), 'utf8');
const gemsVisual = readFileSync(new URL('../src/components/GemsLearningSystem.astro', import.meta.url), 'utf8');

describe('final visual evolution contract', () => {
  it('preserves all eight individually certified product-motion paths', () => {
    expect(ecosystemNodes).toHaveLength(8);
    expect(new Set(ecosystemNodes.map((node) => node.id)).size).toBe(8);
    expect(new Set(ecosystemNodes.map((node) => node.orbit.path)).size).toBe(8);
    expect(new Set(ecosystemNodes.map((node) => node.orbit.duration)).size).toBe(8);
    expect(ecosystem.match(/data-planet={node\.id}/g)).toHaveLength(1);
    expect(ecosystem.match(/data-tag-for={node\.id}/g)).toHaveLength(1);
    expect(ecosystem).toContain('offset-path: var(--orbit-path)');
  });

  it('shows the same eight paths that drive the products and uses the canonical center mark', () => {
    expect(ecosystem).not.toContain('data-scaffold-plane');
    expect(ecosystem).toContain('class="orbit-path" d={node.orbit.path}');
    expect(ecosystem).toContain('--orbit-path:path("${node.orbit.path}")');
    expect(ecosystem).toContain('.orbit-path { fill: none; stroke: #8ba9e0;');
    expect(ecosystem).not.toContain('class="relation-layer"');
    expect(ecosystem).toContain('codeforge-icon.svg');
    expect(ecosystem).toContain('class="core__heart"');
    expect(ecosystem).toContain('class="core__reactor-frame core__ring core__ring--outer"');
  });

  it('uses concise product categories in Connected Systems cards', () => {
    expect(connected).not.toContain('DOMAIN //');
    expect(connected).not.toContain('CORE //');
    expect(connected).toContain('eco-node__micro">DEVELOPMENT</p>');
    expect(connected).toContain('eco-node__micro">INTELLIGENCE</p>');
    for (const category of ['GAMING', 'PUBLISHING', 'CIVIC', 'LOCAL DISCOVERY', 'MAINTENANCE']) {
      expect(connected).toContain(`'${category}'`);
    }
    expect(connected).toContain('FDS PRODUCTS');
  });

  it('keeps four canonical lineages and the seven factual Training Grounds stages', () => {
    expect(gems).toHaveLength(4);
    expect(gems.map((gem) => gem.name)).toEqual(['Topaz', 'Sapphire', 'Peridot', 'Garnet']);
    for (const stage of ['Curriculum', 'Teach', 'Test', 'Diagnose', 'Refine', 'Verify', 'Advance']) {
      expect(gemsVisual).toContain(`'${stage}'`);
    }
    expect(gemsVisual).toContain('data-stage={i + 1}');
    expect(gemsVisual).toContain('marker-end="url(#gems-stage-arrow)"');
    expect(gemsVisual).toContain('class="gems-art__sweep"');
    expect(gemsVisual).toContain('@keyframes gemsStageSweep');
    expect(gemsVisual).toContain('.gems-system:not([data-visual-candidate=\'neural-lattice\']) .gems-art__pulse { display: none; }');
    expect(gemsVisual).toContain('Training Grounds');
    expect(gemsVisual).toContain('Evidence-gated advancement');
    expect(gemsVisual).not.toContain('fieldLinks');
    expect(gemsVisual).toContain('class="gems-node__port"');
    expect(gemsVisual).toContain('class="gems-art__port gems-art__port--topaz"');
    expect(gemsVisual).toContain('.gems-art { position: absolute; z-index: 1;');
  });

  it('keeps a structural mobile GEMS layout and low-cost motion hooks', () => {
    expect(gemsVisual).toContain('@media (max-width: 640px)');
    expect(gemsVisual).toContain('.gems-art { display: none; }');
    expect(gemsVisual).toContain('.gems-system:not([data-visual-candidate=\'neural-lattice\']) .gems-core-wrap { width: 100%; }');
    expect(gemsVisual).toContain('data-gems-paused');
    expect(gemsVisual).toContain('@media (prefers-reduced-motion: reduce)');
    expect(gemsVisual).not.toMatch(/feGaussianBlur|feTurbulence|will-change:\s*transform/);
  });
});
