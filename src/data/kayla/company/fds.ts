import type { KaylaCompany } from '../types';
import { siteConfig } from '../../../config/site';

export const fds: KaylaCompany = {
  name: siteConfig.name,
  shortName: siteConfig.shortName,
  description: siteConfig.description,
  mission: 'Independent software and AI engineering across autonomous development, technician tools, game development, publishing, civic information, and local discovery.',
  vision: {
    current: 'Shipping and testing focused products: autonomous repository engineering, engineering governance, a historically grounded game, long-form publishing, civic information, local-food discovery, and Windows technician workflows.',
    activeDevelopment: 'Active work spans CodeForge, Forge Control, Dead Trails West, Kayla AI Publisher, FarmStand Finder, private civic technology, and the ForgerEMS public preview.',
    research: 'FDS research explores engineering reliability, evaluation, adaptive computation, and evidence-driven development. Work is described publicly only where its status and evidence are verified.',
    planned: 'Near-term product work covers CodeForge verification and routing, Forge Control implementation, Dead Trails West world systems, publishing workflows, official-source civic navigation, and local-food discovery. Community programs remain concepts.',
    aspirational: 'Exploring affordable-community concepts, community gardens, technology reuse programs, and open planning tools that help people understand and manage shared infrastructure.',
    longTerm: 'Let lessons from shipped engineering tools, model experiments, creative products, and community-facing software improve one another while each product keeps its own purpose and technical boundaries.'
  },
  philosophy: [
    'Evidence over assumptions — results should provide evidence that the intended objective was achieved.',
    'Adaptive computation — software should understand and adapt to the hardware and compute environments available to it.',
    'Governed intelligence — training, evaluation, experimentation, and deployment should leave understandable evidence.',
    'Build through experimentation — research findings should become reusable architecture only after surviving meaningful real-world use.'
  ],
  productEcosystem: [
    'CodeForge — free-first autonomous software-engineering platform',
    'Forge Control — active development; no public release or integrations verified',
    'Dead Trails West — private Unreal Engine game development',
    'Kayla AI Publisher — continuous creative-project and publishing workspace',
    'We The People — private-development civic technology platform',
    'FarmStand Finder — community-focused local discovery application',
    'ForgerEMS — Windows technician workbench and engineering maintenance suite'
  ],
  currentProjects: [
    'CodeForge (RELEASED + ACTIVE DEVELOPMENT)',
    'Forge Control (ACTIVE DEVELOPMENT)',
    'Dead Trails West (PRIVATE DEVELOPMENT)',
    'Kayla AI Publisher (ACTIVE DEVELOPMENT)',
    'We The People (PRIVATE DEVELOPMENT)',
    'FarmStand Finder (ACTIVE DEVELOPMENT)'
  ],
  futurePlans: [
    'Continued engineering verification and adaptive-compute experimentation.',
    'World systems and playable development for Dead Trails West.',
    'Publishing and multilingual workflow development for Kayla AI Publisher.',
    'Continued private platform development for We The People.',
    'Local discovery features and application development for FarmStand Finder.'
  ],
  publicResearchGoals: [
    'AI research and model training',
    'Evaluation systems and curriculum systems',
    'Adaptive compute and hardware-aware execution',
    'Evidence-driven development',
    'Agentic systems and context learning'
  ],
  communityGoals: [
    'Exploring affordable-community concepts',
    'Community gardens and local food resilience',
    'Technology reuse and access initiatives',
    'Hardware donation coordination'
  ],
  technologyReuse: 'Capable equipment deserves a second life instead of a landfill. Donated hardware can support development, learning, families, and future community programs.',
  hardwareDonations: 'FDS accepts donations of laptops, workstations, GPUs, servers, storage, and other usable computing equipment. Logistics are coordinated privately after initial contact via the support email.',
  affordableTechnology: 'FDS is exploring ways technology and transparent systems could support more affordable, sustainable communities — from shared-resource planning to open tools.',
  affordableCommunityConcepts: 'Exploring ways technology and transparent systems could support more affordable, sustainable communities — from shared-resource planning to open tools that help people understand and manage shared infrastructure.',
  communityGardens: 'Community growing spaces, local food access, and shared infrastructure are on the long-term concept list. Ideas like sensor-driven growing data and open planning tools may connect FDS work with local food resilience.',
  forged: 'Forged is the public shelf for FDS software that can be downloaded, tested, or used now. CodeForge installer downloads are temporarily paused while its release is updated; ForgerEMS remains available as a public preview.',
  downloads: 'The ForgerEMS public preview remains available. CodeForge installer and portable downloads are temporarily paused while its release is updated.',
  supportContact: `Email is the primary contact method: ${siteConfig.supportEmail}. Community channels include GitHub, YouTube, Discord, and LinkedIn.`,
  githubUrl: siteConfig.githubUrl,
  youtubeUrl: siteConfig.youtubeUrl,
  discordUrl: siteConfig.discordUrl,
  linkedinUrl: siteConfig.linkedinUrl,
  tiktokUrl: siteConfig.tiktokUrl || undefined,
  supportUrl: siteConfig.supportUrl,
  kofiUrl: siteConfig.kofiUrl,
  cashAppHandle: siteConfig.cashAppHandle,
  cashAppUrl: siteConfig.cashAppUrl,
  supportEmail: siteConfig.supportEmail
};
