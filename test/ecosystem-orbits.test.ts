import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildEllipsePath, ecosystemCharacterMap, ecosystemNodes } from '../src/data/ecosystem';

const component = readFileSync(new URL('../src/components/FDSEcosystem.astro', import.meta.url), 'utf8');

describe('FDS ecosystem orbital model (Ecosystem 2.0)', () => {
  it('derives node facts from the canonical product manifest', () => {
    for (const node of ecosystemNodes) {
      expect(node.statusLabel).not.toBe('');
      expect(node.purpose.length).toBeGreaterThan(10);
    }
    expect(ecosystemNodes.map((n) => n.manifestId)).toEqual(expect.arrayContaining([
      'codeforge', 'forgerems', 'gems', 'training-grounds', 'kyrablox', 'kayla-publisher', 'we-the-people', 'farmstand-finder'
    ]));
  });

  it('arranges the eight nodes on four fixed layer belts (two per layer)', () => {
    expect(ecosystemNodes).toHaveLength(8);
    expect(new Set(ecosystemNodes.map((node) => node.id)).size).toBe(8);
    // One unique ellipse per conceptual layer; the two nodes on a belt share
    // geometry with offset starting positions so they never collide.
    expect(new Set(ecosystemNodes.map((node) => node.orbit.path)).size).toBe(4);
    expect(new Set(ecosystemNodes.map((node) => node.orbit.start)).size).toBe(8);
    expect(ecosystemNodes.every((node) => node.orbit.path.startsWith('M ') && node.orbit.path.endsWith(' Z'))).toBe(true);
    for (const id of ['build', 'intelligence', 'create', 'knowledge']) {
      const belt = ecosystemNodes.filter((node) => node.group === id);
      expect(belt, `layer ${id} must hold two nodes`).toHaveLength(2);
      expect(belt[0].orbit.path).toBe(belt[1].orbit.path);
      expect(belt[0].orbit.duration).toBe(belt[1].orbit.duration);
      expect(belt[0].orbit.start).not.toBe(belt[1].orbit.start);
    }
  });

  it('slows the orbital belts from the inner Build layer outward', () => {
    const durationByGroup = (group: string) =>
      ecosystemNodes.find((node) => node.group === group)!.orbit.duration;
    expect(durationByGroup('build')).toBeLessThan(durationByGroup('intelligence'));
    expect(durationByGroup('intelligence')).toBeLessThan(durationByGroup('create'));
    expect(durationByGroup('create')).toBeLessThan(durationByGroup('knowledge'));
  });

  it('generates deterministic closed ellipse paths', () => {
    expect(buildEllipsePath(268, 116, -16)).toBe(buildEllipsePath(268, 116, -16));
    expect(buildEllipsePath(268, 116, -16)).not.toBe(buildEllipsePath(268, 116, -15));
  });

  it('only links nodes to existing canonical project routes', () => {
    expect(ecosystemNodes.every((node) => node.href.startsWith('/'))).toBe(true);
    expect(ecosystemNodes.map((node) => node.href)).toEqual(expect.arrayContaining([
      '/projects/codeforge',
      '/projects/forgerems',
      '/projects/gems-training-grounds',
      '/projects/kyrablox',
      '/projects/kayla-ai-publisher',
      '/projects/we-the-people',
      '/projects/farmstand-finder'
    ]));
  });

  it('uses the same generated path for the visible rail and CSS motion path', () => {
    expect(component).toContain('d={node.orbit.path}');
    expect(component).toContain('--orbit-path:path("${node.orbit.path}")');
    expect(component).toContain('offset-path: var(--orbit-path)');
    expect(component).toContain('offset-rotate: 0deg');
    expect(component).toContain('.orbit-path { stroke: var(--planet-color)');
  });

  it('renders the FDS Core as a pure-SVG forge-reactor heart', () => {
    expect(component).toContain('class="core__heart"');
    expect(component).toContain('FDS CORE');
    expect(component).not.toContain('codeforge-icon.svg');
    expect(component).not.toContain('<CodeForgeEmblem');
    expect(component).toContain('class="core__heart-halo"');
    expect(component).not.toContain('core__anvil');
    expect(component).not.toContain('core__code-bracket');
  });

  it('renders the Ecosystem 2.0 information architecture', () => {
    expect(component).toContain('fds-ecosystem__panel');
    expect(component).toContain('data-panel-purpose');
    expect(component).toContain('fds-ecosystem__legend');
    expect(component).toContain('relation-chord');
    expect(component).toContain('fds-ecosystem__mobile');
    expect(component).toContain('eco-group__link');
  });

  it('renders the 8-Bit character family inside the celestial bodies with accessible labels', () => {
    expect(component).toContain('class="planet__character"');
    expect(component).toContain('href={node.character}');
    expect(component).toContain('aria-hidden="true"');
    expect(component).toContain('class="planet__tag"');
    expect(component).toContain('class="planet__label"');
  });

  it('verifies that every configured ecosystem node has an optimized, non-empty 8-Bit asset', () => {
    expect(ecosystemNodes).toHaveLength(8);
    for (const node of ecosystemNodes) {
      expect(node.character).toMatch(/^\/images\/ecosystem\/8bit\/.+-8bit\.webp$/);
      const diskPath = new URL(`../public${node.character}`, import.meta.url);
      expect(existsSync(diskPath), `Asset must exist on disk: ${node.character}`).toBe(true);
      const stat = statSync(diskPath);
      expect(stat.size).toBeGreaterThan(5000);
    }
  });

  it('maintains a deterministic node -> 8bit character mapping contract', () => {
    expect(ecosystemCharacterMap).toBeDefined();
    const expectedCharacters: Record<string, string> = {
      codeforge: 'forged',
      forgerems: 'forgerems',
      gems: 'intelligence',
      'training-grounds': 'applications',
      kyrablox: 'gaming',
      'kayla-publisher': 'publishing',
      'we-the-people': 'civic',
      'farmstand-finder': 'foraging',
    };
    for (const [nodeId, icon] of Object.entries(expectedCharacters)) {
      const node = ecosystemNodes.find((n) => n.id === nodeId);
      expect(node, `node ${nodeId} must exist`).toBeDefined();
      expect(node?.character).toBe(ecosystemCharacterMap[icon]);
    }
  });

  it('freezes path movement at configured positions for reduced motion', () => {
    expect(component).toContain('@media (prefers-reduced-motion: reduce)');
    expect(component).toContain('.planet-motion { animation: none; offset-distance: var(--orbit-start); will-change: auto; }');
    expect(component).toContain('.planet__character { transition: none; transform: none; }');
    expect(component).not.toContain('requestAnimationFrame');
  });
});
