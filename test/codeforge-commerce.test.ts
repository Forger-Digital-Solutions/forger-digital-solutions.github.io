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
    expect(isPlanCheckoutActive('free')).toBe(false); // $0 does not invoke Stripe checkout

    const proPlan = getPlanById('pro');
    expect(proPlan).toBeDefined();
    expect(proPlan?.price).toBeNull();
    expect(proPlan?.displayPrice).toBe('Not yet published');
    expect(proPlan?.status).toBe('preview');
    expect(proPlan?.checkoutEnabled).toBe(false);
    expect(proPlan?.ctaAction).toBe('preview_notice');
    expect(isPlanCheckoutActive('pro')).toBe(false);

    const studioPlan = getPlanById('studio');
    expect(studioPlan).toBeDefined();
    expect(studioPlan?.price).toBeNull();
    expect(studioPlan?.displayPrice).toBe('Not yet published');
    expect(studioPlan?.status).toBe('preview');
    expect(studioPlan?.checkoutEnabled).toBe(false);
    expect(studioPlan?.ctaAction).toBe('preview_notice');
    expect(isPlanCheckoutActive('studio')).toBe(false);
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
    expect(upgradePage).toContain('CodeForge Upgrade & Commercial Preview');
    expect(astroConfig).toContain("!page.includes('/codeforge/upgrade')");
  });

  it('handles checkout redirect statuses fail-closed without granting client entitlements', () => {
    expect(upgradePage).toContain("status === 'success'");
    expect(upgradePage).toContain("status === 'canceled'");
    expect(upgradePage).toContain('status-banner-success');
    expect(upgradePage).toContain('status-banner-canceled');
    expect(upgradePage).toContain('Checkout Session Received — Verification In Progress');
    expect(upgradePage).toContain('desktop entitlements are never self-asserted or granted client-side');
    expect(upgradePage).toContain('Checkout Session Canceled');
  });

  it('includes interactive preview dialog for commercial inquiries', () => {
    expect(upgradePage).toContain('id="preview-dialog"');
    expect(upgradePage).toContain('Private Verification in Progress');
    expect(upgradePage).toContain('commercial-inquiry-link');
  });
});
