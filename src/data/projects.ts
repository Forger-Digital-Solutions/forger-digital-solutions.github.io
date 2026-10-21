import type { Project } from '../types';
import { visualAssets } from './visuals';

/** Canonical public project records. Summaries feed cards/metadata; sections feed detail pages. */
export const projects: Project[] = [
  {
    id: 'codeforge', slug: 'codeforge', name: 'CodeForge',
    category: 'Autonomous Software Engineering', ecosystem: 'Engineering',
    audience: 'Developers who want a Windows-first engineering agent that can take repository work from plan through verified result while keeping cost and execution boundaries visible.',
    problem: 'Coding assistants often stop at suggestions, lose repository context, or quietly route work through paid inference. Engineering work still needs a controlled path through planning, implementation, checks, and review.',
    differentiation: 'CodeForge combines repository-aware execution, specialized engineering agents, verification, and ForgeZero cost enforcement in one free-first product. It is also part of the engineering foundation behind FDS software.',
    summary: 'A free-first autonomous software-engineering platform for Windows, CLI, and editor work. CodeForge can inspect repositories, plan changes, use tools, run checks, and review results under developer control.',
    description: 'CodeForge owns an engineering task across planning, implementation, testing, review, and verification. Its Windows desktop app, CLI, and VS Code experience share a core runtime, while repository boundaries, approvals, secret scanning, and command-risk rules keep execution governed. Dynamic routing selects only verified zero-cost cloud models; ForgeZero fails closed instead of silently falling back to paid or local inference.',
    status: 'RELEASED', secondaryStatus: 'ACTIVE DEVELOPMENT', featured: true, flagship: true,
    stageLabel: 'Public product and FDS engineering foundation',
    tags: ['Autonomous Engineering', 'Windows', 'CLI', 'VS Code', 'ForgeZero', 'Repository Tools'],
    focusAreas: ['Repository inspection', 'Planning and implementation', 'Specialized agents', 'Tool execution', 'Testing and review', 'Developer approvals'],
    highlights: [
      'Released for Windows with installer and portable builds through GitHub Releases.',
      'ForgeZero rejects paid, local, unknown-cost, and unverified routes rather than creating a billing surprise.',
      'The public product and FDS engineering role are complementary, not separate identities.'
    ],
    sections: [
      { title: 'Autonomous Engineering', body: 'CodeForge takes ownership of a bounded repository task: inspect the workspace, form a plan, modify code through approved tools, run verification, review the result, and report what changed. The developer can pause, resume, cancel, or deny execution.' },
      { title: 'Free-First Intelligence', body: 'The default model boundary is free, remote, cloud-hosted, and verified. Dynamic routing chooses among legitimate zero-cost options, while ForgeZero refuses paid inference, local models, unknown pricing, and unverified providers.', note: 'Free provider capacity can be quota-limited. CodeForge does not promise unlimited model availability.' },
      { title: 'Repository Awareness', body: 'Workspace context, sessions, turns, events, file operations, Git tooling, and language-server integration are organized around the repository being changed—not an isolated chat transcript.' },
      { title: 'Specialized Agents', body: 'Engineering roles cover planning, implementation, testing, review, verification, security, documentation, architecture, and other focused work. The director coordinates them against one task and shared repository state.' },
      { title: 'Verification & Safety', items: ['Workspace and path isolation', 'Command risk classification and approval', 'Secret scanning before model context leaves the machine', 'Testing and review inside the task lifecycle', 'Fail-closed model and cost eligibility'] },
      { title: 'Developer Control', body: 'Autonomy does not remove oversight. Repository scope, permissions, provider eligibility, and execution controls remain visible, and CodeForge reports failures or blocked routes rather than disguising them as success.' },
      { title: 'Current Availability', body: 'CodeForge v0.2.0 is released for Windows 10/11 x64 as an installer and portable executable. Builds are currently unsigned, so Windows may show an unknown-publisher warning; SHA-256 checksums are published with the release.', items: ['Desktop application', 'Command-line interface', 'VS Code integration', 'Installer and portable Windows builds'] },
      { id: 'forge-aaa', title: 'Forge AAA', body: 'Forge AAA is an architecture workstream within the CodeForge ecosystem, not a separate public product. This page does not claim a standalone release or capabilities beyond the released CodeForge version.' },
      { title: 'Routing Systems in Development', body: 'Active development continues beyond the released v0.2.0 binary on model-control and runtime-efficiency work. These efforts are not backported claims about the public release.', items: ['ForgeAuto — automatic selection across verified zero-cost models', '8-Bit — dynamic model-routing and failover under changing provider health and quotas', 'ForgeZero — the fail-closed zero-cost boundary', 'ForgeGreen — runtime-efficiency research'] },
      { title: 'Where It Fits Inside FDS', body: 'CodeForge is both public software and an engineering foundation used across FDS. Its repository intelligence, agent coordination, verification discipline, and controlled execution inform how other FDS products are developed.' }
    ],
    githubUrl: 'https://github.com/Forger-Digital-Solutions/CodeForge',
    websiteUrl: 'https://github.com/Forger-Digital-Solutions/CodeForge/releases/latest',
    documentationUrl: 'https://github.com/Forger-Digital-Solutions/CodeForge#readme',
    roadmap: 'Broader repository intelligence, editor integration, verified provider coverage, and autonomous engineering depth.',
    accentColor: '#5a82e8', visualStyle: 'nodes', sortOrder: 1,
    heroImage: visualAssets.codeforgeWorkspace
  },
  {
    id: 'forgerems', slug: 'forgerems', name: 'ForgerEMS',
    category: 'Technician Workbench', ecosystem: 'Engineering',
    audience: 'PC technicians, repair shops, and Windows users who need diagnostics, maintenance, and recovery tooling in one place.',
    problem: 'Technician work jumps between USB toolkit creation, drive validation, port intelligence, system inspection, driver guidance, and recovery tasks — usually across separate utilities with no shared workflow.',
    differentiation: 'ForgerEMS brings those jobs into one local-first Windows workbench built around technician workflows rather than feature sprawl.',
    summary: 'A Windows technician workbench for diagnostics, maintenance, and repair: USB toolkit creation, drive validation, USB and port intelligence, system information, driver guidance, and local-first diagnostics.',
    description: 'Forger Engineering Maintenance Suite is a local-first Windows application for diagnostics, maintenance, and repair-oriented work. It combines USB toolkit creation, drive validation, USB and port intelligence, system information, driver guidance, and local-first diagnostics in one technician application. The public release is a preview: capabilities and packaging may change between builds, and the v1.2.4-preview.1 binaries are unsigned. Public preview builds are hosted on GitHub Releases.',
    status: 'PREVIEW / BETA', featured: false,
    stageLabel: 'Public preview',
    tags: ['Windows', 'Diagnostics', 'USB Tooling', 'Drive Validation', 'Maintenance', 'Repair'],
    focusAreas: ['USB toolkit creation', 'Drive validation', 'USB and port intelligence', 'System information', 'Driver guidance', 'Local-first diagnostics'],
    highlights: [
      'v1.2.4-preview.1 is the current public preview for Windows.',
      'USB Builder, Drive Validator, USB and port intelligence, system information, driver guidance, and local-first diagnostics.',
      'Published as a portable ZIP and an installer; both are unsigned preview artifacts.',
      'Verify checksums before running; see the release page for SHA-256 hashes.'
    ],
    sections: [
      { title: 'Public Preview v1.2.4-preview.1', body: 'ForgerEMS v1.2.4-preview.1 is available for Windows as a public preview. It includes USB Builder, Drive Validator, USB and port intelligence, system information, driver guidance, and local-first diagnostics. Download the portable ZIP or the installer from the release page; both are unsigned preview artifacts.', items: ['Windows application', 'USB toolkit creation', 'Drive validation', 'USB and port intelligence', 'System information and driver guidance'] },
      { title: 'In Development', body: 'Work continues on technician workflows, recovery tooling, and repair-oriented utilities. Features shown here as in development are not necessarily part of the public preview download until they are released.' },
      { title: 'Built for Technicians', body: 'The workbench is organized around how repair work actually happens: inspect the machine, validate media, prepare toolkits, and keep guidance close while the job is in progress.' },
      { title: 'Local-First', body: 'ForgerEMS runs locally on the technician machine. Diagnostic data stays on the device unless you choose to export or share it.' },
      { title: 'Preview Trust Notes', body: 'The v1.2.4-preview.1 binaries are unsigned, so Windows SmartScreen may show an unknown-publisher warning. Verify SHA-256 checksums against the release page before running. This preview is not production-certified or Microsoft Verified.' }
    ],
    githubUrl: 'https://github.com/Forger-Digital-Solutions/ForgerEMS',
    websiteUrl: '/forgerems',
    documentationUrl: 'https://github.com/Forger-Digital-Solutions/ForgerEMS#readme',
    roadmap: 'Technician workflows, recovery tooling, and repair-oriented utilities across preview releases.',
    accentColor: '#e0a63c', visualStyle: 'nodes', sortOrder: 2
  },
  {
    id: 'forge-control', slug: 'forge-control', name: 'Forge Control',
    category: 'Engineering Governance', ecosystem: 'Engineering',
    audience: 'Teams and builders who need clear control and verification around software-engineering work.',
    problem: 'Engineering workflows need accountable execution and evidence, not just activity or generated output.',
    differentiation: 'Forge Control is a separate active FDS development project. Public product details are deliberately limited until implementation and integrations can be verified from an authoritative source.',
    summary: 'An active FDS development project. No public release, live service, integrations, or specific shipped capabilities are currently verified.',
    description: 'Forge Control is in active development. This public page records its place in the FDS portfolio without presenting a roadmap or intended direction as working software. No public download or third-party integration is currently verified.',
    status: 'ACTIVE DEVELOPMENT', featured: true, stageLabel: 'Active development · no public release',
    tags: ['Engineering', 'Governance', 'Verification'],
    focusAreas: ['Product development', 'Implementation verification'],
    highlights: [
      'Active FDS development project; no public release is available.',
      'No specific integration or shipped capability is claimed on this page.'
    ],
    sections: [
      { title: 'Current Status', body: 'The project is active, but the website does not have access to an authoritative, current public source repository. Specific behavior, interfaces, and integrations are therefore not described as implemented.' },
      { title: 'Availability', body: 'There is no public download or live service to use today. Product documentation will be expanded when its claims can be verified.' }
    ],
    roadmap: 'Public product detail will follow verified implementation and release evidence.',
    accentColor: '#36b8ba', visualStyle: 'nodes', sortOrder: 3
  },
  {
    id: 'dead-trails-west', slug: 'dead-trails-west', name: 'Dead Trails West',
    category: 'Historically Grounded Game', ecosystem: 'Gaming',
    audience: 'Players interested in historically grounded Western worlds and character-driven survival stories.',
    problem: 'A convincing historical game world depends on more than scenery: the world, people, animals, time, and player actions need to feel connected.',
    differentiation: 'Dead Trails West is developed around a documented 1882 setting and a persistent-world simulation, with current engine evidence labeled by its actual verification state.',
    summary: 'A private Unreal Engine 4.27 game project set in 1882. The persistent-world simulation foundation is partially verified; no public playable build is available.',
    description: 'Dead Trails West is a historically grounded Western game in private development. Current project records identify an 1882 setting and a Sundance world, with a persistent-world simulation core and Unreal Engine 4.27 adapter under verification. Project records explicitly mark live material-driven visuals as still mid-verification. These are development milestones, not a finished public game.',
    status: 'PRIVATE DEVELOPMENT', featured: true, stageLabel: 'Private game development · no public build',
    tags: ['Western', '1882', 'Unreal Engine 4.27', 'Persistent World'],
    focusAreas: ['World simulation', 'Historically grounded environments', 'Character and animal systems', 'Unreal Engine integration'],
    highlights: [
      'Private development; no public playable build or release date is available.',
      'Current project status marks the simulation foundation verified only in part.',
      'The project uses Unreal Engine 4.27; live visual verification remains in progress.'
    ],
    sections: [
      { title: 'An 1882 World', body: 'The current project records identify an 1882 setting centered on Sundance. Historical and property details remain grounded in the project’s private canon and are not expanded into unsupported public claims.' },
      { title: 'World Simulation', body: 'The documented persistent-world simulation core and adapter are partially verified. Recent project evidence also reports a packaged distribution certification milestone; that evidence does not establish a publicly playable release.' },
      { title: 'Built for Unreal Engine', body: 'The active game project targets Unreal Engine 4.27. Current engineering records separate simulation-core evidence from live material and in-engine visual verification.' },
      { title: 'Availability', body: 'Dead Trails West is in private development. There is no public download, playable build, or announced release date.' }
    ],
    privacyNotice: 'Private-development source and assets are not distributed through this website.',
    roadmap: 'World simulation, playable systems, historical world-building, and in-engine verification.',
    githubUrl: 'https://github.com/Forger-Digital-Solutions/DeadTrailsWest',
    documentationUrl: 'https://github.com/Forger-Digital-Solutions/DeadTrailsWest',
    accentColor: '#c47c4f', visualStyle: 'blocks', sortOrder: 4
  },
  {
    id: 'kayla-ai-publisher', slug: 'kayla-ai-publisher', name: 'Kayla AI Publisher', shortName: 'Kayla Publisher',
    category: 'Creative Project & Publishing Workspace', ecosystem: 'Publishing',
    audience: 'Writers, storytellers, illustrators, independent authors, and small publishers carrying long-form work from early idea toward publication.',
    problem: 'A book or visual story is spread across outlines, drafts, chapters, character notes, revisions, artwork, formatting, translation, and publishing preparation. Fragmented tools make continuity hard to maintain.',
    differentiation: 'Kayla is organized around the whole creative project rather than isolated text generation. The product direction keeps manuscript structure, story state, revision, visual work, and publication preparation connected while the creator retains authorship.',
    summary: 'One continuous creative-project workspace for manuscripts, chapters, characters, revisions, visual storytelling, and publishing preparation. Kayla helps the creator move the complete work forward.',
    description: 'Kayla AI Publisher is being developed as a continuous home for a creative work. It connects drafts, chapters, characters, structure, tone, revision, illustration direction, translation, organization, formatting, and publication preparation according to the maturity of each feature. The creator remains the author and final decision-maker.',
    status: 'ACTIVE DEVELOPMENT', featured: false,
    tags: ['Manuscripts', 'Story Development', 'Revision', 'Visual Storytelling', 'Publishing', 'Project Continuity'],
    focusAreas: ['Manuscript structure', 'Characters and story state', 'Writing and revision', 'Illustration direction', 'Translation direction', 'Publishing preparation'],
    highlights: ['Kayla AI Publisher is a standalone creative product; it is not the website guide.', 'Public copy describes product direction conservatively because no public release is currently listed.'],
    sections: [
      { title: 'From Idea to Published Work', body: 'Kayla is meant to follow the same creative project from early notes through drafts, revision, organization, visual development, formatting, and publication preparation.' },
      { title: 'Project Continuity', body: 'The central thesis is continuity: chapters, characters, story structure, tone, open decisions, and revision state should remain connected instead of becoming disconnected prompts and documents.' },
      { title: 'Writing & Revision', items: ['Outlining and story organization', 'Draft and chapter development', 'Character and continuity tracking', 'Editing and revision support', 'Creator-controlled tone and direction'] },
      { title: 'Visual Storytelling', body: 'Illustration and image direction belong to the same creative project, with human review and authorship preserved. The exact production features remain under active development.' },
      { title: 'Publishing Pipeline', body: 'Formatting, translation direction, asset organization, and publication preparation are part of the long-term connected workspace. Public availability and exact feature boundaries will be announced only when they are ready.' }
    ],
    roadmap: 'Connected manuscript memory, revision, visual storytelling, translation direction, and publication preparation.',
    accentColor: '#d9813f', visualStyle: 'manuscript', sortOrder: 5
  },
  {
    id: 'we-the-people', slug: 'we-the-people', name: 'We The People Library', shortName: 'We The People',
    category: 'Offline Knowledge Platform', ecosystem: 'Civic',
    audience: 'People who need practical information to stay available when connectivity is not — households, students, technicians, farmers, and community members.',
    problem: 'Practical knowledge is often locked behind connectivity. When the internet is unavailable, expensive, or unreliable, the reference material people need — civics, public information, medicine and reference, science, engineering, trades, agriculture, mathematics, and general reference — should not disappear with it.',
    differentiation: 'The platform is being shaped around offline-first access: knowledge that is stored locally, structured for discovery, traceable to its sources, and resilient enough to keep working without a network.',
    summary: 'An offline-first knowledge library designed to keep practical reference material available locally — civics, public information, science, engineering, trades, agriculture, mathematics, and general reference.',
    description: 'We The People Library is in private development around a practical question: how can essential knowledge stay available offline? The platform direction covers offline-first access, local knowledge storage, structured discovery, source provenance, and resilience. Civics and public information remain a foundation domain, joined by medicine and reference, science, engineering, trades, agriculture, mathematics, and general reference as scope supports them.',
    status: 'PRIVATE DEVELOPMENT', featured: false,
    tags: ['Offline-First', 'Local Knowledge', 'Structured Discovery', 'Source Provenance', 'Resilience', 'Reference'],
    focusAreas: ['Offline-first access', 'Local knowledge storage', 'Structured discovery', 'Source provenance', 'Reliability and resilience', 'Practical reference domains'],
    sections: [
      { title: 'Knowledge That Stays Available', body: 'The platform direction is offline-first: once knowledge is stored locally, it remains available without a network connection, an account, or a subscription.' },
      { title: 'Practical Domains', items: ['Civics and public information', 'Medicine and health reference', 'Science', 'Engineering', 'Trades', 'Agriculture', 'Mathematics', 'General reference'] },
      { title: 'Structured Discovery', body: 'Stored knowledge is organized so people can find what they need — by topic, task, or question — rather than paging through unstructured archives.' },
      { title: 'Source Provenance', body: 'Material should remain traceable to its origin. Local availability helps navigation and study, not the replacement of authoritative sources.' },
      { title: 'Reliability & Resilience', body: 'The library is designed for the situations where it matters most: unreliable connections, offline environments, and long-term local storage.' }
    ],
    privacyNotice: 'Implementation details remain private during active development. Public descriptions cover verified scope and direction only.',
    roadmap: 'Private product development across offline-first access, local knowledge storage, structured discovery, and provenance-grounded reference material.',
    accentColor: '#8792a8', visualStyle: 'civic', sortOrder: 6
  },
  {
    id: 'farmstand-finder', slug: 'farmstand-finder', name: 'FarmStand Finder',
    category: 'Nearby Food & Producer Discovery', ecosystem: 'Local Discovery',
    audience: 'People looking for nearby produce and local food, plus farms, roadside stands, markets, CSAs, producers, and community gardens that need to be discoverable.',
    problem: 'Finding local food often means scattered listings, word of mouth, or driving around without knowing what is open, in season, nearby, or available.',
    differentiation: 'FarmStand Finder keeps the question concrete: what is near me, what kind of place is it, when is it open, what may be available, who grows or sells it, and how far away is it?',
    summary: 'A nearby-discovery application for finding farms, roadside stands, growers, markets, CSAs, producers, community gardens, and seasonal food information.',
    description: 'FarmStand Finder is being developed to answer the questions people actually have when seeking local food. Listings distinguish the kind of place, location, distance, producer, hours, and seasonal context so a useful trip does not depend on scattered social posts or chance.',
    status: 'ACTIVE DEVELOPMENT', featured: false,
    tags: ['Nearby', 'Farm Stands', 'Farms', 'Markets', 'Growers', 'Seasonal Produce'],
    focusAreas: ['Nearby discovery', 'Farms and growers', 'Markets and stands', 'Seasonal availability', 'Community listings', 'Producer information'],
    highlights: ['The public scope is discovery and producer visibility; it does not claim live inventory, payments, or subscription management.'],
    sections: [
      { title: "Find What's Nearby", body: 'Location and distance help answer the first question: which farms, stands, markets, CSAs, producers, or community gardens are close enough to visit?' },
      { title: 'Farms & Growers', body: 'Producer information helps visitors understand who grows or sells the food and what kind of operation they are visiting.' },
      { title: 'Markets & Stands', items: ['Roadside stands', 'Farms and growers', 'Farmers markets', 'CSA programs', 'Food producers', 'Community gardens'] },
      { title: 'Seasonal Discovery', body: 'Hours, open status, likely seasonal availability, and listing freshness are central product questions. Exact live-data features remain under development.' },
      { title: 'Community Listings', body: 'Clear listing types and practical details can help small producers become easier to find without requiring a complex commerce platform.' }
    ],
    roadmap: 'Nearby search, clearer listing types, producer details, hours, and seasonal discovery.',
    accentColor: '#76b77d', visualStyle: 'map', sortOrder: 7
  }
];

/**
 * Contextual end-of-page navigation per project. These are editorial choices,
 * not sortOrder defaults: each link should be a real conceptual continuation
 * of the page the visitor just finished. Projects not listed here fall back to
 * the two nearest projects by sortOrder plus the full directory.
 */
export const exploreNextBySlug: Record<string, { label: string; href: string; note: string }[]> = {
  codeforge: [
    { label: 'Forge Control', href: '/projects/forge-control', note: 'A separate active FDS engineering project' },
    { label: 'Forge AAA', href: '/projects/codeforge#forge-aaa', note: 'An architecture workstream within CodeForge' },
    { label: 'Forged', href: '/forged', note: 'The FDS release shelf' },
    { label: 'All Projects', href: '/projects', note: 'Full directory' }
  ],
  'forge-control': [
    { label: 'CodeForge', href: '/projects/codeforge', note: 'Engineering foundation behind FDS tooling' },
    { label: 'Dead Trails West', href: '/projects/dead-trails-west', note: 'A private FDS game project' },
    { label: 'All Projects', href: '/projects', note: 'Full directory' }
  ],
  'dead-trails-west': [
    { label: 'Forge Control', href: '/projects/forge-control', note: 'A separate active FDS engineering project' },
    { label: 'All Projects', href: '/projects', note: 'Full directory' }
  ],
  'kayla-ai-publisher': [
    { label: 'CodeForge', href: '/projects/codeforge', note: 'Released FDS engineering software' },
    { label: 'Notes', href: '/notes', note: 'Build and research field notes' },
    { label: 'All Projects', href: '/projects', note: 'Full directory' }
  ],
  'we-the-people': [
    { label: 'Technology', href: '/technology', note: 'How the stack maps to projects' },
    { label: 'FarmStand Finder', href: '/projects/farmstand-finder', note: 'Fellow practical-application product' },
    { label: 'All Projects', href: '/projects', note: 'Full directory' }
  ],
  'farmstand-finder': [
    { label: 'Community Impact', href: '/community-impact', note: 'Local-food and community concepts' },
    { label: 'We The People', href: '/projects/we-the-people', note: 'Fellow practical-information product' },
    { label: 'All Projects', href: '/projects', note: 'Full directory' }
  ]
};
