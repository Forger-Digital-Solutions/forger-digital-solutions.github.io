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
  }),
});

export const collections = { notes };
