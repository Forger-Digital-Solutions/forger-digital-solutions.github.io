import type { KaylaFounder } from '../types';
import { siteConfig } from '../../../config/site';

export const founder: KaylaFounder = {
  name: siteConfig.author,
  role: 'Founder & Developer',
  publicBio: siteConfig.author + ' is building Forger Digital Solutions as an independent software and AI engineering studio. The work spans autonomous engineering, model research, game creation, publishing, civic information, local discovery, technician tools, and technology reuse.',
  foundingStory: 'Forger Digital Solutions was founded by ' + siteConfig.author + ' to pursue ambitious software across disciplines without forcing every useful problem into one corporate product category. The name reflects hands-on engineering: shaping tools through direct implementation, investigation, and real use.',
  motivation: 'The work starts with concrete problems: safely changing a repository, evaluating whether a model improved, understanding a game project, keeping a manuscript coherent, navigating an official service, finding local food, or diagnosing a Windows system. The common thread is making capable software useful without taking meaningful direction away from the person using it.',
  technicalInterests: [
    'AI research and model training',
    'Evaluation systems and curriculum systems',
    'Adaptive compute and hardware-aware execution',
    'Agentic systems and context learning',
    'Game development tooling and multi-engine workflows',
    'Publishing workflows and multilingual content',
    'Civic technology and accessible software infrastructure',
    'Technology reuse and hardware lifecycle extension',
    'Evidence-driven development and governed experimentation'
  ],
  fdsVision: 'Building an independent technology studio where autonomous engineering, model learning, creative work, civic access, nearby discovery, and technician software can strengthen one another while remaining distinct products.',
  developmentPhilosophy: 'Define what success would look like before a run, test against that signal, keep the result inspectable, and change direction when the result does not support the hypothesis. The full engineering method is documented in FDS Lab.',
  publicProjects: [
    'CodeForge',
    'GEMS / Training Grounds',
    'KyraBlox',
    'Kayla AI Publisher',
    'We The People',
    'FarmStand Finder',
    'ForgerEMS'
  ],
  publicLinks: [
    { label: 'LinkedIn', href: siteConfig.linkedinUrl },
    { label: 'GitHub', href: siteConfig.githubUrl },
    { label: 'YouTube', href: siteConfig.youtubeUrl },
    { label: 'Discord', href: siteConfig.discordUrl }
  ].filter(link => Boolean(link.href))
};
