import { projects } from '../projects';
import { products } from '../products';
import { gems } from '../gems';
import { statusMeta } from '../status';
import type { ProjectStatusValue } from '../../types';

/**
 * Availability semantics.
 *
 * "Public" is not one boolean, and collapsing it into one is how an assistant
 * ends up implying that a visible project page means downloadable software.
 * A project can have a public page, a public GitHub repository, and still have
 * nothing a visitor can run. These attributes are derived from the same
 * canonical records the site renders from, so they cannot drift from it.
 */
export interface ProjectAvailability {
  slug: string;
  name: string;
  status: ProjectStatusValue;
  /** The project has a page on this site. True for every published project. */
  publiclyViewable: boolean;
  /** There is a real public build a visitor can download today. */
  publiclyDownloadable: boolean;
  /** A visitor can actually use it now — currently the same bar as a download. */
  publiclyUsable: boolean;
  /** Research work with no product build of any kind. */
  researchOnly: boolean;
  /** Development happening with portions deliberately not public. */
  privateDevelopment: boolean;
  /** Published version string, when a release exists. */
  releaseVersion?: string;
  /** Canonical download route, when one exists. */
  officialDownloadRoute?: string;
}

function productFor(slug: string) {
  return products.find((entry) => entry.slug === slug || entry.projectSlug === slug);
}

export const projectAvailability: ProjectAvailability[] = projects.map((project) => {
  const product = productFor(project.slug);
  const downloadable = Boolean(product?.downloadUrl && !product.comingSoon);
  return {
    slug: project.slug,
    name: project.name,
    status: project.status,
    publiclyViewable: true,
    publiclyDownloadable: downloadable,
    publiclyUsable: downloadable,
    researchOnly: project.status === 'RESEARCH',
    privateDevelopment: project.status === 'PRIVATE DEVELOPMENT',
    releaseVersion: downloadable ? product?.version : undefined,
    officialDownloadRoute: downloadable ? product?.downloadUrl : undefined
  };
});

/** Standalone products (e.g. ForgerEMS) that are not themselves project pages. */
export const standaloneDownloads = products
  .filter((product) => product.downloadUrl && !product.comingSoon)
  .filter((product) => !projects.some((project) => project.slug === (product.projectSlug || product.slug)))
  .map((product) => ({
    slug: product.slug,
    name: product.name,
    version: product.version,
    officialDownloadRoute: product.downloadUrl!
  }));

export function downloadableNow(): { name: string; version?: string; route: string }[] {
  return [
    ...projectAvailability
      .filter((entry) => entry.publiclyDownloadable)
      .map((entry) => ({ name: entry.name, version: entry.releaseVersion, route: entry.officialDownloadRoute! })),
    ...standaloneDownloads.map((entry) => ({ name: entry.name, version: entry.version, route: entry.officialDownloadRoute }))
  ];
}

export function byStatus(status: ProjectStatusValue): ProjectAvailability[] {
  return projectAvailability.filter((entry) => entry.status === status);
}

/** Statuses actually in use on the site right now, with their published meaning. */
export function statusesInUse(): { status: ProjectStatusValue; short: string; description: string; projects: string[] }[] {
  const used = [...new Set(projects.map((project) => project.status))];
  return used.map((status) => ({
    status,
    short: statusMeta[status].short,
    description: statusMeta[status].description,
    projects: projects.filter((project) => project.status === status).map((project) => project.name)
  }));
}

/**
 * No GEMS lineage has a released model — the family is research, and each
 * lineage's own record disclaims a trained model. Kept as a function so it
 * tracks the data rather than freezing a sentence.
 */
export function gemsAreDownloadable(): boolean {
  return false;
}

export function gemNames(): string[] {
  return gems.map((gem) => gem.name);
}
