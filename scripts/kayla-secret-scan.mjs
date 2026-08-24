import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const roots = ['src', 'worker', 'scripts', 'test', '.github', 'dist'];
const ignored = new Set(['node_modules', '.git', '.wrangler']);
const findings = [];
function walk(target) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) { for (const name of fs.readdirSync(target)) if (!ignored.has(name)) walk(path.join(target, name)); return; }
  if (stat.size > 2_000_000 || /\.(png|jpg|jpeg|webp|ico|zip|woff2?)$/i.test(target)) return;
  const text = fs.readFileSync(target, 'utf8');
  if (/sk-or-[A-Za-z0-9_-]{20,}/.test(text)) findings.push(`${path.relative(root, target)}: OpenRouter key-like value`);
  if (/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) findings.push(`${path.relative(root, target)}: private key`);
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*KAYLA_API_KEY\s*=\s*(.+)\s*$/);
    if (match && !/^(?:|placeholder|replace-|your-|<)/i.test(match[1].trim())) findings.push(`${path.relative(root, target)}: non-placeholder KAYLA_API_KEY`);
  }
}
roots.forEach(name => walk(path.join(root, name)));
if (findings.length) { console.error(`Secret scan failed:\n- ${findings.join('\n- ')}`); process.exit(1); }
console.log('Kayla secret scan: PASS (source and built client assets).');
