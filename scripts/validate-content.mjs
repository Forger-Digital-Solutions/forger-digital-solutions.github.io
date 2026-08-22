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

if (errors.length) {
  console.error(`\n✗ Content validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ Content valid: ${projectSlugs.length} projects, ${noteFiles.length} notes.`);
