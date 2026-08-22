export interface TechnologyCategory {
  name: string;
  description?: string;
  items: string[];
}

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
    description:
      'Research areas and system capabilities under active exploration.',
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
    name: 'Compute & Infrastructure',
    description:
      'Environments used for experiments and workloads. Use of a provider does not imply partnership.',
    items: [
      'NVIDIA CUDA',
      'AWS',
      'Modal',
      'Lightning AI',
      'Kaggle / TPU',
      'Local GPU infrastructure'
    ]
  },
  {
    name: 'Development Environments & Engines',
    description: 'Engines and environments explored where appropriate for FDS projects.',
    items: ['Roblox', 'Unreal Engine', 'Unity', 'Godot']
  }
];
