export type EcosystemIcon = 'brain' | 'forge' | 'kayla' | 'apps' | 'kyra' | 'farm' | 'civic' | 'systems';
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

export interface EcosystemPlanet {
  id: string;
  name: string;
  subtitle: string;
  href: string;
  icon: EcosystemIcon;
  color: string;
  glow: string;
  size: number;
  labelSide: LabelSide;
  orbit: EcosystemOrbit;
}

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

export const ecosystemPlanets: EcosystemPlanet[] = [
  { id: 'intelligence', name: 'INTELLIGENCE', subtitle: 'AI-DRIVEN INSIGHT', href: '/projects/gems-training-grounds', icon: 'brain', color: '#4f8fff', glow: '#1f63ff', size: 44, labelSide: 'left', orbit: orbit(268, 116, -16, 41, 'normal', 58, .5) },
  { id: 'forged', name: 'FORGED', subtitle: 'BUILT TO LAST', href: '/forged', icon: 'forge', color: '#c2d5f4', glow: '#77a8e9', size: 40, labelSide: 'left', orbit: orbit(232, 174, 24, 47, 'reverse', 69, .32) },
  { id: 'kayla', name: 'KAYLA', subtitle: 'AI CO-PILOT', href: '/projects/kayla-ai-publisher', icon: 'kayla', color: '#b473ff', glow: '#7b3df0', size: 46, labelSide: 'right', orbit: orbit(202, 248, 48, 53, 'normal', 79, .42) },
  { id: 'applications', name: 'APPLICATIONS', subtitle: 'REAL-WORLD IMPACT', href: '/projects', icon: 'apps', color: '#61d7a1', glow: '#24a971', size: 45, labelSide: 'right', orbit: orbit(276, 148, 13, 59, 'normal', 1, .42) },
  { id: 'kyra', name: 'KYRA', subtitle: 'AI ARCHITECT', href: '/projects/kyrablox', icon: 'kyra', color: '#48c9f2', glow: '#1594c6', size: 42, labelSide: 'left', orbit: orbit(270, 216, -34, 64, 'reverse', 40, .3) },
  { id: 'farm', name: 'FARM', subtitle: 'NOURISHING FUTURES', href: '/projects/farmstand-finder', icon: 'farm', color: '#a8df64', glow: '#62a833', size: 45, labelSide: 'right', orbit: orbit(236, 270, 68, 69, 'normal', 19, .28) },
  { id: 'civic', name: 'CIVIC', subtitle: 'COMMUNITY FIRST', href: '/projects/we-the-people', icon: 'civic', color: '#f0a052', glow: '#d06b24', size: 43, labelSide: 'right', orbit: orbit(294, 236, 31, 73, 'reverse', 23, .24) },
  { id: 'systems', name: 'SYSTEMS', subtitle: 'FOUNDATION LAYER', href: '/technology', icon: 'systems', color: '#8faee5', glow: '#5178bd', size: 40, labelSide: 'right', orbit: orbit(304, 278, -7, 79, 'normal', 12, .2) }
];
