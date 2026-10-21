import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ecosystemNodes } from '../src/data/ecosystem';

const ecosystem = readFileSync(new URL('../src/components/FDSEcosystem.astro', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const connected = readFileSync(new URL('../src/components/OneFDSEcosystem.astro', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const homepage = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

describe('final visual evolution contract', () => {
  it('preserves seven individually certified product-motion paths', () => {
    expect(ecosystemNodes).toHaveLength(7);
    expect(new Set(ecosystemNodes.map((node) => node.id)).size).toBe(7);
    expect(new Set(ecosystemNodes.map((node) => node.orbit.path)).size).toBe(7);
    expect(new Set(ecosystemNodes.map((node) => node.orbit.duration)).size).toBe(7);
    expect(ecosystem.match(/data-planet={node\.id}/g)).toHaveLength(1);
    expect(ecosystem.match(/data-tag-for={node\.id}/g)).toHaveLength(1);
    expect(ecosystem).toContain('offset-path: var(--orbit-path)');
  });

  it('shows three dominant planes while retaining the exact seven product paths and canonical center mark', () => {
    expect(ecosystem.match(/data-scaffold-plane="(?:one|two|three)"/g)).toHaveLength(3);
    expect(ecosystem).toContain('class="orbit-path" d={node.orbit.path}');
    expect(ecosystem).toContain('--orbit-path:path("${node.orbit.path}")');
    expect(ecosystem).toContain('.orbit-path { fill: none; stroke: #8ba9e0; stroke-width: 1.05; opacity: 0;');
    expect(ecosystem).toContain('stroke-dasharray: 18 982; stroke-dashoffset: var(--accent-offset); opacity: 0;');
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
    expect(connected).toContain("micro: 'ENGINEERING'");
    for (const category of ['GAMING', 'PUBLISHING', 'CIVIC', 'LOCAL DISCOVERY', 'MAINTENANCE']) {
      expect(connected).toContain(`'${category}'`);
    }
    expect(connected).toContain('FDS PRODUCTS');
  });

  it('highlights the current portfolio without publishing retired product diagrams', () => {
    for (const current of ['CodeForge', 'Forge AAA', 'Forge Control', 'Dead Trails West']) {
      expect(homepage).toContain(current);
    }
    expect(homepage).not.toMatch(/GEMS|KyraBlox|Training Grounds/);
    expect(homepage).not.toMatch(/GemsStory|GemsLearningSystem/);
  });

  it('excludes retired products from the ecosystem map', () => {
    expect(ecosystemNodes.map((node) => node.id)).not.toContain('gems-training-grounds');
    expect(ecosystemNodes.map((node) => node.id)).not.toContain('kyrablox');
    expect(ecosystem).not.toMatch(/gems-training-grounds|\/projects\/kyrablox/);
  });
});
