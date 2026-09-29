'use strict';
/**
 * FDS ecosystem orbit model — OFFLINE authoring/verification maths.
 *
 * Nothing here ships. The browser still receives static SVG path data plus a CSS
 * offset-path animation; this module exists so the *schedule* can be proven
 * collision-free at authoring time instead of observed for a few hundred seconds.
 *
 * THE MASTER CYCLE
 * ----------------
 * Eight tilted ellipses cross each other by design, so "do the bodies ever meet?"
 * cannot be answered from one frame. With arbitrary periods it cannot be answered
 * at all: two bodies on tracks that cross approach arbitrarily closely somewhere
 * in infinite time, and the best a phase search can do is push those meetings out
 * of the observation window. That is why the old report degraded with every longer
 * window it was asked about.
 *
 * Making every period an exact divisor of one MASTER_CYCLE changes the question.
 * Body i then sits at arc position
 *
 *     u_i(t) = o_i + sigma_i * n_i * (t / M)      n_i = M / duration_i
 *
 * and at t = M every body has completed a whole number of turns, so the entire
 * eight-body configuration is bit-for-bit where it started. Sweeping [0, M] once is
 * therefore a proof about ALL future time, not a sample of it.
 *
 * The pair structure makes that sweep affordable inside a search. For bodies i, j
 * let g = gcd(n_i, n_j) and Q = n_i / g. Substituting w for the turns body i has
 * made, the pair traces
 *     u_i = o_i + w ,  u_j = o_j + rho * w ,  rho = sigma_i * sigma_j * n_j / n_i
 * which closes after exactly Q turns, and [0, M] walks it g times. So the pair's
 * all-time minimum separation is a function of ONE number,
 *     kappa = (o_j - rho * o_i) mod 1
 * and can be tabulated once per (pair, relative spin). A candidate phase vector
 * then scores with 28 table lookups instead of a time sweep — microseconds — which
 * is what makes thousands of restarts affordable. Every winner is afterwards
 * re-measured by the honest dense sweep in `sweepShells`, never trusted from the
 * table.
 */

const fs = require('node:fs');
const path = require('node:path');

const CENTER = 340;
const KAPPA = 0.5522847498;
const BINS = Number(process.env.MODEL_BINS || 4096);
const SUB = Number(process.env.MODEL_SUB || 400);
const r2 = (v) => Number(v.toFixed(2));

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a * b) / gcd(a, b);

/* ------------------------------------------------------------------ *
 * Path model — byte-identical construction to src/data/ecosystem.ts
 * ------------------------------------------------------------------ */

function ellipseSegments(rx, ry, rotation) {
  const a = (rotation * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const p = (x, y) => [r2(CENTER + x * cos - y * sin), r2(CENTER + x * sin + y * cos)];
  const P0 = p(rx, 0), C1 = p(rx, KAPPA * ry), C2 = p(KAPPA * rx, ry), P1 = p(0, ry);
  const C3 = p(-KAPPA * rx, ry), C4 = p(-rx, KAPPA * ry), P2 = p(-rx, 0);
  const C5 = p(-rx, -KAPPA * ry), C6 = p(-KAPPA * rx, -ry), P3 = p(0, -ry);
  const C7 = p(KAPPA * rx, -ry), C8 = p(rx, -KAPPA * ry);
  return [[P0, C1, C2, P1], [P1, C3, C4, P2], [P2, C5, C6, P3], [P3, C7, C8, P0]];
}

const bez = (s, t) => {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * s[0][0] + b * s[1][0] + c * s[2][0] + d * s[3][0],
          a * s[0][1] + b * s[1][1] + c * s[2][1] + d * s[3][1]];
};

/**
 * Arc-length-uniform lookup table, because that is what `offset-distance: X%`
 * means in CSS: a percentage of path length, not of the parametric angle. On an
 * eccentric plane equal shares of the parameter land on very different shares of
 * the arc, so modelling the parametric form would certify a motion nobody sees.
 */
function buildLUT(orbit) {
  const segs = ellipseSegments(orbit.rx, orbit.ry, orbit.rotation);
  const px = [], py = [], ps = [];
  let total = 0;
  let prev = segs[0][0];
  px.push(prev[0]); py.push(prev[1]); ps.push(0);
  for (const s of segs) {
    for (let i = 1; i <= SUB; i++) {
      const q = bez(s, i / SUB);
      total += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
      px.push(q[0]); py.push(q[1]); ps.push(total);
      prev = q;
    }
  }
  const x = new Float64Array(BINS), y = new Float64Array(BINS);
  let j = 0;
  for (let i = 0; i < BINS; i++) {
    const target = (i / BINS) * total;
    while (j < px.length - 2 && ps[j + 1] < target) j++;
    const span = ps[j + 1] - ps[j] || 1;
    const k = (target - ps[j]) / span;
    x[i] = px[j] + (px[j + 1] - px[j]) * k;
    y[i] = py[j] + (py[j + 1] - py[j]) * k;
  }
  return { x, y, perimeter: total };
}

/**
 * Canonical identity of an orbital plane as a POINT SET. (rx, ry, rotation) is not
 * a unique description: swapping the radii with a quarter turn traces the same
 * curve, and for a circle rotation describes nothing. Two belts differing only in
 * that bookkeeping would pass a naive triple comparison while being one orbit.
 */
function trackSignature(o) {
  const hi = Math.max(o.rx, o.ry);
  const lo = Math.min(o.rx, o.ry);
  let turn = o.rx >= o.ry ? o.rotation : o.rotation + 90;
  if (hi === lo) turn = 0;
  turn = ((turn % 180) + 180) % 180;
  return `${hi}/${lo}/${Math.round(turn * 10) / 10}`;
}

function prepare(config, M) {
  return config.map((o) => {
    const { x, y, perimeter } = buildLUT(o);
    // Revolutions per master cycle must be a whole number for the repeat to be
    // exact; rounding only absorbs the float error in M / (M / n), never a period
    // that genuinely fails to divide the cycle (pairTable re-checks that).
    const n = M ? M / o.duration : null;
    const lines = o.tagLines && o.tagLines.length ? o.tagLines : [o.tag || ''];
    return {
      ...o,
      x, y, perimeter,
      sigma: o.direction === 'reverse' ? -1 : 1,
      revolutions: n === null ? null : Math.round(n),
      speed: perimeter / o.duration,
      _tagLines: lines,
      _tagWidth: Math.max(...lines.map(tagWidth)),
    };
  });
}

/** Point on body b at arc fraction v. Writes into the caller's scratch pair. */
function at(b, v, out) {
  const f = v - Math.floor(v);
  const p = f * BINS;
  const i0 = Math.floor(p);
  const i1 = i0 + 1 === BINS ? 0 : i0 + 1;
  const k = p - i0;
  const a = i0 % BINS;
  out[0] = b.x[a] + (b.x[i1] - b.x[a]) * k;
  out[1] = b.y[a] + (b.y[i1] - b.y[a]) * k;
  return out;
}

const SCRATCH = Array.from({ length: 16 }, () => [0, 0]);

/* ------------------------------------------------------------------ *
 * Reading the shipped configuration
 * ------------------------------------------------------------------ */

const ECO_FILE = path.join(__dirname, '..', 'src', 'data', 'ecosystem.ts');

/** Split the `const specs: NodeSpec[] = [ ... ];` literal into its object blocks. */
function specBlocks(source) {
  const decl = source.indexOf('const specs: NodeSpec[] = [');
  if (decl < 0) throw new Error('could not find the specs array in ecosystem.ts');
  // Start the bracket scan at the array literal itself, not at the declaration:
  // `NodeSpec[]` contains a `[` that would otherwise close the scan immediately.
  let i = decl + 'const specs: NodeSpec[] = '.length;
  let depth = 0;
  let end = -1;
  for (; i < source.length; i++) {
    if (source[i] === '[') depth++;
    else if (source[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) throw new Error('unterminated specs array in ecosystem.ts');
  const body = source.slice(decl, end);
  const blocks = [];
  depth = 0;
  let from = -1;
  for (let k = 0; k < body.length; k++) {
    const c = body[k];
    if (c === '{') { if (depth === 0) from = k; depth++; }
    else if (c === '}') { depth--; if (depth === 0) blocks.push(body.slice(from, k + 1)); }
  }
  return blocks;
}

const str = (block, key) => {
  const m = new RegExp(`${key}:\\s*'([^']*)'`).exec(block);
  return m ? m[1] : null;
};
const num = (block, key) => {
  const m = new RegExp(`${key}:\\s*(-?[\\d.]+)`).exec(block);
  return m ? Number(m[1]) : null;
};
/** `tagLines: ['A', 'B']` -> ['A','B']; null when the spec carries no explicit stack. */
const parseTagLines = (block) => {
  const m = /tagLines:\s*\[([^\]]*)\]/.exec(block);
  if (!m) return null;
  const lines = [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]);
  return lines.length ? lines : null;
};

/**
 * Parse the configuration the site actually ships, rather than a hand-copied twin
 * of it. A solver that analyses its own DEFAULT proves nothing about the page; this
 * is the single source of truth for every certification below.
 */
function readShippedConfig(file = ECO_FILE) {
  const source = fs.readFileSync(file, 'utf8');
  return specBlocks(source).map((block) => {
    const args = /orbit:\s*orbit\(([^)]*)\)/.exec(block);
    if (!args) throw new Error(`no orbit() call in spec block: ${block.slice(0, 60)}`);
    const [rx, ry, rotation, duration, direction, start, opacity] = args[1].split(',').map((s) => s.trim());
    const label = {
      position: str(block, 'labelPosition'),
      dx: num(block, 'labelDx'),
      dy: num(block, 'labelDy'),
      anchor: str(block, 'labelAnchor'),
    };
    return {
      id: str(block, 'id'),
      tag: str(block, 'tag'),
      tagLines: parseTagLines(block),
      size: num(block, 'size'),
      rx: Number(rx), ry: Number(ry), rotation: Number(rotation),
      duration: Number(duration),
      direction: direction.replace(/['"]/g, ''),
      start: Number(start),
      opacity: Number(opacity),
      label,
    };
  });
}

/**
 * Smallest common repeat period of a duration set, in seconds. Durations are lifted
 * to integers first: gcd/lcm on binary floats never lands exactly, and a schedule
 * whose repeat period is computed as 1e52s is a schedule that has no finite repeat
 * at all — which is precisely the failure this replaces.
 */
function repeatPeriod(durations) {
  const scale = Math.max(...durations.map(decimals)) || 0;
  const k = 10 ** scale;
  const ints = durations.map((d) => Math.round(d * k));
  let L = ints[0];
  for (const d of ints.slice(1)) L = lcm(L, d);
  return L / k;
}

/* ------------------------------------------------------------------ *
 * Master-cycle schedule design
 * ------------------------------------------------------------------ */

/**
 * Enumerate candidate master schedules.
 *
 * A schedule is a master period M plus eight integer divisors of it used as orbital
 * periods. Divisibility is what buys the proof: with duration_i | M every body has
 * made a whole number of laps at t = M, so the configuration repeats exactly and a
 * single dense sweep of [0, M] certifies all future time.
 *
 * The constraints encode the brief rather than just the maths:
 *   - eight distinct periods, and no period an integer multiple of another, so
 *     nothing locks into a visible 2:1 or 3:1 carousel resonance;
 *   - consecutive periods separated by at least `spread`, so no two worlds look
 *     like they are pacing each other;
 *   - gcd of the revolution counts equal to 1, so lcm(durations) really is M and
 *     the certificate covers the shortest possible repeat rather than a multiple;
 *   - M inside [minMaster, maxMaster] — long enough that repetition is invisible,
 *     short enough that exhaustive sampling stays cheap.
 */
/** Decimal places needed to write M/n exactly; 9 means "not writable". */
function decimals(v) {
  for (const p of [0, 1, 2, 3]) if (Math.abs(v * 10 ** p - Math.round(v * 10 ** p)) < 1e-9) return p;
  return 9;
}

function masterSchedules({
  minMaster = 600,
  maxMaster = 2700,
  minDuration = 30,
  maxDuration = 100,
  spread = 1.07,
  perMaster = 6,
  maxDecimals = 2,
  limit = Infinity,
} = {}) {
  const out = [];
  for (let M = minMaster; M <= maxMaster && out.length < limit; M++) {
    // A period qualifies when M / period is a whole number of laps AND the period can
    // be written down exactly, so the shipped decimal is the number the proof used.
    const divs = [];
    for (let n = 6; n <= 160; n++) {
      const d = M / n;
      if (d < minDuration || d > maxDuration) continue;
      if (decimals(d) > maxDecimals) continue;
      divs.push(Math.round(d * 1000) / 1000);
    }
    divs.sort((a, b) => a - b);   // n ascends, so durations descend: put them back in order
    if (divs.length < 8) continue;
    let found = 0;
    const chosen = [];
    const walk = (from) => {
      if (found >= perMaster || out.length >= limit) return;
      if (chosen.length === 8) {
        const revolutions = chosen.map((d) => Math.round(M / d));
        // gcd(revolutions) === 1 makes lcm(durations) === M, so the certificate covers
        // the shortest true repeat rather than some multiple of it.
        if (revolutions.reduce((g, n) => gcd(g, n), 0) === 1) {
          out.push({ M, durations: [...chosen], revolutions });
          found++;
        }
        return;
      }
      for (let k = from; k < divs.length; k++) {
        const d = divs[k];
        if (chosen.length && d / chosen[chosen.length - 1] < spread) continue;
        // duration_a / duration_b is an integer exactly when n_b divides n_a, which is
        // the visible "carousel" resonance the design forbids.
        const na = Math.round(M / d);
        if (chosen.some((c) => { const nc = Math.round(M / c); return na % nc === 0 || nc % na === 0; })) continue;
        chosen.push(d);
        walk(k + 1);
        chosen.pop();
      }
    };
    walk(0);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Exact dense sweeps (the honest certificate)
 * ------------------------------------------------------------------ */

const PAIR = (bodies) => {
  const out = [];
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) out.push([i, j]);
  return out;
};

/**
 * Dense sweep of the whole master cycle. Returns the per-pair minimum SHELL
 * clearance (centre distance minus the two radii) and the global worst, each with
 * its timestamp and the two positions, so a closest-approach frame can be captured
 * from the number rather than hunted for by eye.
 */
function sweepShells(bodies, M, dt) {
  const pairs = PAIR(bodies);
  const per = pairs.map(([i, j]) => ({ i, j, a: bodies[i].id, b: bodies[j].id, gap: Infinity, t: 0 }));
  const n = bodies.length;
  const px = new Float64Array(n), py = new Float64Array(n);
  const sc = Array.from({ length: n }, () => [0, 0]);
  const steps = Math.round(M / dt);
  for (let s = 0; s <= steps; s++) {
    const t = (s * dt);
    const frac = t / M;
    for (let i = 0; i < n; i++) {
      at(bodies[i], bodies[i].start / 100 + bodies[i].sigma * bodies[i].revolutions * frac, sc[i]);
      px[i] = sc[i][0]; py[i] = sc[i][1];
    }
    for (let k = 0; k < pairs.length; k++) {
      const [i, j] = pairs[k];
      const d = Math.hypot(px[i] - px[j], py[i] - py[j]) - (bodies[i].size + bodies[j].size) / 2;
      if (d < per[k].gap) { per[k].gap = d; per[k].t = t; }
    }
  }
  per.sort((a, b) => a.gap - b.gap);
  return { per, worst: per[0], steps };
}

/**
 * Narrow a coarse minimum by repeated ternary rescan. The pairwise distance is
 * smooth in t, so a local scan window that brackets the coarse argmin contains the
 * true local minimum; eight halvings of a 2*dt window resolves it far below the
 * 0.01u the report quotes.
 */
function refinePairGap(bodies, i, j, t0, span, M) {
  const need = (bodies[i].size + bodies[j].size) / 2;
  const sc = [[0, 0], [0, 0]];
  const gapAt = (t) => {
    const f = t / M;
    at(bodies[i], bodies[i].start / 100 + bodies[i].sigma * bodies[i].revolutions * f, sc[0]);
    at(bodies[j], bodies[j].start / 100 + bodies[j].sigma * bodies[j].revolutions * f, sc[1]);
    return Math.hypot(sc[0][0] - sc[1][0], sc[0][1] - sc[1][1]) - need;
  };
  let lo = Math.max(0, t0 - span), hi = Math.min(M, t0 + span);
  let best = { t: t0, gap: gapAt(t0) };
  for (let pass = 0; pass < 12; pass++) {
    let bl = lo, bh = hi;
    for (let k = 0; k <= 20; k++) {
      const t = lo + ((hi - lo) * k) / 20;
      const g = gapAt(t);
      if (g < best.gap) best = { t, gap: g };
    }
    const w = (hi - lo) / 20;
    lo = Math.max(lo, best.t - w); hi = Math.min(hi, best.t + w);
    if (hi - lo < 1e-6) break;
    if (bl === lo && bh === hi) break;
  }
  return best;
}

/** Positions of every body at time t, in viewBox units. */
function frameAt(bodies, t, M) {
  const sc = [0, 0];
  return bodies.map((b) => {
    at(b, b.start / 100 + b.sigma * b.revolutions * (t / M), sc);
    return { id: b.id, x: sc[0], y: sc[1] };
  });
}

/** Composition of one frame: separation, core clearance, bounds, bearing balance. */
function frameMetrics(points, bodies) {
  let minPair = Infinity, pair = '';
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      if (d < minPair) { minPair = d; pair = `${points[i].id}~${points[j].id}`; }
    }
  }
  const radii = points.map((p) => Math.hypot(p.x - CENTER, p.y - CENTER));
  const angles = points.map((p) => ((Math.atan2(p.y - CENTER, p.x - CENTER) * 180) / Math.PI + 360) % 360).sort((a, b) => a - b);
  let maxGap = 0;
  for (let i = 0; i < angles.length; i++) {
    maxGap = Math.max(maxGap, (angles[(i + 1) % angles.length] - angles[i] + 360) % 360);
  }
  let minBound = Infinity;
  points.forEach((p, i) => {
    const r = bodies[i].size / 2;
    minBound = Math.min(minBound, p.x - r, p.y - r, 680 - p.x - r, 680 - p.y - r);
  });
  return { minPair, pair, minCore: Math.min(...radii), maxRadius: Math.max(...radii), maxGap, minBound };
}

/* ------------------------------------------------------------------ *
 * Pair tables — the fast surrogate used inside the search
 * ------------------------------------------------------------------ */

/** Arc-fraction index of the LUT point nearest (px, py). */
function arcFracAt(body, px, py) {
  let best = 0;
  let bd = Infinity;
  for (let k = 0; k <= BINS; k++) {
    const dx = body.x[k] - px;
    const dy = body.y[k] - py;
    const d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = k; }
  }
  return best / BINS;
}

/**
 * The (u_A, u_B) arc fractions of every place where two tracks come closest.
 *
 * A near-miss between the BODIES can only happen where the TRACKS are close, and two
 * centred ellipses are close either where their radial profiles cross or where the
 * gap between them bottoms out — a near-tangency, which is the corridor case and is
 * just as dangerous. Both are local minima of |r_A - r_B| over the half circle, so
 * those minima (refined, plus their antipodes) are where the w-refinement has to
 * look. A uniform w grid cannot be trusted to find them: at head-on speed a
 * shell-deep encounter is a few milliseconds wide, narrower than any grid step cheap
 * enough to search with, and a grid that steps over the vertex reports a near-miss
 * as a comfortable miss. That optimism is the dangerous kind, so the search is
 * seeded analytically instead.
 */
function crossingSeeds(A, B) {
  const seeds = [];
  const N = 1024;
  const gap = (th) => Math.abs(radial(A, th) - radial(B, th));
  const prev = new Float64Array(N + 1);
  for (let k = 0; k <= N; k++) prev[k] = gap((k / N) * Math.PI);
  for (let k = 1; k < N; k++) {
    if (!(prev[k] < prev[k - 1] && prev[k] <= prev[k + 1])) continue;
    let lo = ((k - 1) / N) * Math.PI;
    let hi = ((k + 1) / N) * Math.PI;
    for (let r = 0; r < 40; r++) {
      const m1 = lo + (hi - lo) / 3;
      const m2 = hi - (hi - lo) / 3;
      if (gap(m1) < gap(m2)) hi = m2; else lo = m1;
    }
    const tc = (lo + hi) / 2;
    for (const sgn of [1, -1]) {
      // The arc-length LUT lives in scene coordinates, so the seed point must too.
      const px = CENTER + sgn * radial(A, tc) * Math.cos(tc);
      const py = CENTER + sgn * radial(A, tc) * Math.sin(tc);
      seeds.push([arcFracAt(A, px, py), arcFracAt(B, px, py)]);
    }
  }
  return seeds;
}

/**
 * Minimum centre distance along one pair's torus line at a fixed kappa.
 *
 * The joint state of a pair traces (u_A + w, u_B + kappa + rho*w) for w in [0, Q),
 * a closed line that covers ALL of future time, so its minimum is the closest those
 * two bodies ever get at that phase relationship.
 *
 * The minimum is found by refining around every analytically seeded encounter (see
 * `crossingSeeds`) plus one coarse-scan argmin, which covers the case of two tracks
 * that run alongside each other without crossing. Seeds whose partner is more than a
 * tenth of a lap away at that instant cannot be an encounter and are skipped, which
 * is what keeps this affordable inside a search loop.
 */
function minAlongLine(A, B, rho, Q, kappa, {
  perTurn = 24,
  refineRounds = 6,
  floorAt = -Infinity,
  scratch,
  seeds = null,
} = {}) {
  const [pa, pb] = scratch || [[0, 0], [0, 0]];
  const distAt = (w) => {
    at(A, w, pa);
    at(B, kappa + rho * w, pb);
    return Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
  };
  const refine = (w0, half0) => {
    let arg = w0;
    let min = distAt(w0);
    let half = half0;
    for (let r = 0; r < refineRounds; r++) {
      half /= 3;
      let bestW = arg;
      let bestD = min;
      for (let s = -6; s <= 6; s++) {
        const d = distAt(arg + (s / 6) * half);
        if (d < bestD) { bestD = d; bestW = arg + (s / 6) * half; }
      }
      arg = bestW;
      min = bestD;
    }
    return { min, arg };
  };
  let best = Infinity;
  let arg = 0;
  if (seeds) {
    for (const [uA, uB] of seeds) {
      for (let k = 0; k < Q; k++) {
        const w = uA + k;
        let off = (kappa + rho * w) - uB;
        off -= Math.round(off);
        if (Math.abs(off) > 0.25) continue;  // partner is a quarter lap away: not an encounter
        const r = refine(w, 0.1);
        if (r.min < best) { best = r.min; arg = r.arg; }
        if (best <= floorAt) return { min: best, arg };
      }
    }
  }
  // Corridor fallback: tracks that slide alongside each other have no crossing to seed.
  const steps = Math.max(8, Math.round(Q * perTurn));
  const dw = Q / steps;
  let cmin = Infinity;
  let carg = 0;
  for (let s = 0; s < steps; s++) {
    const w = s * dw;
    const d = distAt(w);
    if (d < cmin) { cmin = d; carg = w; }
  }
  const r = refine(carg, dw);
  if (r.min < best) { best = r.min; arg = r.arg; }
  return { min: best, arg };
}

const seedCache = new Map();
/** Crossing seeds for a pair, memoised on the two planes' shapes. */
function seedsFor(A, B) {
  const key = [A.rx, A.ry, A.rotation, B.rx, B.ry, B.rotation].join(',');
  let v = seedCache.get(key);
  if (!v) {
    v = crossingSeeds(A, B);
    if (seedCache.size > 512) seedCache.clear();
    seedCache.set(key, v);
  }
  return v;
}

/** Spin sense of a pair: +1 = both prograde as configured, -1 = one reflected. */
function pairSpin(A, B) {
  const g = gcd(A.revolutions, B.revolutions);
  return { Q: A.revolutions / g, rho: B.revolutions / A.revolutions, g };
}

/**
 * Tabulate one pair's all-time minimum centre distance as a function of kappa, for
 * one relative-spin sense. See the header for why a single number suffices.
 */
function pairTable(A, B, sense, {
  bins = 240,
  perTurn = 48,
  floorAt = -Infinity,
  refineRounds = Number(process.env.TABLE_REFINE || 4),
} = {}) {
  const nA = A.revolutions, nB = B.revolutions;
  if (!Number.isInteger(nA) || !Number.isInteger(nB)) {
    throw new Error(`pair ${A.id}~${B.id} is not on the master cycle (n=${nA}, ${nB})`);
  }
  const g = gcd(nA, nB);
  const Q = nA / g;                       // turns of A before the pair's torus line closes
  const rho = sense * nB / nA;              // slope of that line
  const seeds = seedsFor(A, B);
  const tab = new Float64Array(bins);
  const scratch = [[0, 0], [0, 0]];
  for (let k = 0; k < bins; k++) {
    tab[k] = minAlongLine(A, B, rho, Q, k / bins, { perTurn, refineRounds, floorAt, scratch, seeds }).min;
  }
  return { tab, rho, Q, g, seeds };
}

function buildTables(bodies, opts) {
  const tables = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const nA = bodies[i].revolutions, nB = bodies[j].revolutions;
      const rhoMag = nB / nA;
      tables.push({
        i, j,
        ratio: rhoMag,
        need: (bodies[i].size + bodies[j].size) / 2,
        par: pairTable(bodies[i], bodies[j], +1, opts).tab,
        head: pairTable(bodies[i], bodies[j], -1, opts).tab,
      });
    }
  }
  return tables;
}

/**
 * Worst shell clearance implied by the tables for a candidate phase/spin vector.
 * Allocation-free: this is the innermost call of the search.
 */
function tableScore(tables, bins, o, sigma) {
  let worst = Infinity;
  for (let k = 0; k < tables.length; k++) {
    const t = tables[k];
    const s = sigma[t.i] * sigma[t.j];
    const rho = s * t.ratio;
    let kap = o[t.j] - rho * o[t.i];
    kap -= Math.floor(kap);
    const tab = s > 0 ? t.par : t.head;
    const f = kap * bins;
    const b0 = Math.floor(f) % bins;
    const b1 = b0 + 1 === bins ? 0 : b0 + 1;
    const d = tab[b0] + (tab[b1] - tab[b0]) * (f - Math.floor(f));
    const gap = d - t.need;
    if (gap < worst) worst = gap;
  }
  return worst;
}

/**
 * Peak of a kappa table, refined.
 *
 * A table sampled at `bins` points reports the best of those samples, and the true
 * peak of the min-over-w curve sits between two of them — measured at about 1.2u of
 * lost clearance at bins=400 and far more at bins=160. Since the ceiling is the
 * number the whole design is judged against, the argmax bin gets the same bracket
 * shrinking treatment in kappa that `minAlongLine` applies in w.
 */
function refineKappa(A, B, sense, Q, tab, bins, { perTurn, refineRounds, kappaRounds = 3, seeds = null } = {}) {
  let bi = 0;
  for (let k = 1; k < bins; k++) if (tab[k] > tab[bi]) bi = k;
  const rho = sense * B.revolutions / A.revolutions;
  const scratch = [[0, 0], [0, 0]];
  const at0 = (kap) => minAlongLine(A, B, rho, Q, kap, { perTurn, refineRounds, scratch, seeds }).min;
  let bestK = bi / bins;
  let bestV = tab[bi];
  let half = 1 / bins;
  for (let r = 0; r < kappaRounds; r++) {
    half /= 4;
    for (let s = -6; s <= 6; s++) {
      const kap = bestK + (s / 6) * half;
      const v = at0(kap - Math.floor(kap));
      if (v > bestV) { bestV = v; bestK = kap - Math.floor(kap); }
    }
  }
  return { value: bestV, kappa: bestK };
}

/**
 * Worst per-pair geometric ceiling, with early abort.
 *
 * The ceiling is the clearance the best possible phase assignment can buy a pair,
 * so the worst one over all 28 pairs is an upper bound on what the whole system can
 * ever achieve — and it is phase-independent, which makes it the right thing to
 * hill-climb the plane SHAPES against. Pairs are evaluated in order and the loop
 * bails the moment the running worst drops below the incumbent, so a bad geometry
 * costs a fraction of a good one and thousands of candidates become affordable.
 *
 * `abortSlack` keeps that early exit honest: a sampled table can only UNDER-report a
 * ceiling, so a pair is only skipped when even the slack cannot lift it over the
 * incumbent.
 *
 * `spins` pins the relative sense of every pair to one prograde/retrograde assignment
 * instead of letting each pair independently pick whichever sense suits it. Without
 * it the number reported is optimistic in a way that matters: a design that ships two
 * retrograde planes cannot also have every pair choose its own direction.
 */
function worstCeiling(config, master, {
  bins = Number(process.env.TABLE_BINS || 160),
  perTurn = Number(process.env.TABLE_PER_TURN || 48),
  refineRounds = Number(process.env.TABLE_REFINE || 4),
  kappaRounds = Number(process.env.TABLE_KAPPA_REFINE || 3),
  abortBelow = -Infinity,
  abortSlack = Number(process.env.TABLE_ABORT_SLACK || 3),
  spins = null,
} = {}) {
  const bodies = prepare(config, master);
  let worst = Infinity;
  let worstPair = null;
  const rows = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const need = (bodies[i].size + bodies[j].size) / 2;
      // No floorAt here. The early exit truncates a bin's stored minimum to roughly
      // `need`, which flattens every hopeless pair to "-0.0" and hides how hopeless it
      // is; the ceiling is a max over kappa, so the true minima are required.
      const opts = { bins, perTurn, refineRounds };
      const senses = spins ? [spins[i] * spins[j]] : [+1, -1];
      const built = senses.map((s) => ({ s, t: pairTable(bodies[i], bodies[j], s, opts) }));
      const maxOf = (t) => t.reduce((a, v) => Math.max(a, v), -Infinity);
      const rawBest = Math.max(...built.map(({ t }) => maxOf(t.tab)));
      // A sampled grid can only UNDER-report a peak, so when even the slack cannot
      // lift this pair over the incumbent the expensive kappa refinement is skipped
      // and the raw table max is used to trigger the abort.
      const refined = rawBest + abortSlack > abortBelow
        ? built.map(({ s, t }) => ({ s, ...refineKappa(bodies[i], bodies[j], s, t.Q, t.tab, bins, { perTurn, refineRounds, kappaRounds, seeds: t.seeds }) }))
        : built.map(({ s, t }) => ({ s, value: maxOf(t.tab), kappa: null }));
      const top = refined.reduce((a, r) => (r.value > a.value ? r : a), refined[0]);
      const parRow = refined.find((r) => r.s > 0);
      const headRow = refined.find((r) => r.s < 0);
      const best = top.value - need;
      rows.push({
        i, j, a: bodies[i].id, b: bodies[j].id, best,
        par: parRow ? parRow.value - need : null,
        head: headRow ? headRow.value - need : null,
        sense: top.s > 0 ? 'co-spin' : 'head-on', kappa: top.kappa,
      });
      if (best < worst) { worst = best; worstPair = rows[rows.length - 1]; }
      if (worst <= abortBelow) return { worst, worstPair, rows, aborted: true, bodies };
    }
  }
  rows.sort((x, y) => x.best - y.best);
  return { worst, worstPair: rows[0], rows, aborted: false, bodies };
}

/** Phase-independent feasibility: the best clearance ANY phases could buy a pair. */
function pairCeilings(tables) {
  return tables.map((t) => {
    const max = (tab) => tab.reduce((m, v) => Math.max(m, v), -Infinity);
    const par = max(t.par), head = max(t.head);
    return {
      i: t.i, j: t.j,
      par: par - t.need, head: head - t.need,
      best: Math.max(par, head) - t.need,
      sense: par >= head ? 'same' : 'head-on',
    };
  }).sort((a, b) => a.best - b.best);
}

/* ------------------------------------------------------------------ *
 * Label model
 * ------------------------------------------------------------------ */

/**
 * Ink box of a `.planet__tag`, calibrated in headless Chrome against the shipped
 * CSS (11px, weight 800, 1px letter-spacing, `--font-mono` = Consolas on Windows)
 * rather than guessed, because the whole point of the label certificate is that it
 * describes what is actually painted.
 *
 * Measured: getComputedTextLength === n * 7.048828 exactly (monospace, and the
 * trailing letter-space IS included), ink width is 1.06u narrower than that, and
 * actualBoundingBoxAscent === 7.0 with descent === 0 for every tag — all eight are
 * upper case with no descenders. So the vertical ink box is the cap box, not the
 * font ascent/descent box; using the font box (12.5u tall) would report overlaps
 * between rows of glyph whitespace that never touch.
 *
 * `advance` is deliberately the ADVANCE width, ~1u wider than the ink, which is the
 * whole tolerance budget the certificate allows itself.
 */
const TAG_FONT = {
  size: Number(process.env.TAG_SIZE || 11),
  letterSpacing: Number(process.env.TAG_LS || 1),
  advance: Number(process.env.TAG_ADVANCE || 7.05),
  stroke: Number(process.env.TAG_STROKE || 4),
  /** Cap height above the baseline, measured; zero below it. */
  capHeight: Number(process.env.TAG_CAP || 7),
  descender: Number(process.env.TAG_DESC || 0),
  /** Baseline-to-baseline for a two-line tag. Measured font box is 12.5u at 11px. */
  lineHeight: Number(process.env.TAG_LEADING || 12),
  /** Rounding only — the advance-width overhang above is the real tolerance. */
  tolerance: Number(process.env.TAG_TOL || 0.5),
};

function tagWidth(text) {
  return text.length * TAG_FONT.advance + TAG_FONT.stroke;
}

function labelBox(body, px, py) {
  const { dx, dy, anchor } = body.label;
  const w = body._tagWidth - TAG_FONT.tolerance * 2;
  const l = anchor === 'start' ? px + dx : anchor === 'end' ? px + dx - w : px + dx - w / 2;
  const ascent = TAG_FONT.capHeight + TAG_FONT.stroke / 2 - TAG_FONT.tolerance;
  // `dy` is the FIRST line's baseline; a stacked tag hangs the rest of its lines below it.
  const stack = (body._tagLines.length - 1) * TAG_FONT.lineHeight;
  const descent = TAG_FONT.descender + TAG_FONT.stroke / 2 - TAG_FONT.tolerance + stack;
  return { l, r: l + w, t: py + dy - ascent, b: py + dy + descent };
}

/** Signed separation of two axis-aligned boxes: negative means interpenetration. */
function boxSep(A, B) {
  const sx = Math.max(A.l, B.l) - Math.min(A.r, B.r);
  const sy = Math.max(A.t, B.t) - Math.min(A.b, B.b);
  if (sx > 0 && sy > 0) return Math.hypot(sx, sy);
  return Math.max(sx, sy);
}

/** Signed distance from a point to a box (negative inside). */
function pointBoxSep(px, py, B) {
  const dx = Math.max(B.l - px, 0, px - B.r);
  const dy = Math.max(B.t - py, 0, py - B.b);
  if (dx === 0 && dy === 0) return -Math.min(px - B.l, B.r - px, py - B.t, B.b - py);
  return Math.hypot(dx, dy);
}

/** Signed distance from a circle to a box, minus the circle radius. */
function circleBoxSep(cx, cy, r, B) {
  const dx = Math.max(B.l - cx, 0, cx - B.r);
  const dy = Math.max(B.t - cy, 0, cy - B.b);
  return Math.hypot(dx, dy) - r;
}

const CORE_EXCLUSION = Number(process.env.CORE_EXCLUSION || 118);
/** Clearance at which a label pair stops contributing to the search objective. */
const HINGE_CAP = Number(process.env.LABEL_HINGE_CAP || 2);
const BOUND_MARGIN = Number(process.env.BOUND_MARGIN || 4);
const SCENE = 680;
/**
 * The ACTUAL clipping/apron box for tags, in viewBox units.
 *
 * `.fds-ecosystem__scene` paints `overflow:visible`, and html/body clip only at the
 * viewport edge (`overflow-x: clip`), so a tag that leaves the 680 viewBox is still
 * fully rendered — certifying against the viewBox would contort the design to
 * satisfy a boundary the browser does not enforce. The honest bound is how far a
 * tag can travel before it reaches real content or the viewport edge. Measured in
 * headless Chromium against the production preview (2026-09-29):
 *   - the hero copy column ends ~43u left of the scene at desktop widths, and at
 *     <=960px the scene sits alone in a single column with >=170u of page padding;
 *   - the tightest desktop viewport (1280px) leaves ~64u between the scene's right
 *     edge and the viewport edge;
 *   - the inspection panel starts ~24u below the scene;
 *   - the hero's top padding leaves ~80u of empty space above the scene.
 * The numbers below are each a few units inside those measurements, so the
 * certificate's bound is the real one, not the nominal SVG frame.
 */
const LABEL_BOUNDS = {
  l: -Number(process.env.BOUND_L || 36),
  t: -Number(process.env.BOUND_T || 80),
  r: SCENE + Number(process.env.BOUND_R || 50),
  b: SCENE + Number(process.env.BOUND_B || 20),
};

/**
 * Full label certificate over one frame: tag vs tag, tag vs the nucleus, tag vs
 * every other body's shell, tag vs the scene bounds.
 */
function labelFrameMetrics(bodies, points, hingeCap = HINGE_CAP) {
  const boxes = bodies.map((b, i) => labelBox(b, points[i].x, points[i].y));
  // Squared hinge over EVERY individual separation, not just the worst. The search
  // needs this: a min-max objective has no gradient, so a single-body anchor change
  // that helps one pair but not the current worst scores identically and the greedy
  // climb returns the layout it started from. Squaring keeps a deep overlap worth
  // more than several shallow ones, and the hinge goes flat once a pair is clear.
  // The hinge is tracked per kind: tags paint UNDER the planet layer, so shell/core
  // overlaps are clean occlusions (depth cues), while label~label ink-on-ink and
  // real-clip bounds are the hard constraints the objective must drive to >= 0.
  let hinge = 0;
  const hingeByKind = { 'label~label': 0, 'label~core': 0, 'label~shell': 0, 'label~bounds': 0, 'label~own': 0 };
  const byKind = {
    'label~label': { gap: Infinity, kind: 'label~label', pair: '' },
    'label~core': { gap: Infinity, kind: 'label~core', pair: '' },
    'label~shell': { gap: Infinity, kind: 'label~shell', pair: '' },
    'label~bounds': { gap: Infinity, kind: 'label~bounds', pair: '' },
    'label~own': { gap: Infinity, kind: 'label~own', pair: '' },
  };
  const note = (kind, gap, pair) => {
    if (gap < byKind[kind].gap) byKind[kind] = { gap, kind, pair };
    if (gap < hingeCap) { const d = hingeCap - gap; hinge += d * d; hingeByKind[kind] += d * d; }
  };
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      note('label~label', boxSep(boxes[i], boxes[j]), `${bodies[i].id}~${bodies[j].id}`);
    }
  }
  for (let i = 0; i < boxes.length; i++) {
    // A tag painted under the bodies must still clear its OWN shell — otherwise it
    // is hidden behind the very planet it names. Frame-invariant, but cheap enough
    // to keep inside the per-frame metric where the certificate can see it.
    note('label~own', circleBoxSep(points[i].x, points[i].y, bodies[i].size / 2 + 1, boxes[i]), bodies[i].id);
    note('label~core', pointBoxSep(CENTER, CENTER, boxes[i]) - CORE_EXCLUSION, bodies[i].id);
    note('label~bounds', Math.min(
      boxes[i].l - LABEL_BOUNDS.l, boxes[i].t - LABEL_BOUNDS.t,
      LABEL_BOUNDS.r - boxes[i].r, LABEL_BOUNDS.b - boxes[i].b,
    ), bodies[i].id);
    for (let j = 0; j < bodies.length; j++) {
      if (i === j) continue;
      note('label~shell', circleBoxSep(points[j].x, points[j].y, bodies[j].size / 2 + 2, boxes[i]), `${bodies[i].id}~${bodies[j].id}`);
    }
  }
  let worst = { gap: Infinity, kind: '', pair: '' };
  for (const k of Object.keys(byKind)) if (byKind[k].gap < worst.gap) worst = byKind[k];
  return { worst, byKind, boxes, hinge, hingeByKind };
}

/**
 * Label certificate over the whole master cycle, broken down by the four things a
 * tag can hit: another tag, the nucleus, another body's shell, and the scene bounds.
 * The global worst is what gates the design; the per-kind rows are what say WHICH
 * rule to relax if it fails.
 */
function sweepLabels(bodies, M, dt) {
  const steps = Math.round(M / dt);
  const sc = Array.from({ length: bodies.length }, () => [0, 0]);
  const byKind = {
    'label~label': { gap: Infinity, kind: 'label~label', pair: '', t: 0 },
    'label~core': { gap: Infinity, kind: 'label~core', pair: '', t: 0 },
    'label~shell': { gap: Infinity, kind: 'label~shell', pair: '', t: 0 },
    'label~bounds': { gap: Infinity, kind: 'label~bounds', pair: '', t: 0 },
    'label~own': { gap: Infinity, kind: 'label~own', pair: '', t: 0 },
  };
  let worst = { gap: Infinity, kind: '', pair: '', t: 0 };
  let hinge = 0;
  const hingeByKind = { 'label~label': 0, 'label~core': 0, 'label~shell': 0, 'label~bounds': 0, 'label~own': 0 };
  // How LONG each rule is broken, not just how badly. With eight always-visible tags
  // on eight planes that cross by design, a minimum on its own cannot distinguish a
  // two-second graze from a permanent collision, and the honest report needs both.
  const over = { 'label~label': 0, 'label~core': 0, 'label~shell': 0, 'label~bounds': 0, 'label~own': 0 };
  for (let s = 0; s <= steps; s++) {
    const t = s * dt;
    const f = t / M;
    const pts = bodies.map((b, i) => {
      at(b, b.start / 100 + b.sigma * b.revolutions * f, sc[i]);
      return { id: b.id, x: sc[i][0], y: sc[i][1] };
    });
    const m = labelFrameMetrics(bodies, pts);
    hinge += m.hinge;
    for (const k of Object.keys(hingeByKind)) hingeByKind[k] += m.hingeByKind[k];
    for (const k of Object.keys(over)) if (m.byKind[k].gap < 0) over[k] += dt;
    if (m.worst.gap < worst.gap) worst = { ...m.worst, t };
    for (const k of Object.keys(byKind)) {
      const r = m.byKind[k];
      if (r && r.gap < byKind[k].gap) byKind[k] = { ...r, t };
    }
  }
  const seconds = steps * dt;
  const overlap = {};
  for (const k of Object.keys(over)) overlap[k] = { seconds: over[k], pct: (100 * over[k]) / (seconds || 1) };
  return { ...worst, byKind, hinge, hingeByKind, steps, seconds, overlap };
}

/* ------------------------------------------------------------------ *
 * Phase / spin search against the master cycle
 * ------------------------------------------------------------------ */

/**
 * Coordinate ascent over the eight start phases and (optionally) spins, scored by
 * the pair tables. Only the 7 pairs touching a body change when that body moves,
 * but a full 28-lookup rescore costs microseconds, so the simple form is used —
 * it converges in a handful of sweeps and hundreds of restarts stay affordable.
 *
 * The frozen (t=0) composition is folded in as penalties rather than left to a
 * second pass: prefers-reduced-motion pins exactly this frame, so the composition a
 * reduced-motion visitor sees is optimised by the same search that certifies the
 * moving one, instead of needing a second, conflicting phase vector.
 */
function searchPhases(config, M, {
  // Separate knobs from `worstCeiling`: the phase search builds its tables ONCE and
  // then scores thousands of candidates against them, so it can afford a much finer
  // kappa grid. `perTurn` stays low because `minAlongLine` refines each bin's vertex.
  bins = Number(process.env.PHASE_BINS || 480),
  perTurn = Number(process.env.PHASE_PER_TURN || 48),
  granularity = Number(process.env.PHASE_STEP || 0.25),
  restarts = Number(process.env.RESTARTS || 200),
  passes = Number(process.env.PASSES || 8),
  lockDirs = process.env.LOCK_DIRS === '1',
  minSpread = Number(process.env.MIN_SPREAD || 0),
  maxEmptyArc = Number(process.env.MAX_EMPTY_ARC || 0),
  minCore = Number(process.env.MIN_CORE || 0),
  seedFirst = true,
  tables = null,
  quiet = false,
} = {}) {
  const bodies = prepare(config, M);
  const tab = tables || buildTables(bodies, { bins, perTurn });
  const n = bodies.length;
  const steps = Math.round(100 / granularity);
  const sigma = new Float64Array(n);
  const start = new Float64Array(n);
  const o = new Float64Array(n);
  const fx = new Float64Array(n);
  const fy = new Float64Array(n);
  const bearing = new Float64Array(n);
  const sc = [0, 0];

  /** Frozen-frame terms, allocation-free: this runs inside the innermost loop. */
  const framePenalty = () => {
    if (!minSpread && !maxEmptyArc && !minCore) return 0;
    for (let i = 0; i < n; i++) {
      at(bodies[i], start[i] / 100, sc);
      fx[i] = sc[0]; fy[i] = sc[1];
    }
    let p = 0;
    if (minSpread || minCore) {
      let spread = Infinity, core = Infinity;
      for (let i = 0; i < n; i++) {
        const r = Math.hypot(fx[i] - CENTER, fy[i] - CENTER);
        if (r < core) core = r;
        for (let j = i + 1; j < n; j++) {
          const d = Math.hypot(fx[i] - fx[j], fy[i] - fy[j]);
          if (d < spread) spread = d;
        }
      }
      if (minSpread && spread < minSpread) p -= (minSpread - spread) * 3;
      if (minCore && core < minCore) p -= (minCore - core) * 3;
    }
    if (maxEmptyArc) {
      for (let i = 0; i < n; i++) bearing[i] = Math.atan2(fy[i] - CENTER, fx[i] - CENTER);
      bearing.sort();
      let empty = 0;
      for (let i = 0; i < n; i++) {
        const next = i + 1 < n ? bearing[i + 1] : bearing[0] + Math.PI * 2;
        if (next - bearing[i] > empty) empty = next - bearing[i];
      }
      // Degrees, not radians: the objective is in viewBox units, and a 60 degree hole
      // in the frozen composition must weigh as heavily as a 60u shortfall.
      const arc = maxEmptyArc - (empty * 180) / Math.PI;
      if (arc < 0) p += arc * 3;
    }
    return p;
  };

  const score = () => tableScore(tab, bins, o, sigma) + framePenalty();

  let best = null;
  for (let r = 0; r < restarts; r++) {
    if (r === 0 && seedFirst) {
      for (let i = 0; i < n; i++) { sigma[i] = bodies[i].sigma; start[i] = bodies[i].start; }
    } else {
      for (let i = 0; i < n; i++) {
        sigma[i] = lockDirs ? bodies[i].sigma : (Math.random() < 0.5 ? -1 : 1);
        start[i] = Math.floor(Math.random() * (steps + 1)) * granularity;
      }
    }
    for (let i = 0; i < n; i++) o[i] = start[i] / 100;
    let cur = score();
    for (let pass = 0; pass < passes; pass++) {
      let moved = false;
      for (let i = 0; i < n; i++) {
        const keepStart = start[i], keepSigma = sigma[i];
        let bs = cur, bStart = keepStart, bSigma = keepSigma;
        const dirs = lockDirs ? [keepSigma] : [1, -1];
        for (const g of dirs) {
          sigma[i] = g;
          for (let s = 0; s <= steps; s++) {
            start[i] = s * granularity;
            o[i] = start[i] / 100;
            const v = score();
            if (v > bs) { bs = v; bStart = start[i]; bSigma = g; }
          }
        }
        sigma[i] = bSigma; start[i] = bStart; o[i] = bStart / 100;
        if (bStart !== keepStart || bSigma !== keepSigma) moved = true;
        cur = bs;
      }
      if (!moved) break;
    }
    if (!best || cur > best.score) {
      best = { score: cur, gap: tableScore(tab, bins, o, sigma), start: [...start], sigma: [...sigma], restart: r + 1 };
      if (!quiet) process.stdout.write(`  restart ${r + 1}/${restarts}: table gap ${best.gap.toFixed(2)}u (score ${cur.toFixed(2)})\r`);
    }
  }
  if (!quiet) process.stdout.write('\n');
  const cfg = config.map((c, i) => ({
    ...c,
    start: best.start[i],
    direction: best.sigma[i] > 0 ? 'normal' : 'reverse',
  }));
  return { ...best, cfg, tables: tab, bodies };
}

/**
 * Continuous polish of the eight start phases against the exact dense sweep.
 *
 * The table search quantises phases (0.25% of a lap is a few units of arc), so the
 * winner it returns is the best point on a grid rather than the best point. This
 * walks each phase in a shrinking window scored by `sweepShells` — the same
 * measurement the certificate uses — which recovers the fraction of a unit the grid
 * left on the table without ever trusting the surrogate.
 */
function polishPhases(config, M, {
  dt = Number(process.env.POLISH_DT || 0.05),
  rounds = Number(process.env.POLISH_ROUNDS || 3),
  window = Number(process.env.POLISH_WINDOW || 1.5),
  steps = Number(process.env.POLISH_STEPS || 12),
  minSpread = Number(process.env.MIN_SPREAD || 0),
  maxEmptyArc = Number(process.env.MAX_EMPTY_ARC || 0),
} = {}) {
  const cfg = config.map((o) => ({ ...o }));
  const bodies = prepare(cfg, M);
  const score = () => {
    const gap = sweepShells(bodies, M, dt).worst.gap;
    if (!minSpread && !maxEmptyArc) return gap;
    const fm = frameMetrics(frameAt(bodies, 0, M), bodies);
    let pen = 0;
    if (minSpread && fm.minPair < minSpread) pen -= (minSpread - fm.minPair) * 3;
    if (maxEmptyArc && fm.maxGap > maxEmptyArc) pen -= (fm.maxGap - maxEmptyArc) * 3;
    return gap + pen;
  };
  let best = score();
  let win = window;
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < bodies.length; i++) {
      const keep = bodies[i].start;
      let bs = best, bv = keep;
      for (let s = 0; s <= steps; s++) {
        bodies[i].start = keep - win + (2 * win * s) / steps;
        const v = score();
        if (v > bs) { bs = v; bv = bodies[i].start; }
      }
      bodies[i].start = bv;
      best = bs;
    }
    win /= 3;
  }
  return {
    worst: best,
    cfg: cfg.map((o, i) => ({ ...o, start: Math.round(bodies[i].start * 1000) / 1000 })),
  };
}

/* ------------------------------------------------------------------ *
 * Anchor search for labels
 * ------------------------------------------------------------------ */

/**
 * Candidate tag anchors, expressed as a compass position around the body. The
 * offset is derived from the body radius plus the tag's own ink height so the text
 * clears its own planet by the same margin everywhere; `anchor` is the SVG
 * text-anchor that keeps the ink on the correct side of that point.
 */
const ANCHORS = [
  { position: 'below', ux: 0, ay: 1, anchor: 'middle' },
  { position: 'below-left', ux: -0.72, ay: 0.72, anchor: 'end' },
  { position: 'below-right', ux: 0.72, ay: 0.72, anchor: 'start' },
  { position: 'left', ux: -1, ay: 0.12, anchor: 'end' },
  { position: 'right', ux: 1, ay: 0.12, anchor: 'start' },
  { position: 'above', ux: 0, ay: -1, anchor: 'middle' },
  { position: 'above-left', ux: -0.72, ay: -0.72, anchor: 'end' },
  { position: 'above-right', ux: 0.72, ay: -0.72, anchor: 'start' },
];

const ANCHOR_GAP = Number(process.env.ANCHOR_GAP || 9);
const ANCHOR_LIFT = Number(process.env.ANCHOR_LIFT || 6);
/** Extra radial reaches searched per direction: hugging the shell and standing off. */
const ANCHOR_GAPS = (process.env.ANCHOR_GAPS || '5,9,18').split(',').map(Number);

/** Concrete {dx, dy, anchor} for one body at one candidate anchor. */
function anchorOffset(body, a) {
  const reach = body.size / 2 + (a.gap ?? ANCHOR_GAP);
  const lift = a.lift ?? ANCHOR_LIFT;
  const dx = Math.round((a.ux * reach + (a.sx || 0)) * 10) / 10;
  // Text hangs from its baseline: a tag above the body has to lift by its own ink, and
  // a stacked one by every line below the first as well, or its LAST line lands on the
  // planet instead of its first.
  const stack = (body._tagLines.length - 1) * TAG_FONT.lineHeight;
  const dy = Math.round((a.ay > 0 ? reach * a.ay + lift : reach * a.ay - lift * 0.4 - stack) * 10 + (a.sy || 0) * 10) / 10;
  return { position: a.position, dx, dy, anchor: a.anchor };
}

/** The deterministic candidate set: every compass anchor at every reach tier. */
function anchorCandidates(gaps = ANCHOR_GAPS, shifts = null) {
  const out = [];
  const lat = shifts === null ? [0] : (Array.isArray(shifts) ? shifts : String(shifts).split(',').map(Number));
  for (const gap of gaps) {
    for (const a of ANCHORS) {
      for (const s of lat) {
        // Lateral shift runs perpendicular to the anchor direction so a tag can
        // slide along its own ring instead of only in or out.
        out.push({ ...a, gap, sx: -a.ay * s, sy: a.ux * s });
      }
    }
  }
  return out;
}

/**
 * Greedy coordinate descent over a small deterministic anchor candidate set,
 * scored by the true dense label sweep — the exact certificate, no surrogate.
 *
 * Three phases, each still a hand-inspectable move:
 *   A. coordinate ascent over the compass anchors at every reach tier;
 *   B. worst-pair joint escape — coordinate descent is blind to moves that only
 *      work when BOTH bodies of the worst pair change side at once (e.g. two
 *      stacked tags that each have to point away), so when the descent stalls on
 *      a pairwise violation the two bodies involved are re-searched jointly;
 *   C. per-body (dx, dy) micro-polish on a small grid around the winning anchor,
 *      which recovers the few units a fixed compass offset leaves on the table.
 *
 * Anchors are a small discrete space and the sweep is cheap enough to run
 * outright, so no surrogate is involved: what is optimised is what is certified.
 */
function searchAnchors(config, M, {
  dt = Number(process.env.LABEL_DT || 0.25),
  passes = Number(process.env.ANCHOR_PASSES || 4),
  candidates = anchorCandidates(),
  jointRounds = Number(process.env.ANCHOR_JOINT || 6),
  refineGrid = Number(process.env.ANCHOR_REFINE || 1),
} = {}) {
  let bodies = prepare(config, M);
  bodies.forEach((b) => {
    // A config that has not been solved yet carries no anchor at all; without a real
    // starting point the first score is NaN and no candidate ever beats it, so the
    // search returns the untouched (null) labels it started with.
    if (!b.label || b.label.dx == null || !b.label.anchor) b.label = anchorOffset(b, candidates[0]);
  });
  // Sum of per-kind clearances, each capped at its target. A plain global minimum
  // freezes this search: if one kind is unfixable by anchors alone it stays worst
  // forever, every candidate that improves the OTHER kinds scores identically, and
  // the climb returns the untouched layout it started from. Capping keeps punishing a
  // deficit while still collecting gains everywhere else.
  const cap = Number(process.env.ANCHOR_CAP || 2);
  const softW = Number(process.env.ANCHOR_SOFT || 0.08);
  const measure = (bs) => sweepLabels(bs, M, dt);
  // Hard constraints vs. occlusion. Tags paint UNDER the planet layer, so a tag
  // meeting a shell or the core is a clean depth occlusion, not ink-on-ink — the
  // hinge still counts its depth and duration but at a small weight, while
  // label~label collisions, the real clip apron, and the tag's own shell (which
  // would hide it entirely) dominate the objective.
  const scoreOf = (l) => {
    let s = -(l.hingeByKind['label~label'] + l.hingeByKind['label~bounds'] + l.hingeByKind['label~own'])
      - softW * (l.hingeByKind['label~shell'] + l.hingeByKind['label~core']);
    for (const k of Object.keys(l.byKind)) s += 0.01 * Math.min(l.byKind[k].gap, cap);
    return s;
  };
  const withLabel = (bs, i, label) => bs.map((b, k) => (k === i ? { ...b, label } : b));
  const pairIndex = (pair) => {
    if (!pair) return [];
    const names = pair.split('~');
    return names.map((id) => bodies.findIndex((b) => b.id === id)).filter((k) => k >= 0);
  };

  let cur = scoreOf(measure(bodies));
  for (let pass = 0; pass < passes; pass++) {
    let moved = false;
    for (let i = 0; i < bodies.length; i++) {
      let bestA = null, bestV = cur;
      for (const a of candidates) {
        const v = scoreOf(measure(withLabel(bodies, i, anchorOffset(bodies[i], a))));
        if (v > bestV) { bestV = v; bestA = a; }
      }
      if (bestA) {
        bodies = withLabel(bodies, i, anchorOffset(bodies[i], bestA));
        cur = bestV; moved = true;
      }
    }
    if (!moved) break;
  }

  /* Phase B — joint escape on the binding pair (or pair-less single body). */
  for (let round = 0; round < jointRounds; round++) {
    const rep = measure(bodies);
    if (rep.gap >= 0) break;
    const idx = pairIndex(rep.pair);
    if (!idx.length) break;
    let improved = false;
    if (idx.length === 2) {
      const [i, j] = idx;
      let bi = null, bj = null, bestV = cur;
      for (const a of candidates) {
        for (const b2 of candidates) {
          const trial = withLabel(withLabel(bodies, i, anchorOffset(bodies[i], a)), j, anchorOffset(bodies[j], b2));
          const v = scoreOf(measure(trial));
          if (v > bestV) { bestV = v; bi = a; bj = b2; }
        }
      }
      if (bi) {
        bodies = withLabel(withLabel(bodies, i, anchorOffset(bodies[i], bi)), j, anchorOffset(bodies[j], bj));
        cur = bestV; improved = true;
      }
    } else {
      const i = idx[0];
      let bestA = null, bestV = cur;
      for (const a of candidates) {
        const v = scoreOf(measure(withLabel(bodies, i, anchorOffset(bodies[i], a))));
        if (v > bestV) { bestV = v; bestA = a; }
      }
      if (bestA) {
        bodies = withLabel(bodies, i, anchorOffset(bodies[i], bestA));
        cur = bestV; improved = true;
      }
    }
    if (!improved) break;
    // Re-descend after the escape so the rest of the system can follow the pair.
    for (let pass = 0; pass < 2; pass++) {
      let moved = false;
      for (let i = 0; i < bodies.length; i++) {
        let bestA = null, bestV = cur;
        for (const a of candidates) {
          const v = scoreOf(measure(withLabel(bodies, i, anchorOffset(bodies[i], a))));
          if (v > bestV) { bestV = v; bestA = a; }
        }
        if (bestA) {
          bodies = withLabel(bodies, i, anchorOffset(bodies[i], bestA));
          cur = bestV; moved = true;
        }
      }
      if (!moved) break;
    }
  }

  /* Phase C — (dx, dy) micro-polish; anchor position name is kept for the schema. */
  if (refineGrid) {
    const DXS = [0, -4, 4, -8, 8, -2, 2, -6, 6];
    const DYS = [0, -3, 3, -6, 6, -1.5, 1.5, -4.5, 4.5];
    for (let round = 0; round < 3; round++) {
      let moved = false;
      for (let i = 0; i < bodies.length; i++) {
        const keep = bodies[i].label;
        let bestL = null, bestV = cur;
        for (const ddx of DXS) {
          for (const ddy of DYS) {
            if (!ddx && !ddy) continue;
            const trial = { ...keep, dx: Math.round((keep.dx + ddx) * 10) / 10, dy: Math.round((keep.dy + ddy) * 10) / 10 };
            const v = scoreOf(measure(withLabel(bodies, i, trial)));
            if (v > bestV) { bestV = v; bestL = trial; }
          }
        }
        if (bestL) {
          bodies = withLabel(bodies, i, bestL);
          cur = bestV; moved = true;
        }
      }
      if (!moved) break;
    }
  }

  const final = measure(bodies);
  return {
    score: final.gap,
    byKind: final.byKind,
    overlap: final.overlap,
    objective: cur,
    labels: bodies.map((b) => ({ id: b.id, ...b.label })),
    cfg: config.map((c, i) => ({ ...c, label: bodies[i].label })),
  };
}

/* ------------------------------------------------------------------ *
 * Joint label CSP — deterministic max-min over the eight anchors
 * ------------------------------------------------------------------ */

/**
 * The label problem is a small constraint-satisfaction problem, not a search:
 * with tags painted under the planet layer, the only hard rules left are that no
 * two tags ever overlap ink and that no tag reaches the real clip apron. Tag vs
 * shell/core overlaps are occlusions — handled by paint order, reported, and only
 * minimised as a soft tiebreak.
 *
 * Because two tags interact only while their bodies pass near each other, the
 * pairwise part of the objective decomposes into a per-pair lookup table indexed
 * by the two anchor choices. That makes the joint problem exactly solvable:
 *
 *   1. unary   — prune anchors whose tag ever leaves the real clip apron;
 *   2. binary  — for each body pair, tabulate the minimum tag-vs-tag gap over the
 *                instants the bodies are close enough for tags to interact, for
 *                every surviving (anchor_i, anchor_j) combination;
 *   3. max-min — depth-first branch & bound over the eight anchors maximising the
 *                global minimum of those tables plus the unary bounds margins.
 *
 * The tables are built at the certificate's own resolution, but they are still a
 * discrete candidate set, so the function finishes with the (dx, dy) micro-polish
 * and re-verifies against the dense sweep — the sweep remains the certificate.
 */
/** Box template for a candidate: offsets relative to the body centre, no allocation. */
function labelTemplate(body, label) {
  const w = body._tagWidth - TAG_FONT.tolerance * 2;
  const lo = label.anchor === 'start' ? label.dx : label.anchor === 'end' ? label.dx - w : label.dx - w / 2;
  const ascent = TAG_FONT.capHeight + TAG_FONT.stroke / 2 - TAG_FONT.tolerance;
  const stack = (body._tagLines.length - 1) * TAG_FONT.lineHeight;
  const to = label.dy - ascent;
  const h = ascent + TAG_FONT.descender + TAG_FONT.stroke / 2 - TAG_FONT.tolerance + stack;
  return { lo, to, w, h };
}

function solveLabelsCSP(config, M, {
  dt = Number(process.env.LABEL_DT || 0.2),
  boundsMargin = Number(process.env.LABEL_BOUNDS_MARGIN || 0),
  reach = Number(process.env.LABEL_REACH || 200),
  candidates = anchorCandidates(),
  nodeBudget = Number(process.env.LABEL_NODES || 2000000),
  refineGrid = Number(process.env.ANCHOR_REFINE || 1),
  polishDt = Number(process.env.LABEL_POLISH_DT || 0.3),
  quiet = false,
} = {}) {
  const bodies = prepare(config, M);
  const n = bodies.length;
  const C = candidates.length;
  const steps = Math.max(1, Math.round(M / dt));
  const sc = [0, 0];

  // Position tracks for the whole cycle, once.
  const posT = bodies.map((b) => {
    const arr = new Float64Array((steps + 1) * 2);
    for (let s = 0; s <= steps; s++) {
      at(b, b.start / 100 + b.sigma * b.revolutions * (s / steps), sc);
      arr[2 * s] = sc[0]; arr[2 * s + 1] = sc[1];
    }
    return arr;
  });

  // Per (body, candidate) box template: box at time s = body position + template.
  const tpl = bodies.map((b) => candidates.map((a) => labelTemplate(b, anchorOffset(b, a))));

  // 1. Unary: worst clip-apron margin of each anchor over the whole cycle.
  const uni = bodies.map((b, i) => tpl[i].map((t) => {
    let g = Infinity;
    for (let s = 0; s <= steps; s++) {
      const v = Math.min(
        posT[i][2 * s] + t.lo - LABEL_BOUNDS.l,
        posT[i][2 * s + 1] + t.to - LABEL_BOUNDS.t,
        LABEL_BOUNDS.r - (posT[i][2 * s] + t.lo + t.w),
        LABEL_BOUNDS.b - (posT[i][2 * s + 1] + t.to + t.h),
      );
      if (v < g) g = v;
      if (g < boundsMargin) break;
    }
    return g;
  }));
  const dom0 = uni.map((gaps) => gaps.map((g, a) => (g >= boundsMargin ? a : -1)).filter((a) => a >= 0));
  for (let i = 0; i < n; i++) {
    if (!dom0[i].length && !quiet) console.log(`  [csp] ${bodies[i].id}: no anchor survives the clip apron`);
  }

  // 2. Binary tables: worst tag-vs-tag gap per anchor pair, restricted to the
  // instants the bodies are within `reach` (beyond it the boxes cannot touch).
  const tables = {};
  const pairIds = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const inst = [];
      for (let s = 0; s <= steps; s++) {
        const dx = posT[i][2 * s] - posT[j][2 * s];
        const dy = posT[i][2 * s + 1] - posT[j][2 * s + 1];
        if (dx * dx + dy * dy < reach * reach) inst.push(s);
      }
      if (!inst.length) { tables[`${i}~${j}`] = null; continue; }
      const ti = new Float64Array(C * C).fill(Infinity);
      for (const s of inst) {
        const xi = posT[i][2 * s], yi = posT[i][2 * s + 1];
        const xj = posT[j][2 * s], yj = posT[j][2 * s + 1];
        for (const a of dom0[i]) {
          const ta = tpl[i][a];
          const al = xi + ta.lo, at_ = yi + ta.to, ar = al + ta.w, ab = at_ + ta.h;
          for (const b of dom0[j]) {
            const tb = tpl[j][b];
            const bl = xj + tb.lo, bt = yj + tb.to;
            const sx = Math.max(al, bl) - Math.min(ar, bl + tb.w);
            const sy = Math.max(at_, bt) - Math.min(ab, bt + tb.h);
            const g = sx > 0 && sy > 0 ? Math.hypot(sx, sy) : Math.max(sx, sy);
            const k = a * C + b;
            if (g < ti[k]) ti[k] = g;
          }
        }
      }
      tables[`${i}~${j}`] = ti;
      pairIds.push([i, j]);
    }
  }
  const pairGap = (i, a, j, b) => {
    const t = i < j ? tables[`${i}~${j}`] : tables[`${j}~${i}`];
    if (!t) return Infinity;
    return i < j ? t[a * C + b] : t[b * C + a];
  };

  // 3. AC-3 arc consistency at a margin: prune every anchor that has no partner
  // able to keep that pair's gap at-or-above the margin.
  const arcs = [];
  for (const [i, j] of pairIds) { arcs.push([i, j]); arcs.push([j, i]); }
  const ac3 = (margin) => {
    const D = dom0.map((d) => [...d]);
    const q = [...arcs];
    while (q.length) {
      const [i, j] = q.pop();
      const T = tables[`${Math.min(i, j)}~${Math.max(i, j)}`];
      let revised = false;
      for (let x = D[i].length - 1; x >= 0; x--) {
        const a = D[i][x];
        let ok = false;
        for (const b of D[j]) {
          const g = i < j ? T[a * C + b] : T[b * C + a];
          if (g >= margin) { ok = true; break; }
        }
        if (!ok) { D[i].splice(x, 1); revised = true; }
      }
      if (revised) for (const [k, l] of arcs) if (l === i && k !== j) q.push([k, l]);
      if (!D[i].length) return { D, empty: i };
    }
    return { D, empty: -1 };
  };

  // Margin ladder: largest consistent margin anchors the feasible region; then a
  // branch & bound inside it maximises the true table minimum.
  let margin = null, D = null;
  for (const m of [3, 2, 1.5, 1, 0.75, 0.5, 0.25, 0, -0.5, -1, -1.5, -2, -2.5, -3, -4, -5]) {
    const r = ac3(m);
    if (r.empty < 0) { margin = m; D = r.D; break; }
    if (!quiet) console.log(`  [csp] margin ${m}: ${bodies[r.empty].id} domain emptied`);
  }
  if (!D && !quiet) console.log('  [csp] no margin down to -5 is arc-consistent');
  const searchDoms = D || dom0;

  let best = { min: -Infinity, assign: null, nodes: 0 };
  const order = [...Array(n).keys()].sort((x, y) => searchDoms[x].length - searchDoms[y].length);
  const valued = bodies.map((b, i) => [...searchDoms[i]].sort((x, y) => uni[i][y] - uni[i][x]));
  const assign = new Array(n).fill(-1);
  const dfs = (depth, curMin) => {
    if (curMin <= best.min || best.nodes > nodeBudget) return;
    if (depth === n) {
      if (curMin > best.min) best = { min: curMin, assign: [...assign], nodes: best.nodes };
      return;
    }
    const i = order[depth];
    for (const a of valued[i]) {
      best.nodes++;
      let m = Math.min(curMin, uni[i][a]);
      for (let k = 0; k < depth && m > best.min; k++) {
        const g = pairGap(i, a, order[k], assign[order[k]]);
        if (g < m) m = g;
      }
      if (m <= best.min) continue;
      assign[i] = a;
      dfs(depth + 1, m);
      assign[i] = -1;
    }
  };
  dfs(0, Infinity);
  if (!best.assign && !quiet) console.log(`  [csp] exhausted (${best.nodes} nodes) — no feasible assignment`);

  const solved = bodies.map((b, i) => ({
    ...b,
    label: best.assign ? anchorOffset(b, candidates[best.assign[i]]) : b.label,
  }));

  // 4. (dx, dy) micro-polish on the true objective, same as searchAnchors' phase C.
  const measure = (bs) => sweepLabels(bs, M, polishDt);
  const scoreOf = (l) => {
    let s = -(l.hingeByKind['label~label'] + l.hingeByKind['label~bounds'] + l.hingeByKind['label~own'])
      - 0.08 * (l.hingeByKind['label~shell'] + l.hingeByKind['label~core']);
    for (const k of Object.keys(l.byKind)) s += 0.01 * Math.min(l.byKind[k].gap, 2);
    return s;
  };
  let work = solved;
  let cur = scoreOf(measure(work));
  const withLabel = (bs, i, label) => bs.map((b, k) => (k === i ? { ...b, label } : b));
  if (refineGrid) {
    const DXS = [0, -4, 4, -8, 8, -2, 2, -6, 6, -12, 12];
    const DYS = [0, -3, 3, -6, 6, -1.5, 1.5, -4.5, 4.5, -9, 9];
    for (let round = 0; round < 4; round++) {
      let moved = false;
      for (let i = 0; i < n; i++) {
        const keep = work[i].label;
        let bestL = null, bestV = cur;
        for (const ddx of DXS) {
          for (const ddy of DYS) {
            if (!ddx && !ddy) continue;
            const trial = { ...keep, dx: Math.round((keep.dx + ddx) * 10) / 10, dy: Math.round((keep.dy + ddy) * 10) / 10 };
            const v = scoreOf(measure(withLabel(work, i, trial)));
            if (v > bestV) { bestV = v; bestL = trial; }
          }
        }
        if (bestL) { work = withLabel(work, i, bestL); cur = bestV; moved = true; }
      }
      if (!moved) break;
    }
  }

  const final = measure(work);
  return {
    score: final.gap,
    byKind: final.byKind,
    overlap: final.overlap,
    cspMin: best.min,
    cspMargin: margin,
    cspNodes: best.nodes,
    labels: work.map((b) => ({ id: b.id, ...b.label })),
    cfg: config.map((c, i) => ({ ...c, label: work[i].label })),
  };
}

/* ------------------------------------------------------------------ *
 * Structural design constraints
 * ------------------------------------------------------------------ */

function designReport(cfg, M) {
  const sigs = cfg.map(trackSignature);
  const durations = cfg.map((o) => o.duration);
  const byRadius = [...cfg].sort((a, b) => (a.rx + a.ry) - (b.rx + b.ry));
  let kepler = true;
  for (let i = 1; i < byRadius.length; i++) if (byRadius[i].duration <= byRadius[i - 1].duration) kepler = false;
  let multiples = 0;
  for (const a of durations) for (const b of durations) if (a !== b && Math.max(a, b) % Math.min(a, b) === 0) multiples++;
  const twins = [];
  for (let i = 0; i < cfg.length; i++) {
    for (let j = i + 1; j < cfg.length; j++) {
      if (Math.abs(Math.max(cfg[i].rx, cfg[i].ry) - Math.max(cfg[j].rx, cfg[j].ry)) < 8
        && Math.abs(Math.min(cfg[i].rx, cfg[i].ry) - Math.min(cfg[j].rx, cfg[j].ry)) < 8) {
        twins.push(`${cfg[i].id}~${cfg[j].id}`);
      }
    }
  }
  const eccentric = cfg.map((o) => Math.max(o.rx, o.ry) / Math.min(o.rx, o.ry));
  return {
    uniqueSignatures: new Set(sigs).size === cfg.length,
    uniqueDurations: new Set(durations).size === cfg.length,
    multiples: multiples / 2,
    kepler,
    twins,
    eccentric: eccentric.filter((e) => e >= 1.25).length,
    revolutions: cfg.map((o) => M / o.duration),
    repeatPeriod: repeatPeriod(durations),
    masterDivides: cfg.every((o) => Math.abs(M / o.duration - Math.round(M / o.duration)) < 1e-9),
    retrograde: cfg.filter((o) => o.direction === 'reverse').length,
    minSemiMinor: Math.min(...cfg.map((o) => Math.min(o.rx, o.ry))),
    maxSemiMajor: Math.max(...cfg.map((o) => Math.max(o.rx, o.ry))),
  };
}

/* ------------------------------------------------------------------ *
 * Crossing topology (kept from the earlier tooling: the weave is the design)
 * ------------------------------------------------------------------ */

const radial = (o, th) => {
  const d = th - (o.rotation * Math.PI) / 180;
  const c = Math.cos(d), s = Math.sin(d);
  return 1 / Math.sqrt((c * c) / (o.rx * o.rx) + (s * s) / (o.ry * o.ry));
};
const dRadial = (o, th) => (radial(o, th + 1e-4) - radial(o, th - 1e-4)) / 2e-4;
const tangent = (o, th) => Math.atan2(radial(o, th), dRadial(o, th)) + th;
const foldAngle = (deg) => { const a = ((deg % 180) + 180) % 180; return a > 90 ? 180 - a : a; };

function pairCross(A, B, N = 360) {
  let cross = 0, minAngle = 90, prev = null;
  for (let k = 0; k <= N; k++) {
    const th = (k / N) * Math.PI;
    const d = radial(A, th) - radial(B, th);
    if (prev !== null && Math.sign(d) !== Math.sign(prev) && d !== 0 && prev !== 0) {
      cross++;
      minAngle = Math.min(minAngle, foldAngle(((tangent(A, th) - tangent(B, th)) * 180) / Math.PI));
    }
    prev = d;
  }
  return { cross, minAngle };
}

function crossings(cfg) {
  const out = [];
  for (let i = 0; i < cfg.length; i++) {
    for (let j = i + 1; j < cfg.length; j++) {
      const x = pairCross(cfg[i], cfg[j]);
      if (x.cross > 0) out.push({ a: cfg[i].id, b: cfg[j].id, n: x.cross, minAngle: x.minAngle });
    }
  }
  return out;
}

module.exports = {
  CENTER, KAPPA, BINS, SUB, SCENE,
  TAG_FONT, CORE_EXCLUSION, BOUND_MARGIN,
  ANCHORS, ANCHOR_GAP, ANCHOR_LIFT, ANCHOR_GAPS, anchorCandidates, LABEL_BOUNDS,
  gcd, lcm, decimals,
  ellipseSegments, buildLUT, trackSignature, prepare, at,
  readShippedConfig, repeatPeriod, masterSchedules,
  sweepShells, refinePairGap, frameAt, frameMetrics,
  pairTable, buildTables, tableScore, pairCeilings, worstCeiling,
  minAlongLine, pairSpin, refineKappa, crossingSeeds, seedsFor,
  tagWidth, labelBox, boxSep, pointBoxSep, circleBoxSep,
  labelFrameMetrics, sweepLabels,
  searchPhases, polishPhases, searchAnchors, anchorOffset, solveLabelsCSP,
  designReport, crossings, radial,
  ECO_FILE,
};
