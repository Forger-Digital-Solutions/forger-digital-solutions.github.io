import { test, expect } from '@playwright/test';
import { ecosystemNodes } from '../../src/data/ecosystem';

/**
 * Ecosystem orbit-geometry regression gate.
 *
 * Guards the de-crowding fix without pixel-brittle screenshots: in the static
 * (prefers-reduced-motion) composition every body must be well separated from every
 * other body, clear of the FDS Core, and inside the scene bounds; the core and the
 * canonical CodeForge mark must exist; and all eight expected bodies must be present.
 * Positions are read from getBoundingClientRect and normalized to the 680x680 viewBox.
 */

const EXPECTED_PLANETS = [
  'codeforge',
  'forgerems',
  'gems',
  'training-grounds',
  'kyrablox',
  'kayla-publisher',
  'we-the-people',
  'farmstand-finder',
];

// Separation / clearance floors in viewBox units. Planet bodies are ~28-34 units in
// diameter, so 90 keeps bodies and their tags clearly apart; 140 keeps bodies off the
// core aura (r=116) plus body radius.
const MIN_PAIR_DISTANCE = 90;
const MIN_CORE_DISTANCE = 140;
const BOUND_MARGIN = 20;

interface Body { id: string; x: number; y: number; }

test('ecosystem static composition is spread, core-clear, and in bounds', async ({ page }) => {
  await page.goto('/');
  // Freeze orbital motion so we measure the designed static composition, and prove the
  // freeze actually engaged before trusting the positions.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const eco = page.locator('.fds-ecosystem');
  await eco.scrollIntoViewIfNeeded();
  await expect(eco).toBeVisible();
  const frozen = await page.evaluate(() => {
    const planet = document.querySelector('.planet-motion[data-planet]');
    return Boolean(planet) && matchMedia('(prefers-reduced-motion: reduce)').matches &&
      getComputedStyle(planet!).animationName === 'none';
  });
  expect(frozen, 'reduced-motion freeze engaged (static composition)').toBe(true);

  const geometry = await page.evaluate(() => {
    const svg = document.querySelector('.fds-ecosystem__scene') as SVGSVGElement | null;
    if (!svg) return null;
    const sr = svg.getBoundingClientRect();
    const scale = sr.width / 680;
    const cx = sr.left + sr.width / 2;
    const cy = sr.top + sr.height / 2;
    const toVB = (px: number, py: number) => [340 + (px - cx) / scale, 340 + (py - cy) / scale];

    // [data-planet] selects the eight bodies; the matching .tag-motion groups that
    // carry their tags on the same path are deliberately excluded here.
    const bodies: Body[] = [...document.querySelectorAll('.planet-motion[data-planet]')].map((g) => {
      const shell = g.querySelector('.planet__shell') as SVGCircleElement;
      const r = shell.getBoundingClientRect();
      const [x, y] = toVB(r.left + r.width / 2, r.top + r.height / 2);
      return { id: g.getAttribute('data-planet') || '', x, y };
    });

    const heart = document.querySelector('.core__heart');
    const hr = heart ? heart.getBoundingClientRect() : null;
    const core = hr ? toVB(hr.left + hr.width / 2, hr.top + hr.height / 2) : [340, 340];
    const codeforge = document.querySelector('.core__codeforge');
    const codeforgeHref = codeforge ? (codeforge.getAttribute('href') || '') : '';

    return { bodies, core, hasCore: !!heart, codeforgeHref };
  });

  expect(geometry, 'ecosystem scene present').not.toBeNull();
  const { bodies, core, hasCore, codeforgeHref } = geometry!;

  // All eight bodies present.
  for (const id of EXPECTED_PLANETS) {
    expect(bodies.map((b) => b.id), `expected planet ${id}`).toContain(id);
  }
  expect(bodies).toHaveLength(EXPECTED_PLANETS.length);

  // Core + canonical CodeForge mark present in the center.
  expect(hasCore, 'FDS core heart exists').toBe(true);
  expect(codeforgeHref, 'CodeForge icon embedded in core').toContain('codeforge-icon.svg');

  // ONE PLANET = ONE ORBIT, asserted on what the browser actually received: eight
  // rendered rails and eight motion paths, all distinct, on distinct periods.
  // Comparing path data here rather than (rx, ry, rotation) is deliberate — the
  // rendered curve is the orbit, and that is the thing no two planets may share.
  const rails = await page.evaluate(() => {
    const paths = [...document.querySelectorAll('.orbit-layer path.orbit-path')].map((p) => p.getAttribute('d'));
    const motion = [...document.querySelectorAll('.planet-motion[data-planet]')].map((g) => {
      const style = g.getAttribute('style') || '';
      const path = /--orbit-path:path\("([^"]+)"\)/.exec(style)?.[1] ?? '';
      const duration = /--orbit-duration:([^;]+);/.exec(style)?.[1] ?? '';
      const direction = /--orbit-direction:([^;]+);/.exec(style)?.[1] ?? '';
      return { id: g.getAttribute('data-planet') || '', path, duration, direction, dataDuration: g.getAttribute('data-duration') || '' };
    });
    return { paths, motion };
  });
  expect(rails.paths).toHaveLength(8);
  expect(new Set(rails.paths).size, 'two planets rendered on one orbital path').toBe(8);
  expect(new Set(rails.motion.map((m) => m.path)).size, 'two planets animated on one path').toBe(8);
  expect(new Set(rails.motion.map((m) => m.duration)).size, 'two planets share an orbital period').toBe(8);
  // The rail drawn for a planet must be the track it animates along.
  for (let i = 0; i < rails.paths.length; i++) {
    expect(rails.motion[i].path, `rail ${i} and its motion path disagree`).toBe(rails.paths[i]);
  }
  // All-prograde is the certified configuration: the solver measured any retrograde
  // plane at this world-size family as costing 25-32u of shell clearance, so CW/CCW
  // symmetry was traded for collision safety and legibility. The direction field
  // still has to be a real value either way.
  for (const m of rails.motion) {
    expect(['normal', 'reverse'], `unknown orbit direction ${m.direction}`).toContain(m.direction);
  }

  // Every body must also carry its identity tag on the shared-motion tag layer —
  // same path, same period, painted under the planet layer.
  const tagMotions = await page.evaluate(() =>
    [...document.querySelectorAll('.tag-motion[data-tag-for]')].map((g) => {
      const style = g.getAttribute('style') || '';
      return {
        id: g.getAttribute('data-tag-for'),
        path: /--orbit-path:path\("([^"]+)"\)/.exec(style)?.[1] ?? '',
        duration: /--orbit-duration:([^;]+);/.exec(style)?.[1] ?? '',
      };
    }));
  expect(tagMotions).toHaveLength(8);
  for (const t of tagMotions) {
    const body = rails.motion.find((m) => m.id === t.id);
    expect(t.path, `tag for ${t.id} rides a different path than its planet`).toBe(body?.path);
    expect(t.duration, `tag for ${t.id} rides a different period`).toBe(body?.duration);
  }

  // Pairwise separation.
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const d = Math.hypot(bodies[i].x - bodies[j].x, bodies[i].y - bodies[j].y);
      expect(d, `separation ${bodies[i].id}~${bodies[j].id}`).toBeGreaterThanOrEqual(MIN_PAIR_DISTANCE);
    }
  }

  // Clearance from the core and inside the scene bounds.
  for (const b of bodies) {
    const dc = Math.hypot(b.x - core[0], b.y - core[1]);
    expect(dc, `${b.id} clear of core`).toBeGreaterThanOrEqual(MIN_CORE_DISTANCE);
    expect(b.x).toBeGreaterThanOrEqual(BOUND_MARGIN);
    expect(b.x).toBeLessThanOrEqual(680 - BOUND_MARGIN);
    expect(b.y).toBeGreaterThanOrEqual(BOUND_MARGIN);
    expect(b.y).toBeLessThanOrEqual(680 - BOUND_MARGIN);
  }
});

/* ------------------------------------------------------------------ *
 * Master-cycle gates
 * ------------------------------------------------------------------ */

/**
 * The finite master cycle the shipped periods are built on. Every duration must
 * divide it exactly, so the configuration at t = MASTER_CYCLE is the configuration at
 * t = 0 and the offline solver's sweep of one cycle is a proof about all future time.
 * The browser is not asked to replay 18 minutes; it is asked to prove that what it
 * renders at a handful of model timestamps is what the model says it renders.
 */
const MASTER_CYCLE = 1080;

const READ_BODIES = () => {
  const svg = document.querySelector('.fds-ecosystem__scene');
  if (!svg) return null;
  const sr = svg.getBoundingClientRect();
  const scale = sr.width / 680;
  const cx = sr.left + sr.width / 2, cy = sr.top + sr.height / 2;
  const toVB = (px: number, py: number) => [340 + (px - cx) / scale, 340 + (py - cy) / scale];
  return [...document.querySelectorAll('.planet-motion[data-planet]')].map((g) => {
    const r = (g.querySelector('.planet__shell') as SVGCircleElement).getBoundingClientRect();
    const [x, y] = toVB(r.left + r.width / 2, r.top + r.height / 2);
    return { id: g.getAttribute('data-planet') || '', x, y };
  });
};

/** Drive every ecosystem orbit animation to model time t (seconds) and hold it there.
 *  Both layers (bodies and their tag shadows) share the same animation clock. */
const SET_CLOCK = (t: number) => {
  const seen = new Set<Animation>();
  for (const el of document.querySelectorAll('.planet-motion')) {
    for (const a of el.getAnimations()) { if (!seen.has(a)) { seen.add(a); a.pause(); a.currentTime = t * 1000; } }
  }
  return seen.size;
};

/**
 * The same arc-length walk the browser performs, replayed in the test process:
 * offset-distance is a percentage of PATH LENGTH, so phase must be read along arc
 * length, never off the parametric angle.
 */
function modelPosition(orbit: { rx: number; ry: number; rotation: number; start: number; duration: number; direction: string; size: number }, t: number): [number, number] {
  const SAMPLES = 2000;
  const tilt = (orbit.rotation * Math.PI) / 180;
  const cos = Math.cos(tilt), sin = Math.sin(tilt);
  const xs: number[] = [], ys: number[] = [], lens: number[] = [0];
  for (let i = 0; i <= SAMPLES; i++) {
    const m = (i / SAMPLES) * Math.PI * 2;
    xs.push(orbit.rx * Math.cos(m) * cos - orbit.ry * Math.sin(m) * sin);
    ys.push(orbit.rx * Math.cos(m) * sin + orbit.ry * Math.sin(m) * cos);
    if (i > 0) lens.push(lens[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
  }
  let q = orbit.start / 100 + (orbit.direction === 'reverse' ? -t : t) / orbit.duration;
  q -= Math.floor(q);
  const target = q * lens[SAMPLES];
  let k = 0;
  while (k < SAMPLES - 1 && lens[k + 1] < target) k++;
  const span = lens[k + 1] - lens[k] || 1;
  const f = (target - lens[k]) / span;
  return [340 + xs[k] + (xs[k + 1] - xs[k]) * f, 340 + ys[k] + (ys[k + 1] - ys[k]) * f];
}

/** Orbit facts read from the shipped data, keyed by world id. */
const ORBITS = Object.fromEntries(
  ecosystemNodes.map((n) => [n.id, { ...n.orbit, size: n.size }]),
) as Record<string, { rx: number; ry: number; rotation: number; start: number; duration: number; direction: string; size: number }>;

test('every orbital period divides the master cycle exactly, with no global lockstep', async ({ page }) => {
  await page.goto('/');
  const eco = page.locator('.fds-ecosystem');
  await eco.scrollIntoViewIfNeeded();
  const durations = await page.evaluate(() =>
    [...document.querySelectorAll('.planet-motion[data-planet]')].map((g) => Number(g.getAttribute('data-duration'))));
  expect(durations).toHaveLength(8);
  expect(new Set(durations).size, 'two planets share a period').toBe(8);
  const laps = durations.map((d) => MASTER_CYCLE / d);
  for (const n of laps) expect(Number.isInteger(n), 'a period does not divide the master cycle').toBe(true);
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  expect(laps.reduce((g, n) => gcd(g, n), 0), 'the master cycle is not the shortest true repeat').toBe(1);
});

test('prefers-reduced-motion freezes exactly the animated T=0 frame', async ({ page, browser }) => {
  await page.goto('/');
  const eco = page.locator('.fds-ecosystem');
  await eco.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.evaluate(SET_CLOCK, 0);
  await page.waitForTimeout(150);
  const animated = await page.evaluate<Body[] | null>(READ_BODIES);

  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const rpage = await ctx.newPage();
  await rpage.goto('/');
  const reco = rpage.locator('.fds-ecosystem');
  await reco.scrollIntoViewIfNeeded();
  await rpage.waitForTimeout(500);
  const frozen = await rpage.evaluate<Body[] | null>(READ_BODIES);
  await ctx.close();

  expect(animated).not.toBeNull();
  expect(frozen).not.toBeNull();
  for (const a of animated!) {
    const f = frozen!.find((b) => b.id === a.id);
    expect(f, `reduced motion is missing ${a.id}`).toBeDefined();
    const d = Math.hypot(a.x - f!.x, a.y - f!.y);
    expect(d, `reduced-motion frame of ${a.id} is not the animated T=0 frame`).toBeLessThan(2);
  }
});

test('browser geometry agrees with the orbital model at sampled master-cycle timestamps', async ({ page }) => {
  await page.goto('/');
  const eco = page.locator('.fds-ecosystem');
  await eco.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Sampled, not simulated: the full-cycle proof lives in scripts/eco-orbit-solver.cjs.
  // These timestamps include t=0, the master-cycle midpoint and the certified closest
  // approach, so a regression in phase, period or direction shows up here.
  const samples = [0, 137.5, 763.1, 916.9, MASTER_CYCLE / 2];
  for (const t of samples) {
    const count = await page.evaluate(SET_CLOCK, t);
    expect(count, 'no orbit animations to drive').toBeGreaterThan(0);
    await page.waitForTimeout(150);
    const bodies = await page.evaluate<Body[] | null>(READ_BODIES);
    expect(bodies).not.toBeNull();
    for (const node of EXPECTED_PLANETS) {
      const spec = ORBITS[node];
      const [mx, my] = modelPosition(spec, t);
      const got = bodies!.find((b) => b.id === node);
      expect(got, `${node} not rendered at t=${t}`).toBeDefined();
      const d = Math.hypot(got!.x - mx, got!.y - my);
      expect(d, `${node} at t=${t}s disagrees with the model`).toBeLessThan(4);
    }
    for (let i = 0; i < bodies!.length; i++) {
      for (let j = i + 1; j < bodies!.length; j++) {
        const d = Math.hypot(bodies![i].x - bodies![j].x, bodies![i].y - bodies![j].y);
        const shells = (ORBITS[bodies![i].id].size + ORBITS[bodies![j].id].size) / 2;
        expect(d - shells, `shells of ${bodies![i].id}~${bodies![j].id} interpenetrate at t=${t}s`).toBeGreaterThan(0);
      }
    }
  }

  // And closing the cycle returns to the first frame: the repeat is what makes the
  // offline certificate cover all future time.
  await page.evaluate(SET_CLOCK, MASTER_CYCLE);
  await page.waitForTimeout(150);
  const closed = await page.evaluate<Body[] | null>(READ_BODIES);
  await page.evaluate(SET_CLOCK, 0);
  await page.waitForTimeout(150);
  const open = await page.evaluate<Body[] | null>(READ_BODIES);
  for (const a of open!) {
    const b = closed!.find((x) => x.id === a.id)!;
    expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id} does not return at t=MASTER_CYCLE`).toBeLessThan(2);
  }
});

test('every world carries an explicit label anchor in the rendered markup', async ({ page }) => {
  await page.goto('/');
  const eco = page.locator('.fds-ecosystem');
  await eco.scrollIntoViewIfNeeded();
  const anchors = await page.evaluate(() =>
    [...document.querySelectorAll('.planet__tag')].map((t) => ({
      position: t.getAttribute('data-label-position'),
      x: t.getAttribute('x'),
      y: t.getAttribute('y'),
      anchor: t.getAttribute('text-anchor'),
    })));
  expect(anchors).toHaveLength(8);
  const positions = ['below', 'below-left', 'below-right', 'left', 'right', 'above', 'above-left', 'above-right'];
  for (const a of anchors) {
    expect(positions, `unknown label position ${a.position}`).toContain(a.position);
    expect(a.x).not.toBeNull();
    expect(a.y).not.toBeNull();
    expect(['start', 'middle', 'end'], `unknown text anchor ${a.anchor}`).toContain(a.anchor);
  }
});
