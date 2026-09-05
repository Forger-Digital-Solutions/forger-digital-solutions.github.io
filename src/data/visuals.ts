import type { ProjectImage } from '../types';

/** Public-facing visual manifest. State labels prevent research and development captures being mistaken for releases. */
export const visualAssets = {
  codeforgeWorkspace: {
    src: '/images/codeforge/codeforge-workspace-v0-2.png',
    alt: 'CodeForge v0.2.0 desktop workspace showing the repository context bar, New Task control, task navigation, safe failure state, verification tabs, and free-model routing control.',
    caption: 'CodeForge v0.2.0 desktop workspace; local path redacted for public display.',
    state: 'release' as const,
  },
  kyrabloxCommandCenter: {
    src: '/images/kyrablox/kyrablox-command-center-development.png',
    alt: 'KyraBlox command center development build showing project navigation, Roblox Studio connection status, mission intake, and the project-aware workspace shell.',
    caption: 'KyraBlox current development build — command center shell with Roblox Studio path visible.',
    state: 'development' as const,
  },
  gemsFamily: {
    src: '/images/gems/gems-training-grounds-family.svg',
    alt: 'Diagram showing Training Grounds as the shared learning and evaluation program at the center, connected to four independent GEMS research lineages: Topaz, Sapphire, Peridot, and Garnet.',
    caption: 'GEMS learning architecture: one shared Training Grounds program, four independent from-scratch research lineages.',
    state: 'conceptual' as const,
  },
  trainingGrounds: {
    src: '/images/gems/training-grounds-capability-flow.svg',
    alt: 'Training Grounds conceptual process diagram showing curriculum, training, checkpoint, evaluation, failure analysis, replication, capability gate, and advance or revise.',
    caption: 'Training Grounds research workflow schematic derived from the current project description.',
    state: 'conceptual' as const,
  },
} satisfies Record<string, ProjectImage & { state: 'release' | 'development' | 'research' | 'conceptual' }>;
