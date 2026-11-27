// Content & Public-Safety Registry Validation for FDS — zero extra dependencies.
// Validates:
//   1. Legacy projects.ts slugs & media paths
//   2. Notes frontmatter & relations
//   3. site.ts support / social URL configuration
//   4. Automated public-status registry (content/public-status/registry.json)
//      against FDS_MODEL_STATUS_SCHEMA rules, category/status integrity,
//      and zero private-filesystem / secret / fake-certification leakage.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const err = (m) => errors.push(m);

// --- 1. Projects (parsed from the TS source without importing it) ---
const projectsSrc = readFileSync(join(root, 'src/data/projects.ts'), 'utf8');
const projectSlugs = [...projectsSrc.matchAll(/slug:\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
const seenProject = new Set();
for (const slug of projectSlugs) {
  if (seenProject.has(slug)) err(`Duplicate project slug: ${slug}`);
  seenProject.add(slug);
}

for (const m of projectsSrc.matchAll(/(?:src|ogImage):\s*["'`](\/[^"'`]+)["'`]/g)) {
  const rel = m[1];
  if (!existsSync(join(root, 'public', rel))) err(`Missing referenced media: ${rel}`);
}

// --- 2. Notes (frontmatter) ---
const notesDir = join(root, 'src/content/notes');
const noteFiles = readdirSync(notesDir).filter((f) => f.endsWith('.md'));
const seenNote = new Set();
for (const file of noteFiles) {
  const raw = readFileSync(join(notesDir, file), 'utf8');
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
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

// --- 3. Support / social configuration (src/config/site.ts) ---
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

if (urlValues.tiktokUrl && !/tiktok\.com\//i.test(urlValues.tiktokUrl)) err(`site.ts: tiktokUrl must be a tiktok.com profile URL`);
if (urlValues.kofiUrl && !/ko-fi\.com\//i.test(urlValues.kofiUrl)) err(`site.ts: kofiUrl must be a ko-fi.com URL`);
if (!/^https:\/\/cash\.app\/\$[A-Za-z0-9._-]+$/.test(urlValues.cashAppUrl || '')) err(`site.ts: cashAppUrl must look like https://cash.app/$Handle`);
const cashHandle = cfgValue('cashAppHandle');
if (cashHandle === null || !/^\$[A-Za-z0-9._-]+$/.test(cashHandle)) err(`site.ts: cashAppHandle must look like "$ForgerDigital"`);
const supportEmail = cfgValue('supportEmail');
if (!supportEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) err(`site.ts: supportEmail must be a valid email address`);
if (!cfgValue('hardwareDonationSubject')) err(`site.ts: hardwareDonationSubject must be set`);

{
  const distinct = [urlValues.kofiUrl, urlValues.cashAppUrl, urlValues.tiktokUrl].filter(Boolean);
  const seen = new Set();
  for (const u of distinct) {
    if (seen.has(u)) err(`site.ts: duplicate support/social destination URL: ${u}`);
    seen.add(u);
  }
}

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
}

// --- 4. Automated Public Status Registry & Publication-Safety Guard ---
const VALID_CATEGORIES = new Set([
  'ai-model-family',
  'ai-model',
  'application',
  'research-infrastructure',
  'original-production',
  'legacy-product',
]);

const VALID_DEV_STATUSES = new Set([
  'research-vision',
  'foundation-available',
  'training-planned',
  'training-in-progress',
  'fine-tuning-completed',
  'experimental',
  'evaluated',
  'capability-certified',
  'active-development',
  'private-development',
  'public-preview',
  'public-release',
  'deprecated',
]);

const VALID_AVAILABILITY = new Set([
  'not-publicly-available',
  'research-only',
  'downloads-paused',
  'public-preview',
  'public-release',
  'private-development',
]);

const UNRELEASED_STATUSES = new Set([
  'research-vision',
  'foundation-available',
  'training-planned',
  'training-in-progress',
  'experimental',
  'active-development',
  'private-development',
]);

const PRIVATE_LEAK_PATTERNS = [
  { label: 'Windows local drive path', regex: /\b[A-Z]:\\(?:My Drive|Users|Jaspilite|Hackmanite|FDS_Alexandrite|RobloxProjects)/i },
  { label: 'Private Google Drive reference', regex: /drive\.google\.com\/drive\/folders\/|Z:\\My Drive/i },
  { label: 'Internal desktop username path', regex: /Daddy_FDS/i },
  { label: 'Unverified SOC 2 / ISO compliance claim', regex: /\b(?:SOC\s*2\s*(?:Type|certified|compliant)|ISO\s*27001\s*certified|HIPAA\s*compliant)\b/i },
  { label: 'Secret API key pattern', regex: /\b(?:sk-or-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,})\b/ },
];

const registryPath = join(root, 'content/public-status/registry.json');
let registryCount = 0;

if (!existsSync(registryPath)) {
  err('Missing automated public status registry: content/public-status/registry.json');
} else {
  const reg = JSON.parse(readFileSync(registryPath, 'utf8'));
  if (!reg.schema_version || !/^\d+\.\d+\.\d+$/.test(reg.schema_version)) err('registry.json: invalid schema_version');
  if (!reg.last_updated || !/^\d{4}-\d{2}-\d{2}$/.test(reg.last_updated)) err('registry.json: invalid last_updated date');
  if (!Array.isArray(reg.entries) || reg.entries.length === 0) {
    err('registry.json: entries must be a non-empty array');
  } else {
    registryCount = reg.entries.length;
    const seenIds = new Set();
    const requiredFields = [
      'id', 'name', 'category', 'division', 'version', 'development_status', 'availability',
      'verified_capabilities', 'known_limitations', 'non_claims', 'public_summary',
      'public_evidence', 'route', 'accent', 'last_verified', 'approved_for_publication'
    ];
    for (const entry of reg.entries) {
      for (const field of requiredFields) {
        if (entry[field] === undefined || entry[field] === null || entry[field] === '') {
          err(`registry.json [${entry.id || 'unknown'}]: missing required field "${field}"`);
        }
      }
      if (seenIds.has(entry.id)) err(`registry.json: duplicate id "${entry.id}"`);
      seenIds.add(entry.id);
      if (!VALID_CATEGORIES.has(entry.category)) err(`registry.json [${entry.id}]: invalid category "${entry.category}"`);
      if (!VALID_DEV_STATUSES.has(entry.development_status)) err(`registry.json [${entry.id}]: invalid development_status "${entry.development_status}"`);
      if (!VALID_AVAILABILITY.has(entry.availability)) err(`registry.json [${entry.id}]: invalid availability "${entry.availability}"`);
      if (entry.approved_for_publication !== true) err(`registry.json [${entry.id}]: unapproved entry cannot exist in public registry`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.last_verified || '')) err(`registry.json [${entry.id}]: invalid last_verified date`);
      if (UNRELEASED_STATUSES.has(entry.development_status) && (entry.availability === 'public-release' || entry.availability === 'public-preview')) {
        err(`registry.json [${entry.id}]: unsupported availability "${entry.availability}" for status "${entry.development_status}"`);
      }
    }
  }
}

// Scan all JSON files under content/ and referenced media paths
function scanContentDir(dir) {
  if (!existsSync(dir)) return;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) { scanContentDir(full); continue; }
    if (!ent.name.endsWith('.json')) continue;
    const raw = readFileSync(full, 'utf8');
    try { JSON.parse(raw); } catch (e) { err(`${full}: invalid JSON (${e.message})`); }
    for (const rule of PRIVATE_LEAK_PATTERNS) {
      if (rule.regex.test(raw)) err(`${full}: publication-safety violation — ${rule.label}`);
    }
    for (const m of raw.matchAll(/"image(?:Sm)?":\s*"(\/images\/[^"]+)"/g)) {
      if (!existsSync(join(root, 'public', m[1]))) err(`${full}: missing referenced image ${m[1]}`);
    }
  }
}
scanContentDir(join(root, 'content'));

if (errors.length) {
  console.error(`\n✗ Content validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ Content valid: ${projectSlugs.length} legacy/catalog projects, ${registryCount} public-status registry entries, ${noteFiles.length} notes.`);
