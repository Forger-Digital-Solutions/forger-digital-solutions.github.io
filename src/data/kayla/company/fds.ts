import type { KaylaCompany } from '../types';
import { siteConfig } from '../../../config/site';

export const fds: KaylaCompany = {
  name: siteConfig.name,
  shortName: siteConfig.shortName,
  description: siteConfig.description,
  mission: 'Independent software research and development focused on intelligent systems, developer tooling, creative technology, training infrastructure, and experimental computing.',
  vision: {
    current: 'Building software that learns, adapts, and creates — with a disciplined approach to intelligent systems, creative tools, and practical software.',
    activeDevelopment: 'Active development spans AI-assisted publishing (Kayla AI Publisher), game-development tooling (KyraBlox), local discovery (FarmStand Finder), and private civic technology (We The People). ForgerEMS is published as a usable toolkit product.',
    research: 'Flagship research is GEMS / Training Grounds — an experimental intelligence engineering ecosystem exploring adaptable model training, evaluation, governance, and evidence-driven development across flexible compute environments.',
    planned: 'Continued expansion of AI-assisted development workflows, multilingual publishing support, civic technology infrastructure, and local discovery features. Community-impact programs remain in concept phase.',
    aspirational: 'Exploring affordable-community concepts, community gardens, technology reuse programs, and open planning tools that help people understand and manage shared infrastructure.',
    longTerm: 'Building a coherent ecosystem of practical, evidence-driven software where research, development, and community needs inform each other — from intelligent training systems to accessible civic tools and community-focused discovery platforms.'
  },
  philosophy: [
    'Evidence over assumptions — results should provide evidence that the intended objective was achieved.',
    'Adaptive computation — software should understand and adapt to the hardware and compute environments available to it.',
    'Governed intelligence — training, evaluation, experimentation, and deployment should leave understandable evidence.',
    'Build through experimentation — research findings should become reusable architecture only after surviving meaningful real-world use.'
  ],
  productEcosystem: [
    'GEMS / Training Grounds — experimental intelligence engineering ecosystem',
    'KyraBlox — AI-assisted game development platform',
    'Kayla AI Publisher — AI-assisted publishing platform',
    'We The People — private-development civic technology platform',
    'FarmStand Finder — community-focused local discovery application',
    'ForgerEMS — Ventoy-based toolkit manager and downloader'
  ],
  currentProjects: [
    'GEMS / Training Grounds (ACTIVE RESEARCH)',
    'KyraBlox (ACTIVE DEVELOPMENT)',
    'Kayla AI Publisher (ACTIVE DEVELOPMENT)',
    'We The People (PRIVATE DEVELOPMENT)',
    'FarmStand Finder (ACTIVE DEVELOPMENT)'
  ],
  futurePlans: [
    'Continued GEMS research, evaluation, and adaptive-compute experimentation.',
    'Expanded AI-assisted development workflows and tooling for KyraBlox.',
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
  forged: 'Forged is the FDS storefront for publicly available software, applications, tools, and digital products. Research projects become published software here when they reach a releasable state.',
  downloads: 'Public downloads include ForgerEMS, a Ventoy-based toolkit manager and downloader for organizing, managing, and deploying bootable toolkits and utilities.',
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
