#!/usr/bin/env node
'use strict';
/**
 * FDS ecosystem label pass — OFFLINE authoring tool.
 *
 * The deterministic per-world label search the orbit solver's `labels` mode wraps:
 * greedy coordinate descent over a small compass-anchor candidate set (three reach
 * tiers), a joint escape for the pair the descent stalls on, and a (dx, dy)
 * micro-polish, all scored by the exact full-cycle label sweep. This driver runs
 * that search from several seeds because a greedy climb is start-dependent, and
 * writes the winner so `emit` can print the source lines for src/data/ecosystem.ts.
 *
 *   node scripts/eco-label-solve.cjs --config=tmp-locked-geometry.json
 *   env: MASTER=1080 RETRO=none OUT=tmp-labels-v3.json
 */
const fs = require('node:fs');
const M = require('./eco-orbit-model.cjs');

const MASTER = Number(process.env.MASTER || 2160);
const configFlag = process.argv.find((a) => a.startsWith('--config='));
const OUT = process.env.OUT || 'tmp-labels-out.json';
if (!configFlag) throw new Error('usage: eco-label-solve --config=cfg.json');
const cfg = JSON.parse(fs.readFileSync(configFlag.slice(9), 'utf8'));

const t0 = Date.now();
const dt = Number(process.env.LABEL_DT || 0.25);

/** Alternate tag stacks to try, per world — recognized short labels only. */
const TAG_VARIANTS = {
  // 'KAYLA' is the manifest shortName; the stack prints the canonical full name.
  'kayla-publisher': [['KAYLA', 'PUBLISHER'], ['KAYLA']],
};

/** Seeds: every compass direction applied to all eight bodies at once. */
const SEEDS = [null, 'below', 'above', 'left', 'right', 'below-left', 'above-right', 'above-left', 'below-right'];

function seeded(cfg, dir) {
  const bodies = M.prepare(cfg, MASTER);
  return bodies.map((b) => ({ ...b, label: dir ? M.anchorOffset(b, { ...M.ANCHORS.find((a) => a.position === dir) }) : b.label }));
}

let globalBest = null;
for (const [kid, variants] of Object.entries(TAG_VARIANTS)) {
  for (const lines of variants) {
    const tagged = cfg.map((c) => (c.id === kid ? { ...c, tagLines: lines } : c));
    for (const seed of SEEDS) {
      const start = seeded(tagged, seed);
      const out = M.searchAnchors(start, MASTER, { dt });
      const rep = M.sweepLabels(M.prepare(out.cfg, MASTER), MASTER, dt);
      const entry = { variant: lines.join('/'), seed: seed || 'inherit', gap: rep.gap, byKind: rep.byKind, cfg: out.cfg };
      if (!globalBest || entry.gap > globalBest.gap) globalBest = entry;
      const k = Object.entries(rep.byKind).map(([n, r]) => `${n} ${r.gap.toFixed(1)}`).join('  ');
      console.log(`  [${entry.variant.padEnd(16)} seed=${entry.seed.padEnd(12)}] worst ${rep.gap.toFixed(2).padStart(7)}u   ${k}`);
    }
  }
}

console.log(`\nWINNER in ${((Date.now() - t0) / 1000).toFixed(0)}s: ${globalBest.variant} seed=${globalBest.seed} -> ${globalBest.gap.toFixed(2)}u`);
const bodies = M.prepare(globalBest.cfg, MASTER);
for (const b of bodies) {
  const lab = b.label;
  console.log(`  ${b.id.padEnd(18)} ${String(lab.position).padStart(13)} dx=${String(lab.dx).padStart(7)} dy=${String(lab.dy).padStart(6)} anchor=${lab.anchor}  lines=${JSON.stringify(b._tagLines)}`);
}
fs.writeFileSync(OUT, JSON.stringify(globalBest.cfg, null, 2));
console.log(`\nwrote ${OUT}`);
