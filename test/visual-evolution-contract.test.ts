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

  it('shows three dominant planes while retaining the exact eight product paths and canonical center mark', () => {
    expect(ecosystem.match(/data-scaffold-plane="(?:one|two|three)"/g)).toHaveLength(3);
    expect(ecosystem).toContain('class="orbit-path" d={node.orbit.path}');
    expect(ecosystem).toContain('--orbit-path:path("${node.orbit.path}")');
    expect(ecosystem).toContain('.orbit-path { fill: none; stroke: #8ba9e0; stroke-width: 1.05; opacity: .02;');
    expect(ecosystem).toContain('stroke-dasharray: 18 982; stroke-dashoffset: var(--accent-offset); opacity: .018;');
    expect(ecosystem).not.toContain('class="relation-layer"');
    expect(ecosystem).toContain('.orbit-visual.orbit-highlight .orbit-path');
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
    expect(gemsVisual).toContain('Training Grounds');
    expect(gemsVisual).toContain('Evidence-gated advancement');
    expect(gemsVisual).not.toContain('fieldLinks');
    expect(gemsVisual).toContain('data-gem-core={gem.key}');
    expect(gemsVisual).toContain('data-research-state={gem.state}');
    expect(gemsVisual).toContain('data-gem-port={gem.key}');
    expect(gemsVisual).toContain('data-conduit-for="topaz"');
    expect(gemsVisual).toContain('data-conduit-endpoint="topaz"');
    expect(gemsVisual).toContain('.gems-ambient { z-index: 1; }');
    expect(gemsVisual).toContain('.gems-conduits, .gems-mobile-conduits { z-index: 2; }');
    expect(gemsVisual).toContain('.gems-art { z-index: 3; }');
    expect(gemsVisual).toContain('class="gems-node__facet gems-node__facet--crown"');
    expect(gemsVisual).not.toContain('gems-node__core-frame');
    expect(gemsVisual).not.toContain('border-radius: 0.7rem');
  });

  it('keeps a structural mobile GEMS layout and low-cost motion hooks', () => {
    expect(gemsVisual).toContain('@media (max-width: 640px)');
    expect(gemsVisual).toContain('.gems-nodes {\n      position: relative; z-index: 4; display: grid; grid-row: 2;');
    expect(gemsVisual).toContain('.gems-mobile-conduits { display: block; }');
    expect(gemsVisual).toContain('data-gems-paused');
    expect(gemsVisual).toContain('@media (prefers-reduced-motion: reduce)');
    expect(gemsVisual).not.toMatch(/feGaussianBlur|feTurbulence|will-change:\s*transform/);
  });
});
