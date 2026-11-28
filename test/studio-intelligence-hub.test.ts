import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getRegistryEntry, studioIntelligenceHubData } from '../src/data/registry';
import { getPilotBookingDestination, getPilotMailtoHref } from '../src/lib/booking';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

function walkFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, acc);
    else if (/\.(astro|ts|js|mjs|json|css)$/i.test(name)) acc.push(full);
  }
  return acc;
}

describe('Phase III-C — FDS Studio Intelligence Hub Governance & Commercial Integrity', () => {
  it('registers Studio Intelligence Hub in the public status registry with honest pilot non-claims', () => {
    const entry = getRegistryEntry('studio-intelligence-hub');
    expect(entry.approved_for_publication).toBe(true);
    expect(entry.route).toBe('/solutions/studio-intelligence-hub/');
    expect(entry.flagship).toBe(true);
    expect(entry.non_claims.join(' ')).toMatch(/SaaS|Blueprint|SOC 2/i);
  });

  it('ships dual-width WebP assets for Studio Intelligence Hub', () => {
    expect(existsSync(join(repoRoot, 'public/images/forge/studio-intelligence-hub.webp'))).toBe(true);
    expect(existsSync(join(repoRoot, 'public/images/forge/studio-intelligence-hub-sm.webp'))).toBe(true);
  });

  it('includes all required Phase III-C sections, 6 architecture stages, 4 pilot weeks, 7 security controls, and honest Blueprint limits', () => {
    expect(studioIntelligenceHubData.architecture.stages).toHaveLength(6);
    expect(studioIntelligenceHubData.exampleQuestions).toHaveLength(5);
    expect(studioIntelligenceHubData.supportedEngines.map((e) => e.id)).toEqual([
      'roblox-studio',
      'unreal-engine',
    ]);
    expect(studioIntelligenceHubData.pilotWeeks).toHaveLength(4);
    expect(studioIntelligenceHubData.securityControls).toHaveLength(7);
    expect(studioIntelligenceHubData.faqs.length).toBeGreaterThanOrEqual(6);

    const unreal = studioIntelligenceHubData.supportedEngines.find((e) => e.id === 'unreal-engine')!;
    expect(unreal.honestyBoundary).toMatch(/Blueprint/i);
    expect(unreal.honestyBoundary).toMatch(/NOT been implemented|excluded/i);
  });

  it('never publishes internal pilot prices anywhere in public content, config, pages, or components', () => {
    const files = [
      ...walkFiles(join(repoRoot, 'content')),
      ...walkFiles(join(repoRoot, 'src/pages')),
      ...walkFiles(join(repoRoot, 'src/components')),
      ...walkFiles(join(repoRoot, 'src/config')),
      ...walkFiles(join(repoRoot, 'src/data')),
    ];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(text, `Internal pilot price leaked in ${file}`).not.toMatch(
        /\$(?:1,500|750|2,500|1,250|3,500|1,750)\b/
      );
    }
  });

  it('resolves verified booking destinations and direct email fallback without fabricating calendar URLs', () => {
    const pilotDest = getPilotBookingDestination('pilot');
    const foundingDest = getPilotBookingDestination('founding');
    expect(pilotDest.href.length).toBeGreaterThan(0);
    expect(foundingDest.href.length).toBeGreaterThan(0);
    if (pilotDest.external) {
      expect(pilotDest.href).toMatch(/^https:\/\/(?:[a-z0-9-]+\.)?(?:cal\.com|calendly\.com)\//i);
    } else {
      expect(pilotDest.href).toBe('/contact/?track=studio-intelligence-hub');
      expect(foundingDest.href).toBe('/contact/?track=founding-studio');
    }
    const mailto = getPilotMailtoHref('pilot');
    expect(mailto).toContain('mailto:forgerdigisolsupport@gmail.com');
    expect(mailto).toContain('Studio%20Intelligence%20Hub');
  });

  it('enforces honest in-testing pilot scope, in-development engine references, and read-only-by-design repository wording', () => {
    const boundaries = studioIntelligenceHubData.architecture.pilotScopeVsDeveloping;
    expect(boundaries.pilotScopeTitle).toBe(
      "Pilot scope — in testing on FDS's own Roblox and Unreal projects"
    );
    expect(boundaries.pilotScopeItems.join(' ')).not.toMatch(/scoped engine ref/i);
    expect(boundaries.developingItems.join(' ')).toMatch(/scoped engine references.*in development/i);

    const noRepoMods = studioIntelligenceHubData.securityControls.find((c) => c.code === '04')!;
    expect(noRepoMods.detail).toBe('Cannot modify your repository — read-only by design.');

    const hubFiles = [
      join(repoRoot, 'content/solutions/studio-intelligence-hub.json'),
      join(repoRoot, 'src/components/HubArchitectureFlow.astro'),
      join(repoRoot, 'src/components/HubInvestigationPreview.astro'),
      join(repoRoot, 'src/pages/solutions/studio-intelligence-hub/index.astro'),
    ];
    for (const file of hubFiles) {
      const text = readFileSync(file, 'utf8');
      expect(text, `Stale "verified" capability label in ${file}`).not.toMatch(
        /Included\s*(?:&|and)\s*Verified|Verified for Pilot Scoping|pilotScope.*Verified/i
      );
      expect(text, `Forbidden overclaim wording in ${file}`).not.toMatch(
        /\b(?:guarantee(?:s|d)?|production-proven|proven|without explicit developer action)\b/i
      );
      // Allow import/symbol name `hasVerifiedBookingUrl` in landing page frontmatter, but no "verified" in rendered Hub copy
      const textWithoutBookingImport = text.replace(/\bhasVerifiedBookingUrl\b/g, '');
      expect(textWithoutBookingImport, `Unexpected "verified" claim for Hub capability in ${file}`).not.toMatch(
        /\bverif(?:y|ied|ication)\b/i
      );
    }
  });
});
