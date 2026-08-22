import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve('src/data/certifications.ts');
const source = readFileSync(sourcePath, 'utf8');
const pdfReferences = [...source.matchAll(/pdf:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
const missing = pdfReferences.filter((reference) => !reference.startsWith('/certifications/') || !existsSync(resolve(`public${reference}`)));

if (missing.length) {
  console.error('Certification validation failed. Missing or invalid public PDF references:');
  missing.forEach((reference) => console.error(`  - ${reference}`));
  process.exit(1);
}

console.log(`Certification validation passed (${pdfReferences.length} public PDF reference${pdfReferences.length === 1 ? '' : 's'} checked).`);
