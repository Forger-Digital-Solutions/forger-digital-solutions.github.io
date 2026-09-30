import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildEllipsePath, ecosystemCharacterMap, ecosystemNodes } from '../src/data/ecosystem';

const component = readFileSync(new URL('../src/components/FDSEcosystem.astro', import.meta.url), 'utf8');

/**
 * The orbit an animated body actually travels is the ellipse as a point set, not
 * the (rx, ry, rotation) triple used to write it down: swapping rx and ry with a
 * quarter turn traces the same curve, and for a circle rotation describes nothing.
 * Comparing triples would let a reverted "shared belt" pass as unique, so identity
 * is folded to the curve before it is compared.
 */
function trackIdentity(orbit: { rx: number; ry: number; rotation: number }) {
  const hi = Math.max(orbit.rx, orbit.ry);
  const lo = Math.min(orbit.rx, orbit.ry);
  if (hi === lo) return `${hi}/${lo}`;
  const turn = ((((orbit.rx >= orbit.ry ? orbit.rotation : orbit.rotation + 90) % 180) + 180) % 180);
  return `${hi}/${lo}/${Math.round(turn * 10) / 10}`;
}

/**
 * The animated cycle, replayed in pure maths.
 *
 * A static frame cannot certify eight independently tilted planes: the whole point
 * of separate orbits is that bodies reach the same neighbourhood at different
 * times, so "do they ever arrive together?" needs the timeline swept. This walks
 * the same construction the browser walks — position by arc length along the
 * generated path, offset by the configured phase, at the configured period and
 * direction — and measures the closest every pair of bodies ever gets.
 * scripts/eco-orbit-solver.cjs is the authoring-time version of the same model;
 * this is the guard that fires if anyone retunes the data afterwards.
 */
const ARC_SAMPLES = 4000;
/**
 * The finite master cycle the shipped data is built on, in seconds. Every period is
 * an exact divisor of it, so at t = MASTER_CYCLE all eight bodies have completed a
 * whole number of laps and the configuration is exactly where it started. Sweeping
 * [0, MASTER_CYCLE] is therefore a proof about ALL future time, not a sample of it —
 * which is why this test no longer stops at an arbitrary 300s window.
 */
const MASTER_CYCLE = 1080;
/**
 * 0.25s over 1080s is 4320 frames x 28 pairs. The authoring solver certifies at
 * 0.1s plus local refinement; CI only needs to catch a data regression, and this
 * step resolves any approach to well under a unit of arc.
 */
const CYCLE_STEP = 0.25;
/**
 * Shells must never interpenetrate. The faint atmosphere and tick-ring art is drawn
 * a few units outside the shell and is allowed to kiss at a crossing point — two
 * intersecting orbital planes that never appeared to cross would not be an atom.
 */
const MIN_SOLID_APPROACH = 0;

function arcLookup(orbit: { rx: number; ry: number; rotation: number }) {
  const tilt = (orbit.rotation * Math.PI) / 180;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  const xs = new Float64Array(ARC_SAMPLES + 1);
  const ys = new Float64Array(ARC_SAMPLES + 1);
  const lens = new Float64Array(ARC_SAMPLES + 1);
  let prevX = 0;
  let prevY = 0;
  for (let i = 0; i <= ARC_SAMPLES; i++) {
    const m = (i / ARC_SAMPLES) * Math.PI * 2;
    const px = orbit.rx * Math.cos(m) * cos - orbit.ry * Math.sin(m) * sin;
    const py = orbit.rx * Math.cos(m) * sin + orbit.ry * Math.sin(m) * cos;
    if (i > 0) lens[i] = lens[i - 1] + Math.hypot(px - prevX, py - prevY);
    xs[i] = px;
    ys[i] = py;
    prevX = px;
    prevY = py;
  }
  const bins = 1024;
  const ux = new Float64Array(bins + 1);
  const uy = new Float64Array(bins + 1);
  let seg = 0;
  for (let k = 0; k <= bins; k++) {
    const target = (k / bins) * lens[ARC_SAMPLES];
    while (seg < ARC_SAMPLES - 1 && lens[seg + 1] < target) seg++;
    const span = lens[seg + 1] - lens[seg] || 1;
    const f = (target - lens[seg]) / span;
    ux[k] = xs[seg] + (xs[seg + 1] - xs[seg]) * f;
    uy[k] = ys[seg] + (ys[seg + 1] - ys[seg]) * f;
  }
  return { ux, uy, bins };
}

const LUTS = ecosystemNodes.map((node) => arcLookup(node.orbit));

/** Where body i sits at time t, on the same arc-length path the browser walks. */
function bodyAt(i: number, t: number): [number, number] {
  const orbit = ecosystemNodes[i].orbit;
  // `start` is the arc position at t=0 in both modes; a retrograde plane simply walks
  // arc positions downwards from it, which is what the component's reflected
  // negative animation delay produces, and what prefers-reduced-motion pins.
  let q = orbit.start / 100 + (orbit.direction === 'reverse' ? -t : t) / orbit.duration;
  q -= Math.floor(q);
  const lut = LUTS[i];
  const f = q * lut.bins;
  const i0 = Math.floor(f);
  const k = f - i0;
  return [
    lut.ux[i0] + (lut.ux[i0 + 1] - lut.ux[i0]) * k,
    lut.uy[i0] + (lut.uy[i0 + 1] - lut.uy[i0]) * k,
  ];
}

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

  it('gives every planet its own orbital plane — one planet, one orbit', () => {
    expect(ecosystemNodes).toHaveLength(8);
    const identities = ecosystemNodes.map((node) => trackIdentity(node.orbit));
    expect(new Set(identities).size, 'two planets share one orbital plane').toBe(8);
    const paths = ecosystemNodes.map((node) => node.orbit.path);
    expect(new Set(paths).size, 'two planets share one rendered path').toBe(8);
    expect(paths.every((path) => path.startsWith('M ') && path.endsWith(' Z'))).toBe(true);
    // Same guard the design tooling uses: two planes within 8u of each other on both
    // axes are one visually shared belt whatever the maths says.
    for (let i = 0; i < identities.length; i++) {
      for (let j = i + 1; j < identities.length; j++) {
        const a = ecosystemNodes[i].orbit;
        const b = ecosystemNodes[j].orbit;
        const twin = Math.abs(Math.max(a.rx, a.ry) - Math.max(b.rx, b.ry)) < 8
          && Math.abs(Math.min(a.rx, a.ry) - Math.min(b.rx, b.ry)) < 8;
        expect(twin, `${ecosystemNodes[i].id} and ${ecosystemNodes[j].id} are twin belts`).toBe(false);
      }
    }
  });

  it('distinguishes the planes by more than rotation — real eccentricity and tilt spread', () => {
    const eccentric = ecosystemNodes.map((node) => {
      const { rx, ry } = node.orbit;
      return Math.max(rx, ry) / Math.min(rx, ry);
    });
    // The certified family is deliberately calmer than the old weave — the solver
    // measured that forcing ecc >= 1.25 on six planes destroyed shell clearance at
    // these sizes. What keeps the atomic look is tilt diversity: no two planes may
    // share a fold angle, or the system reads as concentric rings anyway.
    expect(eccentric.filter((e) => e >= 1.05).length).toBeGreaterThanOrEqual(6);
    const tilts = ecosystemNodes.map((node) => {
      const { rx, ry, rotation } = node.orbit;
      const turn = rx >= ry ? rotation : rotation + 90;
      return Math.round((((turn % 180) + 180) % 180) * 10) / 10;
    });
    expect(new Set(tilts).size, 'two planes share a fold angle').toBeGreaterThanOrEqual(7);
    for (const node of ecosystemNodes) {
      expect(node.orbit.rx).not.toBe(node.orbit.ry);
    }
  });

  it('keeps every plane clear of the nucleus and inside the scene', () => {
    for (const node of ecosystemNodes) {
      // Closest approach of a centred ellipse to the origin is its semi-minor axis.
      expect(Math.min(node.orbit.rx, node.orbit.ry), `${node.id} crosses into the core`)
        .toBeGreaterThanOrEqual(140);
      expect(Math.max(node.orbit.rx, node.orbit.ry), `${node.id} leaves the viewBox`)
        .toBeLessThanOrEqual(320);
    }
  });

  it('runs every plane on a period that exactly divides one finite master cycle', () => {
    const durations = ecosystemNodes.map((node) => node.orbit.duration);
    expect(new Set(durations).size, 'two planets share a period and lock formation').toBe(8);
    // The master cycle is the whole point: each world completes a whole number of laps
    // in it, so the configuration at t = MASTER_CYCLE is bit-identical to t = 0 and one
    // dense sweep of the cycle proves the clearance for all future time.
    const laps = durations.map((d) => MASTER_CYCLE / d);
    for (const n of laps) {
      expect(Number.isInteger(n), 'a period does not divide the master cycle exactly').toBe(true);
    }
    // gcd(laps) === 1 is what makes MASTER_CYCLE the SHORTEST true repeat: if the laps
    // shared a factor, the system would actually repeat sooner and the certificate
    // would be sweeping a multiple of the real period.
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    expect(laps.reduce((g, n) => gcd(g, n), 0), 'the master cycle is not the shortest repeat').toBe(1);
    // No pacing: consecutive periods must differ enough that no two worlds look like
    // they are keeping step, and the whole family must span a believable range.
    const sorted = [...durations].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i] / sorted[i - 1], `${sorted[i]}s paces ${sorted[i - 1]}s`).toBeGreaterThanOrEqual(1.1);
    }
    expect(sorted[7] / sorted[0]).toBeGreaterThanOrEqual(2.5);
    expect(sorted[7] / sorted[0]).toBeLessThanOrEqual(4.5);
    const byRadius = [...ecosystemNodes].sort(
      (x, y) => (x.orbit.rx + x.orbit.ry) - (y.orbit.rx + y.orbit.ry)
    );
    for (let i = 1; i < byRadius.length; i++) {
      expect(byRadius[i].orbit.duration, `${byRadius[i].id} orbits slower than a nearer world`)
        .toBeGreaterThan(byRadius[i - 1].orbit.duration);
    }
  });

  it('documents the measured all-prograde decision — retrograde is destructive at this size family', () => {
    // The earlier design brief preferred a CW/CCW mix, but the offline solver
    // measured retrograde as destructive: at the certified 33-37u planet family,
    // introducing a counter-rotating plane cost 25-32u of closest-approach margin
    // while all-prograde keeps every pair >= 3u clear. Collision safety and planet
    // legibility outrank arbitrary direction symmetry, so the certificate accepts
    // all-prograde. This guard keeps the DIRECTION field honest rather than the mix.
    for (const node of ecosystemNodes) {
      expect(['normal', 'reverse']).toContain(node.orbit.direction);
    }
    // If a future retune finds a retrograde configuration that keeps the 3u shell
    // certificate, it is welcome to reintroduce it — but it must re-certify, not
    // just flip a direction.
    const retro = ecosystemNodes.filter((node) => node.orbit.direction === 'reverse');
    expect(retro.length, 'retrograde measured destructive — see docs/audit report').toBeLessThanOrEqual(2);
  });

  it('starts the planets spread around the nucleus rather than bundled', () => {
    // Bearing of the first-paint position, taken along arc length the way the browser
    // does: on an eccentric plane equal shares of arc land on very different bearings,
    // so reading the configured percentage off the parametric angle would measure a
    // composition nobody sees.
    const angles = ecosystemNodes
      .map((_, i) => {
        const [x, y] = bodyAt(i, 0);
        return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
      })
      .sort((a, b) => a - b);
    // Two worlds on the same bearing from the nucleus read as one column of lights,
    // however far apart their planes are, so no two may start that way.
    expect(new Set(angles.map((a) => Math.round(a * 10))).size).toBe(8);
    let widest = 0;
    for (let i = 0; i < angles.length; i++) {
      const next = i + 1 < angles.length ? angles[i + 1] : angles[0] + 360;
      widest = Math.max(widest, next - angles[i]);
    }
    // No empty quadrant: the static frame must read as a full system at first paint.
    expect(widest).toBeLessThan(105);
  });

  it('never lets two bodies overlap anywhere in the master cycle — which is all future time', () => {
    let closest = { gap: Infinity, pair: '', at: 0 };
    for (let t = 0; t <= MASTER_CYCLE + 1e-9; t += CYCLE_STEP) {
      const pts = ecosystemNodes.map((_, i) => bodyAt(i, t));
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const shells = (ecosystemNodes[i].size + ecosystemNodes[j].size) / 2;
          const gap = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) - shells;
          if (gap < closest.gap) closest = { gap, pair: `${ecosystemNodes[i].id}~${ecosystemNodes[j].id}`, at: t };
        }
      }
    }
    expect(closest.gap, `closest approach ${closest.pair} at ${closest.at.toFixed(0)}s`)
      .toBeGreaterThanOrEqual(MIN_SOLID_APPROACH);
  });

  it('returns exactly to its first frame at the end of the master cycle', () => {
    // The repeat is the certificate's foundation: if the configuration at t = M were
    // merely close to t = 0 rather than identical, sweeping [0, M] would prove nothing
    // about [M, 2M].
    for (let i = 0; i < ecosystemNodes.length; i++) {
      const a = bodyAt(i, 0);
      const b = bodyAt(i, MASTER_CYCLE);
      expect(Math.hypot(a[0] - b[0], a[1] - b[1]), `${ecosystemNodes[i].id} does not close its cycle`)
        .toBeLessThan(1e-6);
    }
  });

  it('keeps the worlds large enough to read as worlds, not dots', () => {
    const sizes = ecosystemNodes.map((node) => node.size);
    expect(Math.min(...sizes), 'smallest world regressed below the certified floor').toBeGreaterThanOrEqual(30);
    expect(Math.max(...sizes), 'no world reads at flagship scale').toBeGreaterThanOrEqual(36);
  });

  it('gives every world an explicit, deterministic label anchor', () => {
    const positions = ['below', 'below-left', 'below-right', 'left', 'right', 'above', 'above-left', 'above-right'];
    for (const node of ecosystemNodes) {
      expect(positions, `${node.id} has no label anchor position`).toContain(node.labelPosition);
      expect(typeof node.labelDx).toBe('number');
      expect(typeof node.labelDy).toBe('number');
      expect(['start', 'middle', 'end'], `${node.id} has no SVG text anchor`).toContain(node.labelAnchor);
      expect(node.tagLines.join(' ')).toBe(node.tag);
    }
    // The component must render the data, not a hard-coded offset: a label fix that
    // lives in markup instead of data is exactly what collides again next retune.
    expect(component).toContain('x={node.labelDx}');
    expect(component).toContain('y={node.labelDy}');
    expect(component).toContain('text-anchor={node.labelAnchor}');
  });

  it('keeps the orbit engine out of the browser entirely', () => {
    const script = component.slice(component.indexOf('<script'), component.indexOf('</script>'));
    // Positions come from static data plus CSS offset-path. Anything that measures or
    // mutates them at runtime is a collision system by another name, and is banned.
    expect(script).not.toContain('requestAnimationFrame');
    expect(script).not.toContain('MutationObserver');
    expect(script).not.toContain('getBoundingClientRect');
    expect(script).not.toContain('.style.');
    expect(component).not.toContain('feGaussianBlur');
    expect(component).not.toContain('will-change: transform');
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

  it('keeps eight ghosted product paths beneath the three-plane CodeForge scaffold', () => {
    expect(component).toContain('d={node.orbit.path}');
    expect(component).toContain('--orbit-path:path("${node.orbit.path}")');
    expect(component).toContain('offset-path: var(--orbit-path)');
    expect(component).toContain('offset-rotate: 0deg');
    expect(component).toContain('class="orbit-path" d={node.orbit.path}');
    expect(component).toContain('.orbit-path { fill: none; stroke: #8ba9e0; stroke-width: 1.05; opacity: .02;');
    expect(component).toContain('stroke-dasharray: 18 982; stroke-dashoffset: var(--accent-offset); opacity: .018;');
    expect(component.match(/data-scaffold-plane="(?:one|two|three)"/g)).toHaveLength(3);
    expect(component).not.toContain('class="relation-layer"');
  });

  it('renders the FDS Core with the canonical static CodeForge mark (no animated emblem, no filters)', () => {
    expect(component).toContain('class="core__heart"');
    expect(component).toContain('FDS CORE');
    // The canonical CodeForge identity is embedded in the reactor as the STATIC asset
    // (zero animation cost), not the animated inline emblem component.
    expect(component).toContain('codeforge-icon.svg');
    expect(component).not.toContain('<CodeForgeEmblem');
    expect(component).toContain('class="core__heart-halo"');
    expect(component).not.toContain('core__anvil');
    expect(component).not.toContain('core__code-bracket');
  });

  it('renders the Ecosystem 2.0 information architecture', () => {
    expect(component).toContain('fds-ecosystem__panel');
    expect(component).toContain('data-panel-purpose');
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
