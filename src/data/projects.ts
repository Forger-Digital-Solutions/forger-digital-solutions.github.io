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
      {
        id: 'forge-aaa',
        title: 'Forge AAA: game-development architecture',
        body: 'Forge AAA is the advanced game-development direction within CodeForge, not a separate executable, product, or release. The intended architecture is to help coordinate complex development tasks across game engines, content tools, asset and animation workflows, code, and verification while keeping the developer in control.',
        items: [
          'Unreal Engine project assistance and game-system implementation',
          'Blender-centered 3D asset and animation workflows',
          'Character development and animation integration',
          'Asset validation, automated testing, and performance investigation',
          'Coordinated specialist roles for bounded engineering tasks'
        ],
        note: 'These are development goals, not a claim that each integration is implemented in CodeForge v0.2.0. Forge AAA does not generate complete AAA games.'
      },
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
    category: 'Multi-Agent Engineering Orchestration', ecosystem: 'Engineering',
    audience: 'Developers coordinating substantial software work across multiple subscription-authenticated coding agents.',
    problem: 'Separate coding agents can leave a developer manually splitting tasks, tracking state, avoiding conflicting edits, and recovering work when capacity changes.',
    differentiation: 'Forge Control is intended to coordinate eligible connected agents in one governed workflow. Its direction is automatic discovery, task decomposition, parallel work where safe, shared progress, and continuation—not a chatbot that asks the user to appoint one replacement agent.',
    summary: 'A separate FDS product in active development: intended to coordinate eligible coding agents, distribute safe independent work, and track verification. No public release or working provider integration is currently verified.',
    description: 'Forge Control is a separate development project focused on multi-agent software-work coordination. Its intended architecture discovers connected eligible agents, checks supported availability signals, decomposes substantial work, dispatches safe independent tasks concurrently, coordinates shared resources, records progress, and continues or resumes unfinished tasks as capacity changes. These describe product direction; this website does not verify that the workflow or any integration is shipped.',
    status: 'ACTIVE DEVELOPMENT', featured: true, stageLabel: 'Active development · no public release',
    tags: ['Agent Orchestration', 'Task Distribution', 'Progress Tracking', 'Verification'],
    focusAreas: ['Discover eligible connected agents', 'Decompose substantial engineering work', 'Dispatch safe independent tasks concurrently', 'Coordinate shared resources and task state', 'Rebalance, pause, and resume unfinished work', 'Return clear verification evidence'],
    highlights: [
      'The intended product coordinates agents automatically; users should not have to designate one special agent to replace another.',
      'Quota-aware continuation is an architectural goal, not a claim of quota access or account pooling.',
      'Potential integrations include OpenAI Codex, Claude Code, GitHub Copilot, and Antigravity; none is claimed as a verified working integration.',
      'Owner-reported Windows Electron/NSIS installer acceptance testing is in progress. V23 certification evidence is not available to this public site.'
    ],
    sections: [
      { title: 'The coordination problem', body: 'Using more than one coding agent can multiply the work around the work: dividing tasks, checking which agent can accept a task, avoiding conflicting edits, preserving shared context, and recovering unfinished work. Forge Control is being designed around coordinating that workflow rather than presenting another standalone chat surface.' },
      { title: 'Intended orchestration workflow', body: 'The product direction is to discover connected eligible agents, inspect supported availability signals, break a substantial request into bounded work, and dispatch independent tasks in parallel when shared resources allow it. A coordinator would track task state, manage dependencies, and present the evidence needed to review the result.', items: ['Discover connected eligible agents', 'Decompose and assign independent work', 'Coordinate shared files and resources', 'Track progress and verification', 'Rebalance and resume work when capacity changes'], note: 'This is the intended architecture. The website does not claim these steps are implemented or certified.' },
      { title: 'Potential integrations', body: 'The owner has identified OpenAI Codex, Claude Code, GitHub Copilot, and Antigravity as potential integration targets. Their current API, subscription, availability, and authentication compatibility has not been verified for this page; they must not be read as supported integrations.' },
      { title: 'Recovery and continuity', body: 'The product goal is to preserve task state and continue eligible unfinished work when an agent reaches a limit or becomes unavailable, then resume when capacity returns. This does not imply access to private subscription quotas, account pooling, or bypassing provider controls.' },
      { title: 'Security and human oversight', body: 'The intended workflow is governed engineering, not unreviewed parallel writes: task boundaries, shared-resource conflicts, permissions, and verification need to remain inspectable. Implementation and security certification details are not yet verified for public claims.' },
      { id: 'forge-control-availability', title: 'Development and availability', body: 'Forge Control is in active development. The owner reports a Windows Electron/NSIS development installer undergoing installed-application acceptance testing; the website has not verified V23 certification or completed acceptance evidence. No public installer, beta, live service, or supported integration is available to claim.' },
      { title: 'Relationship to CodeForge', body: 'Forge Control is a distinct FDS product direction. CodeForge is the released software-engineering product; Forge AAA is a game-development architecture workstream within CodeForge. This relationship does not mean Forge Control is a CodeForge feature or that all products share one executable.' }
    ],
    roadmap: 'Automatic agent discovery, safe parallel task distribution, durable coordination, recovery, and evidence-backed verification are intended direction, not confirmed shipped capabilities.',
    accentColor: '#36b8ba', visualStyle: 'nodes', sortOrder: 3
  },
  {
    id: 'dead-trails-west', slug: 'dead-trails-west', name: 'Dead Trails West',
    category: 'Historical Open-World Game', ecosystem: 'Gaming',
    audience: 'Players drawn to character-led historical worlds, exploration, survival, and communities that respond to player choices.',
    problem: 'Historical immersion is more than a set of period props. People, property, animals, seasons, work, law, and the consequences of a player’s choices should belong to the same evolving world.',
    differentiation: 'Dead Trails West is being developed around an 1882–1900 historical span and the initial region of Sundance, New Jersey; owner-reported persistent-world simulation work has not been independently verified for this website.',
    summary: 'An original historical open-world game in private development, set across 1882–1900 with an initial region in Sundance, New Jersey. Built for Unreal Engine 4.27; no public playable build is available.',
    description: 'Dead Trails West is an original game about the people and places of a changing late-19th-century world. The initial setting is Sundance, New Jersey, and central characters George Bauer and Edward Bauer. The design combines historical storytelling and open-world exploration with settlement life, wildlife, survival, weather and seasons, farming and ranching, hunting and fishing, property, construction, transportation, law, and long-term progression. These are design goals, not a blanket claim that each system is complete. The project uses Unreal Engine 4.27 with Blender-centered asset workflows; no public playable build or release date is available.',
    status: 'PRIVATE DEVELOPMENT', featured: true, stageLabel: 'Private game development · no public build',
    tags: ['Western', '1882', 'Unreal Engine 4.27', 'Persistent World'],
    focusAreas: ['Historical story and open-world exploration', 'Living settlements and character interactions', 'Wildlife, survival, weather, and seasons', 'Farming, ranching, hunting, and fishing', 'Property, construction, and transportation', 'Law, consequence, and long-term world progression'],
    highlights: [
      'Private development; no public playable build or release date is available.',
      'The persistent-world simulation has not been independently verified; this is not full-game certification.',
      'Owner-reported integration checks cover selected travel, store, empty-wallet purchase refusal, and return-route scenarios.'
    ],
    sections: [
      { id: 'dead-trails-setting', title: 'Sundance, 1882–1900', body: 'The story begins in Sundance, New Jersey, in 1882 and is designed to span the years through 1900. George Bauer and Edward Bauer are central characters. This public overview leaves unreleased story scripts and private canon details unpublished.' },
      { title: 'A world with many kinds of play', body: 'The project is not framed as gunfights alone. Its design brings historical storytelling and open-world exploration together with settlement relationships, survival, wildlife, seasons, work, property, and consequences.', items: ['Living settlements and character interactions', 'Wildlife and survival, with dynamic weather and seasonal simulation as design goals', 'Farming, ranching, hunting, and fishing', 'Property development, construction, and transportation', 'Law, consequences, and long-term world progression'], note: 'These are design pillars and planned systems. This list does not assert that all features are currently implemented or playable.' },
      { title: 'Selected integration checks', body: 'Owner-reported development evidence describes automated travel between locations, a general-store interaction, purchase refusal when the player wallet is empty, and a return-route test. These are specific integration scenarios, not a certification of the whole game, a visual-quality review, or evidence of public release.', note: 'The owner-reported test summary has not been independently reproduced in this website repository.' },
      { title: 'Unreal and asset pipeline', body: 'The project targets Unreal Engine 4.27 and uses Blender with associated asset workflows. The development pipeline is intended to connect character work, materials, animation, collisions, validation, and in-engine integration. No gameplay screenshots are available in this public website repository, so the site uses no fabricated in-game imagery.' },
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
