/**
 * FDS technology map.
 *
 * Tiers are deliberate and must reflect reality:
 * - core:      actively foundational technologies (used across current systems)
 * - active:    infrastructure and platforms currently in use
 * - research:  experimental technology being evaluated or built, not yet load-bearing
 * - historical: previously used or evaluated; not presented as current infrastructure
 */

export type TechnologyTier = 'core' | 'active' | 'research' | 'historical';

export interface TechnologyGroup {
  tier: TechnologyTier;
  name: string;
  description: string;
  items: string[];
}

export interface ProjectTechnology {
  system: string;
  href?: string;
  areas: string;
  purpose: string;
}

export const tierLabels: Record<TechnologyTier, string> = {
  core: 'Core',
  active: 'Active Infrastructure',
  research: 'Research',
  historical: 'Evaluated / Historical',
};

export const projectTechnologies: ProjectTechnology[] = [
  { system: 'CodeForge', href: '/projects/codeforge', areas: 'TypeScript, Node.js, Electron, React, SQLite, Git, VS Code, model/provider APIs', purpose: 'Repository intelligence, autonomous task execution, desktop/CLI/editor surfaces, and free-first model routing.' },
  { system: 'ForgerEMS', href: '/projects/forgerems', areas: 'C#, .NET, WPF, Windows APIs, PowerShell, USB and hardware interfaces', purpose: 'Technician diagnostics, drive validation, USB tooling, system information, and local-first assistance.' },
  { system: 'GEMS / Training Grounds', href: '/projects/gems-training-grounds', areas: 'Python, model post-training, evaluation, curriculum systems, CUDA/GPU environments', purpose: 'Specialization, teaching, held-out evaluation, checkpoints, and hardware-aware model research.' },
  { system: 'KyraBlox', href: '/projects/kyrablox', areas: 'C#, .NET 8, WPF, Luau/Roblox, C++/Unreal, engine plugins, local protocols', purpose: 'Project inspection, governed missions, engine integration, approvals, validation, and recovery.' },
  { system: 'FDS Website', areas: 'Astro, TypeScript, Vitest, Cloudflare Workers, GitHub Pages', purpose: 'Static public publishing plus the separately deployed Kayla site-guide runtime.' }
];

export const technologyGroups: TechnologyGroup[] = [
  {
    tier: 'core',
    name: 'Engineering core',
    description: 'Technologies that carry active FDS systems today.',
    items: [
      'TypeScript',
      'Node.js',
      'Python',
      'C# / .NET',
      'Electron',
      'React',
      'SQLite',
      'Git',
      'PowerShell',
      'Astro',
      'Windows APIs',
    ],
  },
  {
    tier: 'core',
    name: 'Intelligence & verification core',
    description: 'The AI and quality disciplines FDS builds on, in products and research alike.',
    items: [
      'Model post-training',
      'Evaluation systems',
      'Curriculum systems',
      'Held-out evaluation',
      'Agentic execution',
      'Repository intelligence',
      'Automated testing',
      'Packaged-app validation',
    ],
  },
  {
    tier: 'active',
    name: 'Active infrastructure',
    description: 'Services and platforms currently in use.',
    items: [
      'GitHub (code, releases, Actions runners)',
      'GitHub Pages',
      'Cloudflare Workers (Kayla runtime)',
      'Windows 10/11 build machines',
      'NVIDIA CUDA / local GPU systems',
    ],
  },
  {
    tier: 'research',
    name: 'Research technology',
    description: 'Experimental systems under evaluation or construction — not yet load-bearing.',
    items: [
      'From-scratch foundation model experiments (longer-term)',
      'Multimodal module research (Garnet)',
      'Unreal engine bridge (fixture-validated)',
      'ForgeGreen runtime efficiency systems',
      '8-Bit dynamic model routing / failover',
    ],
  },
  {
    tier: 'historical',
    name: 'Evaluated / historical',
    description: 'Previously used or evaluated for workloads. Not presented as current infrastructure.',
    items: [
      'AWS',
      'Modal',
      'Lightning AI',
      'Kaggle / TPU',
    ],
  },
];
