/**
 * Centralized CodeForge Commercial Plan Model & Tier Definitions
 *
 * POLICY:
 * - Free Tier is the active, freely available tier ($0/forever) with ForgeZero routing.
 * - Commercial Tiers (Professional, Studio / Teams) are in PREVIEW status.
 * - Provisional prices ($10, $25, etc.) must NEVER be published as live truth.
 * - displayPrice is "Not yet published" and price is null for all unreleased tiers.
 * - checkoutEnabled is false for unreleased tiers (fail-closed boundary).
 */

export type PlanStatus = 'active' | 'preview' | 'deprecated';

export interface CodeForgePlan {
  id: string;
  name: string;
  tagline: string;
  price: number | null;
  displayPrice: string;
  period: string;
  status: PlanStatus;
  checkoutEnabled: boolean;
  targetAudience: string;
  features: string[];
  ctaText: string;
  ctaAction: 'download' | 'preview_notice' | 'checkout';
  ctaHref?: string;
  badge?: string;
  highlight?: boolean;
}

export const codeForgePlans: CodeForgePlan[] = [
  {
    id: 'free',
    name: 'CodeForge Free',
    tagline: 'Free-first autonomous software engineering with ForgeZero guarantee.',
    price: 0,
    displayPrice: '$0',
    period: 'forever',
    status: 'active',
    checkoutEnabled: true,
    targetAudience: 'Independent developers, open-source contributors, and local-first workflows',
    features: [
      'ForgeZero zero-cost cloud routing guarantee (never bills your card)',
      'Autonomous repository inspection and automated planning',
      'Controlled file editing, linting, and automated verification loops',
      'Local CLI and VS Code extension integration',
      'Public GitHub release downloads and community issue tracking',
    ],
    ctaText: 'Download Free Build',
    ctaAction: 'download',
    ctaHref: 'https://github.com/Forger-Digital-Solutions/CodeForge/releases/latest',
    badge: 'Active & Free',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'CodeForge Professional',
    tagline: 'High-throughput autonomous engineering with multi-model routing.',
    price: null,
    displayPrice: 'Not yet published',
    period: 'commercial license',
    status: 'preview',
    checkoutEnabled: false,
    targetAudience: 'Professional engineers requiring expanded concurrency and commercial licensing',
    features: [
      'Includes all capabilities of CodeForge Free',
      'Multi-engine cloud model routing options',
      'Priority concurrency and parallel batch task execution',
      'Commercial workstation deployment rights',
      'Cryptographically signed desktop entitlement keys',
      'Direct FDS technical engineering escalation channel',
    ],
    ctaText: 'Preview Only // Private Verification',
    ctaAction: 'preview_notice',
    badge: 'Commercial Preview',
    highlight: true,
  },
  {
    id: 'studio',
    name: 'CodeForge Studio / Teams',
    tagline: 'Multi-seat engineering suites with unified architectural guardrails.',
    price: null,
    displayPrice: 'Not yet published',
    period: 'team license',
    status: 'preview',
    checkoutEnabled: false,
    targetAudience: 'Engineering teams, studios, and distributed technical agencies',
    features: [
      'Includes everything in CodeForge Professional',
      'Multi-seat centralized license management',
      'Shared architecture styleguides and lint harnesses',
      'Role-based access controls and team workspace policies',
      'Direct priority engineering and custom model integration review',
    ],
    ctaText: 'Preview Only // Private Verification',
    ctaAction: 'preview_notice',
    badge: 'Commercial Preview',
    highlight: false,
  },
];

export function getPlanById(id: string): CodeForgePlan | undefined {
  return codeForgePlans.find((p) => p.id === id);
}

export function isPlanCheckoutActive(planId: string): boolean {
  const plan = getPlanById(planId);
  return Boolean(plan && plan.status === 'active' && plan.checkoutEnabled && plan.price !== null && plan.price > 0);
}
