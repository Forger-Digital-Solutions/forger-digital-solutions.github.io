import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('../../EmojiPack/8bit/tools/node_modules/sharp');
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const outDir = resolve('public/images/ecosystem/8bit');
const qaDir = resolve('.visual-audit');
mkdirSync(outDir, { recursive: true });
mkdirSync(qaDir, { recursive: true });

const MASTERS_DIR = resolve('../EmojiPack/8bit');

// Common SVG glow filter definition
const SVG_DEFS = `
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur1" />
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
      <feMerge>
        <feMergeNode in="blur1" />
        <feMergeNode in="blur2" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
`;

/**
 * 1. INTELLIGENCE — GEMS / Training Grounds
 * Four-GEM diamond cluster (Topaz, Sapphire, Peridot, Garnet) with learning ring & neural arcs
 */
function getIntelligenceSvg() {
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    ${SVG_DEFS}
    <!-- Neural learning path / evidence orbit -->
    <ellipse cx="512" cy="512" rx="420" ry="240" fill="none" stroke="#60a5fa" stroke-width="4" stroke-dasharray="14 18" opacity="0.55" transform="rotate(-18 512 512)" filter="url(#softGlow)" />
    <ellipse cx="512" cy="512" rx="420" ry="240" fill="none" stroke="#93c5fd" stroke-width="2" stroke-dasharray="8 26" opacity="0.75" transform="rotate(24 512 512)" />

    <!-- Neural connection lines to gems -->
    <path d="M 512 165 L 835 440 M 835 440 L 512 850 M 512 850 L 185 440 M 185 440 L 512 165" fill="none" stroke="#38bdf8" stroke-width="3" stroke-dasharray="6 10" opacity="0.4" />

    <!-- TOPAZ GEM (Top - Amber / Gold) -->
    <g transform="translate(512, 160)" filter="url(#glow)">
      <!-- Octahedron crystal -->
      <polygon points="0,-48 36,0 0,48 -36,0" fill="#f59e0b" stroke="#fde68a" stroke-width="3.5" />
      <polygon points="0,-48 36,0 0,16 -36,0" fill="#fbbf24" opacity="0.85" />
      <polygon points="0,-48 0,48 -36,0" fill="#d97706" opacity="0.6" />
      <circle cx="0" cy="0" r="6" fill="#fff" opacity="0.9" />
    </g>

    <!-- SAPPHIRE GEM (Right - Royal Blue) -->
    <g transform="translate(835, 440)" filter="url(#glow)">
      <polygon points="0,-44 38,0 0,44 -38,0" fill="#2563eb" stroke="#93c5fd" stroke-width="3.5" />
      <polygon points="0,-44 38,0 0,14 -38,0" fill="#3b82f6" opacity="0.85" />
      <polygon points="0,-44 0,44 -38,0" fill="#1d4ed8" opacity="0.6" />
      <circle cx="0" cy="0" r="5.5" fill="#fff" opacity="0.9" />
    </g>

    <!-- GARNET GEM (Bottom - Ruby Red) -->
    <g transform="translate(512, 850)" filter="url(#glow)">
      <polygon points="0,-44 36,0 0,44 -36,0" fill="#dc2626" stroke="#fca5a5" stroke-width="3.5" />
      <polygon points="0,-44 36,0 0,14 -36,0" fill="#ef4444" opacity="0.85" />
      <polygon points="0,-44 0,44 -36,0" fill="#b91c1c" opacity="0.6" />
      <circle cx="0" cy="0" r="5.5" fill="#fff" opacity="0.9" />
    </g>

    <!-- PERIDOT GEM (Left - Lime Green) -->
    <g transform="translate(185, 440)" filter="url(#glow)">
      <polygon points="0,-44 36,0 0,44 -36,0" fill="#65a30d" stroke="#d9f99d" stroke-width="3.5" />
      <polygon points="0,-44 36,0 0,14 -36,0" fill="#84cc16" opacity="0.85" />
      <polygon points="0,-44 0,44 -36,0" fill="#4d7c0f" opacity="0.6" />
      <circle cx="0" cy="0" r="5.5" fill="#fff" opacity="0.9" />
    </g>

    <!-- Floating data insight nodes -->
    <circle cx="680" cy="260" r="6" fill="#38bdf8" filter="url(#glow)" />
    <circle cx="340" cy="270" r="5" fill="#a78bfa" filter="url(#glow)" />
    <circle cx="720" cy="720" r="5.5" fill="#fde047" filter="url(#glow)" />
    <circle cx="300" cy="710" r="6" fill="#4ade80" filter="url(#glow)" />
  </svg>`;
}

/**
 * 2. GAMING — KyraBlox
 * Assembling geometric 3D isometric world voxel blocks with holographic grid & build nodes
 */
function getGamingSvg() {
  // Isometric cube helper: takes center (x,y), size s, colors for top, left, right faces
  const cube = (x, y, s, cTop, cLeft, cRight, stroke = '#e0f2fe') => {
    const dx = s * 0.866;
    const dy = s * 0.5;
    return `
      <g filter="url(#glow)">
        <!-- Top Face -->
        <polygon points="${x},${y - s} ${x + dx},${y - dy} ${x},${y} ${x - dx},${y - dy}" fill="${cTop}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round" />
        <!-- Left Face -->
        <polygon points="${x - dx},${y - dy} ${x},${y} ${x},${y + s} ${x - dx},${y + dy}" fill="${cLeft}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round" />
        <!-- Right Face -->
        <polygon points="${x + dx},${y - dy} ${x},${y} ${x},${y + s} ${x + dx},${y + dy}" fill="${cRight}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round" />
      </g>
    `;
  };

  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    ${SVG_DEFS}
    <!-- Holographic build grid / blueprint plane beneath character -->
    <g opacity="0.65" filter="url(#softGlow)">
      <ellipse cx="512" cy="830" rx="360" ry="120" fill="none" stroke="#0ea5e9" stroke-width="3.5" />
      <ellipse cx="512" cy="830" rx="260" ry="85" fill="none" stroke="#a855f7" stroke-width="2.5" stroke-dasharray="8 12" />
      <line x1="200" y1="830" x2="824" y2="830" stroke="#38bdf8" stroke-width="2" opacity="0.6" />
      <line x1="512" y1="710" x2="512" y2="950" stroke="#38bdf8" stroke-width="2" opacity="0.6" />
    </g>

    <!-- Assembled KyraBlox World Blocks (stacked in front) -->
    <!-- Base block 1 (Cyan) -->
    ${cube(370, 810, 56, '#38bdf8', '#0284c7', '#0369a1', '#e0f2fe')}
    <!-- Base block 2 (Purple) -->
    ${cube(468, 866, 56, '#c084fc', '#9333ea', '#7e22ce', '#f3e8ff')}
    <!-- Base block 3 (Cyan) -->
    ${cube(566, 810, 56, '#38bdf8', '#0284c7', '#0369a1', '#e0f2fe')}
    <!-- Top world block (Floating KyraBlox core world cube) -->
    ${cube(468, 754, 62, '#e879f9', '#a855f7', '#6b21a8', '#fdf4ff')}

    <!-- Floating world build block being placed -->
    ${cube(780, 480, 46, '#38bdf8', '#0284c7', '#0369a1', '#bae6fd')}
    ${cube(240, 520, 42, '#c084fc', '#9333ea', '#7e22ce', '#f3e8ff')}

    <!-- Holographic coordinate sparks / placement markers -->
    <circle cx="780" cy="400" r="5" fill="#38bdf8" filter="url(#glow)" />
    <circle cx="468" cy="670" r="6" fill="#f472b6" filter="url(#glow)" />
    <line x1="468" y1="680" x2="468" y2="720" stroke="#f472b6" stroke-width="3" stroke-dasharray="4 4" />
  </svg>`;
}

/**
 * 3. PUBLISHING — Kayla AI Publisher
 * Continuous manuscript sheets threaded together by a single flowing editorial ribbon with glowing stylus
 */
function getPublishingSvg() {
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    ${SVG_DEFS}
    <!-- Manuscript sheet 1 (Left background) -->
    <g transform="translate(160, 420) rotate(-14)" filter="url(#softGlow)">
      <rect x="0" y="0" width="140" height="180" rx="8" fill="#1e1b4b" stroke="#c084fc" stroke-width="3.5" opacity="0.9" />
      <line x1="22" y1="36" x2="118" y2="36" stroke="#e9d5ff" stroke-width="4" stroke-linecap="round" opacity="0.8" />
      <line x1="22" y1="60" x2="118" y2="60" stroke="#e9d5ff" stroke-width="3" stroke-linecap="round" opacity="0.6" />
      <line x1="22" y1="84" x2="95" y2="84" stroke="#e9d5ff" stroke-width="3" stroke-linecap="round" opacity="0.6" />
      <line x1="22" y1="108" x2="110" y2="108" stroke="#e9d5ff" stroke-width="3" stroke-linecap="round" opacity="0.6" />
      <line x1="22" y1="132" x2="70" y2="132" stroke="#e9d5ff" stroke-width="3" stroke-linecap="round" opacity="0.6" />
    </g>

    <!-- Manuscript sheet 2 (Right background) -->
    <g transform="translate(720, 410) rotate(16)" filter="url(#softGlow)">
      <rect x="0" y="0" width="140" height="180" rx="8" fill="#2e1065" stroke="#f59e0b" stroke-width="3.5" opacity="0.9" />
      <line x1="22" y1="36" x2="118" y2="36" stroke="#fed7aa" stroke-width="4" stroke-linecap="round" opacity="0.8" />
      <line x1="22" y1="60" x2="118" y2="60" stroke="#fed7aa" stroke-width="3" stroke-linecap="round" opacity="0.6" />
      <line x1="22" y1="84" x2="105" y2="84" stroke="#fed7aa" stroke-width="3" stroke-linecap="round" opacity="0.6" />
      <line x1="22" y1="108" x2="85" y2="108" stroke="#fed7aa" stroke-width="3" stroke-linecap="round" opacity="0.6" />
      <line x1="22" y1="132" x2="114" y2="132" stroke="#fed7aa" stroke-width="3" stroke-linecap="round" opacity="0.6" />
    </g>

    <!-- Active center manuscript tablet (In front of 8-Bit) -->
    <g transform="translate(362, 720) rotate(-4)" filter="url(#glow)">
      <rect x="0" y="0" width="300" height="190" rx="12" fill="#18181b" stroke="#f59e0b" stroke-width="4.5" />
      <rect x="12" y="12" width="276" height="166" rx="8" fill="#27272a" opacity="0.85" />
      <!-- Golden chapter heading -->
      <line x1="36" y1="44" x2="180" y2="44" stroke="#fbbf24" stroke-width="6" stroke-linecap="round" />
      <!-- Connected paragraphs -->
      <line x1="36" y1="72" x2="260" y2="72" stroke="#e4e4e7" stroke-width="4" stroke-linecap="round" opacity="0.75" />
      <line x1="36" y1="96" x2="250" y2="96" stroke="#e4e4e7" stroke-width="4" stroke-linecap="round" opacity="0.75" />
      <line x1="36" y1="120" x2="230" y2="120" stroke="#e4e4e7" stroke-width="4" stroke-linecap="round" opacity="0.75" />
      <line x1="36" y1="144" x2="140" y2="144" stroke="#fbbf24" stroke-width="4" stroke-linecap="round" opacity="0.9" />
    </g>

    <!-- THE CONTINUOUS EDITORIAL RIBBON / THREAD -->
    <!-- Weaves from left sheet, through center, over the pages, to the right sheet -->
    <path d="M 230 520 C 310 590 320 680 430 750 C 520 800 580 730 650 760 C 720 790 750 620 790 510" 
      fill="none" stroke="#f59e0b" stroke-width="7" stroke-linecap="round" filter="url(#glow)" />
    <path d="M 230 520 C 310 590 320 680 430 750 C 520 800 580 730 650 760 C 720 790 750 620 790 510" 
      fill="none" stroke="#fef08a" stroke-width="2.5" stroke-linecap="round" />

    <!-- Editorial spark at pen contact point -->
    <circle cx="560" cy="864" r="8" fill="#fef08a" filter="url(#glow)" />
    <circle cx="560" cy="864" r="4" fill="#ffffff" />
  </svg>`;
}

/**
 * 4. CIVIC — We The People
 * Official neutral charter document with steel-blue verification shield & source-trace lattice
 */
function getCivicSvg() {
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    ${SVG_DEFS}
    <!-- Traceable reference lattice (background nodes) -->
    <g opacity="0.5" stroke="#94a3b8" stroke-width="2.5" stroke-dasharray="6 8">
      <line x1="180" y1="360" x2="320" y2="520" />
      <line x1="844" y1="360" x2="704" y2="520" />
      <line x1="240" y1="780" x2="420" y2="820" />
      <line x1="784" y1="780" x2="604" y2="820" />
    </g>
    <circle cx="180" cy="360" r="7" fill="#60a5fa" filter="url(#softGlow)" />
    <circle cx="844" cy="360" r="7" fill="#60a5fa" filter="url(#softGlow)" />
    <circle cx="240" cy="780" r="6" fill="#94a3b8" />
    <circle cx="784" cy="780" r="6" fill="#94a3b8" />

    <!-- Official Charter / Civic Document (In front of 8-Bit) -->
    <g transform="translate(342, 700)" filter="url(#glow)">
      <!-- Document parchment -->
      <path d="M 0 16 C 0 7 7 0 16 0 L 324 0 C 333 0 340 7 340 16 L 340 214 C 340 223 333 230 324 230 L 16 230 C 7 230 0 223 0 214 Z" 
        fill="#0f172a" stroke="#cbd5e1" stroke-width="4.5" />
      
      <!-- Top header line (official seal bar) -->
      <rect x="24" y="24" width="60" height="24" rx="4" fill="#3b82f6" opacity="0.85" />
      <line x1="100" y1="36" x2="250" y2="36" stroke="#f1f5f9" stroke-width="5" stroke-linecap="round" />

      <!-- Structured civic source rows -->
      <line x1="24" y1="74" x2="316" y2="74" stroke="#94a3b8" stroke-width="3.5" stroke-linecap="round" opacity="0.75" />
      <line x1="24" y1="98" x2="316" y2="98" stroke="#94a3b8" stroke-width="3.5" stroke-linecap="round" opacity="0.75" />
      <line x1="24" y1="122" x2="280" y2="122" stroke="#94a3b8" stroke-width="3.5" stroke-linecap="round" opacity="0.75" />
      <line x1="24" y1="146" x2="300" y2="146" stroke="#94a3b8" stroke-width="3.5" stroke-linecap="round" opacity="0.75" />
      <line x1="24" y1="170" x2="210" y2="170" stroke="#94a3b8" stroke-width="3.5" stroke-linecap="round" opacity="0.75" />
      <line x1="24" y1="194" x2="160" y2="194" stroke="#60a5fa" stroke-width="4" stroke-linecap="round" opacity="0.9" />

      <!-- Verified Shield Stamp (bottom right) -->
      <g transform="translate(260, 150)" filter="url(#glow)">
        <polygon points="28,0 56,12 56,38 28,56 0,38 0,12" fill="#1e293b" stroke="#60a5fa" stroke-width="3.5" />
        <polyline points="14,28 24,38 42,18" fill="none" stroke="#60a5fa" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
      </g>
    </g>
  </svg>`;
}

/**
 * 5. FORAGING — FarmStand Finder
 * Radar discovery rings, green sprout / seasonal produce marker, and geographic target radius
 */
function getForagingSvg() {
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    ${SVG_DEFS}
    <!-- Radial discovery rings (radar sweep) centered at 512,512 -->
    <g opacity="0.55" filter="url(#softGlow)">
      <circle cx="512" cy="512" r="410" fill="none" stroke="#22c55e" stroke-width="3" stroke-dasharray="12 16" />
      <circle cx="512" cy="512" r="320" fill="none" stroke="#4ade80" stroke-width="2" />
      <circle cx="512" cy="512" r="230" fill="none" stroke="#86efac" stroke-width="2" stroke-dasharray="8 12" />
      <!-- Crosshairs -->
      <line x1="102" y1="512" x2="922" y2="512" stroke="#22c55e" stroke-width="2" stroke-dasharray="6 14" />
      <line x1="512" y1="102" x2="512" y2="922" stroke="#22c55e" stroke-width="2" stroke-dasharray="6 14" />
    </g>

    <!-- Radar sweep pie wedge (light translucent green) -->
    <path d="M 512 512 L 800 224 A 410 410 0 0 0 512 102 Z" fill="#22c55e" opacity="0.1" />

    <!-- Discovered FarmStand Marker 1 (Top Right) -->
    <g transform="translate(760, 310)" filter="url(#glow)">
      <circle cx="0" cy="0" r="28" fill="#14532d" stroke="#4ade80" stroke-width="3.5" />
      <!-- Sprout / Leaf icon inside marker -->
      <path d="M -6 12 C -6 -4 10 -14 16 -14 C 16 -14 16 2 4 10 Z" fill="#86efac" stroke="#bbf7d0" stroke-width="2" />
      <path d="M -6 12 C -16 6 -16 -4 -10 -8 C -4 -4 0 6 -6 12 Z" fill="#4ade80" stroke="#86efac" stroke-width="1.8" />
    </g>

    <!-- Fresh Harvest Produce Accent (In front of 8-Bit) -->
    <g transform="translate(362, 730)" filter="url(#glow)">
      <!-- Discovery card -->
      <rect x="0" y="0" width="300" height="190" rx="14" fill="#052e16" stroke="#4ade80" stroke-width="4.5" />
      <!-- Fresh crop row / radial discovery horizon -->
      <path d="M 20 120 Q 150 70 280 120" fill="none" stroke="#86efac" stroke-width="3.5" stroke-dasharray="8 8" />
      <path d="M 30 145 Q 150 95 270 145" fill="none" stroke="#4ade80" stroke-width="4" />
      <!-- Central organic leaf badge -->
      <circle cx="150" cy="65" r="32" fill="#166534" stroke="#86efac" stroke-width="3.5" />
      <path d="M 142 82 C 142 56 166 42 174 42 C 174 42 174 66 156 78 Z" fill="#4ade80" stroke="#bbf7d0" stroke-width="2.5" />
      <path d="M 142 82 C 128 72 128 58 136 50 C 144 56 150 72 142 82 Z" fill="#22c55e" stroke="#86efac" stroke-width="2" />
      <!-- Distance label -->
      <line x1="80" y1="168" x2="220" y2="168" stroke="#bbf7d0" stroke-width="4" stroke-linecap="round" />
    </g>

    <!-- Nearby discovery coordinate point -->
    <circle cx="260" cy="660" r="7" fill="#4ade80" filter="url(#glow)" />
  </svg>`;
}

/**
 * 6. FORGED — Public Releases / Deploying Software
 * Upward release beacon, deployment crate artifact, forge sparks & success energy
 */
function getForgedSvg() {
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    ${SVG_DEFS}
    <!-- Upward launch / release energy beacon trails -->
    <g opacity="0.65" filter="url(#glow)">
      <line x1="512" y1="880" x2="512" y2="120" stroke="#93c5fd" stroke-width="6" stroke-dasharray="24 16" />
      <line x1="472" y1="840" x2="472" y2="240" stroke="#60a5fa" stroke-width="3.5" stroke-dasharray="16 16" />
      <line x1="552" y1="840" x2="552" y2="240" stroke="#60a5fa" stroke-width="3.5" stroke-dasharray="16 16" />
    </g>

    <!-- Radiant Forge Sparks (Burst around 8-Bit) -->
    <g filter="url(#glow)">
      <!-- Top release star -->
      <polygon points="512,100 520,130 550,138 520,146 512,176 504,146 474,138 504,130" fill="#ffffff" />
      <!-- Sparks left -->
      <circle cx="210" cy="380" r="6.5" fill="#bae6fd" />
      <circle cx="160" cy="520" r="8" fill="#ffffff" />
      <circle cx="230" cy="680" r="5.5" fill="#93c5fd" />
      <!-- Sparks right -->
      <circle cx="814" cy="380" r="6.5" fill="#bae6fd" />
      <circle cx="864" cy="520" r="8" fill="#ffffff" />
      <circle cx="794" cy="680" r="5.5" fill="#93c5fd" />
    </g>

    <!-- Forged Release Package / Deployment Crate (In front of 8-Bit) -->
    <g transform="translate(352, 730)" filter="url(#glow)">
      <!-- Release container crate -->
      <rect x="0" y="0" width="320" height="190" rx="14" fill="#0f172a" stroke="#93c5fd" stroke-width="5" />
      <rect x="14" y="14" width="292" height="162" rx="8" fill="#1e293b" opacity="0.8" />
      
      <!-- Upward Deploy Chevron Indicator -->
      <polygon points="160,36 210,88 184,88 184,134 136,134 136,88 110,88" fill="#60a5fa" stroke="#e0f2fe" stroke-width="3" />
      
      <!-- Release Version Tag / Ready indicator -->
      <circle cx="60" cy="150" r="10" fill="#22c55e" filter="url(#glow)" />
      <line x1="85" y1="150" x2="260" y2="150" stroke="#cbd5e1" stroke-width="5" stroke-linecap="round" />
    </g>
  </svg>`;
}

/**
 * 7. APPLICATIONS — Real-World Impact
 * Array of connected floating system app tiles linked by communication network grid
 */
function getApplicationsSvg() {
  const appTile = (x, y, w, h, titleColor, lines = 3) => `
    <g transform="translate(${x}, ${y})" filter="url(#glow)">
      <rect x="0" y="0" width="${w}" height="${h}" rx="10" fill="#064e3b" stroke="#34d399" stroke-width="3.5" />
      <!-- App header -->
      <rect x="8" y="8" width="${w - 16}" height="18" rx="4" fill="${titleColor}" opacity="0.85" />
      <!-- Content lines -->
      ${Array.from({ length: lines }).map((_, i) => `
        <line x1="12" y1="${36 + i * 14}" x2="${w - 12 - (i % 2) * 20}" y2="${36 + i * 14}" stroke="#a7f3d0" stroke-width="3" stroke-linecap="round" opacity="0.75" />
      `).join('')}
    </g>
  `;

  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    ${SVG_DEFS}
    <!-- Interconnected network communication grid -->
    <g opacity="0.65" filter="url(#softGlow)">
      <path d="M 230 420 L 512 320 L 794 420 L 680 760 L 344 760 Z" fill="none" stroke="#10b981" stroke-width="3" stroke-dasharray="8 12" />
      <line x1="230" y1="420" x2="344" y2="760" stroke="#34d399" stroke-width="2.5" />
      <line x1="794" y1="420" x2="680" y2="760" stroke="#34d399" stroke-width="2.5" />
    </g>

    <!-- Left App Tile (Tool / Web App) -->
    ${appTile(140, 360, 140, 100, '#059669', 3)}

    <!-- Right App Tile (Desktop / Service) -->
    ${appTile(744, 360, 140, 100, '#047857', 3)}

    <!-- Top Core App Tile -->
    ${appTile(442, 230, 140, 90, '#10b981', 2)}

    <!-- Bottom Wide Impact Hub Window (In front of 8-Bit) -->
    <g transform="translate(342, 730)" filter="url(#glow)">
      <rect x="0" y="0" width="340" height="190" rx="14" fill="#022c22" stroke="#34d399" stroke-width="4.5" />
      <rect x="12" y="12" width="316" height="28" rx="6" fill="#065f46" />
      <circle cx="32" cy="26" r="5" fill="#ef4444" />
      <circle cx="48" cy="26" r="5" fill="#f59e0b" />
      <circle cx="64" cy="26" r="5" fill="#10b981" />
      
      <!-- Multi-app output stream cards inside window -->
      <rect x="20" y="56" width="90" height="110" rx="6" fill="#064e3b" stroke="#6ee7b7" stroke-width="2" />
      <rect x="125" y="56" width="90" height="110" rx="6" fill="#064e3b" stroke="#6ee7b7" stroke-width="2" />
      <rect x="230" y="56" width="90" height="110" rx="6" fill="#064e3b" stroke="#6ee7b7" stroke-width="2" />
    </g>
  </svg>`;
}

/**
 * 8. SYSTEMS — Foundation Architecture Layer
 * Layered structural strata plates, central column, and infrastructure dependency graph
 */
function getSystemsSvg() {
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    ${SVG_DEFS}
    <!-- Infrastructure vertical spine / data bus -->
    <g opacity="0.6" filter="url(#glow)">
      <line x1="512" y1="120" x2="512" y2="880" stroke="#60a5fa" stroke-width="5" stroke-dasharray="12 16" />
      <line x1="280" y1="380" x2="280" y2="760" stroke="#8faee5" stroke-width="2.5" stroke-dasharray="6 10" />
      <line x1="744" y1="380" x2="744" y2="760" stroke="#8faee5" stroke-width="2.5" stroke-dasharray="6 10" />
    </g>

    <!-- Side Infrastructure Nodes -->
    <g filter="url(#glow)">
      <circle cx="280" cy="380" r="12" fill="#1e3a8a" stroke="#93c5fd" stroke-width="3" />
      <circle cx="744" cy="380" r="12" fill="#1e3a8a" stroke="#93c5fd" stroke-width="3" />
      <circle cx="280" cy="620" r="10" fill="#1e3a8a" stroke="#93c5fd" stroke-width="2.5" />
      <circle cx="744" cy="620" r="10" fill="#1e3a8a" stroke="#93c5fd" stroke-width="2.5" />
    </g>

    <!-- STACKED FOUNDATION STRATA PLATES (In front of 8-Bit) -->
    <g transform="translate(312, 700)" filter="url(#glow)">
      <!-- Strata Plate 1 (Top layer - Runtime & Services) -->
      <rect x="50" y="0" width="300" height="42" rx="8" fill="#1e293b" stroke="#8faee5" stroke-width="3.5" />
      <line x1="80" y1="21" x2="200" y2="21" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round" />
      <circle cx="280" cy="21" r="5" fill="#38bdf8" />
      <circle cx="310" cy="21" r="5" fill="#38bdf8" />

      <!-- Strata Plate 2 (Mid layer - Infrastructure & Engine) -->
      <rect x="25" y="56" width="350" height="48" rx="8" fill="#172554" stroke="#60a5fa" stroke-width="4" />
      <line x1="60" y1="80" x2="240" y2="80" stroke="#bfdbfe" stroke-width="5" stroke-linecap="round" />
      <rect x="270" y="70" width="80" height="20" rx="4" fill="#2563eb" />

      <!-- Strata Plate 3 (Base Bedrock - Core Systems Foundation) -->
      <rect x="0" y="120" width="400" height="60" rx="10" fill="#0f172a" stroke="#3b82f6" stroke-width="4.5" />
      <line x1="36" y1="150" x2="364" y2="150" stroke="#93c5fd" stroke-width="6" stroke-linecap="round" stroke-dasharray="24 14" />
    </g>
  </svg>`;
}

/**
 * 9. FORGEREMS — Technician Workbench / Diagnostics
 * Diagnostic reticle, oscilloscope waveform, drive/hardware module with status LEDs
 */
function getForgerEmsSvg() {
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    ${SVG_DEFS}
    <!-- Telemetry waveform line across the background -->
    <path d="M 120 512 L 320 512 L 360 410 L 400 620 L 440 460 L 480 540 L 512 512 L 904 512" 
      fill="none" stroke="#14b8a6" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.65" filter="url(#glow)" />

    <!-- Diagnostic target reticle / inspection rings -->
    <g opacity="0.5" filter="url(#softGlow)">
      <circle cx="512" cy="512" r="390" fill="none" stroke="#2dd4bf" stroke-width="2.5" stroke-dasharray="10 16" />
      <circle cx="780" cy="380" r="60" fill="none" stroke="#14b8a6" stroke-width="2.5" />
      <circle cx="780" cy="380" r="40" fill="none" stroke="#2dd4bf" stroke-width="1.8" stroke-dasharray="4 8" />
      <line x1="700" y1="380" x2="860" y2="380" stroke="#2dd4bf" stroke-width="2" />
      <line x1="780" y1="300" x2="780" y2="460" stroke="#2dd4bf" stroke-width="2" />
    </g>

    <!-- Technician Diagnostic Workbench & Hardware Module (In front of 8-Bit) -->
    <g transform="translate(342, 720)" filter="url(#glow)">
      <rect x="0" y="0" width="340" height="200" rx="14" fill="#042f2e" stroke="#2dd4bf" stroke-width="5" />
      
      <!-- Status Monitor Screen -->
      <rect x="16" y="16" width="220" height="110" rx="8" fill="#134e4a" stroke="#5eead4" stroke-width="2.5" />
      <!-- Dynamic mini waveform inside screen -->
      <path d="M 28 71 L 65 71 L 80 40 L 105 102 L 125 55 L 140 85 L 160 71 L 220 71" 
        fill="none" stroke="#2dd4bf" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      
      <!-- Diagnostic metrics indicators -->
      <line x1="28" y1="105" x2="110" y2="105" stroke="#ccfbf1" stroke-width="4" stroke-linecap="round" />
      <line x1="130" y1="105" x2="210" y2="105" stroke="#5eead4" stroke-width="4" stroke-linecap="round" />

      <!-- Hardware status LEDs column -->
      <g transform="translate(260, 24)">
        <circle cx="16" cy="16" r="9" fill="#10b981" filter="url(#glow)" />
        <circle cx="16" cy="46" r="9" fill="#06b6d4" filter="url(#glow)" />
        <circle cx="16" cy="76" r="9" fill="#f59e0b" />
        <circle cx="16" cy="106" r="9" fill="#2dd4bf" filter="url(#glow)" />
      </g>

      <!-- Port / bus interface connectors -->
      <rect x="24" y="146" width="70" height="34" rx="6" fill="#115e59" stroke="#99f6e4" stroke-width="2" />
      <rect x="110" y="146" width="70" height="34" rx="6" fill="#115e59" stroke="#99f6e4" stroke-width="2" />
      <rect x="196" y="146" width="120" height="34" rx="6" fill="#115e59" stroke="#99f6e4" stroke-width="2" />
    </g>
  </svg>`;
}

// Configuration table for all characters
const CHARACTERS = [
  {
    id: 'intelligence',
    productName: 'GEMS',
    altNames: ['gems'],
    baseMaster: 'activity/masters/8bit-thinking.png',
    getSvg: getIntelligenceSvg,
    color: '#4f8fff',
    role: 'Thinking & Training AI Models'
  },
  {
    id: 'gaming',
    productName: 'KyraBlox',
    altNames: ['kyrablox'],
    baseMaster: 'activity/masters/8bit-coding.png',
    getSvg: getGamingSvg,
    color: '#48c9f2',
    role: 'Building Isometric World Blocks'
  },
  {
    id: 'publishing',
    productName: 'Kayla AI Publisher',
    altNames: ['kayla'],
    baseMaster: 'activity/masters/8bit-writing.png',
    getSvg: getPublishingSvg,
    color: '#b473ff',
    role: 'Writing Connected Manuscripts'
  },
  {
    id: 'civic',
    productName: 'We The People',
    altNames: ['wtp'],
    baseMaster: 'activity/masters/8bit-verifying.png',
    getSvg: getCivicSvg,
    color: '#f0a052',
    role: 'Verifying Official Civic Sources'
  },
  {
    id: 'foraging',
    productName: 'FarmStand Finder',
    altNames: ['farmstand'],
    baseMaster: 'activity/masters/8bit-search.png',
    getSvg: getForagingSvg,
    color: '#a8df64',
    role: 'Discovering Local Farms & Food'
  },
  {
    id: 'forged',
    productName: 'Forged Releases',
    altNames: ['forged-software'],
    baseMaster: 'activity/masters/8bit-deploying.png',
    getSvg: getForgedSvg,
    color: '#c2d5f4',
    role: 'Deploying Released Public Software'
  },
  {
    id: 'applications',
    productName: 'Applications',
    altNames: ['apps'],
    baseMaster: 'personality/masters/8bit-ready.png',
    getSvg: getApplicationsSvg,
    color: '#61d7a1',
    role: 'Interconnecting Practical Systems'
  },
  {
    id: 'systems',
    productName: 'Systems',
    altNames: ['foundation'],
    baseMaster: 'activity/masters/8bit-planning.png',
    getSvg: getSystemsSvg,
    color: '#8faee5',
    role: 'Architecting Foundation Layers'
  },
  {
    id: 'forgerems',
    productName: 'ForgerEMS',
    altNames: ['maintenance'],
    baseMaster: 'activity/masters/8bit-tool-use.png',
    getSvg: getForgerEmsSvg,
    color: '#2dd4bf',
    role: 'System Diagnostics & Maintenance'
  }
];

async function generateAll() {
  console.log('Generating canonical 8-Bit ecosystem character family...');
  const masterCards = [];

  for (const char of CHARACTERS) {
    const baseMasterPath = resolve(MASTERS_DIR, char.baseMaster);
    const svgOverlay = Buffer.from(char.getSvg());

    // 1. Composite 1024x1024 master
    const masterBuf = await sharp(baseMasterPath)
      .composite([{ input: svgOverlay, blend: 'over' }])
      .png()
      .toBuffer();

    // 2. Export 256x256 WebP with calibrated sharpness & contrast for dark celestial shells
    const webp256 = await sharp(masterBuf)
      .resize(256, 256, { kernel: 'lanczos3' })
      .sharpen({ sigma: 0.65, m1: 0.6, m2: 2.2 })
      .webp({ quality: 95, effort: 6, alphaQuality: 100 })
      .toBuffer();

    // 3. Export 256x256 PNG fallback
    const png256 = await sharp(masterBuf)
      .resize(256, 256, { kernel: 'lanczos3' })
      .sharpen({ sigma: 0.65, m1: 0.6, m2: 2.2 })
      .png({ compressionLevel: 9 })
      .toBuffer();

    // Write primary files
    const primaryWebp = resolve(outDir, `${char.id}-8bit.webp`);
    const primaryPng = resolve(outDir, `${char.id}-8bit.png`);
    writeFileSync(primaryWebp, webp256);
    writeFileSync(primaryPng, png256);
    console.log(`Generated: ${char.id}-8bit.webp (${(webp256.length / 1024).toFixed(1)} KB)`);

    // Write alias files
    for (const alt of char.altNames) {
      writeFileSync(resolve(outDir, `${alt}-8bit.webp`), webp256);
      writeFileSync(resolve(outDir, `${alt}-8bit.png`), png256);
    }

    masterCards.push({
      char,
      thumb: await sharp(png256).resize(180, 180).png().toBuffer()
    });
  }

  // 4. Generate QA Side-by-Side Character Sheet (with labels and without labels)
  console.log('Generating QA review character sheets...');
  const cols = 3;
  const rows = Math.ceil(CHARACTERS.length / cols);
  const cardW = 280;
  const cardH = 300;
  const sheetW = cols * cardW + 40;
  const sheetH = rows * cardH + 120;

  // Render sheet SVG with labels
  const sheetSvgWithLabels = `
    <svg width="${sheetW}" height="${sheetH}" viewBox="0 0 ${sheetW} ${sheetH}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${sheetW}" height="${sheetH}" fill="#0a0f1d" />
      <text x="${sheetW / 2}" y="50" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="24" font-weight="bold" text-anchor="middle">ONE FDS ECOSYSTEM — 8-BIT CHARACTER FAMILY</text>
      <text x="${sheetW / 2}" y="80" fill="#94a3b8" font-family="monospace" font-size="14" text-anchor="middle">One canonical mascot identity // 8 distinct product roles orbiting CodeForge</text>
      ${masterCards.map((mc, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = 30 + col * cardW;
        const y = 110 + row * cardH;
        return `
          <g transform="translate(${x}, ${y})">
            <!-- Card background -->
            <rect width="${cardW - 20}" height="${cardH - 20}" rx="16" fill="#111827" stroke="${mc.char.color}" stroke-width="1.8" opacity="0.9" />
            <!-- Celestial shell simulation -->
            <circle cx="${(cardW - 20) / 2}" cy="105" r="75" fill="#070b13" stroke="#475569" stroke-width="2" />
            <circle cx="${(cardW - 20) / 2}" cy="105" r="79" fill="none" stroke="${mc.char.color}" stroke-width="1.5" opacity="0.75" />
            <!-- Character placeholder -->
            <image href="data:image/png;base64,${mc.thumb.toString('base64')}" x="${(cardW - 20) / 2 - 75}" y="30" width="150" height="150" />
            <!-- Product Label -->
            <text x="${(cardW - 20) / 2}" y="210" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" text-anchor="middle">${mc.char.productName}</text>
            <text x="${(cardW - 20) / 2}" y="232" fill="${mc.char.color}" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">${mc.char.id.toUpperCase()}</text>
            <text x="${(cardW - 20) / 2}" y="254" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle">${mc.char.role.replace(/&/g, '&amp;')}</text>
          </g>
        `;
      }).join('')}
    </svg>
  `;

  // Render sheet SVG WITHOUT labels (for role guessing QA exercise)
  const sheetSvgWithoutLabels = `
    <svg width="${sheetW}" height="${sheetH}" viewBox="0 0 ${sheetW} ${sheetH}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${sheetW}" height="${sheetH}" fill="#0a0f1d" />
      <text x="${sheetW / 2}" y="50" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="24" font-weight="bold" text-anchor="middle">ROLE INFERENCE TEST (NO LABELS)</text>
      <text x="${sheetW / 2}" y="80" fill="#94a3b8" font-family="monospace" font-size="14" text-anchor="middle">Can a human infer the role from the 8-Bit character &amp; accessories alone?</text>
      ${masterCards.map((mc, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = 30 + col * cardW;
        const y = 110 + row * cardH;
        return `
          <g transform="translate(${x}, ${y})">
            <rect width="${cardW - 20}" height="${cardH - 20}" rx="16" fill="#111827" stroke="#334155" stroke-width="1.5" />
            <circle cx="${(cardW - 20) / 2}" cy="130" r="85" fill="#070b13" stroke="#475569" stroke-width="2" />
            <circle cx="${(cardW - 20) / 2}" cy="130" r="89" fill="none" stroke="${mc.char.color}" stroke-width="1.5" opacity="0.75" />
            <image href="data:image/png;base64,${mc.thumb.toString('base64')}" x="${(cardW - 20) / 2 - 85}" y="45" width="170" height="170" />
          </g>
        `;
      }).join('')}
    </svg>
  `;

  const sheetPng = await sharp(Buffer.from(sheetSvgWithLabels)).png().toBuffer();
  const sheetUnlabeledPng = await sharp(Buffer.from(sheetSvgWithoutLabels)).png().toBuffer();
  writeFileSync(resolve(qaDir, 'ecosystem-8bit-qa-sheet.png'), sheetPng);
  writeFileSync(resolve(qaDir, 'ecosystem-8bit-qa-unlabeled.png'), sheetUnlabeledPng);
  console.log('Saved QA sheets to .visual-audit/');
}

generateAll().catch(err => {
  console.error('Generation failed:', err);
  process.exit(1);
});
