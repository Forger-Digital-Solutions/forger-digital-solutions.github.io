import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..', 'dist');
const ignoredExtensions = /\.(?:png|jpe?g|gif|webp|ico|woff2?|map)$/i;
const forbidden = [
  [/GITHUB_CLIENT_SECRET/i, 'GitHub OAuth client secret name'],
  [/GITHUB_APP_PRIVATE_KEY/i, 'GitHub App private key name'],
  [/client_secret/i, 'OAuth client secret parameter'],
  [/github_code_verifier/i, 'server-held GitHub PKCE verifier'],
  [/\b(?:gho|ghp|github_pat)_[A-Za-z0-9_]{12,}/, 'GitHub credential-like value'],
  [/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{12,}/, 'Stripe credential-like value'],
];
const findings = [];

function walk(target) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) walk(path.join(target, entry));
    return;
  }
  if (stat.size > 2_000_000 || ignoredExtensions.test(target)) return;
  const content = fs.readFileSync(target, 'utf8');
  for (const [pattern, label] of forbidden) {
    if (pattern.test(content)) findings.push(`${path.relative(root, target)}: ${label}`);
  }
}

walk(root);
if (findings.length) {
  console.error(`CodeForge static auth secret scan failed:\n- ${findings.join('\n- ')}`);
  process.exit(1);
}
console.log('CodeForge static auth secret scan: PASS.');
