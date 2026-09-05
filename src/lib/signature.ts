import type { Project, ProjectSection } from '../types';

/**
 * Signature compositions render the same canonical section copy that used to
 * flow through the generic H2/paragraph template, but restructured into a
 * project-specific visual. The lookup is by exact section title so the copy
 * stays single-sourced in projects.ts (which also feeds Kayla's knowledge
 * corpus); a missing title is a build error rather than silently dropped
 * content, so copy drift cannot quietly empty a signature stage.
 */
export function getSection(project: Project, title: string): ProjectSection {
  const section = project.sections?.find((candidate) => candidate.title === title);
  if (!section) {
    throw new Error(
      `[signature] ${project.slug}: expected section "${title}" is missing from projects.ts — signature composition cannot be built.`
    );
  }
  return section;
}

/** The slugs that carry a signature composition instead of the generic section loop. */
export const signatureKinds = {
  kyrablox: 'loop',
  'kayla-ai-publisher': 'thread',
  'we-the-people': 'trace',
  'farmstand-finder': 'radius',
} as const;

export type SignatureKind = (typeof signatureKinds)[keyof typeof signatureKinds];

export function signatureKindFor(slug: string): SignatureKind | null {
  return (signatureKinds as Record<string, SignatureKind>)[slug] ?? null;
}
