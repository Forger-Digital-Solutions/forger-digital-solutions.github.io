import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve('dist');
const pages = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith('.html')) pages.push(path);
  }
}

walk(root);

let checked = 0;
const broken = [];

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const match of html.matchAll(/\bhref=["']([^"']+)["']/g)) {
    const originalHref = match[1];
    if (!originalHref.startsWith('/') || originalHref.startsWith('//')) continue;

    const href = originalHref.split('#')[0].split('?')[0];
    if (!href) continue;
    checked += 1;

    const path = decodeURIComponent(href).replace(/^\/+/, '');
    const candidates = [join(root, path), join(root, path, 'index.html'), join(root, `${path}.html`)];
    if (!candidates.some(existsSync)) broken.push({ page: relative(root, page), href: originalHref });
  }
}

console.log(`Internal links: ${checked} checked across ${pages.length} pages; ${broken.length} broken.`);
for (const item of broken) console.error(`${item.page}: ${item.href}`);
if (broken.length > 0) process.exitCode = 1;
