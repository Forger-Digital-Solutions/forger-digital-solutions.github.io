import { getCollection, type CollectionEntry } from 'astro:content';

export type Note = CollectionEntry<'notes'>;

/** Published notes (drafts hidden in production), newest first. */
export async function getPublishedNotes(): Promise<Note[]> {
  const notes = await getCollection('notes', ({ data }) =>
    import.meta.env.PROD ? !data.draft : true
  );
  return notes.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function formatNoteDate(date: Date): string {
  // Dates are authored as calendar days (YYYY-MM-DD) and parsed as UTC midnight.
  // Format in UTC so they don't shift a day back in timezones behind UTC.
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
