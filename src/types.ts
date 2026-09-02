export type ProjectStatusValue =
  | "RESEARCH"
  | "ACTIVE DEVELOPMENT"
  | "PRIVATE DEVELOPMENT"
  | "PREVIEW / BETA"
  | "CONCEPT"
  | "RELEASED";

export interface ProjectSection {
  title: string;
  body?: string;
  items?: string[];
  note?: string;
}

export interface ProjectImage {
  src: string;
  alt: string;
  caption?: string;
}

/** Maps projects to their corresponding ecosystem in the FDS solar system. */
export type EcosystemCategory = 
  | "Engineering"
  | "Intelligence" 
  | "Gaming" 
  | "Publishing" 
  | "Civic" 
  | "Foraging";

export interface Project {
  id: string;
  slug: string;
  name: string;
  shortName?: string;
  category: string;
  /** The FDS ecosystem this project belongs to. */
  ecosystem?: EcosystemCategory;
  /** Who this project is built for. */
  audience?: string;
  /** The problem this project addresses. */
  problem?: string;
  /** What makes this project different from alternatives. */
  differentiation?: string;
  summary: string;
  description: string;
  status: ProjectStatusValue;
  /** Optional second status when released software remains under active development. */
  secondaryStatus?: ProjectStatusValue;
  featured: boolean;
  tags: string[];
  githubUrl?: string;
  websiteUrl?: string;
  documentationUrl?: string;
  image?: string;
  accentColor?: string;
  focusAreas?: string[];
  highlights?: string[];
  building?: string[];
  roadmap?: string;
  /** Deliberately project-specific deep-page sections. */
  sections?: ProjectSection[];
  privacyNotice?: string;
  stageLabel?: string;
  flagship?: boolean;
  sortOrder?: number;
  /** Selects the abstract FDS visual identity motif for this project. */
  visualStyle?: "nodes" | "gem" | "blocks" | "manuscript" | "civic" | "map";
  /** Optional real hero screenshot/photo; falls back to the abstract visual when absent. */
  heroImage?: ProjectImage;
  /** Optional real media gallery; the section is omitted entirely when empty. */
  gallery?: ProjectImage[];
  /** Optional per-project social share image; falls back to the global FDS OG image. */
  ogImage?: string;
}

export interface TechnologyCategory {
  name: string;
  items: string[];
}

export interface LabPrinciple {
  title: string;
  description: string;
}
