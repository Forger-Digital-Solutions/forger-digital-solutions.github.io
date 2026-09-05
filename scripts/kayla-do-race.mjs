#!/usr/bin/env node
/**
 * Phase 13 deployed-semantics rate-limit race (local workerd, NOT production).
 *
 * Spins up the REAL Worker (wrangler dev, real Durable Object runtime with
 * SQLite storage) and fires truly concurrent chat requests sharing one
 * client identity. Asserts the per-minute limiter admits exactly the
 * configured ceiling with no over-admission race.
 *
 *   node scripts/kayla-do-race.mjs [--port=8787] [--limit=5] [--fire=15] [--rounds=3] [--json]
 *
 * Safety: binds and targets 127.0.0.1 only. It refuses any non-loopback
 * target by construction (there is no target flag at all).
 */
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
};
const PORT = Number(opt('port', '8787'));
const LIMIT = Number(opt('limit', '5'));
const FIRE = Number(opt('fire', '15'));
const ROUNDS = Number(opt('rounds', '3'));
const asJson = args.includes('--json');

const SALT = 'phase13-race-salt-at-least-16-chars';
// Fresh per-run identity base: dev DO storage persists across wrangler
// restarts, so a fixed IP would inherit counters from earlier runs.
const RUN_SEED = Math.floor(Math.random() * 200);

function waitForReady() {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 90_000;
    const tick = async () => {
      try {
        const r = await fetch(`http://127.0.0.1:${PORT}/api/kayla/health`);
        if (r.ok) return resolve();
      } catch { /* not up yet */ }
      if (Date.now() > deadline) return reject(new Error('wrangler dev did not become ready in 90s'));
      setTimeout(tick, 500);
    };
    tick();
  });
}

const workerDir = new URL('../worker/', import.meta.url);
const wranglerBin = fileURLToPath(new URL('./node_modules/wrangler/bin/wrangler.js', workerDir));
const worker = spawn(
  process.execPath,
  [wranglerBin, 'dev', '--port', String(PORT), '--ip', '127.0.0.1',
    '--var', 'KAYLA_ENABLED:false',
    '--var', 'KAYLA_PROVIDER:',
    '--var', `KAYLA_RATE_LIMIT_SALT:${SALT}`,
    '--var', `KAYLA_RATE_LIMIT_PER_MINUTE:${LIMIT}`,
    '--var', 'KAYLA_RATE_LIMIT_PER_HOUR:1000',
    '--var', 'KAYLA_ALLOWED_ORIGINS:https://forger-digital-solutions.github.io'],
  {
    cwd: fileURLToPath(workerDir),
    env: { ...process.env },
    stdio: 'ignore'
  }
);

let exitCode = 0;
const rounds = [];
try {
  await waitForReady();
  for (let round = 1; round <= ROUNDS; round++) {
    // Fresh identity per round (distinct loopback-routed IP header is NOT
    // possible: wrangler dev sets CF-Connecting-IP itself. Instead each round
    // uses a fresh port-unique salt namespace via distinct header IPs that
    // wrangler passes through only if the runtime honors them... simplest
    // robust isolation: restart-independent per-round identity is achieved by
    // waiting for the minute window to roll. For speed, rounds share the
    // window only if the limit allows; here we RESTART wrangler state by
    // using a new IP per round sent in a header the dev runtime preserves.
    // Empirically: wrangler dev honors incoming CF-Connecting-IP. Verified
    // below by asserting round 1 admits exactly LIMIT before any 429.
    const ip = `203.0.113.${(RUN_SEED + round) % 200 + 1}`;
    const statuses = await Promise.all(Array.from({ length: FIRE }, (_, i) =>
      fetch(`http://127.0.0.1:${PORT}/api/kayla/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://forger-digital-solutions.github.io', 'CF-Connecting-IP': ip },
        body: JSON.stringify({ message: `race probe ${round}-${i}: Who founded FDS?` })
      }).then((r) => r.status).catch(() => 'threw')
    ));
    const admitted = statuses.filter((s) => s === 200).length;
    const rejected = statuses.filter((s) => s === 429).length;
    const other = statuses.filter((s) => s !== 200 && s !== 429);
    const pass = admitted === LIMIT && rejected === FIRE - LIMIT && other.length === 0;
    rounds.push({ round, fired: FIRE, limit: LIMIT, admitted, rejected429: rejected, other, result: pass ? 'PASS' : 'FAIL' });
    if (!pass) exitCode = 1;
  }
  if (asJson) console.log(JSON.stringify({ runtime: 'wrangler dev (workerd, SQLite DO)', port: PORT, rounds }, null, 2));
  else {
    console.log('\nKAYLA DO RACE (local workerd, real Durable Object runtime — not production)');
    console.log('='.repeat(70));
    for (const r of rounds) console.log(`round ${r.round}: fired=${r.fired} limit=${r.limit} admitted=${r.admitted} rejected429=${r.rejected429} other=${JSON.stringify(r.other)} ${r.result}`);
    console.log('='.repeat(70));
    console.log(exitCode ? 'DO RACE: FAIL' : 'DO RACE: PASS');
  }
} finally {
  worker.kill('SIGTERM');
}
process.exit(exitCode);
