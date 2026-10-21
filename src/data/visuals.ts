import type { ProjectImage } from '../types';

/** Public-facing visual manifest. State labels prevent research and development captures being mistaken for releases. */
export const visualAssets = {
  codeforgeWorkspace: {
    src: '/images/codeforge/codeforge-workspace-v0-2.png',
    alt: 'CodeForge v0.2.0 desktop workspace showing the repository context bar, New Task control, task navigation, safe failure state, verification tabs, and free-model routing control.',
    caption: 'CodeForge v0.2.0 desktop workspace; local path redacted for public display.',
    state: 'release' as const,
  },
} satisfies Record<string, ProjectImage & { state: 'release' | 'development' | 'research' | 'conceptual' }>;
