export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string | null;
  modifiedTime: string;
  createdTime: string;
  isFolder: boolean;
}

export interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export type FileAnalysisMetadata = {
  id?: string | null;
  name?: string | null;
  size?: string | null;
  mimeType?: string | null;
  webViewLink?: string | null;
  createdTime?: string | null;
  modifiedTime?: string | null;
};

export const CLASSROOM_LABELS: Record<string, string> = {
  junior: 'Junior',
  'junior-plus': 'Junior+',
  mid: 'Mid',
  'mid-plus': 'Mid+',
  senior: 'Senior',
};

export const STATUS_LABELS = {
  'on-time': { label: 'Vaktinde', variant: 'secondary' as const },
  'late': { label: 'Geç', variant: 'destructive' as const },
};

export const MAX_SUBMISSION_ITEMS = 200;

export type SubmissionRow = {
  id: string;
  studentId: string;
  studentName: string;
  assignmentTitle: string;
  classroomLabel: string;
  classroomKey: string;
  weekLabel: string;
  assignmentWeekNumber: number | null;
  submittedAt: string;
  submittedAtDate: Date | null;
  statusKey: keyof typeof STATUS_LABELS;
  assignmentId: string | null;
  fileName: string;
  fileLink: string | null;
  feedback: string;
  grade: number | null;
  driveFileId: string | null;
  storageUrl: string | null;
  submittedFileMimeType: string | null;
  submittedFileSize: string | null;
};

