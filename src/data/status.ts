import type { ProjectStatusValue } from '../types';

export interface StatusMeta {
  /** Short one-line meaning used in compact contexts. */
  short: string;
  /** Fuller explanation shown on project detail pages. */
  description: string;
}

// Centralized, plain-language explanations of what each project status means.
// Used by project pages and the homepage so the copy stays consistent everywhere.
export const statusMeta: Record<ProjectStatusValue, StatusMeta> = {
  'ACTIVE RESEARCH': {
    short: 'Ongoing experimentation and evaluation.',
    description:
      'Ongoing experimentation, evaluation, and technical development. Architecture and findings may continue to change as evidence is gathered.'
  },
  'ACTIVE DEVELOPMENT': {
    short: 'Actively being built and refined.',
    description:
      'The project is actively being built and refined. Features and implementation may change as development progresses.'
  },
  'PRIVATE DEVELOPMENT': {
    short: 'Underway, with portions kept private.',
    description:
      'Active development is underway, but portions of the project remain intentionally private while the work is being shaped.'
  },
  EXPERIMENTAL: {
    short: 'Early exploratory work.',
    description:
      'Early exploratory work. Direction and scope are still being tested and may shift substantially.'
  },
  PLANNED: {
    short: 'Scoped, not yet in active build.',
    description:
      'Scoped and under consideration, but not yet in active development.'
  },
  RELEASED: {
    short: 'Available and in use.',
    description: 'Released and available, with continued maintenance and refinement.'
  }
};
