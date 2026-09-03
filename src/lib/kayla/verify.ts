import { projects } from '../../data/projects';
import { products } from '../../data/products';
import { gems } from '../../data/gems';
import { siteConfig } from '../../config/site';

/**
 * Canonical claim verification.
 *
 * The system prompt tells the model that canonical FDS data is settled fact.
 * A prompt is a request, not a control: a model that ignores it — or a weak
 * model behind a free router — can still answer "CodeForge is version 9.0" or
 * invent a download URL. This checks generated text against the site's own data
 * and rejects the answer when it contradicts it, so the fallback to the
 * canonical answer is enforced rather than hoped for.
 *
 * Every allowed value is derived from projects.ts / products.ts / gems.ts /
 * site.ts. Nothing here is a hand-maintained list of facts.
 */

export type ViolationKind =
  | 'version'
  | 'availability'
  | 'url'
  | 'benchmark'
  | 'cancellation'
  | 'founder'
  | 'metric'
  | 'price';

export interface CanonViolation {
  kind: ViolationKind;
  detail: string;
  sentence: string;
}

export interface CanonVerdict {
  ok: boolean;
  violations: CanonViolation[];
}

function normalizeVersion(value: string): string {
  return value.trim().toLowerCase().replace(/^v/, '');
}

/** Every version string the site actually publishes. */
const allowedVersions = new Set<string>(
  products.flatMap((product) => (product.version ? [normalizeVersion(product.version)] : []))
);

/** Slugs and display names that have a real public download. */
const downloadable = new Map<string, string>(
  products
    .filter((product) => product.downloadUrl && !product.comingSoon)
    .map((product) => [product.name.toLowerCase(), product.downloadUrl!])
);

/** Named things a visitor can ask about that have no public build. */
const notDownloadable = new Set<string>([
  ...projects
    .filter((entry) => !products.some((product) => (product.projectSlug || product.slug) === entry.slug && product.downloadUrl))
    .map((entry) => entry.name.toLowerCase()),
  ...gems.map((gem) => gem.name.toLowerCase())
]);

/** Hosts and exact URLs the site itself links to. */
const allowedUrls = new Set<string>(
  [
    siteConfig.siteUrl,
    siteConfig.githubUrl,
    siteConfig.youtubeUrl,
    siteConfig.discordUrl,
    siteConfig.linkedinUrl,
    siteConfig.tiktokUrl,
    siteConfig.kofiUrl,
    siteConfig.cashAppUrl,
    siteConfig.supportUrl,
    ...products.flatMap((p) => [p.downloadUrl, p.docsUrl, p.releaseNotesUrl, p.videoUrl]),
    ...projects.flatMap((p) => [p.githubUrl, p.websiteUrl, p.documentationUrl])
  ].filter((value): value is string => Boolean(value)).map((value) => value.toLowerCase())
);

const allowedUrlHosts = new Set<string>(
  [...allowedUrls].map((url) => {
    try { return new URL(url).host.toLowerCase(); } catch { return ''; }
  }).filter(Boolean)
);

const canonicalFounder = siteConfig.author.toLowerCase();

/** All entity names the verifier recognises in a sentence. */
const entityNames: string[] = [
  ...projects.map((p) => p.name),
  ...projects.flatMap((p) => (p.shortName ? [p.shortName] : [])),
  ...products.map((p) => p.name),
  ...gems.map((g) => g.name)
];

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isNegated(sentence: string): boolean {
  // "no longer developed" is an assertion, not a denial, so it must not read
  // as negation and let a cancellation claim through.
  const withoutFalseFriends = sentence.replace(/\bno longer\b/gi, ' ');
  return /\b(not|no|never|cannot|can't|isn't|is not|aren't|are not|doesn't|does not|won't|will not|without|nothing|neither|nor|unavailable)\b/i.test(withoutFalseFriends);
}

/** Only an explicit denial clears a cancellation claim. */
function deniesCancellation(sentence: string): boolean {
  return /\b(not|never|isn't|wasn't|hasn't)\b[^.?!]{0,30}\b(cancell?ed|discontinued|abandoned|scrapped|shut down|dead|defunct)\b/i.test(sentence);
}

function entitiesIn(sentence: string): string[] {
  const lower = sentence.toLowerCase();
  return entityNames.filter((name) => lower.includes(name.toLowerCase()));
}

function checkVersions(sentence: string, violations: CanonViolation[]): void {
  // Only version-shaped mentions: "v0.2.0", "version 9.0", "release 2.1".
  // Bare decimals are left alone so model names like Qwen2.5-Coder and
  // platform names like Windows 10/11 do not trip the check.
  const matches = [
    ...sentence.matchAll(/\bv(\d+(?:\.\d+){1,3}[a-z0-9.\-]*)/gi),
    ...sentence.matchAll(/\b(?:version|release|build)\s+v?(\d+(?:\.\d+){0,3}[a-z0-9.\-]*)/gi)
  ];
  for (const match of matches) {
    const claimed = normalizeVersion(match[1]);
    if (!claimed) continue;
    const known = [...allowedVersions].some((allowed) => allowed === claimed || allowed.startsWith(`${claimed}.`) || claimed.startsWith(allowed));
    if (known) continue;
    // "There is no CodeForge v9.0" denies the version rather than claiming it.
    // The denial has to come before the number to count.
    const before = sentence.slice(0, match.index ?? 0);
    if (/\b(no|not|never|isn't|is not|there is no|does not exist|doesn't exist)\b/i.test(before)) continue;
    violations.push({ kind: 'version', detail: `version "${match[0]}" is not a published FDS version`, sentence });
  }
}

function checkAvailability(sentence: string, violations: CanonViolation[]): void {
  const claimsAvailable = /\b(downloadable|download it|download the|available now|available today|publicly available|you can download|you can get|get it (at|from)|is released|has released|has launched|now available|generally available|ships? (today|now))\b/i.test(sentence);
  if (!claimsAvailable || isNegated(sentence)) return;
  for (const name of entitiesIn(sentence)) {
    if (notDownloadable.has(name.toLowerCase())) {
      violations.push({ kind: 'availability', detail: `${name} has no public download in canonical data`, sentence });
    }
  }
}

function checkUrls(sentence: string, violations: CanonViolation[]): void {
  for (const match of sentence.matchAll(/https?:\/\/[^\s)<>\]"']+/gi)) {
    const raw = match[0].replace(/[.,;:]+$/, '').toLowerCase();
    if (allowedUrls.has(raw)) continue;
    let host = '';
    try { host = new URL(raw).host.toLowerCase(); } catch { /* malformed */ }
    if (host && allowedUrlHosts.has(host)) continue;
    violations.push({ kind: 'url', detail: `link "${raw}" is not an official FDS URL`, sentence });
  }
  for (const match of sentence.matchAll(/mailto:([^\s)<>\]"']+)/gi)) {
    if (match[1].toLowerCase().replace(/[.,;:]+$/, '') !== siteConfig.supportEmail.toLowerCase()) {
      violations.push({ kind: 'url', detail: `email "${match[1]}" is not the FDS support address`, sentence });
    }
  }
}

function checkBenchmarks(sentence: string, violations: CanonViolation[]): void {
  const claimsResult = /\b(beat|beats|beaten|outperform\w*|surpass\w*|outscor\w*|leads?\b|tops?\b|ranked|scored?|achiev\w*)\b/i.test(sentence)
    && /\b(benchmark\w*|gpt|claude|opus|sonnet|llama|gemini|mistral|frontier|sota|state of the art|humaneval|mmlu|swe-?bench|\d+(\.\d+)?\s*%)\b/i.test(sentence);
  if (!claimsResult || isNegated(sentence)) return;
  if (entitiesIn(sentence).length > 0 || /\bgems\b/i.test(sentence)) {
    violations.push({ kind: 'benchmark', detail: 'FDS publishes no benchmark results or model comparisons', sentence });
  }
}

function checkCancellation(sentence: string, violations: CanonViolation[]): void {
  if (!/\b(cancell?ed|discontinued|abandoned|shut down|scrapped|defunct|no longer (being )?(developed|maintained)|dead)\b/i.test(sentence)) return;
  if (deniesCancellation(sentence)) return;
  for (const name of entitiesIn(sentence)) {
    violations.push({ kind: 'cancellation', detail: `${name} is not cancelled in canonical data`, sentence });
  }
}

function checkFounder(sentence: string, violations: CanonViolation[]): void {
  for (const match of sentence.matchAll(/\b(?:founded|created|started|established|built)\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g)) {
    if (match[1].toLowerCase() !== canonicalFounder) {
      violations.push({ kind: 'founder', detail: `"${match[1]}" is not the FDS founder`, sentence });
    }
  }
}

function checkMetrics(sentence: string, violations: CanonViolation[]): void {
  // A digit is required. Matching a bare comma made "releases, downloads"
  // read as a usage figure.
  if (/\b\d[\d,]*\s*(?:\+|plus)?\s*(users|customers|downloads|installs|subscribers|stars|contributors|employees)\b/i.test(sentence)
    || /\b(millions?|thousands?|billions?|hundreds)\s+of\s+(users|customers|downloads|installs)\b/i.test(sentence)) {
    if (!isNegated(sentence)) {
      violations.push({ kind: 'metric', detail: 'FDS publishes no usage, download, or headcount figures', sentence });
    }
  }
}

function checkPrice(sentence: string, violations: CanonViolation[]): void {
  for (const match of sentence.matchAll(/\$\s?[\d,]+(?:\.\d{2})?/g)) {
    violations.push({ kind: 'price', detail: `price "${match[0]}" is not published; FDS software is free`, sentence });
  }
}

/**
 * Check generated text against canonical FDS data.
 * Returns every contradiction found, so callers can log what happened.
 */
export function verifyAgainstCanon(text: string): CanonVerdict {
  const violations: CanonViolation[] = [];
  for (const sentence of sentences(text)) {
    checkVersions(sentence, violations);
    checkAvailability(sentence, violations);
    checkUrls(sentence, violations);
    checkBenchmarks(sentence, violations);
    checkCancellation(sentence, violations);
    checkFounder(sentence, violations);
    checkMetrics(sentence, violations);
    checkPrice(sentence, violations);
  }
  return { ok: violations.length === 0, violations };
}

/** Introspection for tests and the certification receipt. */
export function canonAllowList() {
  return {
    versions: [...allowedVersions],
    downloadable: [...downloadable.keys()],
    notDownloadable: [...notDownloadable],
    urlHosts: [...allowedUrlHosts],
    founder: siteConfig.author
  };
}
