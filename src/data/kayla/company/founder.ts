import type { KaylaFounder } from '../types';
import { siteConfig } from '../../../config/site';

export const founder: KaylaFounder = {
  name: siteConfig.author,
  role: 'Founder & Developer',
  publicBio: siteConfig.author + ' is building Forger Digital Solutions as an independent software research and development effort. The work spans AI research and training infrastructure, game-development tooling, publishing software, civic technology, community discovery platforms, and technology reuse initiatives. The approach emphasizes evidence-driven development, adaptive compute, and building through repeated experimentation.',
  foundingStory: 'Forger Digital Solutions was founded by ' + siteConfig.author + ' as an independent software research and development studio. Projects often begin as experiments and evolve through repeated implementation, measurement, testing, and refinement. The name reflects the philosophy of building durable, practical systems through disciplined iteration rather than relying on unproven assumptions.',
  motivation: 'Building software that learns, adapts, and creates — while keeping development grounded in evidence, practical constraints, and real-world usefulness. The work is driven by curiosity about how intelligent systems can be developed responsibly, how creative tools can support rather than replace human direction, and how technology can serve community needs.',
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
  fdsVision: 'Building Forger Digital Solutions as an independent software development and research effort focused on intelligent systems, creative tools, and practical software — where research findings become reusable architecture only after surviving meaningful real-world use.',
  developmentPhilosophy: 'Evidence over assumptions. Adaptive computation. Governed intelligence. Build through experimentation. Results should provide evidence that the intended objective was achieved. Training, evaluation, experimentation, and deployment should leave understandable evidence.',
  publicProjects: [
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
