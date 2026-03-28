import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { SubmissionRow } from './types';

/**
 * Check if submission matches filter criteria
 */
export function matchesFilters(
  row: SubmissionRow,
  classroomFilter: string,
  weekFilter: string,
  nameSearch: string
): boolean {
  const matchesClassroom = classroomFilter === 'all' || row.classroomKey === classroomFilter;
  const matchesWeek =
    weekFilter === 'all' || (row.assignmentWeekNumber !== null && row.assignmentWeekNumber?.toString() === weekFilter);
  const matchesName = !nameSearch.trim() || 
    row.studentName.toLowerCase().includes(nameSearch.toLowerCase().trim());
  return matchesClassroom && matchesWeek && matchesName;
}

/**
 * Determine which submission is more recent
 */
export function shouldReplaceSubmission(existing: SubmissionRow, current: SubmissionRow): boolean {
  const existingDate = existing.submittedAtDate;
  const currentDate = current.submittedAtDate;
  
  if (currentDate && existingDate) {
    return currentDate > existingDate;
  }
  
  if (!currentDate && existingDate) {
    return false;
  }
  
  if (currentDate && !existingDate) {
    return true;
  }
  
  return false;
}

/**
 * Get latest submission for each student and week combination
 */
export function getLatestSubmissionsByStudentAndWeek(rows: SubmissionRow[]): Map<string, SubmissionRow> {
  const latestByStudentAndWeek = new Map<string, SubmissionRow>();
  
  for (const row of rows) {
    const key = `${row.studentName}_${row.assignmentWeekNumber ?? 'no-week'}`;
    const existing = latestByStudentAndWeek.get(key);
    
    if (!existing) {
      latestByStudentAndWeek.set(key, row);
    } else if (shouldReplaceSubmission(existing, row)) {
      latestByStudentAndWeek.set(key, row);
    }
  }
  
  return latestByStudentAndWeek;
}

/**
 * Sort submissions by submitted date (newest first)
 */
export function sortSubmissionsByDate(submissions: SubmissionRow[]): SubmissionRow[] {
  return submissions.sort((a, b) => {
    const dateA = a.submittedAtDate;
    const dateB = b.submittedAtDate;
    
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Sanitize markdown content for safe display
 */
export function sanitizeMarkdown(content: string): string {
  const html = marked(content) as string;
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
  });
}

