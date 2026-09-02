import type { KaylaGitHubRepo } from './types';

export const githubRepos: KaylaGitHubRepo[] = [
  {
    project: 'ForgerEMS',
    repositoryName: 'ForgerEMS',
    url: 'https://github.com/forger-digital-solutions/ForgerEMS',
    description: 'Windows technician workbench repository. The public v1.2.3 preview covers diagnostics, system information, USB tooling, drive validation, driver guidance, and local-first assistance; later repository work includes Dr. Forge integration.',
    public: true,
    docs: 'https://github.com/forger-digital-solutions/ForgerEMS',
    lastUpdated: '2026-08-23'
  },
  {
    project: 'CodeForge',
    repositoryName: 'CodeForge',
    url: 'https://github.com/Forger-Digital-Solutions/CodeForge',
    description: 'Free-first autonomous software-engineering platform for Windows, CLI, and editor work.',
    public: true,
    docs: 'https://github.com/Forger-Digital-Solutions/CodeForge',
    lastUpdated: '2026-08-29'
  }
];

export function getGithubRepo(project: string): KaylaGitHubRepo | undefined {
  return githubRepos.find(r => r.project.toLowerCase() === project.toLowerCase() || r.repositoryName.toLowerCase() === project.toLowerCase());
}
