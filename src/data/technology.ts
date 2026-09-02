export interface TechnologyCategory {
  name: string;
  description?: string;
  items: string[];
}

export interface ProjectTechnology {
  system: string;
  href?: string;
  areas: string;
  purpose: string;
}

export const projectTechnologies: ProjectTechnology[] = [
  { system: 'CodeForge', href: '/projects/codeforge', areas: 'TypeScript, Node.js, Electron, React, SQLite, Git, VS Code, model/provider APIs', purpose: 'Repository intelligence, autonomous task execution, desktop/CLI/editor surfaces, and free-first model routing.' },
  { system: 'GEMS / Training Grounds', href: '/projects/gems-training-grounds', areas: 'Python, model post-training, evaluation, curriculum systems, CUDA/GPU environments', purpose: 'Specialization, teaching, held-out evaluation, checkpoints, and hardware-aware model research.' },
  { system: 'KyraBlox', href: '/projects/kyrablox', areas: 'C#, .NET 8, WPF, Luau/Roblox, C++/Unreal, engine plugins, local protocols', purpose: 'Project inspection, governed missions, engine integration, approvals, validation, and recovery.' },
  { system: 'ForgerEMS', href: '/forged', areas: 'C#, .NET, WPF, Windows APIs, PowerShell, USB and hardware interfaces', purpose: 'Technician diagnostics, drive validation, USB tooling, system information, and local-first assistance.' },
  { system: 'FDS Website', areas: 'Astro, TypeScript, Vitest, Cloudflare Workers, GitHub Pages', purpose: 'Static public publishing plus the separately deployed Kayla site-guide runtime.' }
];

export const technologyCategories: TechnologyCategory[] = [
  {
    name: 'Languages & Platforms',
    items: [
      'Python',
      'C#',
      '.NET',
      'TypeScript',
      'JavaScript',
      'PowerShell',
      'Luau'
    ]
  },
  {
    name: 'AI & Intelligence',
    description: 'Model learning, agent execution, and evaluation areas used where a project requires them.',
    items: [
      'Custom AI Research',
      'Model Training',
      'Evaluation Systems',
      'Curriculum Systems',
      'Agentic Systems',
      'Context Learning',
      'Adaptive Compute'
    ]
  },
  {
    name: 'Compute & Environments',
    description:
      'Environments used for experiments and workloads. Use of a provider does not imply partnership.',
    items: [
      'NVIDIA CUDA',
      'AWS',
      'Modal',
      'Lightning AI',
      'Kaggle / TPU',
      'Local GPU systems'
    ]
  },
  {
    name: 'Development Environments & Engines',
    description: 'Engines and environments explored where appropriate for FDS projects.',
    items: ['Roblox', 'Unreal Engine', 'Unity', 'Godot']
  }
];
