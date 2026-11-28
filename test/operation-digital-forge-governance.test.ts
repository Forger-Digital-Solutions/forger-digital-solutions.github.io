import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { publicRegistry, flagshipEntries, getRegistryEntry, publicReleasesData } from '../src/data/registry';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

function walkTextFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkTextFiles(full, acc);
    } else if (/\.(astro|ts|js|mjs|json|css|md)$/i.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('Operation Digital Forge — Governance & Truthfulness Guards', () => {
  it('maintains permanent design, brand, and status schema governance files', () => {
    for (const file of [
      'DESIGN.md',
      'BRAND_GUIDELINES.md',
      'docs/FDS_MODEL_STATUS_SCHEMA.json',
      'docs/website-research/FDS_AI_WEBSITE_COMPETITIVE_ANALYSIS.md',
      'content/public-status/registry.json',
    ]) {
      expect(existsSync(join(repoRoot, file)), `${file} must exist`).toBe(true);
    }
  });

  it('registers all seven flagship technologies with approved publication status', () => {
    const flagshipIds = flagshipEntries.map((e) => e.id);
    for (const required of ['alexandrite', 'hackmanite', 'cinnabar', 'jaspilite', 'battleverse', 'project-forge', 'state-lines']) {
      expect(flagshipIds, `${required} must be a flagship registry entry`).toContain(required);
      const entry = getRegistryEntry(required);
      expect(entry.approved_for_publication).toBe(true);
      expect(entry.non_claims.length).toBeGreaterThan(0);
      expect(entry.known_limitations.length).toBeGreaterThan(0);
    }
  });

  it('enforces Hackmanite base model disclosure and Alexandrite non-trained status', () => {
    const alex = getRegistryEntry('alexandrite');
    expect(alex.development_status).toBe('research-vision');
    expect(alex.availability).toBe('not-publicly-available');

    const prime = getRegistryEntry('hackmanite-prime');
    expect(prime.base_architecture).toContain('Qwen/Qwen3.8-27B');

    const reasoning = getRegistryEntry('hackmanite-reasoning');
    expect(reasoning.base_architecture).toContain('openai/gpt-oss-120b');
  });

  it('keeps Cinnabar and Forge BattleVerse explicitly separated and honestly qualified', () => {
    const cinnabar = getRegistryEntry('cinnabar');
    expect(cinnabar.non_claims.join(' ')).toMatch(/video|animation generator/i);

    const battleverse = getRegistryEntry('battleverse');
    expect(battleverse.category).toBe('application');
    expect(battleverse.non_claims.join(' ')).toMatch(/canonical fact|Cinnabar/i);
  });

  it('preserves verified ForgerEMS and CodeForge SHA-256 checksums in releases registry', () => {
    const ems = publicReleasesData.find((r) => r.id === 'forgerems-v1.2.4-preview.1');
    expect(ems).toBeDefined();
    expect(ems!.artifacts.map((a) => a.sha256)).toEqual([
      '61A000203FD3E866C10221856322AD318A38562B5CE9E122626205997373B137',
      'F7C3541860015A533D437CE80B8D0D8B70DD78F0DE9CF47091353C1175B8A9BB',
    ]);

    const cf = publicReleasesData.find((r) => r.id === 'codeforge-v0.2.0');
    expect(cf).toBeDefined();
    expect(cf!.artifacts[0].sha256).toBe('a6e16d0056deebeeb8d8b99f7228f5fed43c380722e97012e45b26d5c6fe3208');
  });

  it('never leaks private Windows paths, personal Drive paths, or fake enterprise certifications', () => {
    const files = [
      ...walkTextFiles(join(repoRoot, 'content')),
      ...walkTextFiles(join(repoRoot, 'src/pages')),
      ...walkTextFiles(join(repoRoot, 'src/components')),
    ];
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      expect(content, `Private path leak in ${file}`).not.toMatch(/Z:\\My Drive|C:\\Users\\Daddy_FDS|D:\\|E:\\|Daddy_FDS/i);
      expect(content, `Unverified certification claim in ${file}`).not.toMatch(/SOC\s*2\s*(Type\s*II|certified|compliant)|ISO\s*27001\s*certified|HIPAA\s*compliant/i);
    }
    expect(publicRegistry.length).toBeGreaterThanOrEqual(12);
  });
});
