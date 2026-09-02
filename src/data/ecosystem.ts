export type EcosystemIcon = 'brain' | 'forge' | 'publishing' | 'apps' | 'gaming' | 'foraging' | 'civic' | 'systems';
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

/**
 * FDS Ecosystem Planets
 * 
 * Orbits are intentionally designed with varied geometries:
 * - Different rx/ry ratios create varied eccentricities
 * - Different rotations create diagonal, horizontal, and vertical paths
 * - Varied durations create natural orbital speed differences
 * - Inner orbits move faster, outer orbits move slower
 * - No paths spend significant portions overlapping near the center
 */
export const ecosystemPlanets: EcosystemPlanet[] = [
  // INNER ORBIT BELT - Faster, tighter paths around the core
  { 
    id: 'intelligence', 
    name: 'INTELLIGENCE', 
    subtitle: 'AI-DRIVEN INSIGHT', 
    href: '/projects/gems-training-grounds', 
    icon: 'brain', 
    color: '#4f8fff', 
    glow: '#1f63ff', 
    size: 42, 
    labelSide: 'left', 
    // Long horizontal ellipse (most stretched), fastest inner orbit
    orbit: orbit(295, 98, -18, 38, 'normal', 52, .48) 
  },
  { 
    id: 'forged', 
    name: 'FORGED', 
    subtitle: 'PUBLIC SOFTWARE',
    href: '/forged', 
    icon: 'forge', 
    color: '#c2d5f4', 
    glow: '#77a8e9', 
    size: 40, 
    labelSide: 'left', 
    // Short vertical ellipse, tilted counter-clockwise
    orbit: orbit(128, 198, -72, 44, 'reverse', 78, .36) 
  },
  
  // MIDDLE ORBIT BELT - Medium eccentricity, varied orientations
  { 
    id: 'publishing', 
    name: 'PUBLISHING', 
    subtitle: 'CREATIVE MEDIA', 
    href: '/projects/kayla-ai-publisher', 
    icon: 'publishing', 
    color: '#b473ff', 
    glow: '#7b3df0', 
    size: 44, 
    labelSide: 'right', 
    // Tall diagonal ellipse, medium-fast
    orbit: orbit(168, 262, 55, 56, 'normal', 12, .42) 
  },
  { 
    id: 'applications', 
    name: 'APPLICATIONS', 
    subtitle: 'REAL-WORLD IMPACT', 
    href: '/projects', 
    icon: 'apps', 
    color: '#61d7a1', 
    glow: '#24a971', 
    size: 45, 
    labelSide: 'right', 
    // Wide horizontal path, different tilt from intelligence
    orbit: orbit(285, 135, 8, 62, 'normal', 88, .40) 
  },
  
  // OUTER ORBIT BELT - Longer, slower, more eccentric paths
  { 
    id: 'gaming', 
    name: 'GAMING', 
    subtitle: 'GAME ENGINES', 
    href: '/projects/kyrablox', 
    icon: 'gaming', 
    color: '#48c9f2', 
    glow: '#1594c6', 
    size: 43, 
    labelSide: 'left', 
    // Extreme diagonal ellipse reaching far corners
    orbit: orbit(262, 188, -48, 68, 'reverse', 35, .32) 
  },
  { 
    id: 'foraging', 
    name: 'FORAGING', 
    subtitle: 'LOCAL DISCOVERY', 
    href: '/projects/farmstand-finder', 
    icon: 'foraging', 
    color: '#a8df64', 
    glow: '#62a833', 
    size: 45, 
    labelSide: 'right', 
    // Very tall vertical ellipse, reaches high and low
    orbit: orbit(142, 285, 72, 74, 'normal', 25, .30) 
  },
  { 
    id: 'civic', 
    name: 'CIVIC', 
    subtitle: 'COMMUNITY FIRST', 
    href: '/projects/we-the-people', 
    icon: 'civic', 
    color: '#f0a052', 
    glow: '#d06b24', 
    size: 43, 
    labelSide: 'right', 
    // Large wide ellipse, slower outer orbit
    orbit: orbit(305, 198, 22, 82, 'reverse', 68, .26) 
  },
  { 
    id: 'systems', 
    name: 'SYSTEMS', 
    subtitle: 'FOUNDATION LAYER', 
    href: '/technology', 
    icon: 'systems', 
    color: '#8faee5', 
    glow: '#5178bd', 
    size: 40, 
    labelSide: 'right', 
    // Largest outermost orbit, slowest movement
    orbit: orbit(308, 252, -12, 92, 'normal', 8, .22) 
  }
];
