#!/usr/bin/env node
/**
 * Automated Canonical Knowledge Drift & Freshness Validator.
 *
 * Phase 10: Ensures that published website facts, project metadata, statuses,
 * releases, routes, relationships, and Kayla retrieval documents remain
 * perfectly synchronized from one canonical source of truth.
 *
 * Usage:
 *   node scripts/kayla-knowledge-check.mjs
 *   node scripts/kayla-knowledge-check.mjs --matrix
 *   node scripts/kayla-knowledge-check.mjs --json
 */
import path from 'node:path';
import process from 'node:process';
import { createServer } from 'vite';

const root = path.resolve(import.meta.dirname, '..');
const showMatrix = process.argv.includes('--matrix');
const asJson = process.argv.includes('--json');

const vite = await createServer({
  root,
  appType: 'custom',
  server: { middlewareMode: true },
  logLevel: 'silent'
});

try {
  const [{ runDriftCheck, formatActionableDriftMessage }] = await Promise.all([
    vite.ssrLoadModule('/src/data/kayla/drift-detector.ts')
  ]);

  const report = runDriftCheck();

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.passed ? 0 : 1);
  }

  console.log('\nKAYLA CANONICAL KNOWLEDGE DRIFT & FRESHNESS CHECK');
  console.log('========================================================');
  console.log(`Knowledge Version:        ${report.knowledgeVersion}`);
  console.log(`Canonical Entities:       ${report.inventory.entities}`);
  console.log(`Canonical Projects:       ${report.inventory.projects}`);
  console.log(`Canonical Products:       ${report.inventory.products}`);
  console.log(`GEMS Lineages:            ${report.inventory.gems}`);
  console.log(`Recognized Statuses:      ${report.inventory.statuses}`);
  console.log(`Canonical Routes:         ${report.inventory.routes}`);
  console.log(`Semantic Relations:       ${report.inventory.relations}`);
  console.log(`Denied Relations:         ${report.inventory.deniedRelations}`);
  console.log(`Published Releases:       ${report.inventory.releases}`);
  console.log(`Retrieval Documents:      ${report.inventory.retrievalDocs}`);
  console.log(`Canonical External Links: ${report.inventory.externalLinks}`);
  console.log('--------------------------------------------------------');

  // Check categories status
  const hasRouteErrors = report.errors.some((e) => e.code.includes('ROUTE'));
  const hasStatusErrors = report.errors.some((e) => e.code.includes('STATUS'));
  const hasAvailErrors = report.errors.some((e) => e.code.includes('DOWNLOAD') || e.code.includes('AVAIL'));
  const hasReleaseErrors = report.errors.some((e) => e.code.includes('RELEASE') || e.code.includes('VERSION'));
  const hasRelationErrors = report.errors.some((e) => e.code.includes('RELATION'));
  const hasRetrievalErrors = report.errors.some((e) => e.code.includes('RETRIEVAL'));

  console.log(`Route Integrity:          ${hasRouteErrors ? 'FAIL' : 'PASS'}`);
  console.log(`Status Consistency:       ${hasStatusErrors ? 'FAIL' : 'PASS'}`);
  console.log(`Availability Consistency: ${hasAvailErrors ? 'FAIL' : 'PASS'}`);
  console.log(`Release Consistency:      ${hasReleaseErrors ? 'FAIL' : 'PASS'}`);
  console.log(`Relation Integrity:       ${hasRelationErrors ? 'FAIL' : 'PASS'}`);
  console.log(`Retrieval Coverage:       ${hasRetrievalErrors ? 'FAIL' : 'PASS'}`);
  console.log('--------------------------------------------------------');

  if (showMatrix) {
    console.log('\nPUBLIC KNOWLEDGE COVERAGE MATRIX');
    console.log('-----------------------------------------------------------------------------------------------');
    console.log('| Entity ID              | Kind      | Canonical | Retrieval | Source | Action | Status / State       | Downloadable |');
    console.log('|------------------------|-----------|-----------|-----------|--------|--------|----------------------|--------------|');
    for (const item of report.coverageMatrix) {
      const id = item.id.padEnd(22).slice(0, 22);
      const kind = item.kind.padEnd(9).slice(0, 9);
      const canon = item.canonical ? '  YES  ' : '  NO   ';
      const retr = item.retrieval ? '   YES   ' : '   NO    ';
      const src = item.source ? '  YES ' : '  NO  ';
      const act = item.action ? '  YES ' : '  NO  ';
      const status = item.status.padEnd(20).slice(0, 20);
      const dl = item.downloadable ? (item.version ? `YES (${item.version})` : 'YES').padEnd(12) : 'NO          ';
      console.log(`| ${id} | ${kind} | ${canon} | ${retr} | ${src} | ${act} | ${status} | ${dl} |`);
    }
    console.log('-----------------------------------------------------------------------------------------------');
  }

  if (report.errors.length > 0) {
    console.log(`\nDRIFT DETECTED (${report.errors.length} errors):\n`);
    for (const err of report.errors) {
      console.error(formatActionableDriftMessage(err));
      console.error('');
    }
    console.log('VERDICT: FAIL');
    process.exit(1);
  } else {
    console.log(`Active Drift Errors:      0`);
    console.log(`Active Drift Warnings:    ${report.warnings.length}`);
    console.log('========================================================');
    console.log('VERDICT: PASS');
    process.exit(0);
  }
} finally {
  await vite.close();
}
