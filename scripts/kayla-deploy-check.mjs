import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const config = read('worker/wrangler.toml');
const envExample = read('.env.example');
const worker = read('worker/index.ts');
const failures = [];
const requireMatch = (condition, message) => { if (!condition) failures.push(message); };

requireMatch(/workers_dev\s*=\s*true/.test(config), 'workers.dev must be enabled');
requireMatch(!/^\s*(route|routes)\s*=/m.test(config), 'custom DNS routes must not block initial deployment');
requireMatch(/class_name\s*=\s*"KaylaAbuseGuard"/.test(config), 'Durable Object binding missing');
requireMatch(/new_sqlite_classes\s*=\s*\["KaylaAbuseGuard"\]/.test(config), 'SQLite Durable Object migration missing');
requireMatch(/KAYLA_MODEL\s*=\s*"openrouter\/free"/.test(config), 'production model must be openrouter/free');
requireMatch(!/KAYLA_ALLOWED_ORIGINS\s*=\s*"\*"/.test(config), 'wildcard production CORS is forbidden');
requireMatch(/evaluateModelPolicy/.test(worker), 'zero-cost model policy is not wired into Worker health');
requireMatch(/KAYLA_RATE_LIMIT_SALT=replace-with/.test(envExample), 'rate-limit salt placeholder missing');
if (process.argv.includes('--require-secrets')) {
  requireMatch(Boolean(process.env.KAYLA_API_KEY), 'KAYLA_API_KEY is not present in this shell');
  requireMatch((process.env.KAYLA_RATE_LIMIT_SALT || '').length >= 16, 'KAYLA_RATE_LIMIT_SALT is missing or too short');
}
if (failures.length) { console.error(`Kayla deploy check failed:\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log('Kayla deploy check: PASS (workers.dev, zero-cost policy, strict CORS, SQLite Durable Object).');
