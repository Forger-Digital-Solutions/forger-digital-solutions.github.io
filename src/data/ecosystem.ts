import { manifestById, canonicalStatusLabels, type CanonicalStatus, type ProductGroup } from './manifest';

/**
 * FDS ECOSYSTEM 2.0
 *
 * The ecosystem visualizes how FDS works: the FDS core at the center, with the
 * company's projects arranged in four conceptual layers (build, intelligence,
 * create, knowledge). Node facts (name, status, one-line purpose, href) are
 * derived from the canonical product manifest so the map can never contradict
 * the pages it links to.
 *
 * Orbit rules:
 * - Every node owns one unique, fixed ellipse; nodes never drift or bounce.
 * - Inner belts (Build) move faster; outer belts (Knowledge) move slower.
 * - Motion is pure CSS offset-path and freezes at a configured position under
 *   prefers-reduced-motion.
 */

export type EcosystemIcon =
  | 'intelligence'
  | 'forged'
  | 'publishing'
  | 'applications'
  | 'gaming'
  | 'foraging'
  | 'civic'
  | 'systems';

export type LabelSide = 'left' | 'right';

export interface EcosystemOrbit {
  rx: number;
  ry: number;
  rotation: number;
  duration: number;
  direction: 'normal' | 'reverse';
  start: number;
  opacity: number;
  path: string;
}

export interface EcosystemGroup {
  id: ProductGroup;
  name: string;
  short: string;
  blurb: string;
  color: string;
}

export interface EcosystemNode {
  id: string;
  manifestId: string;
  name: string;
  /** Short label rendered under the body on the orbital map. */
  tag: string;
  href: string;
  group: ProductGroup;
  category: string;
  status: CanonicalStatus;
  statusLabel: string;
  purpose: string;
  icon: EcosystemIcon;
  character: string;
  color: string;
  glow: string;
  size: number;
  labelSide: LabelSide;
  orbit: EcosystemOrbit;
}

export const ecosystemCharacterMap: Record<string, string> = {
  intelligence: '/images/ecosystem/8bit/intelligence-8bit.webp',
  forged: '/images/ecosystem/8bit/forged-8bit.webp',
  publishing: '/images/ecosystem/8bit/publishing-8bit.webp',
  applications: '/images/ecosystem/8bit/applications-8bit.webp',
  gaming: '/images/ecosystem/8bit/gaming-8bit.webp',
  foraging: '/images/ecosystem/8bit/foraging-8bit.webp',
  civic: '/images/ecosystem/8bit/civic-8bit.webp',
  systems: '/images/ecosystem/8bit/systems-8bit.webp',
  forgerems: '/images/ecosystem/8bit/forgerems-8bit.webp',
};

const CENTER = 340;
const KAPPA = 0.5522847498;

const round = (value: number) => Number(value.toFixed(2));

export function buildEllipsePath(rx: number, ry: number, rotation: number): string {
  const angle = rotation * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const point = (x: number, y: number) => [
    round(CENTER + x * cos - y * sin),
    round(CENTER + x * sin + y * cos)
  ];
  const p0 = point(rx, 0);
  const c1 = point(rx, KAPPA * ry);
  const c2 = point(KAPPA * rx, ry);
  const p1 = point(0, ry);
  const c3 = point(-KAPPA * rx, ry);
  const c4 = point(-rx, KAPPA * ry);
  const p2 = point(-rx, 0);
  const c5 = point(-rx, -KAPPA * ry);
  const c6 = point(-KAPPA * rx, -ry);
  const p3 = point(0, -ry);
  const c7 = point(KAPPA * rx, -ry);
  const c8 = point(rx, -KAPPA * ry);

  return `M ${p0.join(' ')} C ${c1.join(' ')} ${c2.join(' ')} ${p1.join(' ')} C ${c3.join(' ')} ${c4.join(' ')} ${p2.join(' ')} C ${c5.join(' ')} ${c6.join(' ')} ${p3.join(' ')} C ${c7.join(' ')} ${c8.join(' ')} ${p0.join(' ')} Z`;
}

const orbit = (
  rx: number,
  ry: number,
  rotation: number,
  duration: number,
  direction: EcosystemOrbit['direction'],
  start: number,
  opacity: number
): EcosystemOrbit => ({ rx, ry, rotation, duration, direction, start, opacity, path: buildEllipsePath(rx, ry, rotation) });

/** The four conceptual layers of Ecosystem 2.0, inner to outer. */
export const ecosystemGroups: EcosystemGroup[] = [
  { id: 'build', name: 'Build & Engineering', short: 'BUILD', blurb: 'Software that plans, edits, tests, and repairs.', color: '#5a82e8' },
  { id: 'intelligence', name: 'Intelligence & Research', short: 'INTELLIGENCE', blurb: 'Specialized model research and evaluation.', color: '#4f8fff' },
  { id: 'create', name: 'Create', short: 'CREATE', blurb: 'Tools for game development and publishing.', color: '#b487ff' },
  { id: 'knowledge', name: 'Knowledge & Community', short: 'KNOWLEDGE', blurb: 'Practical information and local discovery.', color: '#61d7a1' },
];

type NodeSpec = Omit<EcosystemNode, 'name' | 'href' | 'category' | 'status' | 'statusLabel' | 'purpose'> & {
  manifestId: string;
  tag: string;
  hrefOverride?: string;
  purposeOverride?: string;
};

const specs: NodeSpec[] = [
  // INNER BELT — BUILD / ENGINEERING (fastest, tightest paths)
  {
    id: 'codeforge', manifestId: 'codeforge', tag: 'CODEFORGE', group: 'build',
    icon: 'forged',
    character: ecosystemCharacterMap.forged,
    color: '#5a82e8', glow: '#1f4fd8', size: 46, labelSide: 'left',
    orbit: orbit(284, 96, -18, 38, 'normal', 30, .5),
  },
  {
    id: 'forgerems', manifestId: 'forgerems', tag: 'FORGEREMS', group: 'build',
    icon: 'systems',
    character: ecosystemCharacterMap.forgerems,
    color: '#e0a63c', glow: '#b06f10', size: 40, labelSide: 'right',
    orbit: orbit(284, 96, -18, 38, 'normal', 80, .5),
  },
  // SECOND BELT — INTELLIGENCE / RESEARCH
  {
    id: 'gems', manifestId: 'gems', tag: 'GEMS', group: 'intelligence',
    icon: 'intelligence',
    character: ecosystemCharacterMap.intelligence,
    color: '#4f8fff', glow: '#1f63ff', size: 44, labelSide: 'left',
    orbit: orbit(206, 232, 52, 56, 'normal', 8, .42),
  },
  {
    id: 'training-grounds', manifestId: 'training-grounds', tag: 'TRAINING GROUNDS', group: 'intelligence',
    icon: 'applications',
    character: ecosystemCharacterMap.applications,
    color: '#38b6e0', glow: '#0f7fae', size: 38, labelSide: 'right',
    orbit: orbit(206, 232, 52, 56, 'normal', 58, .42),
  },
  // THIRD BELT — CREATE
  {
    id: 'kyrablox', manifestId: 'kyrablox', tag: 'KYRABLOX', group: 'create',
    icon: 'gaming',
    character: ecosystemCharacterMap.gaming,
    color: '#b487ff', glow: '#7b3df0', size: 42, labelSide: 'left',
    orbit: orbit(258, 196, -44, 68, 'reverse', 42, .34),
  },
  {
    id: 'kayla-publisher', manifestId: 'kayla-publisher', tag: 'KAYLA', group: 'create',
    icon: 'publishing',
    character: ecosystemCharacterMap.publishing,
    color: '#d9813f', glow: '#a34f14', size: 40, labelSide: 'right',
    orbit: orbit(258, 196, -44, 68, 'reverse', 92, .34),
  },
  // OUTER BELT — KNOWLEDGE / COMMUNITY (slowest, widest paths)
  {
    id: 'we-the-people', manifestId: 'we-the-people', tag: 'WE THE PEOPLE', group: 'knowledge',
    icon: 'civic',
    character: ecosystemCharacterMap.civic,
    color: '#8fa2c0', glow: '#5a6f92', size: 40, labelSide: 'left',
    orbit: orbit(296, 246, 24, 82, 'reverse', 16, .28),
  },
  {
    id: 'farmstand-finder', manifestId: 'farmstand-finder', tag: 'FARMSTAND FINDER', group: 'knowledge',
    icon: 'foraging',
    character: ecosystemCharacterMap.foraging,
    color: '#76b77d', glow: '#3d8245', size: 40, labelSide: 'right',
    orbit: orbit(296, 246, 24, 82, 'reverse', 66, .28),
  },
];

const resolveHref = (manifestId: string, hrefOverride?: string): string =>
  hrefOverride ?? manifestById[manifestId]?.projectUrl ?? '/projects';

export const ecosystemNodes: EcosystemNode[] = specs.map((spec) => {
  const entry = manifestById[spec.manifestId];
  if (!entry) throw new Error(`ecosystem node references unknown manifest entry: ${spec.manifestId}`);
  const { manifestId, hrefOverride, purposeOverride, tag, ...rest } = spec;
  return {
    ...rest,
    manifestId,
    tag,
    name: entry.name,
    href: resolveHref(manifestId, hrefOverride),
    category: entry.category,
    status: entry.canonicalStatus,
    statusLabel: canonicalStatusLabels[entry.canonicalStatus],
    purpose: purposeOverride ?? entry.oneLineDescription,
  };
});
