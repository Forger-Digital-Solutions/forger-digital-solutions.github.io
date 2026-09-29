#!/usr/bin/env node
'use strict';
/**
 * FDS ecosystem orbit solver — OFFLINE design/verification tool.
 *
 * Runs at authoring time only. Nothing here ships: the browser still receives
 * static SVG path data plus a CSS offset-path animation. The maths lives in
 * ./eco-orbit-model.cjs; this file is the CLI over it.
 *
 * WHY THIS EXISTS
 * Eight independently tilted orbital planes cross each other by design, so "do the
 * bodies ever collide?" is not a question one frame can answer. With arbitrary
 * periods it is not answerable at all: two bodies on tracks that cross approach
 * arbitrarily closely somewhere in infinite time, and phase tuning can only push
 * those meetings outside the observation window. Every longer window then reports a
 * worse number, which is exactly what the old 0-60s / 0-300s / 0-600s / 0-7200s
 * ladder showed.
 *
 * The fix is to stop treating time as open-ended. Every period is chosen as an
 * exact divisor of one MASTER CYCLE, so at t = M all eight bodies have completed a
 * whole number of laps and the configuration is exactly where it started. One dense
 * sweep of [0, M] is then a proof about all future time, not a sample of it.
 *
 * Modes:
 *   node scripts/eco-orbit-solver.cjs config    dump what src/data/ecosystem.ts ships
 *   node scripts/eco-orbit-solver.cjs master    report the finite schedule
 *   node scripts/eco-orbit-solver.cjs hunt      anneal the eight plane SHAPES
 *   node scripts/eco-orbit-solver.cjs screen    exact per-pair clearance ceilings
 *   node scripts/eco-orbit-solver.cjs solve     search phases + spins, verify exactly
 *   node scripts/eco-orbit-solver.cjs labels    search per-world tag anchors
 *   node scripts/eco-orbit-solver.cjs sizes     sweep planet size families
 *   node scripts/eco-orbit-solver.cjs weave     crossing topology of the eight planes
 *   node scripts/eco-orbit-solver.cjs certify   full certificate for a config
 *
 * Any mode accepts --config=path.json to work on a candidate instead of the
 * shipped data.
 */

const fs = require('node:fs');
const M = require('./eco-orbit-model.cjs');

const { CENTER, gcd, prepare, trackSignature, crossings } = M;

/* ------------------------------------------------------------------ *
 * Master cycle
 * ------------------------------------------------------------------ */

/**
 * The shipping schedule. MASTER is the cycle length in seconds; REV[i] is the exact
 * number of laps world i completes in one master cycle, so duration_i = MASTER /
 * REV[i] and at t = MASTER every body is back where it started.
 *
 * MASTER = 2160 = 2^4 * 3^3 * 5 (36 minutes) — long enough that the repeat is
 * invisible, short enough to sweep exhaustively, and inside the 10-45 minute band
 * the brief asks for. REV is eight distinct integers with gcd 1, which gives:
 *   - eight distinct periods spanning 30s..108s, a 3.6x range with consecutive
 *     ratios of 1.13-1.33, close enough to geometric that no two worlds look like
 *     they are pacing each other;
 *   - lcm(durations) === MASTER, so the certificate covers the SHORTEST true repeat
 *     rather than some multiple of it;
 *   - gcd(REV) === 1, so no global lockstep.
 *
 * WHY EVERY DURATION IS A MULTIPLE OF SIX. The clearance a pair of bodies can ever
 * achieve is set by how many times the pair's joint state winds its torus: with
 * Q = max(n_i,n_j)/gcd(n_i,n_j) turns, fixing body i puts body j at Q equally
 * spaced track positions, spaced P_j/Q apart. Since Q = lcm(d_i,d_j)/max(d_i,d_j),
 * a large gcd(d_i,d_j) is what makes that spacing wide, and gcd(d_i,d_j) can only
 * be large if the durations share a factor. With coprime-ish periods (the previous
 * 1.4s gcd schedule) Q reaches 40 and the best any phase can do is around -25u.
 * With every duration a multiple of six, min pairwise gcd is 6, Q caps at 18, and
 * the measured ceilings go positive. Six is the largest usable common factor: at
 * twelve, no eight durations reach lcm <= 2700s.
 *
 * The honest cost is that five pairs are exact 2:1 or 3:1 resonances (30/60, 30/90,
 * 36/72, 36/108, 54/108). That is a deliberate trade: a resonance between two
 * DIFFERENTLY SHAPED, DIFFERENTLY PHASED planes is a repeating meeting pattern, not
 * a shared track, and it is what real orbital systems look like. The old "no
 * duration divides another" rule is therefore relaxed — it forbade exactly the
 * shared factor the collision proof requires.
 * Every duration is an exact integer, so the value in the source file is the value
 * the proof used.
 */
const MASTER = Number(process.env.MASTER || 2160);
const REV = (process.env.REV || '72,60,45,40,36,30,24,20').split(',').map(Number);

/**
 * Assign the schedule inner -> outer by mean radius. Deriving the pairing from the
 * geometry rather than from array order is what keeps "outer bodies move more
 * slowly" structural instead of something a later edit can silently break.
 */
function applySchedule(cfg, rev = REV, master = MASTER) {
  const rank = cfg.map((o, i) => i).sort((a, b) => (cfg[a].rx + cfg[a].ry) - (cfg[b].rx + cfg[b].ry));
  const out = cfg.map((o) => ({ ...o }));
  rank.forEach((bodyIndex, r) => { out[bodyIndex].duration = master / rev[r]; });
  return out;
}

function scheduleReport(rev = REV, master = MASTER) {
  const rows = rev.map((n) => ({ n, duration: master / n })).sort((a, b) => a.duration - b.duration);
  const durations = rows.map((r) => r.duration);
  let multiples = 0;
  for (const a of rev) for (const b of rev) if (a !== b && b % a === 0) multiples++;
  return {
    master,
    minutes: master / 60,
    durations,
    revolutions: rows.map((r) => r.n),
    unique: new Set(rev).size === rev.length,
    gcd: rev.reduce((g, n) => gcd(g, n), 0),
    multiples: multiples / 2,
    exactDecimals: durations.every((d) => M.decimals(d) <= 3),
    minRatio: Math.min(...durations.slice(1).map((d, i) => d / durations[i])),
    range: durations[durations.length - 1] / durations[0],
  };
}

/* ------------------------------------------------------------------ *
 * Design constraints — the approved atomic character, encoded
 * ------------------------------------------------------------------ */

const CORE_MIN = Number(process.env.CORE_MIN || 150);
const REACH_MAX = Number(process.env.REACH_MAX || 320);
const ECC_MIN = Number(process.env.ECC_MIN || 1.15);
const ECC_COUNT = Number(process.env.ECC_COUNT || 6);

/**
 * Per-world roles, written around the APPROVED shipped layout so the hunt refines
 * that design instead of inventing another one. Each window is the shipped value
 * plus slack; `major` is the bearing of the LONG axis folded into [-90, 90].
 *
 * The approved bearings are -4 (broad horizontal), -23 (gems), -42 (outer
 * diagonal), -58 (negative diagonal), -77 (near-vertical), +53 (positive diagonal),
 * with the two near-round planes orientation-free. Note that three of the elongated
 * planes are only ~19 degrees apart. That is tighter than "well separated axes
 * only cross transversally" would like, but it is the approved weave, and the
 * master-cycle schedule is what pays for it: with every duration a multiple of six
 * the pair winding numbers stay low enough that a near-parallel crossing is still
 * escapable by phase. MIN_AXIS_SEP is therefore a floor against degenerating into a
 * single fan, not a target.
 */
const MIN_AXIS_SEP = Number(process.env.MIN_AXIS_SEP || 14);

const ROLE_SETS = {
  /**
   * Windows held close to the APPROVED shipped layout: same bearing fan, same radial
   * order, eccentricities allowed to relax only as far as the clearance proof needs.
   * This is the set that finishes the approved design rather than replacing it.
   */
  shipped: {
  codeforge: { major: [-90, 90], lo: [146, 164], hi: [152, 172], ecc: [1.0, 1.2], note: 'inner ground state (near-round)' },
  forgerems: { major: [-16, 8], lo: [140, 168], hi: [228, 256], ecc: [1.3, 1.85], note: 'broad horizontal plane' },
  gems: { major: [-35, -11], lo: [152, 180], hi: [234, 262], ecc: [1.3, 1.7], note: 'shallow plane through the middle' },
  'training-grounds': { major: [-70, -46], lo: [170, 198], hi: [228, 256], ecc: [1.22, 1.5], note: 'negative diagonal' },
  kyrablox: { major: [41, 65], lo: [140, 168], hi: [288, 305], ecc: [1.6, 2.05], note: 'positive diagonal, widest sweep' },
  'kayla-publisher': { major: [-89, -65], lo: [178, 206], hi: [248, 276], ecc: [1.2, 1.5], note: 'near-vertical steep plane' },
  'farmstand-finder': { major: [-54, -30], lo: [230, 258], hi: [286, 302], ecc: [1.16, 1.4], note: 'outer diagonal' },
  'we-the-people': { major: [-90, 90], lo: [294, 312], hi: [300, 312], ecc: [1.0, 1.13], note: 'outer orbital fence (near-round)' },
  },

  /**
   * The same roles with the radial and eccentricity windows opened up. Used to map
   * the frontier: how much clearance is available if the weave is allowed to restage
   * itself, versus how much the approved character is worth.
   */
  free: {
    codeforge: { major: [-90, 90], lo: [146, 176], hi: [150, 196], ecc: [1.0, 1.28], note: 'inner ground state (near-round)' },
    forgerems: { major: [-24, 16], lo: [148, 206], hi: [176, 268], ecc: [1.04, 1.72], note: 'broad horizontal plane' },
    gems: { major: [-48, -6], lo: [158, 226], hi: [186, 286], ecc: [1.04, 1.72], note: 'shallow plane through the middle' },
    'training-grounds': { major: [-78, -38], lo: [172, 244], hi: [200, 302], ecc: [1.04, 1.68], note: 'negative diagonal' },
    kyrablox: { major: [32, 72], lo: [150, 232], hi: [180, 305], ecc: [1.04, 2.05], note: 'positive diagonal, widest sweep' },
    'kayla-publisher': { major: [-90, -58], lo: [186, 254], hi: [214, 314], ecc: [1.04, 1.6], note: 'near-vertical steep plane' },
    'farmstand-finder': { major: [-62, -24], lo: [204, 268], hi: [232, 302], ecc: [1.04, 1.55], note: 'outer diagonal' },
    'we-the-people': { major: [-90, 90], lo: [282, 312], hi: [290, 312], ecc: [1.0, 1.14], note: 'outer orbital fence (near-round)' },
  },

  /**
   * Direction-mix staging. Measured, not guessed: on the certified layout, reversing
   * the innermost world moved the ceiling from -6.77u to -6.77u — no cost at all —
   * provided that world owns a radial band with a full shell-sum gap to the next one,
   * while reversing the outer fence cost -29u because it shares a band with the world
   * inside it. Radial isolation is the only clearance that does not depend on timing,
   * and timing is exactly what a head-on pair runs out of. So the reversed world gets
   * the inside of the scene to itself and the other seven co-spin outward from there.
   *
   * The gap is one shell sum at the largest family searched (32..40 -> need 38u), so
   * nothing outside the inner band can meet the reversed world at any phase.
   */
  iso: {
    codeforge: { major: [-90, 90], lo: [136, 146], hi: [156, 172], ecc: [1.08, 1.24], note: 'reversed inner world, owns its band' },
    forgerems: { major: [-24, 16], lo: [200, 226], hi: [228, 268], ecc: [1.04, 1.6], note: 'broad horizontal plane' },
    gems: { major: [-48, -6], lo: [200, 234], hi: [228, 286], ecc: [1.04, 1.7], note: 'shallow plane through the middle' },
    'training-grounds': { major: [-78, -38], lo: [200, 246], hi: [228, 300], ecc: [1.04, 1.66], note: 'negative diagonal' },
    kyrablox: { major: [32, 72], lo: [200, 244], hi: [246, 308], ecc: [1.04, 2.0], note: 'positive diagonal, widest sweep' },
    'kayla-publisher': { major: [-90, -58], lo: [200, 256], hi: [236, 312], ecc: [1.04, 1.6], note: 'near-vertical steep plane' },
    'farmstand-finder': { major: [-62, -24], lo: [200, 268], hi: [248, 314], ecc: [1.04, 1.55], note: 'outer diagonal' },
    'we-the-people': { major: [-90, 90], lo: [276, 306], hi: [288, 314], ecc: [1.0, 1.14], note: 'outer orbital fence (near-round)' },
  },
};
const ROLES = ROLE_SETS[process.env.ROLES || 'shipped'] || ROLE_SETS.shipped;

/** Hand-laid starting point for the hunt; satisfies every role window by construction. */
const SEED = {
  codeforge: { lo: 150, hi: 157, major: -7 },
  forgerems: { lo: 152, hi: 241, major: -4 },
  gems: { lo: 165, hi: 248, major: -23 },
  'training-grounds': { lo: 184, hi: 242, major: -58 },
  kyrablox: { lo: 152, hi: 303, major: 53 },
  'kayla-publisher': { lo: 192, hi: 263, major: -77 },
  'farmstand-finder': { lo: 245, hi: 302, major: -42 },
  'we-the-people': { lo: 306, hi: 312, major: 5 },
};

/**
 * How far a world may reach before its own tag leaves the viewBox.
 *
 * A tag is horizontal at every bearing, and an anchor is static while the body is
 * not, so the only thing that keeps the widest tag of a world inside the scene is
 * that world's own maximum radius: at bearing 0 the tag spans
 * [340 + r - w/2, 340 + r + w/2]. Stacked tags are measured by their widest line.
 */
function tagReach(o) {
  const lines = o.tagLines && o.tagLines.length ? o.tagLines : [o.tag || ''];
  const w = Math.max(...lines.map(M.tagWidth));
  // The apron is the real clip box (measured browser layout), not the viewBox edge.
  const apron = Math.min(-M.LABEL_BOUNDS.l, M.LABEL_BOUNDS.r - M.SCENE);
  return (M.SCENE + apron - w) / 2;
}

/** Long-axis bearing folded to [-90, 90]. */
function signedMajor(o) {
  const turn = o.rx >= o.ry ? o.rotation : o.rotation + 90;
  const b = ((turn % 180) + 180) % 180;
  return b > 90 ? b - 180 : b;
}

/**
 * Why two centred tracks can or cannot be kept apart by phase alone.
 *
 * The all-prograde layout that certified +5.2u does it by sliding: pairs run within
 * 5u of each other across 200-255 degrees of bearing, and co-spinning bodies can
 * still be phased so they never arrive together. Reverse one world and the relative
 * velocity doubles, the phase knot sweeps its whole circle, and the same layout
 * measures -32u. That is not a phase problem, it is a shape problem, and no amount
 * of phase search fixes it — so the shape is constrained directly.
 *
 * Both tracks are centred on the nucleus, so at any bearing th the two bodies CAN
 * occupy the same spoke, and the closest they can get on that spoke is
 * |r_A(th) - r_B(th)|. The set of bearings where that is under `need` is where a
 * collision is possible at all. It is legal only as a narrow window straddling a
 * genuine crossing: there the danger zone is a disc of radius `need`, the partner's
 * arc inside it is about 2*need, and the phase pitch at that point is wide enough to
 * step over it. A wide window — two tracks running alongside each other, whether or
 * not they touch — is a corridor, the danger zone spans a long arc of BOTH tracks at
 * once, and no phase assignment escapes it.
 *
 * This is the difference between "the tracks intersect visually" and "the tracks
 * overlap", and it is measurable without simulating anything.
 */
const CORRIDOR_MAX_DEG = Number(process.env.CORRIDOR_MAX_DEG || 26);
const TANG_SAMPLES = Number(process.env.TANG_SAMPLES || 1440);

function tangencyWindows(cfg, v) {
  const N = TANG_SAMPLES;
  const d = new Float64Array(N);
  const inside = new Uint8Array(N);
  for (let i = 0; i < cfg.length; i++) {
    for (let j = i + 1; j < cfg.length; j++) {
      const A = cfg[i], B = cfg[j];
      const need = (A.size + B.size) / 2;
      let count = 0;
      for (let k = 0; k < N; k++) {
        const th = (k / N) * 2 * Math.PI;
        d[k] = M.radial(A, th) - M.radial(B, th);
        inside[k] = Math.abs(d[k]) < need ? 1 : 0;
        count += inside[k];
      }
      if (!count) continue;
      // Walk the circular bearing set and inspect each contiguous near-approach window.
      let start = -1;
      for (let k = 0; k < N; k++) {
        if (inside[k] && !inside[(k - 1 + N) % N]) start = k;
        if (!inside[k] && start >= 0) { reportWindow(i, j, A, B, start, k, N, need, v, d); start = -1; }
      }
      if (start >= 0) reportWindow(i, j, A, B, start, start + N, N, need, v, d);
    }
  }
  return v;
}

function reportWindow(i, j, A, B, from, to, N, need, v, d) {
  const len = to - from;
  const deg = (len / N) * 360;
  let crossed = false;
  for (let k = from; k < to; k++) {
    const a = d[k % N], b = d[(k + 1) % N];
    if (a * b <= 0 && (a !== 0 || b !== 0)) crossed = true;
  }
  const at = (((from + len / 2) % N) / N) * 360;
  if (!crossed) {
    v.push(`${A.id}~${B.id} run inside ${need.toFixed(0)}u for ${deg.toFixed(0)}deg near ${at.toFixed(0)}deg without ever crossing (corridor)`);
  } else if (deg > CORRIDOR_MAX_DEG) {
    v.push(`${A.id}~${B.id} cross over a ${deg.toFixed(0)}deg window near ${at.toFixed(0)}deg (glancing; max ${CORRIDOR_MAX_DEG}deg)`);
  }
}

/**
 * Corridor audit, reported rather than enforced.
 *
 * A hard corridor cap cannot be used as a search filter: at 26 degrees not one of
 * 3000 random layouts satisfies it, so the climb would have nothing to stand on. It
 * is still the honest explanation of WHY a direction mix is expensive here — the
 * available radial band is about 170u and eight worlds at 32-40u shells need 272u of
 * it to be radially separated, so every pair spends a lot of bearing inside the
 * other's shell and survives on timing alone. Co-spinning worlds can be timed; a
 * head-on pair sweeps twice the relative angle and loses that escape.
 */
function corridorAudit(cfg) {
  const v = [];
  tangencyWindows(cfg, v);
  return v;
}

function designViolations(cfg) {
  const v = [];
  const sigs = cfg.map(trackSignature);
  if (new Set(sigs).size !== cfg.length) v.push(`shared orbital plane (${sigs.length - new Set(sigs).size} duplicate signatures)`);
  for (let i = 0; i < cfg.length; i++) {
    const o = cfg[i];
    const lo = Math.min(o.rx, o.ry);
    const hi = Math.max(o.rx, o.ry);
    if (lo < CORE_MIN) v.push(`${o.id} semi-minor ${lo} < ${CORE_MIN} (crosses the nucleus)`);
    if (hi > REACH_MAX) v.push(`${o.id} semi-major ${hi} > ${REACH_MAX} (leaves the scene)`);
    const reach = Math.min(REACH_MAX, tagReach(o));
    if (hi > reach) v.push(`${o.id} reaches ${hi}u but its tag needs a max radius of ${reach.toFixed(0)}u to stay inside the viewBox`);
    if (o.rx === o.ry) v.push(`${o.id} is a circle`);
    const role = ROLES[o.id];
    if (role) {
      const b = signedMajor(o);
      if (b < role.major[0] || b > role.major[1]) v.push(`${o.id} major axis ${b.toFixed(0)}deg outside its role window [${role.major}]`);
      if (lo < role.lo[0] || lo > role.lo[1]) v.push(`${o.id} semi-minor ${lo} outside role [${role.lo}]`);
      if (hi < role.hi[0] || hi > role.hi[1]) v.push(`${o.id} semi-major ${hi} outside role [${role.hi}]`);
      const e = hi / lo;
      if (e < role.ecc[0] || e > role.ecc[1]) v.push(`${o.id} eccentricity ${e.toFixed(2)} outside role [${role.ecc}]`);
    }
    for (let j = i + 1; j < cfg.length; j++) {
      const p = cfg[j];
      // Two tracks within 10u on BOTH axes are one belt wearing different lipstick:
      // they pass a signature equality test and still read as a shared ring.
      if (Math.abs(hi - Math.max(p.rx, p.ry)) < 10 && Math.abs(lo - Math.min(p.rx, p.ry)) < 10) {
        v.push(`${o.id}~${p.id} are twin belts`);
      }
      const pEcc = Math.max(p.rx, p.ry) / Math.min(p.rx, p.ry);
      if (hi / lo >= ECC_MIN && pEcc >= ECC_MIN) {
        let sep = Math.abs(signedMajor(o) - signedMajor(p)) % 180;
        if (sep > 90) sep = 180 - sep;
        if (sep < MIN_AXIS_SEP) v.push(`${o.id}~${p.id} long axes only ${sep.toFixed(0)}deg apart (corridor risk)`);
      }
    }
  }
  const ecc = cfg.filter((o) => Math.max(o.rx, o.ry) / Math.min(o.rx, o.ry) >= ECC_MIN).length;
  if (ecc < ECC_COUNT) v.push(`only ${ecc}/8 planes reach eccentricity ${ECC_MIN} (concentric-ring look)`);
  return v;
}

/* ------------------------------------------------------------------ *
 * Config plumbing
 * ------------------------------------------------------------------ */

const configFlag = process.argv.find((a) => a.startsWith('--config='));
const outFile = () => process.env.OUT || 'tmp-orbit-config.json';

function loadConfig() {
  if (configFlag) return { cfg: JSON.parse(fs.readFileSync(configFlag.slice(9), 'utf8')), shipped: false };
  return { cfg: M.readShippedConfig(), shipped: true };
}

/**
 * Where each world sits in the size hierarchy, 0 = smallest of the family, 1 =
 * largest. A family is then just the [lo, hi] band these weights are mapped onto, so
 * "how large can the planets get?" is a one-parameter question instead of eight
 * independent ones — and every family keeps the same visual ranking.
 *
 * `outward` is the shipping scheme. It is not the obvious one — the flagship does not
 * get the biggest body — and the reason is measured, not aesthetic: the pairs that
 * gate the whole certificate (codeforge~gems, gems~training-grounds,
 * training-grounds~kyrablox) are all in the crowded inner and middle system, where
 * the tracks have the least radial room to escape each other. Putting mass out
 * there costs clearance unit for unit, while the outer fence has room to spare. The
 * worlds therefore grow with distance, which also reads correctly: outer worlds as
 * gas giants, inner worlds as rocky and compact.
 */
const WEIGHT_SETS = {
  outward: {
    'we-the-people': 1, 'farmstand-finder': 0.92, kyrablox: 0.8, 'kayla-publisher': 0.7,
    forgerems: 0.55, codeforge: 0.5, gems: 0.38, 'training-grounds': 0.28,
  },
  inward: {
    codeforge: 1, gems: 0.7, kyrablox: 0.55, 'kayla-publisher': 0.35,
    'farmstand-finder': 0.3, forgerems: 0.25, 'we-the-people': 0.2, 'training-grounds': 0,
  },
  flat: {},
};
const WEIGHTS = WEIGHT_SETS[process.env.WEIGHTS || 'outward'] || WEIGHT_SETS.outward;

/** Sizes for a family, mapped through the hierarchy above. */
function sizeFamily(cfg, lo, hi) {
  return cfg.map((c) => ({ ...c, size: Math.round(lo + (hi - lo) * (WEIGHTS[c.id] ?? 0.5)) }));
}

/** `--sizes=lo,hi` or SIZES=lo,hi; anything else keeps each world's own size. */
function sizesFlag() {
  const f = process.argv.find((a) => a.startsWith('--sizes='));
  const raw = f ? f.slice(8) : process.env.SIZES;
  return raw ? raw.split(',').map(Number) : null;
}

/**
 * Which worlds run retrograde. The approved design has the two OUTERMOST planes
 * counter-spinning: they are the slowest worlds, so a head-on meeting with them costs
 * the fewest encounters of any pair in the system, and the mix is what stops eight
 * prograde planes from reading as one carousel.
 *
 * Spins are pinned here rather than left to the search, because a ceiling that lets
 * every pair pick its own direction describes a system that cannot be built: one
 * body has one direction, shared with all seven of its pairs.
 */
const RETRO = (process.env.RETRO || 'we-the-people,farmstand-finder').split(',').filter(Boolean);

function withSpins(cfg) {
  return cfg.map((c) => ({ ...c, direction: RETRO.includes(c.id) ? 'reverse' : 'normal' }));
}

/** Spin vector aligned to a config's own order, for the pair tables. */
function spinsOf(cfg) {
  return cfg.map((c) => (c.direction === 'reverse' ? -1 : 1));
}

/** A config file may already carry scheduled durations; the shipped data is scheduled here. */
function withSchedule(cfg) {
  const spun = withSpins(cfg);
  return spun.every((c) => Math.abs(MASTER / c.duration - Math.round(MASTER / c.duration)) < 1e-9) ? spun : applySchedule(spun);
}

const fmt = (v, w = 7, p = 2) => (v == null ? 'pinned'.padStart(w) : v.toFixed(p).padStart(w));

/* ------------------------------------------------------------------ *
 * Geometry hunt
 * ------------------------------------------------------------------ */

/** Reproducible PRNG, so a reported winner can be re-derived exactly. */
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/**
 * Hunt the eight plane SHAPES against the exact objective.
 *
 * Clearance is decided by geometry, not by timing: two tracks that run alongside
 * each other hold both bodies inside each other's discs for a long window every
 * lap, and no start phase escapes that — it can only re-time the overlap. The
 * measurable form of "no escape" is the per-pair ceiling, the best clearance ANY
 * phase assignment can buy, so the worst ceiling over all 28 pairs is a hard upper
 * bound on what the system can ever achieve and is exactly what the hunt climbs.
 *
 * A radial-overlap proxy was tried first and rejected: it ranked several real
 * corridors as benign and several steep crossings as corridors, because what
 * decides a collision is whether two bodies reach the same point at the same time,
 * which no static overlap metric can see.
 *
 * A plane is carried as (semi-minor, eccentricity, long-axis bearing) rather than
 * (rx, ry, rotation): that is the space the role windows are written in, and it
 * makes "semi-major exceeds semi-minor" true by construction instead of something
 * the clamps have to remember to re-check.
 */
function hunt(config, {
  iters = Number(process.env.HUNT_ITERS || 3000),
  samples = Number(process.env.HUNT_SAMPLES || 240),
  bins = Number(process.env.HUNT_BINS || 160),
  perTurn = Number(process.env.HUNT_PER_TURN || 48),
  sizes = null,
  seed = Number(process.env.SEED || 12345),
  temp0 = Number(process.env.HUNT_TEMP || 1.4),
} = {}) {
  const rand = rng(seed);
  const sized = sizes ? sizeFamily(config, sizes[0], sizes[1]) : config;
  const sched = withSpins(applySchedule(sized));
  const spins = spinsOf(sched);
  const base = sched.map((o) => ({ ...o, rx: 0, ry: 0, rotation: 0 }));
  // The tag-reach cap is per world, so a body's own label length bounds its orbit.
  const reach = new Map(config.map((c) => [c.id, Math.min(REACH_MAX, tagReach(c))]));

  /** Eccentricity window that keeps the semi-major inside its role window too. */
  const eccWindow = (o, lo) => {
    const role = ROLES[o.id];
    const a = Math.max(role.ecc[0], role.hi[0] / lo, CORE_MIN / lo);
    const b = Math.min(role.ecc[1], role.hi[1] / lo, reach.get(o.id) / lo);
    return a <= b ? [a, b] : null;
  };

  const draw = (o, r) => {
    const role = ROLES[o.id];
    const lo = role.lo[0] + r() * (role.lo[1] - role.lo[0]);
    const w = eccWindow(o, lo);
    if (!w) return null;
    const ecc = w[0] + r() * (w[1] - w[0]);
    const major = role.major[0] + r() * (role.major[1] - role.major[0]);
    return { lo, ecc, major };
  };

  const materialise = (st) => st.map((s) => ({
    ...s.base,
    rx: Math.round(s.lo * s.ecc),
    ry: Math.round(s.lo),
    rotation: Math.round(s.major),
  }));

  const evaluate = (st, abortBelow) => {
    const cfg = materialise(st);
    const viol = designViolations(cfg);
    if (viol.length) return { ok: false, viol, worst: -Infinity };
    const r = M.worstCeiling(cfg, MASTER, { bins, perTurn, abortBelow, spins });
    // An aborted evaluation has only measured SOME of the 28 pairs, so r.worst is an
    // upper bound on the truth, not a measurement of it: the worst pair may not have
    // been reached yet. Reporting that bound as the candidate's score is how a climb
    // ends up chasing a phantom -- hunt E logged -3.96u and re-measured -24.02u. What
    // is known for certain is that the true worst is at or below the threshold that
    // fired the abort, and that threshold is by construction below the incumbent, so
    // reporting it keeps annealing graded while making promotion impossible.
    const raw = r.aborted ? abortBelow : r.worst;
    // A pure min-max objective stalls: the worst pair only moves when one of its two
    // planes is retuned, so six of the eight planes get no signal at all. Adding a
    // small share of the second-worst ceiling gives the climb somewhere to go while
    // the ranking still tracks the number that actually gates the design.
    const second = r.aborted
      ? raw
      : (r.rows.slice().sort((a, b) => a.best - b.best)[1] || { best: r.worst }).best;
    return { ok: true, worst: raw + 0.05 * second, raw, worstPair: r.worstPair, cfg, aborted: r.aborted };
  };

  // Warm start: the hand-laid seed plus a spread of random legal layouts. The seed
  // sits in a deep corridor basin, and climbing out of it one plane at a time is far
  // slower than starting from a random draw that happens to land in a better one.
  const handSeed = base.map((o) => {
    const s = SEED[o.id];
    return s ? { lo: s.lo, ecc: s.hi / s.lo, major: s.major, base: o } : { ...draw(o, rand), base: o };
  });
  const scored = [];
  const consider = (st) => {
    if (!st || st.some((x) => !x)) return;
    // Abort against the best sample so far: almost every random layout is bad, and
    // rejecting it early is what makes 240 exact evaluations affordable.
    const floor = scored.length ? scored[scored.length - 1].v.worst : -Infinity;
    const v = evaluate(st, floor);
    if (!v.ok) return;
    scored.push({ st, v });
    scored.sort((a, b) => b.v.worst - a.v.worst);
    if (scored.length > 12) scored.length = 12;
  };
  consider(handSeed);
  for (let s = 0; s < samples; s++) {
    consider(base.map((o) => {
      let d = null;
      for (let tries = 0; tries < 20 && !d; tries++) d = draw(o, rand);
      return d ? { ...d, base: o } : null;
    }));
  }
  if (!scored.length) {
    const diag = designViolations(applySchedule(materialise(handSeed)));
    throw new Error('no legal layout found in the role windows; hand seed violations:\n    ' + diag.join('\n    '));
  }
  const hand = evaluate(handSeed, -Infinity);
  console.log(`  ${samples} random layouts sampled, ${scored.length} kept; best ceiling ${scored[0].v.raw.toFixed(2)}u (${scored[0].v.worstPair.a}~${scored[0].v.worstPair.b}), hand seed ${hand.ok ? hand.raw.toFixed(2) + 'u' : 'illegal'}`);

  let cur = scored[0].st.map((s) => ({ ...s }));
  let curEval = scored[0].v;
  let best = { worst: curEval.worst, raw: curEval.raw, worstPair: curEval.worstPair, st: cur.map((s) => ({ ...s })), iter: 0 };

  const jitter = (st, scale) => {
    const out = st.map((s) => ({ ...s }));
    const i = Math.floor(rand() * out.length);
    const role = ROLES[out[i].base.id];
    const k = rand();
    // Step sizes are a fraction of each window's own width, so widening a role window
    // widens the search step with it instead of leaving the climb crawling.
    if (k < 0.38) {
      const w = role.lo[1] - role.lo[0];
      out[i].lo = Math.max(role.lo[0], Math.min(role.lo[1], out[i].lo + (rand() - 0.5) * 2 * scale * w * 0.09));
    } else if (k < 0.76) {
      const w = role.ecc[1] - role.ecc[0];
      out[i].ecc = Math.max(role.ecc[0], Math.min(role.ecc[1], out[i].ecc + (rand() - 0.5) * 2 * scale * w * 0.12));
    } else {
      const w = role.major[1] - role.major[0];
      out[i].major = Math.max(role.major[0], Math.min(role.major[1], out[i].major + (rand() - 0.5) * 2 * scale * w * 0.07));
    }
    const w = eccWindow(out[i].base, out[i].lo);
    if (!w) return null;
    out[i].ecc = Math.max(w[0], Math.min(w[1], out[i].ecc));
    return out;
  };

  let evals = 0;
  const t0 = Date.now();
  for (let it = 0; it < iters; it++) {
    const temp = temp0 * Math.pow(1 - it / iters, 2) + 0.03;
    const cand = jitter(cur, it % 9 === 8 ? 2.6 : 1);
    if (!cand) continue;
    // Abort as soon as a candidate is worse than the climb can still accept: most of
    // the space is bad, and that is what makes an exact objective affordable to search.
    const v = evaluate(cand, Math.max(curEval.raw, best.raw) - temp * 3);
    evals++;
    if (!v.ok) continue;
    if (v.worst >= curEval.worst || rand() < Math.exp((v.worst - curEval.worst) / temp)) {
      cur = cand;
      curEval = v;
    }
    if (curEval.worst > best.worst) {
      best = { worst: curEval.worst, raw: curEval.raw, worstPair: curEval.worstPair, st: cur.map((s) => ({ ...s })), iter: it };
      console.log(`  iter ${String(it).padStart(5)}: worst ceiling ${best.raw.toFixed(2)}u (${best.worstPair.a}~${best.worstPair.b})   ${evals} evals, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  }
  // Re-measure the winner at full resolution: the hunt runs coarse to afford many
  // candidates, and the number that ships must not be an artefact of that.
  const finalCfg = withSpins(applySchedule(materialise(best.st)));
  const final = M.worstCeiling(finalCfg, MASTER, {
    bins: Number(process.env.TABLE_BINS || 400),
    perTurn: Number(process.env.TABLE_PER_TURN || 96),
    spins,
  });
  console.log(`\nHUNT winner (seed ${seed}, ${evals} climb evaluations, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  console.log(`  worst ceiling ${best.raw.toFixed(2)}u coarse -> ${final.worst.toFixed(2)}u at full resolution (${final.worstPair.a}~${final.worstPair.b})`);
  console.log(`  ${final.rows.filter((r) => r.best <= 0).length}/28 pairs unclearable, ${final.rows.filter((r) => r.best > 0 && r.best < 3).length}/28 below 3u`);
  printShapes(finalCfg);
  return { cfg: finalCfg, worst: final.worst, rows: final.rows };
}

function printShapes(cfg) {
  for (const o of cfg) {
    const lo = Math.min(o.rx, o.ry);
    const hi = Math.max(o.rx, o.ry);
    const role = ROLES[o.id];
    console.log(`  ${o.id.padEnd(18)} rx=${String(o.rx).padStart(3)} ry=${String(o.ry).padStart(3)} rot=${String(o.rotation).padStart(4)}  [${lo}..${hi}]  e=${(hi / lo).toFixed(2)}  major=${signedMajor(o).toFixed(0).padStart(4)}deg  dur=${String(o.duration).padStart(6)}s  ${role ? role.note : ''}`);
  }
}

/* ------------------------------------------------------------------ *
 * Exact certification
 * ------------------------------------------------------------------ */

/**
 * The honest certificate: dense sweep of the whole master cycle, then a local
 * refinement around every nearest approach found. The tables used by the searches
 * are a surrogate; nothing is reported as proven until it has been re-measured here
 * directly from the arc-length LUT the browser walks.
 */
function certify(config, master = MASTER, {
  dt = Number(process.env.CERT_DT || 0.1),
  labelDt = Number(process.env.LABEL_DT || 0.2),
} = {}) {
  const bodies = prepare(config, master);
  const shells = M.sweepShells(bodies, master, dt);
  const refined = shells.per.map((p) => {
    const r = M.refinePairGap(bodies, p.i, p.j, p.t, dt * 2, master);
    return { ...p, gap: r.gap, t: r.t };
  }).sort((a, b) => a.gap - b.gap);
  const frame = M.frameMetrics(M.frameAt(bodies, 0, master), bodies);
  const hasLabels = config.every((c) => c.label && c.label.dx != null && c.label.anchor);
  return {
    bodies,
    master,
    shells: refined,
    worstShell: refined[0],
    frame,
    labels: hasLabels ? M.sweepLabels(bodies, master, labelDt) : null,
    steps: shells.steps,
  };
}

function printCertificate(c) {
  console.log(`\n=== CERTIFICATE — master cycle ${c.master}s (${(c.master / 60).toFixed(1)} min), ${c.steps} samples at ${(c.master / c.steps).toFixed(3)}s, then local refinement ===`);
  console.log(`\nSHELL CLEARANCE — valid for ALL future time, because the configuration repeats exactly at t=${c.master}s`);
  for (const p of c.shells.slice(0, 8)) {
    console.log(`  ${(p.a + '~' + p.b).padEnd(34)} ${fmt(p.gap)}u  at t=${p.t.toFixed(3)}s`);
  }
  console.log(`  GLOBAL MINIMUM SHELL CLEARANCE = ${c.worstShell.gap.toFixed(3)}u  (${c.worstShell.a}~${c.worstShell.b} at t=${c.worstShell.t.toFixed(3)}s)`);
  console.log(`  ${c.shells.filter((p) => p.gap <= 0).length}/28 pairs overlap; ${c.shells.filter((p) => p.gap < 3).length}/28 below the 3u target; ${c.shells.filter((p) => p.gap < 5).length}/28 below the 5u strong target`);
  console.log(`\nT=0 COMPOSITION — also the prefers-reduced-motion freeze`);
  console.log(`  min centre separation ${c.frame.minPair.toFixed(1)}u (${c.frame.pair})   closest core approach ${c.frame.minCore.toFixed(1)}u   farthest reach ${c.frame.maxRadius.toFixed(1)}u`);
  console.log(`  largest empty bearing arc ${c.frame.maxGap.toFixed(1)}deg   body inset from viewBox ${c.frame.minBound.toFixed(1)}u`);
  for (const p of M.frameAt(c.bodies, 0, c.master)) {
    const r = Math.hypot(p.x - CENTER, p.y - CENTER);
    const a = ((Math.atan2(p.y - CENTER, p.x - CENTER) * 180) / Math.PI + 360) % 360;
    console.log(`    ${p.id.padEnd(18)} bearing ${a.toFixed(0).padStart(3)}deg  radius ${r.toFixed(0).padStart(3)}u  (${p.x.toFixed(0)},${p.y.toFixed(0)})`);
  }
  if (c.labels) {
    console.log(`\nLABEL CLEARANCE — tag ink boxes over the whole master cycle (${c.labels.steps} samples)`);
    console.log(`  box model: ${M.TAG_FONT.size}px ${M.TAG_FONT.advance}u/char advance, ${M.TAG_FONT.capHeight}u cap height, ${M.TAG_FONT.stroke}u stroke, ${M.TAG_FONT.tolerance}u whitespace tolerance each side`);
    for (const k of ['label~label', 'label~core', 'label~shell', 'label~bounds']) {
      const r = c.labels.byKind[k];
      console.log(`  ${k.padEnd(14)} minimum ${fmt(r.gap, 8)}u  ${r.pair}${r.t ? ` at t=${r.t.toFixed(2)}s` : ''}`);
    }
    console.log(`  GLOBAL MINIMUM LABEL CLEARANCE = ${c.labels.gap.toFixed(3)}u (${c.labels.kind} ${c.labels.pair} at t=${c.labels.t.toFixed(2)}s)`);
  } else {
    console.log(`\nLABEL CLEARANCE — skipped (config carries no per-world label anchors)`);
  }
}

/* ------------------------------------------------------------------ *
 * Modes
 * ------------------------------------------------------------------ */

const arg = process.argv[2] || 'certify';
const { cfg: loaded, shipped } = loadConfig();

if (arg === 'config') {
  console.log(`Shipped configuration (${shipped ? 'src/data/ecosystem.ts' : configFlag.slice(9)}):`);
  for (const c of loaded) {
    console.log(`  ${c.id.padEnd(18)} rx=${String(c.rx).padStart(3)} ry=${String(c.ry).padStart(3)} rot=${String(c.rotation).padStart(4)} dur=${String(c.duration).padStart(6)} ${c.direction.padEnd(7)} start=${String(c.start).padStart(6)} size=${c.size} opacity=${c.opacity} tag=${JSON.stringify(c.tag)}`);
  }
  const L = M.repeatPeriod(loaded.map((c) => c.duration));
  console.log(`  repeat period of those durations: ${L.toLocaleString('en-US')}s (${(L / 3600).toFixed(0)}h) — finite in principle, unreachable in practice, which is why a designed master cycle replaces it`);

} else if (arg === 'master') {
  const r = scheduleReport();
  console.log(`\nMASTER CYCLE ${r.master}s = ${r.minutes.toFixed(1)} minutes`);
  console.log(`  revolutions per master cycle (inner -> outer): ${r.revolutions.join(', ')}`);
  console.log(`  durations (inner -> outer):                  ${r.durations.map((d) => d.toFixed(2)).join(', ')} s`);
  console.log(`  gcd(revolutions) = ${r.gcd} ${r.gcd === 1 ? '(so lcm(durations) === MASTER: the shortest true repeat is the one certified)' : '(WARNING: the true repeat is shorter than MASTER)'}`);
  console.log(`  distinct periods: ${r.unique}   integer resonances between periods: ${r.multiples}`);
  console.log(`  consecutive period ratio >= ${r.minRatio.toFixed(3)}   total range ${r.range.toFixed(2)}x   every period exactly writable: ${r.exactDecimals}`);
  const found = M.masterSchedules({ limit: 4000 });
  console.log(`\nOther finite schedules enumerable in 600-2700s: ${found.length} (this one chosen for period spread and clean decimals)`);

} else if (arg === 'hunt') {
  const out = hunt(loaded, { sizes: sizesFlag() });
  fs.writeFileSync(outFile(), JSON.stringify(out.cfg, null, 2));
  console.log(`\nwrote ${outFile()}`);

} else if (arg === 'screen') {
  const cfg = withSchedule(loaded);
  const t0 = Date.now();
  const r = M.worstCeiling(cfg, MASTER, {
    bins: Number(process.env.TABLE_BINS || 400),
    perTurn: Number(process.env.TABLE_PER_TURN || 96),
    spins: spinsOf(cfg),
  });
  console.log(`\nGEOMETRIC CEILING — best clearance ANY phase assignment can buy, over ALL future time`);
  console.log(`(${((Date.now() - t0) / 1000).toFixed(1)}s for master cycle ${MASTER}s, sizes ${cfg.map((c) => c.size).join('/')})`);
  for (const c of r.rows) {
    console.log(`  ${(c.a + '~' + c.b).padEnd(34)} best=${fmt(c.best)}u via ${c.sense.padEnd(7)} (co-spin ${fmt(c.par)}u / head-on ${fmt(c.head)}u)`);
  }
  const hopeless = r.rows.filter((c) => c.best <= 0);
  const thin = r.rows.filter((c) => c.best > 0 && c.best < 3);
  console.log(`  ${hopeless.length}/28 pairs cannot be cleared by ANY phase${hopeless.length ? ' — the shapes must change' : ''}; ${thin.length}/28 clear but below the 3u target`);
  console.log(`  WORST ACHIEVABLE SYSTEM CLEARANCE = ${r.worst.toFixed(2)}u`);

} else if (arg === 'solve') {
  const cfg = withSchedule(loaded);
  const spread = Number(process.env.MIN_SPREAD || 100);
  const arc = Number(process.env.MAX_EMPTY_ARC || 96);
  const out = M.searchPhases(cfg, MASTER, { minSpread: spread, maxEmptyArc: arc, minCore: Number(process.env.MIN_CORE || 150) });
  const coarse = certify(out.cfg);
  const polished = M.polishPhases(out.cfg, MASTER, { minSpread: spread, maxEmptyArc: arc });
  console.log(`\nsearch restart ${out.restart}: table gap ${out.gap.toFixed(2)}u -> measured ${coarse.worstShell.gap.toFixed(2)}u -> polished ${polished.worst.toFixed(2)}u`);
  const c = certify(polished.cfg);
  printCertificate(c);
  console.log(`\nSOLVED SCHEDULE`);
  for (const o of c.bodies) {
    console.log(`  ${o.id.padEnd(18)} dur=${String(o.duration).padStart(6)}s  laps/master=${String(o.revolutions).padStart(2)}  ${o.direction.padEnd(7)} start=${o.start}%`);
  }
  console.log(`  spins: ${c.bodies.map((o) => (o.direction === 'reverse' ? 'r' : 'n')).join('')}  (${c.bodies.filter((o) => o.direction === 'reverse').length} retrograde)`);
  fs.writeFileSync(outFile(), JSON.stringify(polished.cfg, null, 2));
  console.log(`\nwrote ${outFile()}`);

} else if (arg === 'labels') {
  const cfg = withSchedule(loaded);
  const out = M.searchAnchors(cfg, MASTER, {});
  console.log(`\nANCHORS — minimum label clearance ${out.score.toFixed(2)}u over the whole master cycle`);
  for (const l of out.labels) {
    console.log(`  ${l.id.padEnd(18)} ${String(l.position).padStart(13)}  dx=${String(l.dx).padStart(7)} dy=${String(l.dy).padStart(6)} anchor=${l.anchor}`);
  }
  fs.writeFileSync(outFile(), JSON.stringify(out.cfg, null, 2));
  console.log(`\nwrote ${outFile()}`);

} else if (arg === 'sizes') {
  const families = (process.env.FAMILIES || '28,34:30,36:32,38:34,40:36,42:38,44').split(':').map((f) => f.split(',').map(Number));
  const base = withSchedule(loaded);
  const target = Number(process.env.TARGET_GAP || 3);
  const spread = Number(process.env.MIN_SPREAD || 100);
  const arc = Number(process.env.MAX_EMPTY_ARC || 96);
  const rows = [];
  for (const [lo, hi] of families) {
    const sized = sizeFamily(base, lo, hi);
    const ceil = M.worstCeiling(sized, MASTER, {
      bins: Number(process.env.TABLE_BINS || 240),
      perTurn: Number(process.env.TABLE_PER_TURN || 64),
      spins: spinsOf(sized),
    });
    const solved = M.searchPhases(sized, MASTER, {
      restarts: Number(process.env.RESTARTS || 80),
      lockDirs: process.env.LOCK_DIRS === '1',
      minSpread: spread,
      maxEmptyArc: arc,
      quiet: true,
    });
    const polished = M.polishPhases(solved.cfg, MASTER, { minSpread: spread, maxEmptyArc: arc });
    const c = certify(polished.cfg);
    const row = { lo, hi, ceiling: ceil.worst, worst: c.worstShell.gap, pair: `${c.worstShell.a}~${c.worstShell.b}`, t: c.worstShell.t, frame: c.frame, cfg: polished.cfg };
    rows.push(row);
    console.log(`  ${String(lo).padStart(2)}-${hi}u  ceiling ${fmt(ceil.worst)}u  MEASURED ${fmt(c.worstShell.gap)}u (${row.pair} @ ${c.worstShell.t.toFixed(1)}s)  t=0 spread ${c.frame.minPair.toFixed(0)}u  empty arc ${c.frame.maxGap.toFixed(0)}deg  ${c.worstShell.gap >= target ? 'PASS' : 'fail'}`);
    fs.writeFileSync(`tmp-sizes-${lo}-${hi}.json`, JSON.stringify(polished.cfg, null, 2));
  }
  const ok = rows.filter((r) => r.worst >= target);
  const winner = ok.length ? ok[ok.length - 1] : null;
  console.log(`\nlargest family meeting the ${target}u target: ${winner ? `${winner.lo}-${winner.hi}u at ${winner.worst.toFixed(2)}u -> tmp-sizes-${winner.lo}-${winner.hi}.json` : 'NONE'}`);

} else if (arg === 'weave') {
  const cfg = withSchedule(loaded);
  const x = crossings(cfg);
  console.log(`\nORBITAL PLANE WEAVE: ${x.length}/28 plane pairs cross, ${x.reduce((a, c) => a + c.n, 0)} crossing points`);
  console.log(`  ${x.filter((c) => c.minAngle >= 38).length} cross steeply (>=38deg), ${x.filter((c) => c.minAngle < 22).length} shallower than 22deg (bodies travel near-parallel through them)`);
  for (const c of x.sort((a, b) => a.minAngle - b.minAngle)) {
    console.log(`  ${(c.a + '~' + c.b).padEnd(34)} ${c.n} crossings, shallowest ${c.minAngle.toFixed(0)}deg`);
  }
  console.log(`  ${28 - x.length}/28 pairs are nested (one plane entirely inside the other) — those can never meet`);

} else if (arg === 'emit') {
  /*
   * Print the exact source lines a solved config needs, so nothing is transcribed by
   * hand. Opacity follows RADIAL rank, not array order, which is what the brief's
   * track hierarchy means: inner/high-importance ~.45-.50, middle ~.34-.42,
   * outer ~.24-.32.
   */
  const cfg = withSchedule(loaded);
  const OPACITY = [.5, .46, .42, .4, .37, .34, .29, .25];
  const rank = cfg.map((o, i) => i).sort((a, b) => (cfg[a].rx + cfg[a].ry) - (cfg[b].rx + cfg[b].ry));
  const lines = new Map();
  rank.forEach((bi, r) => {
    const c = cfg[bi];
    const lab = c.label && c.label.dx != null
      ? `\n    labelPosition: '${c.label.position}', labelDx: ${c.label.dx}, labelDy: ${c.label.dy}, labelAnchor: '${c.label.anchor}',`
      : '';
    lines.set(c.id, [
      `  ${c.id}:`,
      `    size: ${c.size},${lab}`,
      `    orbit: orbit(${c.rx}, ${c.ry}, ${c.rotation}, ${c.duration}, '${c.direction}', ${c.start}, ${OPACITY[r]}),`,
    ].join('\n'));
  });
  console.log(`\n// ${cfg.length} solved worlds, radial order: ${rank.map((bi) => cfg[bi].id).join(' < ')}`);
  for (const c of cfg) console.log(lines.get(c.id));
  console.log(`\n// master cycle ${MASTER}s = ${(MASTER / 60).toFixed(1)} min; laps ${rank.map((bi) => Math.round(MASTER / cfg[bi].duration)).join(',')}`);

} else {
  const cfg = withSchedule(loaded);
  const c = certify(cfg);
  const rep = M.designReport(cfg, MASTER);
  const viol = designViolations(cfg);
  console.log('\nDESIGN');
  console.log(`  unique orbital planes ${rep.uniqueSignatures}   unique periods ${rep.uniqueDurations}   integer resonances ${rep.multiples}   Kepler order ${rep.kepler}`);
  console.log(`  eccentric planes ${rep.eccentric}/8   twin belts ${rep.twins.length}   retrograde ${rep.retrograde}/8`);
  console.log(`  semi-minor floor ${rep.minSemiMinor}u   semi-major ceiling ${rep.maxSemiMajor}u`);
  console.log(`  every period divides the master cycle: ${rep.masterDivides}   laps per master cycle ${rep.revolutions.join(',')}`);
  console.log(`  design-constraint violations: ${viol.length ? '\n    ' + viol.join('\n    ') : 'none'}`);
  const x = crossings(cfg);
  console.log(`  weave: ${x.length}/28 plane pairs cross, ${x.filter((c2) => c2.minAngle >= 38).length} of them at >=38deg, shallowest ${Math.min(...x.map((c2) => c2.minAngle)).toFixed(0)}deg`);
  const corridors = corridorAudit(cfg);
  console.log(`  corridors: ${corridors.length ? corridors.length + ' near-approach windows wider than ' + CORRIDOR_MAX_DEG + 'deg (survivable only on timing, see tangencyWindows)' : 'none wider than ' + CORRIDOR_MAX_DEG + 'deg'}`);
  for (const c of corridors.slice(0, 6)) console.log(`    ${c}`);
  printCertificate(c);
}
