import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { productManifest } from '../src/data/manifest';
import { products } from '../src/data/products';

const repoRoot = new URL('..', import.meta.url);
const forgedPage = readFileSync(new URL('../src/pages/forged.astro', import.meta.url), 'utf8');

const publishedArchives = productManifest.filter((entry) => entry.archive.available);

/** Parse ZIP central directory entry names and their inflated contents. */
function readZipEntries(bytes: Buffer): Array<{ name: string; content: Buffer }> {
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) {
    if (bytes.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  expect(eocd, 'archive must be a readable ZIP (end-of-central-directory)').toBeGreaterThanOrEqual(0);
  const count = bytes.readUInt16LE(eocd + 10);
  let ptr = bytes.readUInt32LE(eocd + 16);
  const entries: Array<{ name: string; content: Buffer }> = [];
  for (let n = 0; n < count; n++) {
    expect(bytes.readUInt32LE(ptr), 'corrupt ZIP central directory').toBe(0x02014b50);
    const method = bytes.readUInt16LE(ptr + 10);
    const compressedSize = bytes.readUInt32LE(ptr + 20);
    const nameLen = bytes.readUInt16LE(ptr + 28);
    const extraLen = bytes.readUInt16LE(ptr + 30);
    const commentLen = bytes.readUInt16LE(ptr + 32);
    const localOffset = bytes.readUInt32LE(ptr + 42);
    const name = bytes.subarray(ptr + 46, ptr + 46 + nameLen).toString('utf8');
    const localNameLen = bytes.readUInt16LE(localOffset + 26);
    const localExtraLen = bytes.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLen + localExtraLen;
    const raw = bytes.subarray(start, start + compressedSize);
    const content = method === 0 ? Buffer.from(raw) : inflateRawSync(raw);
    entries.push({ name, content });
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** Unambiguous live-credential shapes; fixture/placeholder hits are filtered. */
const SECRET_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'AWS access key id', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'GitHub token (classic)', re: /ghp_[A-Za-z0-9]{30,}/ },
  { name: 'GitHub fine-grained PAT', re: /github_pat_[A-Za-z0-9_]{20,}/ },
  { name: 'Stripe live key', re: /sk_live_[A-Za-z0-9]{10,}/ },
  { name: 'Slack token', re: /xox[abp]-[A-Za-z0-9-]{10,}/ },
];
const PLACEHOLDER_SHAPE = /fake|example|placeholder|sentinel|dummy|sample|redact|test|your[_-]|xxx/i;

describe('project archive system', () => {
  it('publishes project archives as .zip only', () => {
    expect(publishedArchives.length).toBeGreaterThan(0);
    for (const entry of publishedArchives) {
      expect(entry.archive.filename, `${entry.name} archive filename`).toMatch(/\.zip$/);
      expect(entry.archive.url, `${entry.name} archive url`).toMatch(/\.zip$/);
    }
  });

  it('never references forbidden archive formats anywhere in site data', () => {
    const serialized = JSON.stringify({ manifest: productManifest, products });
    expect(serialized).not.toMatch(/\.7z/);
    expect(serialized).not.toMatch(/\.rar/);
    expect(serialized).not.toMatch(/\.tar\.gz/);
    expect(serialized).not.toMatch(/\.tgz/);
  });

  it('resolves every published archive reference to a real artifact on disk', () => {
    for (const entry of publishedArchives) {
      const url = entry.archive.url!;
      expect(url.startsWith('/downloads/'), `${entry.name} archive must be site-hosted`).toBe(true);
      const diskPath = new URL(`./public${url}`, repoRoot);
      expect(existsSync(diskPath), `archive must exist: ${url}`).toBe(true);
      expect(statSync(diskPath).size).toBeGreaterThan(10_000);
      expect(statSync(diskPath).size).toBe(entry.archive.sizeBytes);
    }
  });

  it('records a full 64-hexadecimal-character SHA-256 checksum for every archive', () => {
    for (const entry of publishedArchives) {
      expect(entry.archive.sha256, `${entry.name} checksum must be 64 hex chars`).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.archive.sha256).not.toBe('');
    }
  });

  it('verifies each published archive hashes exactly to its manifest checksum', () => {
    for (const entry of publishedArchives) {
      const bytes = readFileSync(new URL(`./public${entry.archive.url}`, repoRoot));
      const actual = createHash('sha256').update(bytes).digest('hex');
      expect(actual, `${entry.name} archive integrity`).toBe(entry.archive.sha256);
    }
  });

  it('excludes sensitive file classes from every published archive', () => {
    for (const entry of publishedArchives) {
      const bytes = readFileSync(new URL(`./public${entry.archive.url}`, repoRoot));
      const names: string[] = [];
      let offset = 0;
      while (offset < bytes.length - 4) {
        const found = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), offset);
        if (found === -1) break;
        const nameLen = bytes.readUInt16LE(found + 28);
        const extraLen = bytes.readUInt16LE(found + 30);
        const commentLen = bytes.readUInt16LE(found + 32);
        names.push(bytes.subarray(found + 46, found + 46 + nameLen).toString('utf8'));
        offset = found + 46 + nameLen + extraLen + commentLen;
      }
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) {
        expect(name, `no .git entries in ${entry.name} archive`).not.toMatch(/(^|\/)\.git(\/|$)/);
        expect(name, `no node_modules in ${entry.name} archive`).not.toMatch(/(^|\/)node_modules(\/|$)/);
        expect(name, `no .env in ${entry.name} archive`).not.toMatch(/(^|\/)\.env(\.|$)/);
        expect(name, `no key material in ${entry.name} archive`).not.toMatch(/\.(pem|key|pfx|p12)$/i);
        expect(name, `no databases in ${entry.name} archive`).not.toMatch(/\.(db|sqlite|sqlite3)$/i);
        expect(name, `no cert bundles in ${entry.name} archive`).not.toMatch(/(^|\/)certs(\/|$)/);
      }
    }
  });

  it('keeps the archive manifest consistent', () => {
    const filenames = publishedArchives.map((entry) => entry.archive.filename);
    expect(new Set(filenames).size).toBe(filenames.length);
    for (const entry of publishedArchives) {
      expect(entry.archive.sourceCommit, `${entry.name} archive must record its source commit`).toMatch(/^[0-9a-f]{40}$/);
      expect(entry.archive.sha256).not.toBe(entry.archive.sourceCommit);
    }
  });

  it('renders the full checksum, copy control, and download on the Releases page', () => {
    expect(forgedPage).toContain('Download ZIP');
    expect(forgedPage).toContain('Copy SHA-256');
    expect(forgedPage).toContain('Archive SHA-256');
    expect(forgedPage).toContain('Source commit');
    expect(forgedPage).toContain('{archive.sha256}');
    // Terminology: a git commit must never be labeled as the file checksum.
    expect(forgedPage).not.toContain('SHA: {');
  });

  it('does not present project archives as executable applications', () => {
    expect(forgedPage).toContain('Project archives are not installers');
    expect(forgedPage).toContain('Source/project snapshot (.zip)');
  });

  it('gives every manifest project an explicit archive status', () => {
    for (const entry of productManifest) {
      expect(['public', 'not-published', 'private', 'not-applicable']).toContain(entry.archive.status);
    }
  });

  it('classifies published archives as public and keeps them unique per project', () => {
    for (const entry of publishedArchives) {
      expect(entry.archive.status, `${entry.name} must be status public`).toBe('public');
      expect(entry.archive.verifiedAt, `${entry.name} must record when it was verified`).toBeTruthy();
    }
    const ids = publishedArchives.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never publishes an archive for a non-public project', () => {
    for (const entry of productManifest) {
      if (entry.archive.status !== 'public') {
        expect(entry.archive.available, `${entry.name} must not publish an archive`).toBe(false);
        expect(entry.archive.url, `${entry.name} must not reference an archive url`).toBeUndefined();
        expect(entry.archive.sha256, `${entry.name} must not reference an archive checksum`).toBeUndefined();
        expect(entry.archive.policy, `${entry.name} must state why it has no archive`).toBeTruthy();
      }
    }
  });

  it('renders the explanatory archive status table for unpublished projects', () => {
    const unpublished = productManifest.filter((entry) => !entry.archive.available);
    expect(unpublished.length).toBeGreaterThan(0);
    expect(forgedPage).toContain('Archive status by project');
    // The reason column is bound to each project's manifest policy record.
    expect(forgedPage).toContain('{item.policy}');
    // No fake download cards for unpublished projects.
    for (const entry of unpublished) {
      expect(entry.archive.filename).toBeUndefined();
      expect(entry.archive.url).toBeUndefined();
    }
  });

  it('opens every published archive as a structurally valid ZIP', () => {
    for (const entry of publishedArchives) {
      const bytes = readFileSync(new URL(`./public${entry.archive.url}`, repoRoot));
      const entries = readZipEntries(bytes);
      expect(entries.length, `${entry.name} archive must contain files`).toBeGreaterThan(0);
      expect(
        entries.some((e) => !e.name.endsWith('/')),
        `${entry.name} archive must contain at least one file`
      ).toBe(true);
    }
  });

  it('scans published archive contents for live credential shapes', () => {
    for (const entry of publishedArchives) {
      const bytes = readFileSync(new URL(`./public${entry.archive.url}`, repoRoot));
      const entries = readZipEntries(bytes);
      for (const { name, content } of entries) {
        const text = content.toString('utf8');
        for (const { name: label, re } of SECRET_PATTERNS) {
          const match = text.match(re);
          if (!match) continue;
          const filtered = PLACEHOLDER_SHAPE.test(match[0]) || /(^|\/)(test|tests|__tests__|fixtures?)(\/|$)/i.test(name);
          expect(filtered, `${entry.name}: ${label} in ${name}`).toBe(true);
        }
      }
    }
  });

  it('binds the Copy SHA-256 button to the full manifest digest', () => {
    for (const entry of publishedArchives) {
      expect(forgedPage).toContain('data-copy-sha={archive.sha256}');
    }
    // The digest is rendered verbatim from the manifest, never abbreviated.
    expect(forgedPage).not.toMatch(/sha\.sha256\.slice|sha\.sha256\.substring|sha\.sha256\.substr/);
  });
});
