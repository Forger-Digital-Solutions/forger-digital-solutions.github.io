export interface Project {
  id: string;
  slug: string;
  name: string;
  shortName?: string;
  category: string;
  summary: string;
  description: string;
  status: "ACTIVE RESEARCH" | "ACTIVE DEVELOPMENT" | "EXPERIMENTAL" | "PRIVATE DEVELOPMENT" | "PLANNED" | "RELEASED";
  featured: boolean;
  tags: string[];
  githubUrl?: string;
  websiteUrl?: string;
  documentationUrl?: string;
  image?: string;
  accentColor?: string;
  focusAreas?: string[];
  highlights?: string[];
  privacyNotice?: string;
  stageLabel?: string;
  flagship?: boolean;
  sortOrder?: number;
}

export interface TechnologyCategory {
  name: string;
  items: string[];
}

export interface LabPrinciple {
  title: string;
  description: string;
}
