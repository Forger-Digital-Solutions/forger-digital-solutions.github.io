import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { codeForgePlans, getPlanById, isPlanCheckoutActive } from '../src/data/codeforge-plans';

const upgradePage = readFileSync(new URL('../src/pages/codeforge/upgrade.astro', import.meta.url), 'utf8');
const astroConfig = readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');

describe('CodeForge Commerce & Upgrade Architecture', () => {
  it('enforces free-first model and fail-closed commercial tier states', () => {
    const freePlan = getPlanById('free');
    expect(freePlan).toBeDefined();
    expect(freePlan?.price).toBe(0);
    expect(freePlan?.displayPrice).toBe('$0');
    expect(freePlan?.status).toBe('active');
    expect(freePlan?.checkoutEnabled).toBe(true);
    expect(freePlan?.ctaAction).toBe('download');
    expect(isPlanCheckoutActive('free')).toBe(false); // $0 does not invoke checkout

    const expandedPlan = getPlanById('expanded');
    expect(expandedPlan).toBeDefined();
    expect(expandedPlan?.price).toBeNull();
    expect(expandedPlan?.displayPrice).toBe('Not yet published');
    expect(expandedPlan?.status).toBe('in-development');
    expect(expandedPlan?.checkoutEnabled).toBe(false);
    expect(expandedPlan?.ctaAction).toBe('in_development_notice');
    expect(isPlanCheckoutActive('expanded')).toBe(false);
  });

  it('keeps the commercial presentation intentionally simple (no obsolete plan taxonomy)', () => {
    const serialized = JSON.stringify(codeForgePlans);
    // The obsolete plan architecture must not return.
    expect(serialized).not.toContain('Professional');
    expect(serialized).not.toContain('Studio');
    expect(serialized).not.toContain('entitlement');
    expect(serialized).not.toContain('commercial license');
    // Exactly two public surfaces: the active free tier and the in-development expansion.
    expect(codeForgePlans.map((p) => p.id)).toEqual(['free', 'expanded']);
  });

  it('guarantees no provisional prices ($10 / $25) are published in data models', () => {
    const serialized = JSON.stringify(codeForgePlans);
    expect(serialized).not.toContain('$10');
    expect(serialized).not.toContain('$25');
    expect(serialized).not.toContain('10.00');
    expect(serialized).not.toContain('25.00');
  });

  it('unlisted /codeforge/upgrade route has noindex and sitemap exclusion', () => {
    expect(upgradePage).toContain('noindex={true}');
    expect(upgradePage).toContain('CodeForge Plans & Availability');
    expect(astroConfig).toContain("!page.includes('/codeforge/upgrade')");
  });

  it('publishes no fake checkout states and accepts no payment', () => {
    // The obsolete pretend-checkout flow must not return.
    expect(upgradePage).not.toContain("status === 'success'");
    expect(upgradePage).not.toContain('Checkout Session Received');
    expect(upgradePage).not.toContain('Checkout Session Canceled');
    expect(upgradePage).not.toContain('entitlement');
    expect(upgradePage).not.toContain('signed license key');
    // ForgeZero copy must match the actual fail-closed architecture.
    expect(upgradePage).not.toContain('or local models');
    expect(upgradePage).toContain('no checkout or');
    expect(upgradePage).toContain('payment is active');
  });

  it('includes an informational in-development dialog for commercial inquiries', () => {
    expect(upgradePage).toContain('id="preview-dialog"');
    expect(upgradePage).toContain('Expanded plans are in development');
    expect(upgradePage).toContain('commercial-inquiry-link');
  });
});
