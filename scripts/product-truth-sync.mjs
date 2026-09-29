// Product truth sync — authoring-time drift audit.
// Compares manifest versions/statuses against the real GitHub Releases of
// public FDS repos, and scans src/ for version literals so a stale copy line
// cannot outlive a new release unnoticed.
//
// NOT a CI gate: it needs network + `gh` auth against sibling product repos.
// Run after any product release ships, or during periodic maintenance:
//   node scripts/product-truth-sync.mjs
// Exit 0 = no drift. Exit 1 = at least one drift finding (details printed).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { createServer } from 'vite';

const repoRoot = resolve(import.meta.dirname, '..');
const vite = await createServer({ root: repoRoot, appType: 'custom', server: { middlewareMode: true }, logLevel: 'silent' });
const { productManifest } = await vite.ssrLoadModule('/src/data/manifest.ts');
await vite.close();

const releasesFor = (githubUrl) => {
  const m = githubUrl?.match(/github\.com\/([^/]+\/[^/]+)/);
  if (!m) return null;
  try {
    const out = execSync(`gh api "repos/${m[1]}/releases?per_page=5"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return JSON.parse(out);
  } catch {
    return null; // offline / unauthed / private repo — report as unknown
  }
};

const walk = (dir, files = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (/\.(astro|ts|md)$/.test(name)) files.push(p);
  }
  return files;
};

let drift = 0;
const rows = [];

for (const entry of productManifest) {
  const rels = releasesFor(entry.githubUrl);
  const latest = rels?.find((r) => !r.draft);
  const row = {
    product: entry.id,
    websiteVersion: entry.version ?? '—',
    websiteStatus: entry.canonicalStatus,
    latestRelease: latest ? `${latest.tag_name}${latest.prerelease ? ' (pre)' : ''}` : rels ? 'none' : 'unknown',
  };
  if (entry.version && latest && latest.tag_name !== entry.version) {
    row.drift = `manifest says ${entry.version} but latest release is ${latest.tag_name}`;
    drift++;
  }
  if ((entry.canonicalStatus === 'public-release' || entry.canonicalStatus === 'public-preview') && rels && !latest) {
    row.drift = 'site claims public availability but repo has no non-draft release';
    drift++;
  }
  if (entry.archive.available && rels) {
    // Archives pin a sourceCommit; newer releases do not make the snapshot wrong,
    // but a newer tag is worth surfacing for re-verification.
    const archTag = rels.find((r) => r.target_commitish && entry.archive.sourceCommit?.startsWith(r.target_commitish.slice(0, 7)));
    if (!archTag && latest) row.note = `archive source ${entry.archive.sourceCommit?.slice(0, 7)} is not the commitish of latest release ${latest.tag_name} — confirm the snapshot still represents what the site describes`;
  }
  rows.push(row);
}

// Version literals in src/ that mention a manifest version are expected;
// literals that match NO manifest version flag possible hand-typed drift.
const manifestVersions = new Set(productManifest.map((e) => e.version).filter(Boolean));
const stray = [];
for (const file of walk(join(repoRoot, 'src'))) {
  const text = readFileSync(file, 'utf8');
  // Only real version shapes: v-prefixed, or a prerelease-suffixed semver.
  // Bare "x.y.z" would also match SVG path decimals and IP fragments.
  for (const m of text.matchAll(/\bv\d+\.\d+\.\d+(?:-[\w.]+)?\b|\b\d+\.\d+\.\d+-(?:preview|beta|alpha|rc)[\w.]*\b/g)) {
    const v = m[0].startsWith('v') ? m[0] : `v${m[0]}`;
    const bare = m[0].replace(/^v/, '');
    const tracked = manifestVersions.has(v) || manifestVersions.has(bare) || manifestVersions.has(m[0]);
    if (!tracked) stray.push(`${relative(repoRoot, file)}: ${m[0]}`);
  }
}

console.log('Product truth sync — website manifest vs GitHub Releases\n');
for (const r of rows) {
  console.log(`${r.drift ? 'DRIFT' : 'ok   '} ${r.product.padEnd(18)} site:${r.websiteVersion.padEnd(18)} status:${r.websiteStatus.padEnd(20)} latest:${r.latestRelease}${r.note ? `\n      note: ${r.note}` : ''}`);
  if (r.drift) console.log(`      ${r.drift}`);
}
if (stray.length) {
  console.log('\nVersion literals not tracked by the manifest (review manually — historical refs may be fine):');
  for (const s of stray) console.log(`  ${s}`);
}
console.log(drift ? `\n${drift} drift finding(s).` : '\nNo drift between manifest and live releases.');
process.exit(drift ? 1 : 0);
