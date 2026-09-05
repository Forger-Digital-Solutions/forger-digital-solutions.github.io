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
    id: 'gems-training-grounds', slug: 'gems-training-grounds', name: 'GEMS / Training Grounds', shortName: 'GEMS',
    category: 'AI Model Research & Capability Development', ecosystem: 'Intelligence',
    audience: 'People following practical AI model specialization, evaluation, curriculum design, agentic learning, and affordable intelligence research.',
    problem: 'Useful intelligence requires more than a capable foundation model. It needs deliberate curriculum, trustworthy evaluation, controlled advancement, and a path from research checkpoints to specialized real-world performance.',
    differentiation: 'GEMS is a family of developing intelligences, while Training Grounds is the environment that teaches, challenges, evaluates, and advances them. The near-term strategy can begin from strong open foundations and produce increasingly FDS-specific models through post-training and specialization.',
    summary: 'Four independent AI research lineages—generalist, software engineering, quantitative reasoning, and multimodal—plus the Training Grounds used to teach, evaluate, and advance them.',
    description: 'GEMS combines four developing model identities with a governed learning environment. Phase 158 Generation 0 has selected distinct upstream foundation candidates for Topaz, Sapphire, Peridot, and Garnet, but those untouched or partially acquired artifacts are not GEMS models. Training Grounds organizes curriculum, specialization, trials, checkpoints, and evaluation so advancement depends on demonstrated learning.',
    status: 'RESEARCH', featured: true, flagship: true, stageLabel: 'Flagship AI research',
    tags: ['Model Specialization', 'Post-Training', 'Curriculum', 'Evaluation', 'Agentic Learning', 'Affordable AI'],
    focusAreas: ['Distinct open foundation candidates', 'Post-training and specialization', 'Curriculum design', 'Agentic and tool-use learning', 'Evaluation checkpoints', 'Multimodal systems'],
    highlights: [
      'Frontier-scale pretraining is not a prerequisite for distinctive FDS model work.',
      'Training Grounds separates activity from demonstrated learning through held-out evaluation and checkpoints.',
      'Affordable frontier-like usefulness is a long-term target, not a claim of current parity.'
    ],
    sections: [
      { title: 'What GEMS Is', body: 'GEMS is a developing family of specialized intelligences. Topaz pursues broad reasoning and orchestration; Sapphire software engineering; Peridot mathematics and technical reasoning; and Garnet multimodal and publishing intelligence. Training Grounds owns the shared teaching, evaluation, and advancement discipline.' },
      { title: 'Foundation Strategy', body: 'Phase 158 Generation 0 recommends distinct OLMo 2, Qwen2.5-Coder, Mathstral, and SmolVLM2 base checkpoints for the four lineages. A candidate foundation is not a GEMS model: each lineage still requires governed acquisition, training, independent evaluation, and registration before it can earn that name.' },
      { title: 'Current Research', items: ['Topaz: broad language, reasoning, planning, and orchestration', 'Sapphire: coding, repair, repository reasoning, and engineering tools', 'Peridot: mathematics, science, formal reasoning, and verification', 'Garnet: document and visual understanding, with image generation kept as a separate module', 'Curriculum design, held-out evaluation, and learning-versus-memorization checks', 'Hardware-aware training and evaluation'] },
      { title: 'Long-Term Direction', body: 'As datasets, compute, funding, and research capacity expand, GEMS may move toward deeper FDS-developed foundations and eventually full foundation-model work. Those are research directions—not shipped capability claims.' }
    ],
    roadmap: 'Post-training, specialization, controlled capability advancement, and increasingly FDS-developed foundations over time.',
    accentColor: '#2f6bff', visualStyle: 'gem', sortOrder: 2,
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
    accentColor: '#b487ff', visualStyle: 'blocks', sortOrder: 3,
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
    accentColor: '#d9813f', visualStyle: 'manuscript', sortOrder: 4
  },
  {
    id: 'we-the-people', slug: 'we-the-people', name: 'We The People',
    category: 'Civic Information & Resource Navigation', ecosystem: 'Civic',
    audience: 'People trying to understand public information, find services and community resources, or navigate civic processes.',
    problem: 'Official information is often distributed across dense documents, agencies, jurisdictions, and service portals. Finding the relevant source and understanding the next step can be unnecessarily difficult.',
    differentiation: 'The product is being shaped around understandable, source-grounded civic navigation: locating official material, explaining it in plain language, and connecting people with relevant services and resources.',
    summary: 'A civic-information product for making government material, public services, eligibility information, and community resources easier to understand and navigate.',
    description: 'We The People is in private development around a practical question: how can software help someone move from confusing public information to an understandable next step? The work covers official sources, plain-language explanation, resource discovery, service navigation, and the boundaries between local, state, and federal information.',
    status: 'PRIVATE DEVELOPMENT', featured: false,
    tags: ['Public Information', 'Official Sources', 'Services', 'Civic Navigation', 'Accessibility', 'Neutrality'],
    focusAreas: ['Official-source grounding', 'Plain-language summaries', 'Public services', 'Eligibility information', 'Community resources', 'Understandable next steps'],
    sections: [
      { title: 'Understand Public Information', body: 'The product direction focuses on turning dense government material into clearer explanations while preserving links back to the official source.' },
      { title: 'Official Sources', body: 'Public documents, agency pages, service information, and jurisdiction-specific material must remain traceable. Summaries should help navigation, not replace authoritative guidance.' },
      { title: 'Services & Resources', items: ['Government and agency information', 'Public services and eligibility', 'Community resource discovery', 'Local, state, and federal navigation', 'Plain-language next steps'] },
      { title: 'Accessibility & Clarity', body: 'Information should be readable, navigable, and useful to people who do not already understand the agency or process behind it.' },
      { title: 'Neutrality', body: 'We The People is nonpartisan. It is intended to clarify public information and civic processes without political advocacy or partisan framing.' }
    ],
    privacyNotice: 'Implementation details remain private during active development. Public descriptions cover verified scope and direction only.',
    roadmap: 'Private product development around official-source grounding, service navigation, and accessible civic information.',
    accentColor: '#8792a8', visualStyle: 'civic', sortOrder: 5
  },
  {
    id: 'farmstand-finder', slug: 'farmstand-finder', name: 'FarmStand Finder',
    category: 'Nearby Food & Producer Discovery', ecosystem: 'Foraging',
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
    accentColor: '#76b77d', visualStyle: 'map', sortOrder: 6
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
