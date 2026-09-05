import { describe, it, expect } from 'vitest';
import { runDriftCheck, formatActionableDriftMessage } from '../src/data/kayla/drift-detector';
import { getCanonicalKnowledgeVersion } from '../src/data/kayla/canonical-registry';

describe('Kayla Canonical Knowledge Drift Detector', () => {
  it('passes on canonical repository state', () => {
    const report = runDriftCheck();
    if (!report.passed) {
      console.error(report.errors.map(formatActionableDriftMessage).join('\n'));
    }
    expect(report.passed).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.inventory.entities).toBeGreaterThanOrEqual(14);
    expect(report.inventory.projects).toBe(6);
    expect(report.inventory.products).toBe(2);
    expect(report.inventory.gems).toBe(4);
    expect(report.knowledgeVersion).toHaveLength(16);
  });
});
