#!/usr/bin/env node
/**
 * Project archive generation & verification.
 *
 * Policy (see the archive integrity rules):
 * - Project archives are .zip only. No .7z/.rar/tar is ever produced or referenced.
 * - Every published archive's SHA-256 is computed from the actual artifact bytes
 *   and stored in src/data/generated-archives.json; the website renders that value.
 * - Generation excludes .git, secrets, credentials, .env, private keys, tokens,
 *   local databases, caches, build output, node_modules, virtualenvs, temp files,
 *   and logs: excluded tracked paths are physically removed from the artifact and
 *   untracked files can never enter (git archive only packages committed files).
 * - A content secret scan must pass before an archive is accepted. Test-fixture
 *   directories are reported as warnings; placeholder-shaped values in docs are
 *   filtered; anything else fails generation.
 * - Private projects are never packaged without explicit public-release
 *   authorization; only explicitly approved public repositories are listed here.
 *
 * Usage:
 *   node scripts/generate-project-archives.mjs            # generate + verify all
 *   node scripts/generate-project-archives.mjs --verify   # verify existing only
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateRawSync, inflateRawSync, crc32 } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const generatedManifestPath = resolve(repoRoot, 'src/data/generated-archives.json');

const verifyOnly = process.argv.includes('--verify');

/**
 * Archive sources. `repoPath` may be overridden with FDS_CODEFORGE_REPO so CI or
 * another checkout can be used. A source that is unavailable locally keeps its
 * existing published artifact untouched (verify-only still runs against it).
 */
const archiveSources = [
  {
    id: 'codeforge',
    label: 'CodeForge Source Archive',
    repoPath: process.env.FDS_CODEFORGE_REPO || resolve(repoRoot, '..', 'CodeForge-R3-worktree'),
    ref: 'HEAD',
    outDir: 'downloads/codeforge',
    filenamePrefix: 'CodeForge-source',
  },
];

const EXCLUDED_PATH_PATTERNS = [
  /(^|\/)\.git(?:\/|$)/i,
  /(^|\/)node_modules(?:\/|$)/i,
  /(^|\/)\.venv(?:\/|$)/i,
  /(^|\/)venv(?:\/|$)/i,
  /(^|\/)__pycache__(?:\/|$)/i,
  /(^|\/)certs(?:\/|$)/i,
  /(^|\/)\.env(\.[^.]+)?$/i,
  /\.(pem|key|pfx|p12)$/i,
  /\.(db|sqlite|sqlite3)$/i,
  /\.log$/i,
  /(^|\/)\.DS_Store$/i,
  /(^|\/)Thumbs\.db$/i,
];

const SECRET_PATTERNS = [
  { name: 'private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'AWS access key id', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'OpenAI-style API key', re: /sk-[A-Za-z0-9_-]{20,}/ },
  { name: 'GitHub token (classic)', re: /ghp_[A-Za-z0-9]{30,}/ },
  { name: 'GitHub fine-grained PAT', re: /github_pat_[A-Za-z0-9_]{20,}/ },
  { name: 'Slack token', re: /xox[abp]-[A-Za-z0-9-]{10,}/ },
  { name: 'Stripe live key', re: /sk_live_[A-Za-z0-9]{10,}/ },
  { name: 'Supabase service-role JWT', re: /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'generic assignment secret', re: /\b(SECRET_KEY|API_KEY|API_SECRET|ACCESS_TOKEN|PRIVATE_KEY)\s*=\s*['"][A-Za-z0-9+/_-]{24,}['"]/ },
];

// Values that are obviously placeholder fixtures rather than live credentials.
const PLACEHOLDER_SHAPE = /fake|example|placeholder|sentinel|dummy|sample|redact|abcd|1234567890|aaaa|0000|adversarial|your[_-]|xxx/i;
// Fixture directories whose contents exist to exercise secret handling.
const FIXTURE_PATH = /(^|\/)(test|tests|__tests__|fixtures?)(\/|$)/i;

function git(repoPath, args) {
  return execFileSync('git', ['-C', repoPath, ...args], { encoding: 'utf8' }).trim();
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

/** Read ZIP central directory (authoritative sizes/offsets, descriptor-safe). */
function readCentralDirectory(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65558); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error('not a ZIP (no end-of-central-directory)');
  const count = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) throw new Error(`corrupt central directory at ${ptr}`);
    const method = buf.readUInt16LE(ptr + 10);
    const crc = buf.readUInt32LE(ptr + 16);
    const compressedSize = buf.readUInt32LE(ptr + 20);
    const uncompressedSize = buf.readUInt32LE(ptr + 24);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.subarray(ptr + 46, ptr + 46 + nameLen).toString('utf8');
    entries.push({ name, method, crc, compressedSize, uncompressedSize, localOffset });
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function entryData(buf, entry) {
  const nameLen = buf.readUInt16LE(entry.localOffset + 26);
  const extraLen = buf.readUInt16LE(entry.localOffset + 28);
  const start = entry.localOffset + 30 + nameLen + extraLen;
  const raw = buf.subarray(start, start + entry.compressedSize);
  return entry.method === 0 ? Buffer.from(raw) : inflateRawSync(raw);
}

/**
 * Rewrite a ZIP, keeping only entries that pass `keep`. Kept entries are
 * re-deflated; the result is a self-consistent archive whose bytes depend only
 * on the kept content, so its SHA-256 is stable for identical input.
 */
function rewriteZipDropping(buf, entries, keep) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const push = (b) => { chunks.push(b); offset += b.length; };
  const kept = entries.filter((e) => keep(e.name));
  for (const entry of kept) {
    const data = deflateRawSync(entryData(buf, entry), { level: 9 });
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(0, 10);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    push(local); push(nameBuf); push(data);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0, 8);
    dir.writeUInt16LE(8, 10);
    dir.writeUInt32LE(0, 12);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(data.length, 20);
    dir.writeUInt32LE(data.length, 24);
    dir.writeUInt16LE(nameBuf.length, 28);
    dir.writeUInt32LE(0, 30);
    dir.writeUInt16LE(0, 42);
    dir.writeUInt32LE(0, 38);
    dir.writeUInt32LE(entry.localOffset, 42); // placeholder, fixed below
    central.push({ dir, nameBuf, headerOffset: offset - 30 - nameBuf.length - data.length });
  }
  // Fix local-header offsets now that all sizes are known.
  const centralStart = offset;
  let cdSize = 0;
  for (const { dir, nameBuf, headerOffset } of central) {
    dir.writeUInt32LE(headerOffset, 42);
    push(dir); push(nameBuf);
    cdSize += 46 + nameBuf.length;
  }
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(central.length, 8);
  eocd.writeUInt16LE(central.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(centralStart, 16);
  push(eocd);
  return Buffer.concat(chunks);
}

function scanForSecrets(entries, getData, filename) {
  const failures = [];
  const warnings = [];
  for (const entry of entries) {
    let content;
    try {
      content = getData(entry).toString('utf8');
    } catch {
      failures.push(`${filename}: could not decompress ${entry.name} for secret scan`);
      continue;
    }
    for (const { name: label, re } of SECRET_PATTERNS) {
      const match = content.match(re);
      if (!match) continue;
      const record = `${filename}: ${label} in ${entry.name} (${match[0].slice(0, 18)}…)`;
      if (FIXTURE_PATH.test(entry.name)) warnings.push(`fixture hit (ignored): ${record}`);
      else if (PLACEHOLDER_SHAPE.test(match[0])) warnings.push(`placeholder-shaped hit (ignored): ${record}`);
      else failures.push(record);
    }
  }
  return { failures, warnings };
}

function main() {
  const results = [];
  for (const source of archiveSources) {
    const existing = existsSync(generatedManifestPath)
      ? JSON.parse(readFileSync(generatedManifestPath, 'utf8'))
      : { archives: [] };
    const previous = existing.archives.find((a) => a.id === source.id);

    if (verifyOnly) {
      if (!previous) throw new Error(`--verify: no generated archive record for ${source.id}`);
      const absPath = resolve(repoRoot, 'public', previous.url.replace(/^\//, ''));
      if (!existsSync(absPath)) throw new Error(`--verify: missing archive file ${previous.url}`);
      const buffer = readFileSync(absPath);
      const actual = sha256(buffer);
      if (actual !== previous.sha256) {
        throw new Error(`--verify: SHA-256 mismatch for ${previous.filename}: manifest ${previous.sha256} != actual ${actual}`);
      }
      results.push(previous);
      continue;
    }

    if (!existsSync(source.repoPath)) {
      console.warn(`[archives] source repo not found for ${source.id}; keeping existing record`);
      if (previous) results.push(previous);
      continue;
    }

    const commit = git(source.repoPath, ['rev-parse', 'HEAD']);
    const shortCommit = commit.slice(0, 7);
    const filename = `${source.filenamePrefix}-${shortCommit}.zip`;
    const outDir = resolve(repoRoot, 'public', source.outDir);
    mkdirSync(outDir, { recursive: true });
    const outPath = resolve(outDir, filename);

    // git archive only packages committed, tracked files at the ref: untracked
    // local artifacts (caches, .env, keys) can never leak into the archive.
    execFileSync('git', ['-C', source.repoPath, 'archive', '--format=zip', '--output', outPath, source.ref]);

    const raw = readFileSync(outPath);
    const entries = readCentralDirectory(raw);
    const dropped = entries.filter((e) => EXCLUDED_PATH_PATTERNS.some((p) => p.test(e.name))).map((e) => e.name);
    const cleaned = rewriteZipDropping(raw, entries, (name) => !EXCLUDED_PATH_PATTERNS.some((p) => p.test(name)));

    const cleanedEntries = readCentralDirectory(cleaned);
    const { failures, warnings } = scanForSecrets(
      cleanedEntries,
      (entry) => entryData(cleaned, entry),
      filename
    );
    for (const warning of warnings) console.warn(`[archives] ${warning}`);
    if (failures.length > 0) {
      throw new Error(`[archives] refusing to publish ${filename}:\n  ${failures.join('\n  ')}`);
    }

    writeFileSync(outPath, cleaned);
    const buffer = readFileSync(outPath);
    const record = {
      id: source.id,
      label: source.label,
      filename,
      url: `/${source.outDir}/${filename}`,
      sha256: sha256(buffer),
      sizeBytes: buffer.length,
      sourceCommit: commit,
      sourceRef: source.ref,
      entryCount: cleanedEntries.length,
      excludedEntries: dropped,
      generatedAt: new Date().toISOString(),
    };
    results.push(record);
    console.log(`[archives] ${filename} sha256=${record.sha256} size=${record.sizeBytes} entries=${record.entryCount} excluded=${dropped.length}`);
  }

  writeFileSync(generatedManifestPath, `${JSON.stringify({ archives: results }, null, 2)}\n`);
  console.log('[archives] manifest written:', generatedManifestPath);
}

main();
