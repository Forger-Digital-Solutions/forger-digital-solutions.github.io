export interface SiteConfig {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  siteUrl: string;
  githubUrl: string;
  supportUrl: string;
  statusText: string;
  founder: string;
  location: string;
}

export const siteConfig: SiteConfig = {
  name: "Forger Digital Solutions",
  shortName: "FDS",
  tagline: "Building software that learns, adapts, and creates.",
  description: "Independent software research and development studio focused on intelligent systems, developer infrastructure, creative technology, and experimental computing.",
  siteUrl: "https://forger-digital-solutions.github.io",
  githubUrl: "https://github.com/forger-digital-solutions",
  supportUrl: "https://ko-fi.com/forgerdigitalsolutions",
  statusText: "FDS // RESEARCH & DEVELOPMENT // ACTIVE",
  founder: "Edward Schmidt",
  location: "New Jersey, United States",
};
