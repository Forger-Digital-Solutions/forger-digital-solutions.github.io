import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createServer } from 'vite';

const root = path.resolve(import.meta.dirname, '..');
const vite = await createServer({ root, appType: 'custom', server: { middlewareMode: true }, logLevel: 'silent' });
const failures = [];
try {
  const [{ kaylaKnowledge }, { appAliases }, { products }] = await Promise.all([
    vite.ssrLoadModule('/src/data/kayla/index.ts'), vite.ssrLoadModule('/src/data/kayla/apps/index.ts'), vite.ssrLoadModule('/src/data/products.ts')
  ]);
  const ids = new Set(kaylaKnowledge.apps.map((item) => item.id));
  const relationshipTargets = new Set([...ids, 'forged']);
  const unique = (values, label) => { if (new Set(values).size !== values.length) failures.push(`Duplicate ${label}`); };
  unique(kaylaKnowledge.apps.map((item) => item.id), 'app ID');
  unique(kaylaKnowledge.downloads.map((item) => item.id), 'download ID');
  unique(kaylaKnowledge.releases.map((item) => `${item.appId}:${item.version}`), 'release');
  for (const [alias, id] of Object.entries(appAliases)) if (!alias.trim() || !ids.has(id)) failures.push(`Alias ${alias || '<empty>'} targets unknown app ${id}`);
  for (const relation of kaylaKnowledge.relationships) if (!relationshipTargets.has(relation.from) || !relationshipTargets.has(relation.to)) failures.push(`Broken relationship ${relation.from} -> ${relation.to}`);
  for (const download of kaylaKnowledge.downloads) {
    if (!ids.has(download.appId)) failures.push(`Download ${download.id} targets unknown app`);
    if (download.href.startsWith('/') && !fs.existsSync(path.join(root, 'public', download.href))) failures.push(`Missing local download ${download.href}`);
  }
  const product = products.find((item) => item.slug === 'forgerems');
  const release = kaylaKnowledge.releases.find((item) => item.appId === 'forgerems');
  const download = kaylaKnowledge.downloads.find((item) => item.appId === 'forgerems');
  if (!product || product.version !== release?.version || product.version !== download?.version || product.downloadUrl !== release?.downloads?.[0] || product.downloadUrl !== download?.href) failures.push('ForgerEMS canonical version/download registries disagree');
  const unsafe = /(?:\.\.[/\\]|file:\/\/|localhost|127\.0\.0\.1|BEGIN PRIVATE KEY|sk-or-[A-Za-z0-9_-]{20,})/i;
  if (unsafe.test(JSON.stringify(kaylaKnowledge))) failures.push('Unsafe or secret-like knowledge reference detected');

  console.log('\nKAYLA KNOWLEDGE INVENTORY');
  console.log('========================================');
  console.log(`Company entries:        ${kaylaKnowledge.company ? 1 : 0}`);
  console.log(`Founder entries:        ${kaylaKnowledge.founder ? 1 : 0}`);
  console.log(`Apps:                   ${kaylaKnowledge.apps.length}`);
  console.log(`ForgerEMS:              ${product?.version || 'MISSING'}`);
  console.log(`Downloads:              ${kaylaKnowledge.downloads.length}`);
  console.log(`Releases:               ${kaylaKnowledge.releases.length}`);
  console.log(`Roadmap items:          ${kaylaKnowledge.roadmap.length}`);
  console.log(`Community/support:      ${kaylaKnowledge.support ? 1 : 0}`);
  console.log(`GitHub repositories:    ${kaylaKnowledge.github.length}`);
  console.log(`Official sites:         ${kaylaKnowledge.sites.length}`);
  console.log(`Product relationships:  ${kaylaKnowledge.relationships.length}`);
  console.log(`FAQs:                   ${kaylaKnowledge.faqs.length}`);
  console.log(`Broken references:      ${failures.length}`);
  console.log('========================================');
  if (failures.length) { failures.forEach(item => console.error(`- ${item}`)); console.log('\nVERDICT: FAIL'); process.exitCode = 1; }
  else console.log('\nVERDICT: PASS');
} finally { await vite.close(); }
