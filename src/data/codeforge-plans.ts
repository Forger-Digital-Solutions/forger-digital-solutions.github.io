/**
 * CodeForge Commercial Plan Model
 *
 * POLICY:
 * - CodeForge Free is the active, freely available tier ($0/forever) with
 *   ForgeZero fail-closed zero-cost routing.
 * - Expanded commercial plans are IN DEVELOPMENT. Until final tiers are
 *   approved, the public presentation stays intentionally simple: no plan
 *   names, no prices, no limits, no billing terms, and no checkout.
 * - Provisional prices ($10, $25, etc.) must NEVER be published as live truth.
 * - displayPrice is "Not yet published" and price is null for unreleased tiers.
 * - checkoutEnabled is false for unreleased tiers (fail-closed boundary).
 * - Licensing mechanics (entitlement files, account requirements, enterprise
 *   rights) are NOT described publicly until the commercial architecture ships.
 */

export type PlanStatus = 'active' | 'in-development';

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
  ctaAction: 'download' | 'in_development_notice' | 'checkout';
  ctaHref?: string;
  badge?: string;
  highlight?: boolean;
}

export const codeForgePlans: CodeForgePlan[] = [
  {
    id: 'free',
    name: 'CodeForge Free',
    tagline: 'Free-first autonomous software engineering with ForgeZero zero-cost routing.',
    price: 0,
    displayPrice: '$0',
    period: 'forever',
    status: 'active',
    checkoutEnabled: true,
    targetAudience: 'Independent developers, open-source contributors, and local-first workflows',
    features: [
      'Autonomous repository inspection and automated planning',
      'Controlled file editing, testing, and verification loops',
      'Developer approvals, steering, and execution history',
      'Local CLI and VS Code integration from one core runtime',
      'Dynamic routing across verified zero-cost cloud model providers',
      'Public GitHub release downloads and community issue tracking',
    ],
    ctaText: 'Download Free Build',
    ctaAction: 'download',
    ctaHref: 'https://github.com/Forger-Digital-Solutions/CodeForge/releases/latest',
    badge: 'Available Now',
    highlight: true,
  },
  {
    id: 'expanded',
    name: 'Expanded CodeForge Plans',
    tagline: 'Commercial tiers are in development. Final structure is not published yet.',
    price: null,
    displayPrice: 'Not yet published',
    period: 'not finalized',
    status: 'in-development',
    checkoutEnabled: false,
    targetAudience: 'Details will be announced when commercial tiers are finalized',
    features: [
      'Expanded model access',
      'GEMS-powered intelligence where it matures',
      'Usage limits and task/runtime allowances',
      'Concurrency options',
      'Advanced engineering features',
      'Premium provider access',
    ],
    ctaText: 'In Development',
    ctaAction: 'in_development_notice',
    badge: 'In Development',
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
