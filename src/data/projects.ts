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
      { title: 'Routing Systems in Development', body: 'Active development continues beyond the released v0.2.0 binary on a distinct set of model-control systems. They are part of current engineering work, not backported claims about the public release.', items: ['ForgeAuto — the automatic selection mode that routes free-experience work across verified zero-cost models', '8-Bit — a dynamic model-routing and failover core that keeps sessions working as free-model availability, quotas, and health change; routing authority only, with no path into permissions, approvals, or verification', 'ForgeZero — the fail-closed zero-cost boundary those systems operate inside', 'ForgeGreen — runtime efficiency research that reduces wasted work without weakening verification'] },
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
    summary: 'A Windows technician workbench for diagnostics, maintenance, and repair: USB toolkit creation, drive validation, USB and port intelligence, system information, driver guidance, and local-first Kyra assistance.',
    description: 'Forger Engineering Maintenance Suite is a local-first Windows application for diagnostics, maintenance, and repair-oriented work. It combines USB toolkit creation, drive validation, USB and port intelligence, system information, driver guidance, and local-first Kyra assistance in one technician application. The public release is a preview: capabilities and packaging may change between builds. Public preview builds are hosted on GitHub Releases.',
    status: 'PREVIEW / BETA', featured: false,
    stageLabel: 'Public preview',
    tags: ['Windows', 'Diagnostics', 'USB Tooling', 'Drive Validation', 'Maintenance', 'Repair'],
    focusAreas: ['USB toolkit creation', 'Drive validation', 'USB and port intelligence', 'System information', 'Driver guidance', 'Local-first Kyra assistance'],
    highlights: [
      'v1.2.3-preview.1 is a public preview for Windows.',
      'USB Builder, Drive Validator, USB and port intelligence, system information, driver guidance, and local-first Kyra assistance.',
      'Preview builds may change between releases; verify checksums before running.'
    ],
    sections: [
      { title: 'Public Preview', body: 'ForgerEMS v1.2.3-preview.1 is available for Windows as a public preview. It includes USB Builder, Drive Validator, USB and port intelligence, system information, driver guidance, and local-first Kyra assistance.', items: ['Windows application', 'USB toolkit creation', 'Drive validation', 'USB and port intelligence', 'System information and driver guidance'] },
      { title: 'In Development', body: 'Work continues on technician workflows, recovery tooling, and repair-oriented utilities. Features shown here as in development are not necessarily part of the public preview download until it is released.' },
      { title: 'Built for Technicians', body: 'The workbench is organized around how repair work actually happens: inspect the machine, validate media, prepare toolkits, and keep guidance close while the job is in progress.' },
      { title: 'Local-First', body: 'ForgerEMS runs locally on the technician machine. Kyra assistance inside ForgerEMS is local-first and does not require sending the workbench state to a server.' }
    ],
    githubUrl: 'https://github.com/Forger-Digital-Solutions/ForgerEMS',
    websiteUrl: 'https://github.com/Forger-Digital-Solutions/ForgerEMS/releases',
    documentationUrl: 'https://github.com/Forger-Digital-Solutions/ForgerEMS',
    roadmap: 'Technician workflows, recovery tooling, and repair-oriented utilities across preview releases.',
    accentColor: '#e0a63c', visualStyle: 'nodes', sortOrder: 2
  },
  {
    id: 'gems-training-grounds', slug: 'gems-training-grounds', name: 'GEMS / Training Grounds', shortName: 'GEMS',
    category: 'AI Model Research & Capability Development', ecosystem: 'Intelligence',
    audience: 'People following practical AI model specialization, evaluation, curriculum design, agentic learning, and affordable intelligence research.',
    problem: 'Useful intelligence requires more than a capable foundation model. It needs deliberate curriculum, trustworthy evaluation, controlled advancement, and a path from research checkpoints to specialized real-world performance.',
    differentiation: 'GEMS is a family of developing intelligences, while Training Grounds is the environment that teaches, challenges, evaluates, and advances them. The program specializes on strong open or pretrained foundations where a role benefits from them, and keeps fully from-scratch FDS-developed model development as longer-term research.',
    summary: 'Four independent AI research lineages—generalist, software engineering, quantitative reasoning, and multimodal—plus the Training Grounds used to teach, evaluate, and advance them.',
    description: 'GEMS combines four developing model identities with a governed learning environment. Current strategy builds on strong open or pretrained foundations where appropriate; fully from-scratch FDS-developed foundations remain longer-term research. Training Grounds organizes curriculum, controlled training, trials, checkpoints, and evaluation so advancement depends on demonstrated learning, not activity.',
    status: 'RESEARCH', featured: true, flagship: true, stageLabel: 'Flagship AI research',
    tags: ['Specialized Intelligence', 'Curriculum', 'Evaluation', 'Agentic Learning', 'Model Lineages', 'Affordable AI'],
    focusAreas: ['Specialized model research', 'Training Grounds evaluation discipline', 'Curriculum design', 'Agentic and tool-use learning', 'Evaluation checkpoints', 'Multimodal systems'],
    highlights: [
      'GEMS is a family of four independent research lineages, not one model wearing different hats.',
      'Training Grounds separates activity from demonstrated learning through held-out evaluation and checkpoints.',
      'Affordable frontier-like usefulness is a long-term target, not a claim of current parity.'
    ],
    sections: [
      { title: 'Current Research', items: ['Topaz: broad language, reasoning, planning, and orchestration', 'Sapphire: coding, repair, repository reasoning, and engineering tools — experimental research checkpoints have been evaluated through Training Grounds', 'Peridot: mathematics, science, formal reasoning, and verification', 'Garnet: document and visual understanding, with image generation kept as a separate module', 'Curriculum design, held-out evaluation, and learning-versus-memorization checks', 'Hardware-aware training and evaluation'] },
      { title: 'Training Grounds', items: ['Curriculum creation', 'Model post-training and candidate training', 'Evaluation, including protected evaluation where appropriate', 'Failure diagnosis and remediation', 'Advancement, promotion, and specialization', 'Architecture experimentation'] },
      { title: 'Foundation Strategy', body: 'Current GEMS work may begin from strong open or pretrained foundations where a role benefits from them. Fully from-scratch, FDS-developed model foundations remain longer-term research as datasets, compute, and capacity allow. Neither path changes the rule that no GEM is presented as a public production model.' },
      { title: 'Long-Term Direction', body: 'As datasets, compute, funding, and research capacity expand, GEMS continues toward deeper FDS-developed foundations. Those are research directions—not shipped capability claims.' }
    ],
    roadmap: 'Specialized model research, controlled capability advancement, and Training Grounds evaluation discipline as the program matures.',
    accentColor: '#2f6bff', visualStyle: 'gem', sortOrder: 3,
    heroImage: visualAssets.gemsFamily
    // trainingGrounds visual now lives inside the Training Grounds subsection
    // of GemsDeep, not a generic end-of-page gallery.
  },
  {
    id: 'kyrablox', slug: 'kyrablox', name: 'KyraBlox',
    category: 'Project-Aware Game Development', ecosystem: 'Gaming',
    audience: 'Game creators and developers who need an assistant to understand the project, engine, scripts, plan, approvals, and validation—not just answer isolated questions.',
    problem: 'Game work spans project structure, scripts, objects, engine state, debugging, testing, and iteration. A generic chatbot cannot see enough of that connected state to own a development mission safely.',
    differentiation: 'KyraBlox is local-first, provider-neutral, and inspect-first. One governed runtime attaches to the project, builds an understanding snapshot, plans against that state, proposes bounded changes, validates results, and preserves approval and recovery history.',
    summary: 'A local-first, project-aware game-development platform that understands repositories, scripts, engines, plans, approvals, and validation. Roblox has the deepest current integration; other engine paths have explicitly limited maturity.',
    description: 'KyraBlox keeps one mission, conversation, plan lifecycle, approval model, execution history, and recovery path around the game project being developed. Kyra is the cross-engine primary intelligence; focused agents cover Roblox, Unreal, Unity, Godot, desktop/web/2D, and systems domains. Current engine support is labeled honestly so planning-only paths are not presented as live editor control.',
    status: 'ACTIVE DEVELOPMENT', featured: false, stageLabel: 'Private 0.3.0-preview.2 development line',
    tags: ['Game Projects', 'Roblox', 'Project Intelligence', 'Guarded Execution', 'Multi-Engine', 'Local-First'],
    focusAreas: ['Project inspection', 'Scripts and systems', 'Plans and approvals', 'Guarded file changes', 'Validation and review', 'Engine-specific capability'],
    highlights: [
      'No public KyraBlox release or download is currently available.',
      'Roblox has an integrated guarded transaction path; live mutation requires a paired Studio session.',
      'Unreal has a fixture-validated bridge and plugin; Unity and Godot are currently planning/file-workflow paths.',
      'Provider authentication is fixture-tested, not publicly certified as a live subscription service.'
    ],
    sections: [
      { title: 'Build With Project Context', body: 'KyraBlox attaches to a project and inspects its structure, source, version control, tests, engine adapter, and available provider routes. Questions and plans begin from that project state instead of asking the creator to re-explain the game every session.' },
      { title: 'Game-Aware Intelligence', body: 'The platform connects scripts, gameplay systems, engine state, mission history, approvals, validation, and recovery. That is the difference between advice about a hypothetical game and assistance grounded in the game being made.' },
      { title: 'Roblox First', body: 'Roblox is the most developed engine path, with guarded file transactions and a separately approved Studio transaction route. Publishing, uploads, purchases, and unrestricted execution remain outside the current boundary.' },
      { title: 'Scripts, Systems & Iteration', items: ['Project and file inspection', 'Gameplay and system planning', 'Bounded script proposals', 'Exact diff review and approval', 'Testing and validation', 'Rollback and recovery state'] },
      { title: 'Multi-Engine Direction', body: 'Unreal currently has a fixture-validated bridge and plugin without certified live editor mutation. Unity, Godot, desktop/web/2D, and custom-engine paths support planning or file-oriented work at different maturity levels. Broader live integration remains in development.' }
    ],
    roadmap: 'Deeper live engine validation, provider certification, focused-agent product packaging, and broader project-aware development coverage.',
    accentColor: '#b487ff', visualStyle: 'blocks', sortOrder: 4,
    heroImage: visualAssets.kyrabloxCommandCenter,
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
    { label: 'GEMS', href: '/projects/gems-training-grounds', note: 'AI model research the engineering supports' },
    { label: 'Forged', href: '/forged', note: 'The FDS release shelf' },
    { label: 'All Projects', href: '/projects', note: 'Full directory' }
  ],
  'gems-training-grounds': [
    { label: 'CodeForge', href: '/projects/codeforge', note: 'Released FDS engineering software' },
    { label: 'Lab', href: '/lab', note: 'How FDS establishes what is true' },
    { label: 'All Projects', href: '/projects', note: 'Full directory' }
  ],
  kyrablox: [
    { label: 'CodeForge', href: '/projects/codeforge', note: 'Engineering foundation behind FDS tooling' },
    { label: 'GEMS', href: '/projects/gems-training-grounds', note: 'Model research behind game intelligence' },
    { label: 'All Projects', href: '/projects', note: 'Full directory' }
  ],
  'kayla-ai-publisher': [
    { label: 'GEMS', href: '/projects/gems-training-grounds', note: 'Publishing-intelligence research lineage' },
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
