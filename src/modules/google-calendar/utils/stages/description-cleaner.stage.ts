import { ProcessedGoogleTask } from '../../interfaces/google-calendar.interfaces';

export const DescriptionCleanerStage = (
  task: ProcessedGoogleTask,
): ProcessedGoogleTask => {
  if (task.notes_encrypted) {
    // 1. Better HTML stripping (replaces common tags with newlines or spaces)
    let cleaned = task.notes_encrypted
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<li>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]*>?/gm, '');

    // 2. Decode common HTML entities
    cleaned = cleaned
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

    // 3. Normalize whitespace and trim
    task.notes_encrypted = cleaned.replace(/\n\s*\n/g, '\n\n').trim();
  }
  return task;
};
