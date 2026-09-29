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
 * Orbit rules — ONE PLANET = ONE ORBIT:
 * - Every node owns exactly one ellipse and no two of them are the same plane:
 *   radii, eccentricity and tilt all differ, so the eight tracks read as an atomic
 *   system of intersecting orbits rather than as concentric rings or shared belts.
 *   Two bodies 180 degrees apart on one ellipse would still be sharing an orbit,
 *   which is why the geometry is per-body and not per-layer.
 * - Every plane has its own period, an exact divisor of the 1080s master cycle,
 *   shortest for the innermost world, so nothing locks into formation and the
 *   system repeats exactly at t = 1080s — one dense sweep certifies all future time.
 * - All eight planes run prograde. Mixed/retrograde layouts were measured and are
 *   deliberately rejected: any counter-rotating plane at these world sizes cost
 *   25-32u of closest-approach margin, and collision safety plus legibility
 *   outrank CW/CCW symmetry.
 * - The eight planes were laid out and verified offline against closest approach
 *   across the whole animated cycle, with every plane kept clear of the nucleus
 *   and inside the scene; see scripts/eco-orbit-solver.cjs.
 * - Motion is pure CSS offset-path and freezes at a configured position under
 *   prefers-reduced-motion.
 * - Identity tags ride on a second motion layer painted UNDER the planets: a tag
 *   that meets a nearer world is occluded by it, a depth cue that reads like a
 *   moon passing behind a planet instead of ink painted over a shell.
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

/**
 * Compass position of a world's tag around its body, and the exact offset that
 * position resolves to. The offsets are data, not markup: scripts/eco-orbit-solver.cjs
 * searches these eight anchors against the full master cycle and writes the winners
 * back here, so a label fix survives every future retune instead of living in a
 * hard-coded transform that collides again.
 */
export type LabelPosition =
  | 'below' | 'below-left' | 'below-right'
  | 'left' | 'right'
  | 'above' | 'above-left' | 'above-right';
export type LabelAnchor = 'start' | 'middle' | 'end';

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
  /**
   * The same label as painted lines. A tag is horizontal at every bearing while its
   * world travels all the way around the nucleus, so the widest line is what decides
   * how far that world can reach before its own label leaves the viewBox. Stacking
   * the three two-word names keeps the canonical wording and halves their span;
   * scripts/eco-orbit-model.cjs certifies the result over the whole master cycle.
   */
  tagLines: string[];
  labelPosition: LabelPosition;
  labelDx: number;
  labelDy: number;
  labelAnchor: LabelAnchor;
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

/**
 * One ellipse per world, ordered inner to outer. `start` is the percentage of the
 * plane's own arc length the body occupies at t=0 — in the animation AND in the
 * prefers-reduced-motion freeze, so the composition that gets verified is the one
 * that gets painted. Retrograde planes run the same keyframes backwards from there.
 */
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

type NodeSpec = Omit<EcosystemNode, 'name' | 'href' | 'category' | 'status' | 'statusLabel' | 'purpose' | 'tagLines'> & {
  manifestId: string;
  tag: string;
  /** Painted lines for `tag`; defaults to the whole tag on a single line. */
  tagLines?: string[];
  hrefOverride?: string;
  purposeOverride?: string;
};

/**
 * Eight worlds, eight planes, listed inner to outer. Nothing here is generated:
 * each ellipse was laid out for the shape of the system it contributes — a compact
 * ground-state orbit, a broad horizontal plane, a tall near-vertical one, shallow
 * and steep diagonals, a wide outer fence — and then verified offline against every
 * other plane for closest approach across the whole animated cycle.
 *
 * All eight run prograde and every period divides the 1080s master cycle, so the
 * full state at t=1080 is bit-identical to t=0 and the offline certificate covers
 * all future time. The counter-rotating alternative was measured and rejected: at
 * this planet size family (33-37u) any retrograde plane cost 25-32u of clearance.
 */
const specs: NodeSpec[] = [
  {
    id: 'codeforge', manifestId: 'codeforge', tag: 'CODEFORGE', group: 'build',
    labelPosition: 'below', labelDx: 8, labelDy: 27, labelAnchor: 'middle',
    icon: 'forged',
    character: ecosystemCharacterMap.forged,
    color: '#5a82e8', glow: '#1f4fd8', size: 34, labelSide: 'left',
    // Ground state: the tightest, roundest plane, closest lap of all.
    orbit: orbit(168, 155, 29, 30, 'normal', 98.333, .5),
  },
  {
    id: 'forgerems', manifestId: 'forgerems', tag: 'FORGEREMS', group: 'build',
    labelPosition: 'below-left', labelDx: -23.8, labelDy: 6.3, labelAnchor: 'end',
    icon: 'systems',
    character: ecosystemCharacterMap.forgerems,
    color: '#e0a63c', glow: '#b06f10', size: 34, labelSide: 'right',
    // The broad horizontal plane: wide sweep, shallow tilt.
    orbit: orbit(242, 202, 6, 45, 'normal', 46.972, .46),
  },
  {
    id: 'gems', manifestId: 'gems', tag: 'GEMS', group: 'intelligence',
    labelPosition: 'below-left', labelDx: -3.2, labelDy: 32.3, labelAnchor: 'end',
    icon: 'intelligence',
    character: ecosystemCharacterMap.intelligence,
    color: '#4f8fff', glow: '#1f63ff', size: 33, labelSide: 'left',
    // Mid field, shallow negative tilt.
    orbit: orbit(208, 167, -12, 36, 'normal', 0, .42),
  },
  {
    id: 'training-grounds', manifestId: 'training-grounds', tag: 'TRAINING GROUNDS', tagLines: ['TRAINING', 'GROUNDS'], group: 'intelligence',
    labelPosition: 'left', labelDx: -45.4, labelDy: -13.4, labelAnchor: 'end',
    icon: 'applications',
    character: ecosystemCharacterMap.applications,
    color: '#38b6e0', glow: '#0f7fae', size: 33, labelSide: 'right',
    // Medium eccentricity on a steep negative diagonal.
    orbit: orbit(264, 228, -66, 54, 'normal', 87.75, .38),
  },
  {
    id: 'kyrablox', manifestId: 'kyrablox', tag: 'KYRABLOX', group: 'create',
    labelPosition: 'below-left', labelDx: -27.8, labelDy: 15.3, labelAnchor: 'end',
    icon: 'gaming',
    character: ecosystemCharacterMap.gaming,
    color: '#b487ff', glow: '#7b3df0', size: 36, labelSide: 'left',
    // Wide plane on the opposing diagonal.
    orbit: orbit(285, 232, 63, 60, 'normal', 46.266, .34),
  },
  {
    id: 'kayla-publisher', manifestId: 'kayla-publisher', tag: 'KAYLA PUBLISHER', tagLines: ['KAYLA', 'PUBLISHER'], group: 'create',
    labelPosition: 'below', labelDx: 24, labelDy: 27.5, labelAnchor: 'middle',
    icon: 'publishing',
    character: ecosystemCharacterMap.publishing,
    color: '#d9813f', glow: '#a34f14', size: 35, labelSide: 'right',
    // Steep negative tilt through the outer middle field.
    orbit: orbit(301, 254, -84, 72, 'normal', 7.5, .31),
  },
  {
    id: 'we-the-people', manifestId: 'we-the-people', tag: 'WE THE PEOPLE', tagLines: ['WE THE', 'PEOPLE'], group: 'knowledge',
    labelPosition: 'below-right', labelDx: 41.9, labelDy: 1.4, labelAnchor: 'start',
    icon: 'civic',
    character: ecosystemCharacterMap.civic,
    color: '#8fa2c0', glow: '#5a6f92', size: 37, labelSide: 'left',
    // The outer fence: slowest world on the widest, near-circular plane.
    orbit: orbit(306, 300, 90, 108, 'normal', 0.095, .28),
  },
  {
    id: 'farmstand-finder', manifestId: 'farmstand-finder', tag: 'FARMSTAND FINDER', tagLines: ['FARMSTAND', 'FINDER'], group: 'knowledge',
    labelPosition: 'below', labelDx: 7, labelDy: 45.5, labelAnchor: 'middle',
    icon: 'foraging',
    character: ecosystemCharacterMap.foraging,
    color: '#76b77d', glow: '#3d8245', size: 37, labelSide: 'right',
    // Second outer plane: a large diagonal crossing the fence at an angle.
    orbit: orbit(318, 263, -37, 90, 'normal', 47.012, .26),
  },
];

const resolveHref = (manifestId: string, hrefOverride?: string): string =>
  hrefOverride ?? manifestById[manifestId]?.projectUrl ?? '/projects';

export const ecosystemNodes: EcosystemNode[] = specs.map((spec) => {
  const entry = manifestById[spec.manifestId];
  if (!entry) throw new Error(`ecosystem node references unknown manifest entry: ${spec.manifestId}`);
  const { manifestId, hrefOverride, purposeOverride, tag, tagLines, ...rest } = spec;
  return {
    ...rest,
    manifestId,
    tag,
    tagLines: tagLines ?? [tag],
    name: entry.name,
    href: resolveHref(manifestId, hrefOverride),
    category: entry.category,
    status: entry.canonicalStatus,
    statusLabel: canonicalStatusLabels[entry.canonicalStatus],
    purpose: purposeOverride ?? entry.oneLineDescription,
  };
});
