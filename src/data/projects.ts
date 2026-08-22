export type ProjectStatus =
  | "ACTIVE RESEARCH"
  | "ACTIVE DEVELOPMENT"
  | "EXPERIMENTAL"
  | "PRIVATE DEVELOPMENT"
  | "PLANNED"
  | "RELEASED";

export interface Project {
  id: string;
  name: string;
  subtitle?: string;
  category: string;
  description: string;
  status: ProjectStatus;
  tags: string[];
  featured: boolean;
  isFlagship?: boolean;
  githubUrl?: string;
  websiteUrl?: string;
  docsUrl?: string;
  image?: string;
  accentColor?: string;
}

export const projects: Project[] = [
  {
    id: "gems-training-grounds",
    name: "GEMS / Training Grounds",
    subtitle: "Intelligence Engineering Ecosystem",
    category: "Artificial Intelligence / ML Research / Training Infrastructure",
    description: "GEMS and Training Grounds form an experimental intelligence engineering ecosystem for training, evaluating, governing, and evolving AI systems across adaptable compute environments.",
    status: "ACTIVE RESEARCH",
    tags: [
      "AI Research",
      "Model Training",
      "Evaluation",
      "Curriculum Systems",
      "Adaptive Compute",
      "Evidence & Certification"
    ],
    featured: true,
    isFlagship: true,
    accentColor: "#f97316"
  },
  {
    id: "kyrablox",
    name: "KyraBlox",
    subtitle: "AI-Assisted Game Development Platform",
    category: "AI-Assisted Game Development",
    description: "An intelligent development platform exploring agent-assisted game creation, development workflows, and specialized tooling across modern game engines.",
    status: "ACTIVE DEVELOPMENT",
    tags: [
      "Roblox",
      "Unreal Engine",
      "Unity",
      "Godot",
      "AI Development",
      "Developer Tools"
    ],
    featured: true,
    accentColor: "#38bdf8"
  },
  {
    id: "kayla-ai-publisher",
    name: "Kayla AI Publisher",
    subtitle: "AI Publishing & Creative Tools",
    category: "AI Publishing / Creative Software",
    description: "An AI-assisted publishing platform exploring tools for writing, organization, content development, production workflows, and digital publishing.",
    status: "ACTIVE DEVELOPMENT",
    tags: [
      "AI Publishing",
      "Writing Tools",
      "Content Workflow",
      "Creative Software",
      "Automation"
    ],
    featured: true,
    accentColor: "#a855f7"
  },
  {
    id: "we-the-people",
    name: "We The People",
    subtitle: "Civic Digital Infrastructure",
    category: "Software Platform / Civic Technology",
    description: "An FDS software platform currently under development, focused on building useful, accessible digital tools and infrastructure.",
    status: "PRIVATE DEVELOPMENT",
    tags: [
      "Software Platform",
      "Civic Technology",
      "Infrastructure",
      "Private Development"
    ],
    featured: true,
    accentColor: "#10b981"
  },
  {
    id: "farmstand-finder",
    name: "FarmStand Finder",
    subtitle: "Local Agriculture & Community Discovery",
    category: "Local Discovery / Community Software",
    description: "A community-focused discovery application designed to help people find local farm stands, growers, markets, and locally available food.",
    status: "ACTIVE DEVELOPMENT",
    tags: [
      "Local Discovery",
      "Agriculture",
      "Community",
      "Mapping",
      "Food",
      "Small Business"
    ],
    featured: true,
    accentColor: "#eab308"
  }
];
