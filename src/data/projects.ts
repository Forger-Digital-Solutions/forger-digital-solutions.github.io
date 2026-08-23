import type { Project } from '../types';

export const projects: Project[] = [
  {
    id: "gems-training-grounds",
    slug: "gems-training-grounds",
    name: "GEMS / Training Grounds",
    category: "Artificial Intelligence / ML Research / Training Infrastructure",
    summary: "Experimental intelligence engineering for adaptable model training, evaluation, governance, and evidence.",
    description: "GEMS and Training Grounds form an experimental intelligence engineering ecosystem for training, evaluating, governing, and evolving AI systems across adaptable compute environments. It is FDS's flagship research initiative: a public-facing view into a disciplined approach to building and learning from intelligent systems.",
    status: "ACTIVE RESEARCH",
    featured: true,
    tags: ["AI Research", "Model Training", "Evaluation", "Curriculum Systems", "Adaptive Compute", "Evidence & Certification"],
    focusAreas: ["AI research", "Model training", "Evaluation systems", "Curriculum systems", "Adaptive compute", "Evidence & certification"],
    highlights: ["Training and evaluation are treated as connected, evidence-producing work.", "Compute awareness informs planning across available environments.", "Public descriptions focus on research direction, not private datasets or protected implementations."],
    flagship: true,
    stageLabel: "Flagship research initiative",
    accentColor: "#2f6bff",
    visualStyle: "nodes",
    heroImage: {
      src: "/images/projects/gems/gems-framework.webp",
      alt: "GEMS Framework diagram: four specialized models — Topaz (reasoning and insight), Sapphire (optimization and performance), Peridot (evaluation and validation), and Garnet (automation and execution) — arranged around a central GEMS adaptive intelligence engine, above a row of core principles.",
      caption: "GEMS Framework — four specialized models, one adaptive intelligence engine."
    },
    ogImage: "/images/projects/gems/gems-framework-og.jpg",
    building: [
      "Model training systems and evaluation infrastructure",
      "Curriculum experimentation and governed experimentation",
      "Adaptive, hardware-aware compute execution",
      "Evidence-driven development where results — not just runs — decide what survives"
    ],
    roadmap: "Continued research, evaluation, and adaptive-compute experimentation.",
    sortOrder: 1
  },
  {
    id: "kyrablox",
    slug: "kyrablox",
    name: "KyraBlox",
    category: "AI-Assisted Game Development",
    summary: "AI-assisted tools and workflows for exploring game creation across modern engines.",
    description: "KyraBlox is an intelligent development platform exploring AI-assisted game creation, specialized developer tooling, and multi-engine development workflows. The work examines how useful tools can support builders while leaving creative direction in human hands.",
    status: "ACTIVE DEVELOPMENT",
    featured: false,
    tags: ["Roblox", "Unreal Engine", "Unity", "Godot", "AI Development", "Developer Tools"],
    focusAreas: ["Roblox", "Unreal Engine", "Unity", "Godot", "AI development", "Developer tools"],
    highlights: ["Explores specialized tooling for game-development workflows.", "Designed as a research and development platform, not a promise of any particular shipped capability."],
    accentColor: "#b487ff",
    visualStyle: "blocks",
    building: [
      "AI-assisted development workflows for game creation",
      "Project-aware development assistance and tooling",
      "Multi-engine experimentation across modern game engines",
      "Specialized game-development agents and utilities"
    ],
    roadmap: "Expanded AI-assisted development workflows and tooling.",
    sortOrder: 2
  },
  {
    id: "kayla-ai-publisher",
    slug: "kayla-ai-publisher",
    name: "Kayla AI Publisher",
    category: "AI Publishing / Creative Software",
    summary: "An AI-assisted platform exploring writing, editing, organization, and publishing workflows.",
    description: "Kayla AI Publisher is an AI-assisted publishing platform exploring intelligent writing, editing, organization, production workflows, and digital publishing. Its focus is on thoughtful creative software and practical ways to support content from draft through production.",
    status: "ACTIVE DEVELOPMENT",
    featured: false,
    tags: ["Writing", "Editing", "Publishing", "Multilingual Content", "Creative Software", "Intelligent Workflow"],
    focusAreas: ["Writing", "Editing", "Publishing", "Multilingual content", "Creative software", "Intelligent workflow"],
    highlights: ["Explores helpful organization and production workflows.", "Public materials describe active exploration rather than unsupported shipping claims."],
    accentColor: "#d9813f",
    visualStyle: "manuscript",
    building: [
      "Writing and editing workflows",
      "Publishing preparation and manuscript organization",
      "Translation-aware and multilingual publishing support",
      "Intelligent content tooling from draft through production"
    ],
    roadmap: "Publishing and multilingual workflow development.",
    sortOrder: 3
  },
  {
    id: "we-the-people",
    slug: "we-the-people",
    name: "We The People",
    category: "Software Platform / Civic Technology",
    summary: "A private-development FDS platform for useful, accessible digital tools and infrastructure.",
    description: "We The People is an FDS software platform under private development focused on useful, accessible digital tools and infrastructure. Its public description remains intentionally broad while the work is being shaped and evaluated.",
    status: "PRIVATE DEVELOPMENT",
    featured: false,
    tags: ["Software Platform", "Civic Technology", "Infrastructure", "Private Development"],
    focusAreas: ["Accessible digital tools", "Civic technology", "Software infrastructure", "Useful public-facing systems"],
    privacyNotice: "Portions of this project remain private while development is ongoing.",
    accentColor: "#8792a8",
    visualStyle: "civic",
    building: [
      "Digital civic tools and accessible software workflows",
      "Structured public information",
      "Platform infrastructure",
      "A useful, accessible foundation for public-facing software"
    ],
    roadmap: "Continued private platform development.",
    sortOrder: 4
  },
  {
    id: "farmstand-finder",
    slug: "farmstand-finder",
    name: "FarmStand Finder",
    category: "Local Discovery / Community Software",
    summary: "A local discovery application for farm stands, growers, markets, and local food.",
    description: "FarmStand Finder is a community-focused discovery application designed to make it easier to find local farm stands, growers, markets, and locally available food. It explores clear, useful ways to connect people with nearby growers, food, and small businesses.",
    status: "ACTIVE DEVELOPMENT",
    featured: false,
    tags: ["Local Discovery", "Agriculture", "Mapping", "Community", "Local Food", "Small Business"],
    focusAreas: ["Local discovery", "Agriculture", "Mapping", "Community", "Local food", "Small business"],
    highlights: ["Designed around practical discovery of local food and growers.", "Explores community-oriented software with a clear, accessible experience."],
    accentColor: "#76b77d",
    visualStyle: "map",
    building: [
      "Local farm stand and grower discovery",
      "Location-based browsing of nearby markets",
      "Community-focused listings for local food",
      "A clear, accessible experience for finding local food"
    ],
    roadmap: "Local discovery features and application development.",
    sortOrder: 5
  }
];
