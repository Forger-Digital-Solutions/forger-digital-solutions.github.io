import type { Project } from '../types';

export const projects: Project[] = [
  {
    id: "gems-training-grounds",
    slug: "gems-training-grounds",
    name: "GEMS / Training Grounds",
    shortName: "GEMS",
    category: "AI Research & Training Infrastructure",
    ecosystem: "Intelligence",
    audience: "AI researchers, machine learning engineers, and teams building intelligent systems that require rigorous evaluation and evidence-driven development.",
    problem: "Building reliable AI systems requires more than running models — it demands structured experimentation, reproducible evaluation, and a disciplined path from candidate ideas to validated capabilities. Many teams lack the infrastructure to train, test, and iterate systematically.",
    differentiation: "GEMS is not a chatbot interface or a simple model wrapper. It is a research infrastructure designed for the full lifecycle of intelligent system development — from curriculum design through training, evaluation, and certification. The work focuses on building systems that learn from evidence, not just output.",
    summary: "A research and development platform for training, evaluating, and improving AI systems under controlled conditions. GEMS provides the infrastructure for evidence-driven intelligence engineering.",
    description: "GEMS (Governed Experimental Model Systems) and Training Grounds form a research and development platform for building, training, evaluating, and improving AI systems. Rather than connecting an application to an existing model, GEMS is designed to explore how intelligent systems are developed, tested, governed, and advanced under controlled experimental conditions.\n\nTraining Grounds provides the environment where AI systems can be taught, evaluated, challenged, and refined — a governed space for experimentation where results, not just activity, determine what moves forward. The work spans curriculum design, model training, performance evaluation, adaptive compute orchestration, and evidence-driven certification.\n\nThis is FDS's flagship research initiative: a long-term effort to build the infrastructure for creating adaptable intelligence systems, not just consuming them.",
    status: "ACTIVE RESEARCH",
    featured: true,
    tags: ["AI Research", "Model Training", "Evaluation Systems", "Curriculum Design", "Evidence-Driven Development", "Compute Orchestration"],
    focusAreas: [
      "Governed AI experimentation",
      "Training and curriculum systems",
      "Evaluation and certification",
      "Long-context research",
      "Adaptive compute orchestration",
      "Reproducible experimentation"
    ],
    highlights: [
      "Training and evaluation are treated as connected, evidence-producing work — not separate phases.",
      "The system is designed to adapt to available compute resources, not require specific hardware configurations.",
      "Research directions are published openly; protected implementations remain private."
    ],
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
      "Model training systems with structured curriculum support",
      "Evaluation infrastructure for systematic performance measurement",
      "Governed experimentation environments with reproducible conditions",
      "Adaptive, hardware-aware compute execution across flexible environments"
    ],
    roadmap: "Continued research, evaluation, and adaptive-compute experimentation.",
    sortOrder: 1
  },
  {
    id: "kyrablox",
    slug: "kyrablox",
    name: "KyraBlox",
    category: "AI-Assisted Game Development",
    ecosystem: "Gaming",
    audience: "Game developers, creators, and studios building projects across engines like Roblox, Unreal Engine, Unity, and Godot — especially those working without large specialized teams.",
    problem: "Game development involves complex workflows: scripting, system design, debugging, testing, and iteration. Creators often work through problems alone or with fragmented tooling, making it harder to ship projects efficiently.",
    differentiation: "KyraBlox is designed as development infrastructure — AI assistance embedded in the workflow of building games, not just answering isolated coding questions. It works alongside creators, understanding project context rather than treating each interaction as standalone.",
    summary: "An AI-assisted development environment for game creators. KyraBlox explores intelligent workflows for building, testing, and iterating on games — with initial focus on Roblox and expanding toward multi-engine development.",
    description: "KyraBlox is an AI-assisted development platform designed to help game creators build, debug, and iterate on their projects. Rather than a simple question-answering tool, KyraBlox is built as development infrastructure — assistance that understands the context of a game project and provides relevant guidance.\n\nThe work explores how AI can participate meaningfully in game development workflows: assisting with scripting, helping design gameplay systems, supporting testing and debugging, and organizing project direction. Initial development focuses on Roblox, with broader multi-engine direction across Unreal Engine, Unity, and Godot.\n\nThe goal is practical: help creators spend more time building and less time navigating toolchains, documentation, and disconnected help systems.",
    status: "ACTIVE DEVELOPMENT",
    featured: false,
    tags: ["Game Development", "Roblox", "Scripting Assistance", "Developer Tools", "Multi-Engine", "AI Workflows"],
    focusAreas: [
      "AI-assisted game development",
      "Code and scripting guidance",
      "Gameplay system creation",
      "Testing and debugging",
      "Guided project workflows",
      "Multi-engine direction"
    ],
    highlights: [
      "Explores specialized tooling embedded in game-development workflows, not bolted onto them.",
      "Initial focus on Roblox, with architecture supporting expansion to other major engines."
    ],
    accentColor: "#b487ff",
    visualStyle: "blocks",
    building: [
      "Context-aware development assistance for game projects",
      "Scripting and system-design guidance",
      "Testing, debugging, and iteration support",
      "Multi-engine experimentation across modern game development platforms"
    ],
    roadmap: "Expanded AI-assisted development workflows and multi-engine support.",
    sortOrder: 2
  },
  {
    id: "kayla-ai-publisher",
    slug: "kayla-ai-publisher",
    name: "Kayla AI Publisher",
    shortName: "Kayla",
    category: "AI Publishing & Creative Software",
    ecosystem: "Publishing",
    audience: "Writers, independent authors, storytellers, illustrators, small publishers, and creators developing long-form creative work — from first draft through production.",
    problem: "Moving from an idea to a finished, publishable work involves many stages: outlining, drafting, editing, revising, organizing, formatting, and preparing for publication. Creators often manage this process with fragmented tools and limited feedback.",
    differentiation: "Kayla is positioned as creative production infrastructure — a workspace for developing and refining creative projects, not just a text-generation tool. The AI assists with the craft; the creator retains authorship and creative direction.",
    summary: "An AI-assisted creative workspace for writing, editing, and publishing. Kayla supports creators developing long-form content — from initial concepts through production-ready work.",
    description: "Kayla AI Publisher is an AI-assisted platform exploring how intelligent tools can support writers, editors, and creators throughout the publishing process. From early-stage drafting and outlining to revision, organization, and production preparation, Kayla is designed to be a creative workspace — not a replacement for the creator's voice.\n\nThe work examines practical ways to assist with writing and editing, manuscript organization, multilingual content direction, visual storytelling support, and the workflows that transform creative work into publishable form. Rather than generating content in isolation, Kayla explores how AI can participate meaningfully in the creative process while leaving authorship squarely with the human creator.\n\nThe vision is software that understands the shape of a creative project and helps the creator move it forward.",
    status: "ACTIVE DEVELOPMENT",
    featured: false,
    tags: ["Writing", "Editing", "Publishing", "Creative Software", "Multilingual", "Workflows"],
    focusAreas: [
      "Writing and storytelling",
      "Editing and revision",
      "Project organization",
      "Publishing preparation",
      "Creative AI assistance",
      "Multilingual content direction"
    ],
    highlights: [
      "Explores organization and production workflows designed for long-form creative work.",
      "Public materials describe active development rather than shipping claims."
    ],
    accentColor: "#d9813f",
    visualStyle: "manuscript",
    building: [
      "Writing and editing assistance for creative projects",
      "Manuscript organization and workflow tools",
      "Publishing preparation and formatting support",
      "Translation-aware and multilingual content direction"
    ],
    roadmap: "Publishing and multilingual workflow development.",
    sortOrder: 3
  },
  {
    id: "we-the-people",
    slug: "we-the-people",
    name: "We The People",
    category: "Civic Technology & Public Information",
    ecosystem: "Civic",
    audience: "Individuals and communities seeking to understand public information, navigate civic systems, and access resources that affect their lives — without partisan framing.",
    problem: "Government information, public services, and civic resources are often difficult to navigate. Ordinary people face complex systems, dense documents, and unclear pathways to the help and information they need.",
    differentiation: "We The People is nonpartisan and focused on accessibility — helping people understand and navigate civic information rather than advocating for political positions. The goal is clarity, not ideology.",
    summary: "A civic technology platform designed to make public information easier to understand and navigate. We The People explores accessible ways to connect people with community resources, government services, and civic information.",
    description: "We The People is an FDS civic technology platform focused on making public information more accessible and navigable. The work explores how software can help people understand government information, find community resources, and navigate systems that affect their daily lives.\n\nThis is nonpartisan infrastructure — designed to provide clarity, not political advocacy. The goal is practical: help ordinary people make sense of complicated civic information, understand public services, and find relevant resources without filtering through dense bureaucracy.\n\nBecause portions of the work remain private during active development, public descriptions are intentionally focused on the intent and direction rather than specific implementations.",
    status: "PRIVATE DEVELOPMENT",
    featured: false,
    tags: ["Civic Technology", "Public Information", "Accessibility", "Community Resources", "Government Services", "Nonpartisan"],
    focusAreas: [
      "Civic information discovery",
      "Plain-language explanations",
      "Community resource navigation",
      "Public service accessibility",
      "Nonpartisan design"
    ],
    privacyNotice: "Portions of this project remain private while development is ongoing. Public descriptions focus on intent and direction rather than implementation specifics.",
    accentColor: "#8792a8",
    visualStyle: "civic",
    building: [
      "Accessible digital tools for civic navigation",
      "Plain-language explanations of public information",
      "Platform infrastructure for community resources",
      "Useful, accessible foundations for public-facing software"
    ],
    roadmap: "Continued private platform development.",
    sortOrder: 4
  },
  {
    id: "farmstand-finder",
    slug: "farmstand-finder",
    name: "FarmStand Finder",
    category: "Local Discovery & Community Food",
    ecosystem: "Foraging",
    audience: "People seeking local food sources, farm stands, growers, markets, and community food resources — and the small producers who want to be discoverable.",
    problem: "Finding local food sources often requires scattered knowledge, word-of-mouth recommendations, or driving around hoping to spot a roadside stand. Small growers and producers lack easy ways to become visible to nearby customers.",
    differentiation: "FarmStand Finder focuses on practical discovery — connecting people with local food resources in their communities — without requiring complex subscription systems, inventory management, or payment processing.",
    summary: "A community-focused discovery application for finding local farm stands, growers, markets, and food resources nearby. FarmStand Finder connects people with local producers and community food networks.",
    description: "FarmStand Finder is a community-focused application designed to make local food discovery simpler. It helps people find nearby farm stands, growers, farmers markets, community gardens, and other local food resources — connecting consumers with the producers and food sources in their communities.\n\nThe work explores practical, accessible discovery without requiring complex infrastructure on either side. The goal is straightforward: help people find locally grown, produced, and sold food, and help small producers and growers become visible to their communities.\n\nFarmStand Finder begins with farm stands and local food discovery while supporting a broader vision: technology that helps people connect with resources grown, produced, shared, and sold within their communities.",
    status: "ACTIVE DEVELOPMENT",
    featured: false,
    tags: ["Local Discovery", "Farm Stands", "Growers", "Farmers Markets", "Local Food", "Community"],
    focusAreas: [
      "Local food discovery",
      "Farm stand and grower visibility",
      "Community resource connection",
      "Location-based exploration",
      "Small producer support",
      "Seasonal information"
    ],
    highlights: [
      "Designed around practical discovery of local food and nearby growers.",
      "Explores community-oriented software with a clear, accessible experience."
    ],
    accentColor: "#76b77d",
    visualStyle: "map",
    building: [
      "Farm stand and grower discovery",
      "Location-based browsing of nearby markets and producers",
      "Community-focused listings for local food resources",
      "Clear, accessible tools for finding local food"
    ],
    roadmap: "Local discovery features and application development.",
    sortOrder: 5
  }
];
