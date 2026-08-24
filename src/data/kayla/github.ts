import type { KaylaGitHubRepo } from './types';

export const githubRepos: KaylaGitHubRepo[] = [
  {
    project: 'ForgerEMS',
    repositoryName: 'ForgerEMS',
    url: 'https://github.com/forger-digital-solutions/ForgerEMS',
    description: 'Ventoy-based toolkit manager and downloader for organizing, managing, and deploying bootable toolkits and utilities.',
    public: true,
    docs: 'https://github.com/forger-digital-solutions/ForgerEMS',
    lastUpdated: '2025-01-01'
  }
];

export function getGithubRepo(project: string): KaylaGitHubRepo | undefined {
  return githubRepos.find(r => r.project.toLowerCase() === project.toLowerCase() || r.repositoryName.toLowerCase() === project.toLowerCase());
}
