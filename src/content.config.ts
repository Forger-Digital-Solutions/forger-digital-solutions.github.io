import { defineCollection } from 'astro:content';
import { object, string, array, boolean, coerce } from 'astro:schema';
import { glob } from 'astro/loaders';

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: object({
    title: string(),
    description: string(),
    date: coerce.date(),
    tags: array(string()).default([]),
    draft: boolean().default(false),
    // Optional relation to a project (use the project slug). Renders a project badge
    // and surfaces the entry under that project's "Latest Project Updates".
    projectSlug: string().optional(),
    // One of: Research, Development, Milestone, Release, Infrastructure, Website.
    category: string().optional(),
  }),
});

export const collections = { notes };
