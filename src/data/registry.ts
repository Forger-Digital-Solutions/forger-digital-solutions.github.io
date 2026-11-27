import publicStatusRaw from '../../content/public-status/registry.json' with { type: 'json' };
import modelsRaw from '../../content/models/models.json' with { type: 'json' };
import productsRaw from '../../content/products/products.json' with { type: 'json' };
import researchRaw from '../../content/research/divisions.json' with { type: 'json' };
import evaluationsRaw from '../../content/evaluations/evaluations.json' with { type: 'json' };
import releasesRaw from '../../content/releases/releases.json' with { type: 'json' };
import updatesRaw from '../../content/publications/updates.json' with { type: 'json' };
import companyRaw from '../../content/company/profile.json' with { type: 'json' };
import solutionsRaw from '../../content/solutions/solutions.json' with { type: 'json' };

export type RegistryCategory =
  | 'ai-model-family'
  | 'ai-model'
  | 'application'
  | 'commercial-direction'
  | 'research-infrastructure'
  | 'original-production'
  | 'legacy-product';

export type RegistryAccent =
  | 'alexandrite'
  | 'hackmanite'
  | 'cinnabar'
  | 'jaspilite'
  | 'battleverse'
  | 'project-forge'
  | 'state-lines'
  | 'fds-cobalt'
  | 'neutral';

export type DevelopmentStatus =
  | 'research-vision'
  | 'active-research'
  | 'foundation-available'
  | 'training-planned'
  | 'training-in-progress'
  | 'fine-tuning-completed'
  | 'experimental-checkpoint'
  | 'experimental'
  | 'internal-evaluation'
  | 'evaluated'
  | 'capability-certified'
  | 'active-development'
  | 'private-alpha'
  | 'private-beta'
  | 'private-development'
  | 'commercial-direction'
  | 'public-preview'
  | 'public-release'
  | 'commercially-available'
  | 'deprecated';

export type AvailabilityStatus =
  | 'not-publicly-available'
  | 'research-only'
  | 'private-development'
  | 'early-interest-open'
  | 'downloads-paused'
  | 'public-preview'
  | 'public-release'
  | 'commercially-available';

export interface PublicRegistryEntry {
  id: string;
  name: string;
  category: RegistryCategory;
  division: string;
  flagship?: boolean;
  version: string;
  development_status: DevelopmentStatus;
  availability: AvailabilityStatus;
  base_architecture?: string | null;
  parameter_count?: string | null;
  modalities?: string[];
  license_info?: string | null;
  commercial_direction?: string | null;
  verified_capabilities: string[];
  planned_capabilities?: string[];
  known_limitations: string[];
  non_claims: string[];
  public_summary: string;
  public_evidence: string;
  route: string;
  accent: RegistryAccent;
  last_verified: string;
  approved_for_publication: boolean;
}

export const statusDisplayLabels: Record<DevelopmentStatus, string> = {
  'research-vision': 'Research Vision',
  'active-research': 'Active Research',
  'foundation-available': 'Foundation Available',
  'training-planned': 'Training Planned',
  'training-in-progress': 'Training in Progress',
  'fine-tuning-completed': 'Fine-Tuning Completed',
  'experimental-checkpoint': 'Experimental Checkpoint',
  experimental: 'Experimental',
  'internal-evaluation': 'Internal Evaluation',
  evaluated: 'Evaluated',
  'capability-certified': 'Capability Certified',
  'active-development': 'Active Development',
  'private-alpha': 'Private Alpha',
  'private-beta': 'Private Beta',
  'private-development': 'Private Development',
  'commercial-direction': 'Commercial Direction',
  'public-preview': 'Public Preview',
  'public-release': 'Public Release',
  'commercially-available': 'Commercially Available',
  deprecated: 'Deprecated',
};

export const availabilityDisplayLabels: Record<AvailabilityStatus, string> = {
  'not-publicly-available': 'Not Publicly Available',
  'research-only': 'Research Only',
  'private-development': 'Private Development',
  'early-interest-open': 'Early Interest Open',
  'downloads-paused': 'Downloads Paused',
  'public-preview': 'Public Preview Download',
  'public-release': 'Public Release',
  'commercially-available': 'Commercially Available',
};

export const publicRegistry = publicStatusRaw.entries as PublicRegistryEntry[];
export const registryMeta = {
  schemaVersion: publicStatusRaw.schema_version,
  lastUpdated: publicStatusRaw.last_updated,
};

export const registryById: Record<string, PublicRegistryEntry> = Object.fromEntries(
  publicRegistry.map((entry) => [entry.id, entry])
);

export const flagshipEntries = publicRegistry.filter((entry) => entry.flagship);

export const modelFamiliesData = modelsRaw.families;
export const flagshipAppsData = productsRaw.flagship_applications;
export const projectForgeData = researchRaw;
export const evaluationsData = evaluationsRaw;
export const publicReleasesData = releasesRaw.releases;
export const newsUpdatesData = updatesRaw.updates;
export const companyProfile = companyRaw;
export const solutionsData = solutionsRaw;

export function getRegistryEntry(id: string): PublicRegistryEntry {
  const found = registryById[id];
  if (!found) throw new Error(`Missing public registry entry for id: ${id}`);
  return found;
}

export function getAudienceSolution(slug: string) {
  const found = solutionsData.audienceSolutions.find((item) => item.slug === slug);
  if (!found) throw new Error(`Missing audience solution for slug: ${slug}`);
  return found;
}
