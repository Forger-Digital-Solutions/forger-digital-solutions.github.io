import type { KaylaCompany } from '../types';
import { siteConfig } from '../../../config/site';

export const fds: KaylaCompany = {
  name: siteConfig.name,
  shortName: siteConfig.shortName,
  description: siteConfig.description,
  mission: 'Independent AI research and software engineering studio leading with the FDS Studio Intelligence Hub—managed four-week engineering intelligence pilots for Roblox Studio and Unreal Engine game studios—alongside Project Forge research, specialized model families (Hackmanite, Cinnabar, Alexandrite), standalone software platforms (Jaspilite, Forge BattleVerse, ForgerEMS), and original games.',
  vision: {
    current: 'Focused on managed Studio Intelligence Hub pilots (currently in testing on FDS’s own Roblox and Unreal projects), alongside Project Forge research, active application development, verified public software releases, and original productions—with clear boundaries between tested pilot scope, released software, and work in development.',
    activeDevelopment: 'Active work spans FDS Studio Intelligence Hub pilots (in testing), Project Forge research, Jaspilite, Forge BattleVerse, State Lines, CodeForge, Forge Control, Dead Trails West, Kayla AI Publisher, FarmStand Finder, private civic technology, and the ForgerEMS public preview.',
    research: 'FDS research runs through Project Forge across gaming intelligence (Hackmanite), storytelling models (Cinnabar), collective convergence vision (Alexandrite), evaluation systems, and evidence-driven engineering. Work is described publicly only where its status and evidence are verified.',
    planned: 'Near-term focus covers Studio Intelligence Hub managed pilots for Roblox Studio and Unreal Engine studios, scoped engine reference packs, Jaspilite multi-agent engineering workflows, Hackmanite and Cinnabar model development, and verified releases. Community programs remain concepts.',
    aspirational: 'Exploring affordable-community concepts, community gardens, technology reuse programs, and open planning tools that help people understand and manage shared infrastructure.',
    longTerm: 'Let lessons from Studio Intelligence Hub pilots, Project Forge research, specialized models, and shipped tools improve one another while each product keeps explicit technical boundaries.'
  },
  philosophy: [
    'Evidence over assumptions — results should provide evidence that the intended objective was achieved.',
    'Adaptive computation — software should understand and adapt to the hardware and compute environments available to it.',
    'Governed intelligence — training, evaluation, experimentation, and deployment should leave understandable evidence.',
    'Build through experimentation — research findings should become reusable architecture only after surviving meaningful real-world use.'
  ],
  productEcosystem: [
    'FDS Studio Intelligence Hub — managed four-week engineering intelligence pilot for Roblox Studio & Unreal Engine teams (in testing)',
    'Project Forge — permanent 15-division research and engineering foundation',
    'Hackmanite, Cinnabar & Alexandrite — specialized AI model families & collective intelligence research vision',
    'Jaspilite — autonomous multi-agent coding-agent environment (Auto, Meld, Solo; active development)',
    'Forge BattleVerse — fictional intelligence & creative-production platform (Arena & Creator Studio)',
    'State Lines — original AAA-ambition open-world game (preproduction / private development)',
    'CodeForge — free-first autonomous software-engineering platform (downloads temporarily paused)',
    'ForgerEMS — Windows technician workbench and engineering maintenance suite (public preview)'
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
