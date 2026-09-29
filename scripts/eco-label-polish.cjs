#!/usr/bin/env node
'use strict';
/**
 * FDS ecosystem label polish — OFFLINE authoring tool.
 *
 * Final (dx, dy) descent on a solved label assignment, scored against the exact
 * dense label certificate. Hard gates, in order: no two tags ever overlap ink
 * (label~label), no tag leaves the real clip apron (label~bounds), and no tag
 * hides behind its own shell (label~own). Tag-vs-shell and tag-vs-core overlaps
 * are soft: tags paint under the planet layer, so those are occlusion depth cues
 * — minimised, not forbidden.
 *
 *   node scripts/eco-label-polish.cjs --config=tmp-labels-csp.json --out=tmp-labels-final.json
 *   env: DT=0.1 ROUNDS=8
 */
const fs = require('node:fs');
const M = require('./eco-orbit-model.cjs');

const MASTER = Number(process.env.MASTER || 1080);
const DT = Number(process.env.DT || 0.1);
const ROUNDS = Number(process.env.ROUNDS || 8);
const configFlag = process.argv.find((a) => a.startsWith('--config='));
const outFlag = process.argv.find((a) => a.startsWith('--out='));
if (!configFlag) throw new Error('usage: eco-label-polish --config=cfg.json [--out=file.json]');
const cfg = JSON.parse(fs.readFileSync(configFlag.slice(9), 'utf8'));
const OUT = (outFlag && outFlag.slice(6)) || 'tmp-labels-polished.json';

const bodies = M.prepare(cfg, MASTER);
const measure = (bs) => M.sweepLabels(bs, MASTER, DT);
const scoreOf = (l) => 1000 * Math.min(l.byKind['label~label'].gap, 0)
  + 400 * Math.min(l.byKind['label~own'].gap, 0)
  + 300 * Math.min(l.byKind['label~bounds'].gap, 0)
  + 150 * Math.min(l.byKind['label~core'].gap, 0)
  + 25 * Math.min(l.byKind['label~label'].gap, 3)
  - l.hingeByKind['label~label'] - l.hingeByKind['label~bounds'] - l.hingeByKind['label~own']
  - 0.4 * l.hingeByKind['label~core'] - 0.03 * l.hingeByKind['label~shell']
  + 0.01 * Math.min(l.byKind['label~bounds'].gap, 4);

const withL = (bs, i, label) => bs.map((b, k) => (k === i ? { ...b, label } : b));
let work = bodies;
let cur = scoreOf(measure(work));
const DXS = [0, -2, 2, -4, 4, -6, 6, -1, 1, -3, 3, -10, 10];
const DYS = [0, -1.5, 1.5, -3, 3, -4.5, 4.5, -6, 6, -9, 9];
for (let round = 0; round < ROUNDS; round++) {
  let moved = false;
  for (let i = 0; i < work.length; i++) {
    const keep = work[i].label;
    let bestL = null, bestV = cur;
    for (const dx of DXS) {
      for (const dy of DYS) {
        if (!dx && !dy) continue;
        const t = { ...keep, dx: Math.round((keep.dx + dx) * 10) / 10, dy: Math.round((keep.dy + dy) * 10) / 10 };
        const v = scoreOf(measure(withL(work, i, t)));
        if (v > bestV) { bestV = v; bestL = t; }
      }
    }
    if (bestL) { work = withL(work, i, bestL); cur = bestV; moved = true; }
  }
  const r = measure(work);
  console.log(`round ${round}  label~label ${r.byKind['label~label'].gap.toFixed(2)} (${r.byKind['label~label'].pair})  own ${r.byKind['label~own'].gap.toFixed(2)}  bounds ${r.byKind['label~bounds'].gap.toFixed(2)}  core ${r.byKind['label~core'].gap.toFixed(2)}`);
  if (!moved) break;
}

const final = measure(work);
console.log('\nFINAL dense certificate:');
for (const [k, v] of Object.entries(final.byKind)) {
  console.log(`  ${k.padEnd(14)} ${v.gap.toFixed(2)}u @ ${v.t.toFixed(1)}s  ${v.pair}`);
}
console.log('overlap%:', JSON.stringify(Object.fromEntries(Object.entries(final.overlap).map(([k, v]) => [k, +v.pct.toFixed(2)]))));
for (const l of work.map((b) => ({ id: b.id, ...b.label }))) {
  console.log(`  ${l.id.padEnd(18)} ${String(l.position).padEnd(12)} dx=${String(l.dx).padStart(6)} dy=${String(l.dy).padStart(6)} anchor=${l.anchor}`);
}
fs.writeFileSync(OUT, JSON.stringify(cfg.map((c, i) => ({ ...c, label: work[i].label })), null, 2));
console.log(`\nwrote ${OUT}`);
