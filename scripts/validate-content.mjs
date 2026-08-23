// Lightweight content validation for FDS — no extra dependencies.
// Checks: duplicate project/note slugs, note→project relations, and that
// any locally-referenced project media actually exists in /public.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const err = (m) => errors.push(m);

// --- Projects (parsed from the TS source without importing it) ---
const projectsSrc = readFileSync(join(root, 'src/data/projects.ts'), 'utf8');
const projectSlugs = [...projectsSrc.matchAll(/slug:\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
const seenProject = new Set();
for (const slug of projectSlugs) {
  if (seenProject.has(slug)) err(`Duplicate project slug: ${slug}`);
  seenProject.add(slug);
}

// Referenced local media in projects.ts must exist under /public.
for (const m of projectsSrc.matchAll(/(?:src|ogImage):\s*["'`](\/[^"'`]+)["'`]/g)) {
  const rel = m[1];
  if (!existsSync(join(root, 'public', rel))) err(`Missing referenced media: ${rel}`);
}

// --- Notes (frontmatter) ---
const notesDir = join(root, 'src/content/notes');
const noteFiles = readdirSync(notesDir).filter((f) => f.endsWith('.md'));
const seenNote = new Set();
for (const file of noteFiles) {
  const raw = readFileSync(join(notesDir, file), 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) { err(`Note ${file}: missing frontmatter`); continue; }
  const body = fm[1];
  const slug = file.replace(/\.md$/, '');
  if (seenNote.has(slug)) err(`Duplicate note slug: ${slug}`);
  seenNote.add(slug);

  const date = body.match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})/m);
  if (!date) err(`Note ${file}: missing or invalid date (expected YYYY-MM-DD)`);

  const ps = body.match(/^projectSlug:\s*["']?([^"'\n]+)["']?\s*$/m);
  if (ps && !projectSlugs.includes(ps[1].trim())) {
    err(`Note ${file}: projectSlug "${ps[1].trim()}" does not match any project`);
  }
}

// --- Support / social configuration (src/config/site.ts) ---
// Parses flat "key: \"value\"" pairs without importing TypeScript.
// Optional channels (Ko-fi, TikTok, community funding) are allowed to be
// empty — empty simply means the UI hides them. Malformed non-empty values fail.
const siteSrc = readFileSync(join(root, 'src/config/site.ts'), 'utf8');
const cfgValue = (key) => {
  const m = siteSrc.match(new RegExp(`^\\s*${key}:\\s*"([^"]*)"`, 'm'));
  return m ? m[1] : null;
};
const cfgBool = (key) => {
  const m = siteSrc.match(new RegExp(`^\\s*${key}:\\s*(true|false)`, 'm'));
  return m ? m[1] === 'true' : null;
};
const isHttpUrl = (v) => /^https:\/\/[^\s"'<>]+$/.test(v);

const urlKeys = ['siteUrl', 'githubUrl', 'youtubeUrl', 'discordUrl', 'linkedinUrl', 'tiktokUrl', 'supportUrl', 'kofiUrl', 'cashAppUrl'];
const urlValues = {};
for (const key of urlKeys) {
  const v = cfgValue(key);
  if (v === null) { err(`site.ts: missing required config key: ${key}`); continue; }
  urlValues[key] = v;
  if (v === '') continue;
  if (!isHttpUrl(v)) err(`site.ts: ${key} is not a valid HTTPS URL: "${v}"`);
}

if (urlValues.tiktokUrl && !/tiktok\.com\//i.test(urlValues.tiktokUrl)) {
  err(`site.ts: tiktokUrl must be a tiktok.com profile URL`);
}
if (urlValues.kofiUrl && !/ko-fi\.com\//i.test(urlValues.kofiUrl)) {
  err(`site.ts: kofiUrl must be a ko-fi.com URL`);
}
if (!/^https:\/\/cash\.app\/\$[A-Za-z0-9._-]+$/.test(urlValues.cashAppUrl || '')) {
  err(`site.ts: cashAppUrl must look like https://cash.app/$Handle`);
}
const cashHandle = cfgValue('cashAppHandle');
if (cashHandle === null || !/^\$[A-Za-z0-9._-]+$/.test(cashHandle)) {
  err(`site.ts: cashAppHandle must look like "$ForgerDigital"`);
}
const supportEmail = cfgValue('supportEmail');
if (!supportEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
  err(`site.ts: supportEmail must be a valid email address`);
}
if (!cfgValue('hardwareDonationSubject')) {
  err(`site.ts: hardwareDonationSubject must be set`);
}

// Support destinations that serve different purposes must not collide.
{
  const distinct = [urlValues.kofiUrl, urlValues.cashAppUrl, urlValues.tiktokUrl].filter(Boolean);
  const seen = new Set();
  for (const u of distinct) {
    if (seen.has(u)) err(`site.ts: duplicate support/social destination URL: ${u}`);
    seen.add(u);
  }
}

// Community funding must stay coherent: either fully unconfigured (wallet
// fields all empty) or fully populated. Partial wallet configuration fails.
{
  const walletKeys = ['communityWalletAddress', 'communityWalletNetwork', 'communityWalletType', 'communityWalletThreshold'];
  const setCount = walletKeys.filter((k) => (cfgValue(k) ?? '') !== '').length;
  if (setCount > 0 && setCount < walletKeys.length) {
    err(`site.ts: community wallet fields are partially populated (${setCount}/${walletKeys.length}) — configure all or none`);
  }
  const active = cfgBool('communityFundingActive');
  if (active === null) err(`site.ts: missing communityFundingActive (expected true or false)`);
  const fundingUrl = cfgValue('communityFundingUrl') ?? '';
  if (active && !fundingUrl) {
    err(`site.ts: communityFundingActive is true but communityFundingUrl is empty — a live contribution destination is required first`);
  }
  if (active && setCount > 0 && setCount < walletKeys.length) {
    // already covered above; kept explicit for readability
  }
}

if (errors.length) {
  console.error(`\n✗ Content validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ Content valid: ${projectSlugs.length} projects, ${noteFiles.length} notes.`);
