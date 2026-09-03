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
    src: '/images/gems/gems-phase158-generation0-family.svg',
    alt: 'GEMS Phase 158 Generation 0 family strategy diagram connecting selected open foundations to Topaz, Sapphire, Peridot, and Garnet specialization lineages.',
    caption: 'GEMS Phase 158 Generation 0 foundation strategy; candidates are not yet GEMS models.',
    state: 'research' as const,
  },
  trainingGrounds: {
    src: '/images/gems/training-grounds-capability-flow.svg',
    alt: 'Training Grounds conceptual process diagram showing foundation, curriculum, training, checkpoint, evaluation, failure analysis, replication, capability gate, and advance or revise.',
    caption: 'Training Grounds research workflow schematic derived from the current project description.',
    state: 'conceptual' as const,
  },
} satisfies Record<string, ProjectImage & { state: 'release' | 'development' | 'research' | 'conceptual' }>;
