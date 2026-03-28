'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useFirebase, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { isTeacher } from '@/lib/roles';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/lib/use-toast';
import { collection, doc, limit, orderBy, query, updateDoc, deleteField, serverTimestamp, getDoc } from 'firebase/firestore';
import type { Assignment, AssignmentSubmission, UserProfile } from '@/types';
import { RefreshCw, ArrowLeft, Folder, FileCode, FileSpreadsheet, Send, Bot, ExternalLink, MessageSquare, Sparkles, Loader2, Search, Edit, Trash2, Pause, Play, CheckCircle2, XCircle, X } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { DriveFile, Message, FileAnalysisMetadata, SubmissionRow } from './types';
import { CLASSROOM_LABELS, STATUS_LABELS, MAX_SUBMISSION_ITEMS } from './types';
import { matchesFilters, shouldReplaceSubmission, getLatestSubmissionsByStudentAndWeek, sortSubmissionsByDate, sanitizeMarkdown } from './utils';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

// Helper: Determine file card styling
const getFileCardClassName = (file: DriveFile, selectedFiles: Set<string>): string => {
  if (file.isFolder) {
    return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
  }
  if (selectedFiles.has(file.id)) {
    return 'bg-primary/10 border-primary';
  }
  return 'hover:bg-muted';
};

// Helper: Get appropriate icon for file type
const getFileIcon = (file: DriveFile) => {
  if (file.isFolder) {
    return <Folder className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0" />;
  }
  
  const isSpreadsheet = file.mimeType === 'application/vnd.google-apps.spreadsheet' || 
                        file.name.toLowerCase().endsWith('.xlsx') || 
                        file.name.toLowerCase().endsWith('.xls');
  
  if (isSpreadsheet) {
    return <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />;
  }
  
  return <FileCode className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />;
};

// Helper: Render file list content
const renderFileListContent = (
  driveFiles: DriveFile[], 
  driveError: string | null
): React.ReactNode => {
  if (driveFiles.length === 0 && !driveError) {
    return <p className="text-muted-foreground text-center py-8">Dosya bulunamadı</p>;
  }
  
  if (driveFiles.length === 0 && driveError) {
    return <p className="text-muted-foreground text-center py-8">Yukarıdaki hatayı kontrol edin</p>;
  }
  
  return null;
};

// 1. Memoized Markdown Renderer
const useMarkdownRenderer = () => {
  return useCallback((text: string) => {
    const html = marked.parse(text) as string;
    const sanitized = DOMPurify.sanitize(html);
    return { __html: sanitized };
  }, []);
};

// 2. İyileştirilmiş Key Generation
const generateSubmissionKey = (submission: SubmissionRow, index: number): string => {
  // submission.id her zaman benzersiz olmalı
  return submission.id 
    ? `submission-${submission.id}-${index}` 
    : `fallback-${index}-${submission.studentName}-${submission.submittedAt}`;
};

// 3. Centralized Error Handler
interface ApiError {
  code?: string;
  message: string;
  details?: unknown;
}

const createErrorHandler = (toast: ReturnType<typeof useToast>['toast']) => {
  return (error: ApiError, context: string) => {
    console.error(`[${context}]`, error);
    
    const errorMessages: Record<string, string> = {
      'DRIVE_FILE_NOT_FOUND': 'Drive dosyası bulunamadı',
      'STORAGE_FILE_UNAVAILABLE': 'Storage dosyası erişilemez',
      'FILE_SOURCE_NOT_FOUND': 'Dosya kaynağı bulunamadı',
      'UNAUTHORIZED': 'Yetkiniz bulunmuyor',
      'NETWORK_ERROR': 'Bağlantı hatası oluştu',
    };

    const message = error.code && errorMessages[error.code] 
      ? errorMessages[error.code] 
      : error.message || 'Bilinmeyen hata';

    toast({
      title: `Hata: ${context}`,
      description: message,
      variant: 'destructive',
    });
  };
};

// 4. Custom Hook for File Analysis
const useFileAnalysis = (user: any, toast: ReturnType<typeof useToast>['toast']) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const analyzeFile = useCallback(async (
    fileId: string,
    fileName: string,
    mimeType: string
  ) => {
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');
    
    setIsAnalyzing(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/ai-agent/drive/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fileId, fileName, mimeType })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error ?? 'Analiz başarısız oldu');
      }

      return await response.json();
    } finally {
      setIsAnalyzing(false);
    }
  }, [user]);

  return { analyzeFile, isAnalyzing };
};

// 5. Optimized Submissions List Component
const SubmissionsList: React.FC<{
  submissions: SubmissionRow[];
  isLoading: boolean;
  onAnalyze: (submission: SubmissionRow) => void;
  onOpenLink: (url: string | null) => void;
  onEdit: (submission: SubmissionRow) => void;
  onDelete: (submission: SubmissionRow) => void;
  resolvingId: string | null;
}> = ({ submissions, isLoading, onAnalyze, onOpenLink, onEdit, onDelete, resolvingId }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">
          Teslimler yükleniyor...
        </span>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Seçilen filtrelere uygun teslim bulunamadı.
      </div>
    );
  }

  return (
    <>
      {submissions.map((submission, index) => {
        const statusConfig = STATUS_LABELS[submission.statusKey];
        
        return (
          <div
            key={generateSubmissionKey(submission, index)}
            className="border rounded-lg p-2 sm:p-3 space-y-2"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-sm sm:text-base font-semibold">{submission.studentName}</p>
                <p className="text-xs text-muted-foreground">{submission.assignmentTitle}</p>
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground mt-1">
                  <span>{submission.classroomLabel}</span>
                  <span>• {submission.weekLabel}</span>
                  <span>• {submission.submittedAt}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusConfig.variant} className="text-[10px] sm:text-xs">
                  {statusConfig.label}
                </Badge>
                
                {submission.grade !== null && (
                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                    {submission.grade} puan
                  </Badge>
                )}
                
                {submission.fileLink && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] sm:text-xs"
                    onClick={() => onOpenLink(submission.fileLink)}
                    aria-label={`${submission.fileName} dosyasını aç`}
                  >
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Dosyayı Aç</span>
                    <span className="sm:hidden">Aç</span>
                  </Button>
                )}
                
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-[10px] sm:text-xs"
                  disabled={resolvingId === submission.id}
                  onClick={() => onAnalyze(submission)}
                  aria-label={`${submission.studentName} için AI geri bildirim oluştur`}
                >
                  {resolvingId === submission.id ? (
                    <>
                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 animate-spin" />
                      <span className="hidden sm:inline">Drive Aranıyor</span>
                      <span className="sm:hidden">Aranıyor</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden sm:inline">AI Geri Bildirim</span>
                      <span className="sm:hidden">AI</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Dosya</p>
              <p className="text-xs sm:text-sm text-foreground break-words">{submission.fileName}</p>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Geri Bildirim
              </p>
                {submission.feedback !== 'Henüz geri bildirim yok.' && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => onEdit(submission)}
                      aria-label="Geri bildirimi düzenle"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                      onClick={() => onDelete(submission)}
                      aria-label="Geri bildirimi sil"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap break-words">
                {submission.feedback}
              </p>
            </div>
          </div>
        );
      })}
    </>
  );
};

// 6. Improved Filter Component
const FilterSection: React.FC<{
  classroomFilter: string;
  weekFilter: string;
  nameSearch: string;
  onClassroomChange: (value: string) => void;
  onWeekChange: (value: string) => void;
  onNameSearchChange: (value: string) => void;
  weekOptions: number[];
  classroomOptions: Array<{ value: string; label: string }>;
}> = ({ classroomFilter, weekFilter, nameSearch, onClassroomChange, onWeekChange, onNameSearchChange, weekOptions, classroomOptions }) => {
  return (
    <div className="space-y-3" role="group" aria-label="Filtreleme seçenekleri">
      <div className="flex flex-wrap gap-3">
      <div className="flex-1 min-w-[160px]">
        <label htmlFor="classroom-filter" className="text-[11px] font-semibold text-muted-foreground mb-1 block">
          Seviye
        </label>
        <Select value={classroomFilter} onValueChange={onClassroomChange}>
          <SelectTrigger id="classroom-filter" className="h-9 text-xs sm:text-sm">
            <SelectValue placeholder="Seviye seçin" />
          </SelectTrigger>
          <SelectContent>
            {classroomOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="capitalize">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[160px]">
        <label htmlFor="week-filter" className="text-[11px] font-semibold text-muted-foreground mb-1 block">
          Hafta
        </label>
        <Select value={weekFilter} onValueChange={onWeekChange}>
          <SelectTrigger id="week-filter" className="h-9 text-xs sm:text-sm">
            <SelectValue placeholder="Hafta seçin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Haftalar</SelectItem>
            {weekOptions.map((weekNumber) => (
              <SelectItem key={weekNumber} value={weekNumber.toString()}>
                {weekNumber}. Hafta
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>
      </div>

      <div>
        <label htmlFor="name-search" className="text-[11px] font-semibold text-muted-foreground mb-1 block">
          Öğrenci Adı ile Ara
        </label>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="name-search"
            type="text"
            placeholder="Öğrenci adı girin..."
            value={nameSearch}
            onChange={(e) => onNameSearchChange(e.target.value)}
            className="h-9 pl-8 text-xs sm:text-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default function AIAgentPage() {
  const { user, firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Merhaba! Ben UludagAIClub Ödev Kontrolcüsü. Drive'dan dosya seçin, birlikte analiz edelim.",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [driveError, setDriveError] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [resolvingSubmissionId, setResolvingSubmissionId] = useState<string | null>(null);
  const [activeFeedbackSubmission, setActiveFeedbackSubmission] = useState<SubmissionRow | null>(null);
  const [feedbackPreviewRaw, setFeedbackPreviewRaw] = useState('');
  const [feedbackEditable, setFeedbackEditable] = useState('');
  const [isFeedbackGenerating, setIsFeedbackGenerating] = useState(false);
  const [isFeedbackSaving, setIsFeedbackSaving] = useState(false);
  const [isExcelSaving, setIsExcelSaving] = useState(false);
  const [feedbackMetadata, setFeedbackMetadata] = useState<FileAnalysisMetadata | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<SubmissionRow | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableGrade, setEditableGrade] = useState<number | null>(null);
  const [previousGrade, setPreviousGrade] = useState<number | null | undefined>(null);
  const CLASSROOM_FILTER_OPTIONS = useMemo(
    () => [
      { value: 'all', label: 'Tüm Seviyeler' },
      ...Object.entries(CLASSROOM_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    ],
    []
  );
  const [classroomFilter, setClassroomFilter] = useState<string>('all');
  const [weekFilter, setWeekFilter] = useState<string>('all');
  const [nameSearch, setNameSearch] = useState<string>('');
  
  // Batch Analysis State'leri
  const [batchClassroom, setBatchClassroom] = useState<string>('');
  const [batchWeek, setBatchWeek] = useState<string>('');
  const [batchFilter, setBatchFilter] = useState<'all' | 'no-feedback' | 'has-file'>('all');
  const [batchSort, setBatchSort] = useState<'name' | 'date'>('date');
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [isBatchPaused, setIsBatchPaused] = useState(false);
  const [batchCancelRequested, setBatchCancelRequested] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchResults, setBatchResults] = useState<Map<string, { grade: number; feedback: string; studentName: string; submissionId: string }>>(new Map());
  const [batchErrors, setBatchErrors] = useState<Map<string, string>>(new Map());
  const [isBatchConfirming, setIsBatchConfirming] = useState(false);
  const [editingBatchResultId, setEditingBatchResultId] = useState<string | null>(null);
  const [editingBatchFeedback, setEditingBatchFeedback] = useState<string>('');
  const [editingBatchGrade, setEditingBatchGrade] = useState<number | null>(null);


  const userProfileRef = useMemoFirebase(
    () => (user && firestore) ? doc(firestore, 'users', user.uid) : null,
    [user, firestore]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const isTeacherUser = isTeacher(userProfile?.role);

  const assignmentsQuery = useMemoFirebase(
    () => (firestore && isTeacherUser)
      ? query(collection(firestore, 'assignments'), orderBy('createdAt', 'desc'))
      : null,
    [firestore, isTeacherUser]
  );
  const { data: assignments } = useCollection<Assignment>(assignmentsQuery);

  const submissionsQuery = useMemoFirebase(
    () => (firestore && isTeacherUser)
      ? query(
          collection(firestore, 'assignmentSubmissions'),
          orderBy('submittedAt', 'desc'),
          limit(MAX_SUBMISSION_ITEMS)
        )
      : null,
    [firestore, isTeacherUser]
  );
  const { data: teacherSubmissions, isLoading: isSubmissionsLoading } = useCollection<AssignmentSubmission>(submissionsQuery);

  const assignmentMap = useMemo(() => {
    const map = new Map<string, Assignment>();
    (assignments ?? []).forEach((assignment) => {
      if (assignment.id) {
        map.set(assignment.id, assignment);
      }
    });
    return map;
  }, [assignments]);

  const submissionRows = useMemo(() => {
    if (!teacherSubmissions) return [];
    return teacherSubmissions.map((submission) => {
      const assignment = submission.assignmentId ? assignmentMap.get(submission.assignmentId) : undefined;
      const classroomKey = submission.classroomLevel ?? assignment?.classroomLevels?.[0] ?? '';
      const classroomLabel = classroomKey
        ? (CLASSROOM_LABELS[classroomKey] ?? classroomKey)
        : 'Seviye belirtilmedi';
      const weekValue = submission.assignmentWeek ?? assignment?.week ?? null;
      const weekLabel = weekValue
        ? `${weekValue}. Hafta`
        : 'Hafta belirtilmedi';
      const submittedDate = submission.submittedAt?.toDate ? submission.submittedAt.toDate() : null;
      const submittedAtFormatted = submittedDate
        ? submittedDate.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })
        : 'Tarih yok';
      const statusKey: keyof typeof STATUS_LABELS = submission.submissionTiming === 'late' ? 'late' : 'on-time';
      const fileName = submission.submittedFileName ?? 'Dosya adı kayıtlı değil';
      const storageUrl = submission.submittedFileUrl ?? null;
      const fileLink = storageUrl
        ?? (submission.driveFileId ? `https://drive.google.com/file/d/${submission.driveFileId}/view` : null);
      const assignmentTitle = assignment?.title ?? 'Ödev';
      const feedbackText = submission.feedback?.trim() ? submission.feedback : 'Henüz geri bildirim yok.';
      const grade = typeof submission.grade === 'number' ? submission.grade : null;

      return {
        id: submission.id,
        studentId: submission.studentId,
        studentName: submission.studentName ?? 'Öğrenci',
        assignmentTitle,
        classroomLabel,
        classroomKey,
        weekLabel,
        assignmentWeekNumber: weekValue ?? null,
        submittedAt: submittedAtFormatted,
        submittedAtDate: submittedDate,
        statusKey,
        assignmentId: submission.assignmentId ?? null,
        fileName,
        fileLink,
        feedback: feedbackText,
        grade,
        driveFileId: submission.driveFileId ?? null,
        storageUrl,
        submittedFileMimeType: submission.submittedFileMimeType ?? null,
        submittedFileSize: submission.submittedFileSize ?? null,
      };
    });
  }, [teacherSubmissions, assignmentMap]);
  const weekFilterOptions = useMemo(() => {
    const weeks = new Set<number>();
    submissionRows.forEach((row) => {
      if (row.assignmentWeekNumber) {
        weeks.add(row.assignmentWeekNumber);
      }
    });
    return Array.from(weeks).sort((a, b) => a - b);
  }, [submissionRows]);

  const filteredSubmissionRows = useMemo(() => {
    // Önce sınıf, hafta ve isim arama filtresine göre filtrele
    const preFiltered = submissionRows.filter((row) => {
      const matchesClassroom = classroomFilter === 'all' || row.classroomKey === classroomFilter;
      const matchesWeek =
        weekFilter === 'all' || (row.assignmentWeekNumber !== null && row.assignmentWeekNumber?.toString() === weekFilter);
      const matchesName = !nameSearch.trim() || 
        row.studentName.toLowerCase().includes(nameSearch.toLowerCase().trim());
      return matchesClassroom && matchesWeek && matchesName;
    });

    // Her öğrenci + hafta kombinasyonu için en son teslim edilen ödevi seç
    const latestByStudentAndWeek = new Map<string, SubmissionRow>();
    
    for (const row of preFiltered) {
      // Öğrenci adı + hafta numarası kombinasyonu için key oluştur
      const key = `${row.studentName}_${row.assignmentWeekNumber ?? 'no-week'}`;
      const existing = latestByStudentAndWeek.get(key);
      
      if (!existing) {
        // İlk kayıt, direkt ekle
        latestByStudentAndWeek.set(key, row);
      } else {
        // Mevcut kayıt var, tarih karşılaştırması yap
        const existingDate = existing.submittedAtDate;
        const currentDate = row.submittedAtDate;
        
        if (currentDate && existingDate) {
          // Daha yeni tarihli olanı seç
          if (currentDate > existingDate) {
            latestByStudentAndWeek.set(key, row);
          }
        } else if (currentDate && !existingDate) {
          // Mevcut kayıt tarihli, yeni kayıt tarihsiz - mevcut kaydı tut
          // (değişiklik yok)
        } else if (!currentDate && existingDate) {
          // Mevcut kayıt tarihsiz, yeni kayıt tarihli - yeni kaydı seç
          latestByStudentAndWeek.set(key, row);
        }
        // İkisi de tarihsiz ise mevcut kaydı tut (değişiklik yok)
      }
    }
    
    // Map'ten array'e çevir ve submittedAtDate'e göre sırala (en yeni önce)
    return Array.from(latestByStudentAndWeek.values()).sort((a, b) => {
      const dateA = a.submittedAtDate;
      const dateB = b.submittedAtDate;
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      return dateB.getTime() - dateA.getTime();
    });
  }, [submissionRows, classroomFilter, weekFilter, nameSearch]);

  const displayedSubmissionCount = filteredSubmissionRows.length;

  useEffect(() => {
    if (userProfile && !isTeacherUser) {
      router.push('/dashboard');
    }
  }, [userProfile, isTeacherUser, router]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if user is teacher
    if (user) {
      user.getIdToken().then(async (token) => {
        const response = await fetch('/api/ai-agent/drive/list', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (response.ok) {
          setDriveFiles(data.files ?? []);
          setCurrentFolderId(data.folderId ?? null);
          setCurrentFolderName(data.folderName ?? null);
          setDriveError(null);
        } else {
          setDriveError(data.error ?? 'Dosyalar yüklenemedi');
          setDriveFiles([]);
        }
      });
    }
  }, [user, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    setMessages(prev => [...prev, {
      text: userMessage,
      isUser: true,
      timestamp: new Date()
    }]);

    try {
      if (!user) {
        throw new Error('Not authenticated');
      }
      const token = await user.getIdToken();

      const response = await fetch('/api/ai-agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await response.json();

      if (response.ok) {
        setMessages(prev => [...prev, {
          text: data.response,
          isUser: false,
          timestamp: new Date()
        }]);
      } else {
        setMessages(prev => [...prev, {
          text: `Hata: ${data.error}`,
          isUser: false,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        text: 'Bir hata oluştu. Lütfen tekrar deneyin.',
        isUser: false,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDriveFiles = async (folderId: string | null = null) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();

      const url = folderId 
        ? `/api/ai-agent/drive/list?folderId=${folderId}`
        : '/api/ai-agent/drive/list';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setDriveFiles(data.files ?? []);
        setCurrentFolderId(data.folderId ?? folderId);
        setCurrentFolderName(data.folderName ?? null);
        setDriveError(null);
      } else {
        setDriveError(data.error ?? 'Dosyalar yüklenemedi');
        setDriveFiles([]);
        console.error('Drive list failed:', data.error ?? 'Unknown error');
      }
    } catch (error) {
      console.error('Drive files load error:', error);
    }
  };

  const handleFolderClick = async (file: DriveFile) => {
    if (!file.isFolder) return;

    const previousId = currentFolderId ?? '';
    const previousName = currentFolderName ?? 'Üst Klasör';
    setFolderStack(prev => [...prev, { id: previousId, name: previousName }]);
    await loadDriveFiles(file.id);
  };

  const handleBackClick = async () => {
    if (folderStack.length === 0) {
      await loadDriveFiles(null);
      return;
    }

    const previous = folderStack[folderStack.length - 1];
    setFolderStack(prev => prev.slice(0, -1));
    await loadDriveFiles(previous.id);
  };

  const handleFileSelect = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const analyzeSelectedFiles = async () => {
    if (selectedFiles.size === 0 || !user) return;

    setIsLoading(true);
    const selectedFilesArray = Array.from(selectedFiles);
    
    setMessages(prev => [...prev, {
      text: `${selectedFiles.size} dosya analiz ediliyor...`,
      isUser: true,
      timestamp: new Date()
    }]);

    try {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();

      let combinedResponse = '';
      let hasSuccess = false;
      for (const fileId of selectedFilesArray) {
        const file = driveFiles.find(f => f.id === fileId);
        if (!file) continue;

        try {
          const response = await fetch('/api/ai-agent/drive/download', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              fileId: file.id,
              fileName: file.name,
              mimeType: file.mimeType
            })
          });

          const data = await response.json();
          if (response.ok) {
            combinedResponse += `\n\n## ${file.name}\n\n${data.response}`;
            hasSuccess = true;
          } else {
            const errorMessage = data?.error ?? 'Dosya analiz edilemedi.';
            setMessages(prev => [...prev, {
              text: `${file.name} analizi başarısız: ${errorMessage}`,
              isUser: false,
              timestamp: new Date()
            }]);
          }
        } catch (error) {
          console.error(`Dosya analiz hatası: ${file.name}`, error);
          setMessages(prev => [...prev, {
            text: `${file.name} analizi sırasında hata oluştu.`,
            isUser: false,
            timestamp: new Date()
          }]);
        }
      }

      setIsLoading(false);
      if (hasSuccess && combinedResponse) {
        setMessages(prev => [...prev, {
          text: combinedResponse,
          isUser: false,
          timestamp: new Date()
        }]);
      } else {
        setMessages(prev => [...prev, {
          text: 'Seçilen dosyalar analiz edilemedi.',
          isUser: false,
          timestamp: new Date()
        }]);
      }

      // Clear selection
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Error analyzing files:', error);
      setIsLoading(false);
      setMessages(prev => [...prev, {
        text: 'Dosyalar analiz edilemedi.',
        isUser: false,
        timestamp: new Date()
      }]);
    }
  };

  const renderMarkdown = useMarkdownRenderer();

  const formatBytes = (bytes: string | null): string => {
    if (!bytes || isNaN(Number(bytes))) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let index = 0;
    let value = Number(bytes);
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index++;
    }
    return `${value.toFixed(value < 10 && index > 0 ? 1 : 0)} ${units[index]}`;
  };

  const formatMetadataLine = (metadata: FileAnalysisMetadata | null, fallbackName: string) => {
    if (!metadata) {
      return fallbackName;
    }
    const parts: string[] = [];
    const name = metadata.name ?? fallbackName;
    if (name) parts.push(name);
    const sizeLabel = metadata.size ? formatBytes(metadata.size) : '';
    if (sizeLabel) parts.push(sizeLabel);
    if (metadata.mimeType) parts.push(metadata.mimeType);
    return parts.join(' · ');
  };

  const formatDateTime = (isoDate?: string | null) => {
    if (!isoDate) return null;
    const parsed = new Date(isoDate);
    if (isNaN(parsed.getTime())) return null;
    return parsed.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const buildAiFeedbackChatEntry = (
    submission: SubmissionRow,
    feedbackText: string,
    metadata: FileAnalysisMetadata | null
  ) => {
    const header = `AI Geri Bildirim • ${submission.studentName} → ${submission.assignmentTitle}`;
    const fileLine = `Dosya: ${formatMetadataLine(metadata, submission.fileName)}`;
    return `${header}\n${fileLine}\n\n${feedbackText}`;
  };

  const openSubmissionLink = (url: string | null) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCloseFeedbackDialog = () => {
    if (isFeedbackSaving) return;
    setIsFeedbackDialogOpen(false);
    setActiveFeedbackSubmission(null);
    setFeedbackPreviewRaw('');
    setFeedbackEditable('');
    setIsFeedbackGenerating(false);
    setFeedbackMetadata(null);
    setIsEditMode(false);
    setEditableGrade(null);
    setPreviousGrade(null);
  };

  const resolveDriveFileForSubmission = useCallback(
    async (submission: SubmissionRow): Promise<SubmissionRow | null> => {
      if (!user) {
        toast({
          title: 'Oturum bulunamadı',
          description: 'Drive dosyası aranırken kullanıcı oturumu doğrulanamadı.',
          variant: 'destructive',
        });
        return null;
      }

      setResolvingSubmissionId(submission.id);
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/ai-agent/drive/resolve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            submissionId: submission.id,
            classroomLevel: submission.classroomKey,
            assignmentWeek: submission.assignmentWeekNumber,
            studentName: submission.studentName,
            fileName: submission.fileName,
            assignmentTitle: submission.assignmentTitle,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? 'Drive üzerinde dosya bulunamadı.');
        }

        toast({
          title: 'Drive dosyası bulundu',
          description: `${submission.studentName} için dosya otomatik eşleştirildi.`,
        });

        return {
          ...submission,
          driveFileId: data.driveFileId ?? submission.driveFileId,
          fileName: data.fileName ?? submission.fileName,
        };
      } catch (error) {
        toast({
          title: 'Drive dosyası bulunamadı',
          description: error instanceof Error ? error.message : 'Bilinmeyen hata',
          variant: 'destructive',
        });
        return null;
      } finally {
        setResolvingSubmissionId((prev) => (prev === submission.id ? null : prev));
      }
    },
    [toast, user]
  );

  const validateSubmission = (submission: SubmissionRow): boolean => {
    if (!user) {
      toast({
        title: 'Oturum bulunamadı',
        description: 'Geri bildirim üretmek için lütfen yeniden giriş yapın.',
        variant: 'destructive',
      });
      return false;
    }

    if (!submission.driveFileId && !submission.storageUrl) {
      toast({
        title: 'Dosya bulunamadı',
        description: 'Bu teslim için Drive veya Storage kaynağı bulunamadı.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const initializeFeedbackDialog = (submission: SubmissionRow) => {
    setActiveFeedbackSubmission(submission);
    setIsFeedbackDialogOpen(true);
    setIsFeedbackGenerating(true);
    setFeedbackPreviewRaw('');
    setFeedbackEditable('');
    setFeedbackMetadata(null);
    setIsEditMode(false);
    setEditableGrade(submission.grade);
    setPreviousGrade(submission.grade);
    setMessages(prev => [
      ...prev,
      {
        text: `AI analizi başlatıldı: ${submission.studentName} → ${submission.assignmentTitle}`,
        isUser: false,
        timestamp: new Date()
      }
    ]);
  };

  const fetchAiAnalysis = async (submission: SubmissionRow) => {
    const token = await user!.getIdToken();
    const response = await fetch('/api/ai-agent/drive/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fileId: submission.driveFileId,
        fileName: submission.fileName ?? submission.assignmentTitle,
        mimeType: submission.submittedFileMimeType ?? 'application/octet-stream',
        storageUrl: submission.storageUrl,
        storageMimeType: submission.submittedFileMimeType ?? undefined
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const errorMessage = data.error ?? 'AI geri bildirimi alınamadı.';
      const err = new Error(errorMessage) as Error & { code?: string };
      if (typeof data.code === 'string') {
        err.code = data.code;
      }
      throw err;
    }

    return data;
  };

  const updateSubmissionMetadata = async (
    submission: SubmissionRow,
    metadata: FileAnalysisMetadata
  ) => {
    if (!firestore) return;

    const updates: Record<string, string> = {};
    if ((!submission.fileName || submission.fileName === 'Dosya adı kayıtlı değil') && metadata.name) {
      updates.submittedFileName = metadata.name;
    }
    if (!submission.submittedFileMimeType && metadata.mimeType) {
      updates.submittedFileMimeType = metadata.mimeType;
    }
    if (metadata.size) {
      updates.submittedFileSize = metadata.size;
    }

    if (Object.keys(updates).length > 0) {
      try {
        await updateDoc(doc(firestore, 'assignmentSubmissions', submission.id), updates);
      } catch (metaUpdateErr) {
        console.warn('Metadata güncellenemedi:', metaUpdateErr);
      }
    }
  };

  const formatErrorMessage = (error: Error & { code?: string }): string => {
    const errorCode = error.code;
    if (errorCode === 'DRIVE_FILE_NOT_FOUND') {
      return 'Drive üzerinde dosya bulunamadı. Dosya taşınmış veya silinmiş olabilir.';
    }
    if (errorCode === 'STORAGE_FILE_UNAVAILABLE') {
      return 'Dosya Firebase Storage üzerinden de indirilemedi. Öğrenciden tekrar yüklemesini isteyin.';
    }
    if (errorCode === 'FILE_SOURCE_NOT_FOUND') {
      return 'Analiz edilecek dosya kaynağı tespit edilemedi.';
    }
    return error.message ?? 'Bilinmeyen hata';
  };

  const handleAnalysisSuccess = (
    submission: SubmissionRow,
    aiText: string,
    metadata: FileAnalysisMetadata | null,
    source?: string
  ) => {
    setFeedbackMetadata(metadata);

    if (metadata?.name && submission.fileName === 'Dosya adı kayıtlı değil') {
      setActiveFeedbackSubmission((prev) =>
        prev && prev.id === submission.id ? { ...prev, fileName: metadata.name ?? prev.fileName } : prev
      );
    }

    setFeedbackPreviewRaw(aiText);
    setFeedbackEditable(aiText);
    
    // AI metninden puanı parse et
    let parsedGrade: number | null = null;
    
    // Pattern 1: "## Puan" başlığı altında (en öncelikli)
    const puanSectionMatch = aiText.match(/##\s*Puan\s*\n\s*(\d+)/i) || 
                             aiText.match(/##\s*Puan\s*[:\-]?\s*(\d+)/i);
    if (puanSectionMatch) {
      parsedGrade = parseInt(puanSectionMatch[1], 10);
    }
    
    // Pattern 2: "Puan: X" veya "Puan X" formatı
    if (!parsedGrade) {
      const gradeMatch = aiText.match(/Puan[:\s]+(\d+)/i);
      if (gradeMatch) {
        parsedGrade = parseInt(gradeMatch[1], 10);
      }
    }
    
    // Pattern 3: "X puan" veya "X/100" formatı
    if (!parsedGrade) {
      const gradeMatch = aiText.match(/(\d+)\s*(?:puan|\/100)/i);
      if (gradeMatch) {
        parsedGrade = parseInt(gradeMatch[1], 10);
      }
    }
    
    // Pattern 4: "Not: X" veya "Not X" formatı
    if (!parsedGrade) {
      const gradeMatch = aiText.match(/Not[:\s]+(\d+)/i);
      if (gradeMatch) {
        parsedGrade = parseInt(gradeMatch[1], 10);
      }
    }
    
    // Pattern 5: "Skor: X" veya "Skor X" formatı
    if (!parsedGrade) {
      const gradeMatch = aiText.match(/Skor[:\s]+(\d+)/i);
      if (gradeMatch) {
        parsedGrade = parseInt(gradeMatch[1], 10);
      }
    }
    
    // Validate grade
    if (parsedGrade !== null && (isNaN(parsedGrade) || parsedGrade < 0 || parsedGrade > 100)) {
      parsedGrade = null;
    }
    
    // Mevcut puanı previousGrade'e kaydet, yeni puanı editableGrade'e set et
    setPreviousGrade(submission.grade);
    setEditableGrade(parsedGrade);
    
    setMessages((prev) => [
      ...prev,
      {
        text: buildAiFeedbackChatEntry(submission, aiText, metadata),
        isUser: false,
        timestamp: new Date(),
      },
    ]);

    if (source === 'storage') {
      toast({
        title: 'Drive yedeği kullanıldı',
        description: 'Drive dosyası bulunamadı, Firebase Storage kopyası ile analiz tamamlandı.',
      });
    }
  };

  const handleAnalysisError = (submission: SubmissionRow, error: Error & { code?: string }) => {
    const message = formatErrorMessage(error);
    setFeedbackPreviewRaw(`Hata: ${message}`);
    toast({
      title: 'AI geri bildirimi alınamadı',
      description: message,
      variant: 'destructive',
    });
    setMessages((prev) => [
      ...prev,
      {
        text: `AI analizi başarısız: ${submission.studentName}\nHata: ${message}`,
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  };

  const handleAnalyzeSubmission = async (submission: SubmissionRow) => {
    let submissionToAnalyze = submission;

    // Eğer driveFileId yoksa, resolve API'sini çağır
    if (!submission.driveFileId && !submission.storageUrl) {
      const resolved = await resolveDriveFileForSubmission(submission);
      if (resolved) {
        submissionToAnalyze = resolved;
      }
    }

    if (!validateSubmission(submissionToAnalyze)) {
      return;
    }

    initializeFeedbackDialog(submissionToAnalyze);

    try {
      const data = await fetchAiAnalysis(submissionToAnalyze);
      const aiText = data.response ?? 'Yanıt alınamadı.';
      const metadata: FileAnalysisMetadata | null = data.metadata ?? null;

      if (metadata) {
        await updateSubmissionMetadata(submissionToAnalyze, metadata);
      }

      handleAnalysisSuccess(submissionToAnalyze, aiText, metadata, data.source);
    } catch (error) {
      const err = error as Error & { code?: string };
      
      // Eğer dosya bulunamadı hatası alırsak (DRIVE_FILE_NOT_FOUND), resolve API'sini çağır
      if (err.code === 'DRIVE_FILE_NOT_FOUND' && submissionToAnalyze.driveFileId) {
        toast({
          title: 'Dosya ID güncelleniyor',
          description: 'Dosya bulunamadı, Drive\'da yeniden aranıyor...',
        });
        
        const resolved = await resolveDriveFileForSubmission(submissionToAnalyze);
        if (resolved && resolved.driveFileId !== submissionToAnalyze.driveFileId) {
          // Yeni dosya ID bulundu, tekrar dene
          submissionToAnalyze = resolved;
          try {
            const retryData = await fetchAiAnalysis(submissionToAnalyze);
            const aiText = retryData.response ?? 'Yanıt alınamadı.';
            const metadata: FileAnalysisMetadata | null = retryData.metadata ?? null;

            if (metadata) {
              await updateSubmissionMetadata(submissionToAnalyze, metadata);
            }

            handleAnalysisSuccess(submissionToAnalyze, aiText, metadata, retryData.source);
            return; // Başarılı, fonksiyondan çık
          } catch (retryError) {
            // Retry de başarısız, orijinal hatayı göster
            handleAnalysisError(submissionToAnalyze, retryError as Error & { code?: string });
          }
        } else {
          // Resolve başarısız, orijinal hatayı göster
          handleAnalysisError(submissionToAnalyze, err);
        }
      } else {
        // Diğer hatalar için normal hata işleme
        handleAnalysisError(submissionToAnalyze, err);
      }
    } finally {
      setIsFeedbackGenerating(false);
    }
  };

  const handleSaveToExcel = async () => {
    if (!activeFeedbackSubmission || !user) return;

    const sanitizedFeedback = feedbackEditable.trim();
    if (!sanitizedFeedback) {
      toast({
        title: 'Geri bildirim boş olamaz',
        description: 'Excel\'e kaydetmek için metin gerekli.',
        variant: 'destructive',
      });
      return;
    }

    setIsExcelSaving(true);
    try {
      const token = await user.getIdToken();
      const excelResponse = await fetch('/api/ai-agent/excel/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentName: activeFeedbackSubmission.studentName,
          feedback: sanitizedFeedback,
          assignmentTitle: activeFeedbackSubmission.assignmentTitle,
          classroomLevel: activeFeedbackSubmission.classroomKey,
          week: activeFeedbackSubmission.assignmentWeekNumber,
        }),
      });

      if (!excelResponse.ok) {
        const excelError = await excelResponse.json();
        throw new Error(excelError.error || 'Excel\'e yazılırken bir hata oluştu.');
      }

      toast({
        title: 'Excel\'e kaydedildi',
        description: `${activeFeedbackSubmission.studentName} için geri bildirim Excel'e başarıyla kaydedildi.`,
      });

      setMessages((prev) => [
        ...prev,
        {
          text: `Excel'e kaydedildi → ${activeFeedbackSubmission.studentName}\n\n${sanitizedFeedback}`,
          isUser: true,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      toast({
        title: 'Excel\'e kaydedilemedi',
        description: error instanceof Error ? error.message : 'Bilinmeyen hata',
        variant: 'destructive',
      });
    } finally {
      setIsExcelSaving(false);
    }
  };

  const handleSaveFeedback = async () => {
    if (!firestore || !activeFeedbackSubmission || !user) return;

    const sanitizedFeedback = feedbackEditable.trim();
    if (!sanitizedFeedback) {
      toast({
        title: 'Geri bildirim boş olamaz',
        description: 'Öğrenciye göndermeden önce metni düzenleyin.',
        variant: 'destructive',
      });
      return;
    }

    // Puan kontrolü
    if (editableGrade !== null && (editableGrade < 0 || editableGrade > 100)) {
      toast({
        title: 'Geçersiz puan',
        description: 'Puan 0-100 arasında olmalıdır.',
        variant: 'destructive',
      });
      return;
    }

    setIsFeedbackSaving(true);
    try {
      // Firestore'a kaydet
      const updateData: Record<string, any> = {
        feedback: sanitizedFeedback,
        gradedAt: serverTimestamp(),
        gradedBy: user.uid,
      };
      
      // Puan varsa ekle
      if (editableGrade !== null) {
        updateData.grade = editableGrade;
      } else {
        // Puan null ise, önceki puan varsa sil
        updateData.grade = deleteField();
      }

      await updateDoc(doc(firestore, 'assignmentSubmissions', activeFeedbackSubmission.id), updateData);

      // Puan değiştiyse haftalık puanı güncelle
      if (activeFeedbackSubmission.assignmentWeekNumber && activeFeedbackSubmission.studentId) {
        const gradeChanged = previousGrade !== editableGrade;
        if (gradeChanged) {
          await updateStudentWeekScore({
            studentId: activeFeedbackSubmission.studentId,
            week: activeFeedbackSubmission.assignmentWeekNumber,
            previousGrade,
            nextGrade: editableGrade,
          });
        }
      }

      // Excel'e yaz
      try {
        const token = await user.getIdToken();
        const excelResponse = await fetch('/api/ai-agent/excel/write', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            studentName: activeFeedbackSubmission.studentName,
            feedback: sanitizedFeedback,
            assignmentTitle: activeFeedbackSubmission.assignmentTitle,
            classroomLevel: activeFeedbackSubmission.classroomKey,
            week: activeFeedbackSubmission.assignmentWeekNumber,
          }),
        });

        if (!excelResponse.ok) {
          const excelError = await excelResponse.json();
          if (process.env.NODE_ENV === 'development') {
            console.warn('Excel write failed', {
              error: excelError.error,
              studentName: activeFeedbackSubmission.studentName,
            });
          }
          // Excel yazma hatası kritik değil, sadece uyarı ver
          toast({
            title: 'Geri bildirim kaydedildi',
            description: `${activeFeedbackSubmission.studentName} için geri bildirim kaydedildi. Excel'e yazılırken bir sorun oluştu.`,
            variant: 'default',
          });
        } else {
          toast({
            title: 'Geri bildirim gönderildi',
            description: `${activeFeedbackSubmission.studentName} için geri bildirim kaydedildi ve Excel'e yazıldı.`,
          });
        }
      } catch (excelError) {
        // Excel yazma hatası kritik değil, sadece logla
        if (process.env.NODE_ENV === 'development') {
          console.warn('Excel write error', excelError);
        }
        toast({
          title: 'Geri bildirim kaydedildi',
          description: `${activeFeedbackSubmission.studentName} için geri bildirim kaydedildi. Excel'e yazılırken bir sorun oluştu.`,
          variant: 'default',
        });
      }

      setMessages((prev) => [
        ...prev,
        {
          text: `Geri bildirim gönderildi → ${activeFeedbackSubmission.studentName}\n\n${sanitizedFeedback}`,
          isUser: true,
          timestamp: new Date(),
        },
      ]);
      handleCloseFeedbackDialog();
    } catch (error) {
      toast({
        title: 'Geri bildirim kaydedilemedi',
        description: error instanceof Error ? error.message : 'Bilinmeyen hata',
        variant: 'destructive',
      });
    } finally {
      setIsFeedbackSaving(false);
    }
  };

  const handleEditFeedback = (submission: SubmissionRow) => {
    setActiveFeedbackSubmission(submission);
    setFeedbackEditable(submission.feedback);
    setFeedbackPreviewRaw(submission.feedback);
    setFeedbackMetadata(null);
    setIsFeedbackGenerating(false);
    setIsEditMode(true);
    setEditableGrade(submission.grade);
    setPreviousGrade(submission.grade);
    setIsFeedbackDialogOpen(true);
  };

  const handleDeleteFeedback = (submission: SubmissionRow) => {
    setSubmissionToDelete(submission);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteFeedback = async () => {
    if (!firestore || !submissionToDelete || !user) {
      setIsDeleteDialogOpen(false);
      setSubmissionToDelete(null);
      return;
    }

    try {
      await updateDoc(doc(firestore, 'assignmentSubmissions', submissionToDelete.id), {
        feedback: deleteField(),
        gradedAt: deleteField(),
        gradedBy: deleteField(),
      });

      toast({
        title: 'Geri bildirim silindi',
        description: `${submissionToDelete.studentName} için geri bildirim başarıyla silindi.`,
      });

      setMessages((prev) => [
        ...prev,
        {
          text: `Geri bildirim silindi → ${submissionToDelete.studentName}`,
          isUser: true,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      toast({
        title: 'Geri bildirim silinemedi',
        description: error instanceof Error ? error.message : 'Bilinmeyen hata',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setSubmissionToDelete(null);
    }
  };

  /**
   * Helper: Render submissions list with proper conditional logic
   */
  const renderSubmissionsList = () => {
    if (submissionRows.length === 0 && !isSubmissionsLoading) {
      return <p className="text-sm text-muted-foreground">Henüz teslim bulunmuyor.</p>;
    }

    return (
      <SubmissionsList
        submissions={filteredSubmissionRows}
        isLoading={isSubmissionsLoading}
        onAnalyze={handleAnalyzeSubmission}
        onOpenLink={openSubmissionLink}
        onEdit={handleEditFeedback}
        onDelete={handleDeleteFeedback}
        resolvingId={resolvingSubmissionId}
      />
    );
  };

  // Get target submissions for batch analysis with filters and sorting
  const getBatchTargetSubmissions = (): SubmissionRow[] => {
    if (!batchClassroom || !batchWeek) return [];
    
    let filtered = submissionRows.filter((row) => {
      const matchesClassroom = row.classroomKey === batchClassroom;
      const matchesWeek = row.assignmentWeekNumber !== null && row.assignmentWeekNumber.toString() === batchWeek;
      if (!matchesClassroom || !matchesWeek) return false;

      // IMPORTANT: Automatically exclude submissions that already have feedback AND grade
      // This prevents them from appearing in the batch analysis list at all
      const hasFeedback = row.feedback && row.feedback !== 'Henüz geri bildirim yok.';
      const hasGrade = row.grade !== null && row.grade !== undefined;
      
      // Skip if already has both feedback and grade
      if (hasFeedback && hasGrade) return false;

      // Apply additional filters
      if (batchFilter === 'no-feedback') {
        if (hasFeedback) return false;
      }
      if (batchFilter === 'has-file') {
        if (!row.driveFileId && !row.storageUrl) return false;
      }

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      if (batchSort === 'name') {
        return a.studentName.localeCompare(b.studentName, 'tr');
      } else {
        // Sort by date (newest first)
        const dateA = a.submittedAtDate?.getTime() ?? 0;
        const dateB = b.submittedAtDate?.getTime() ?? 0;
        return dateB - dateA;
      }
    });

    return filtered;
  };

  // Get filtered and sorted submissions for display
  const getFilteredBatchSubmissions = (): SubmissionRow[] => {
    const all = getBatchTargetSubmissions();
    // If selections exist, only show selected ones
    if (selectedSubmissions.size > 0) {
      return all.filter(s => selectedSubmissions.has(s.id));
    }
    return all;
  };

  // Batch analysis functions
  const handleStartBatchAnalysis = async () => {
    if (!user || !firestore || !batchClassroom || !batchWeek) return;

    // Get submissions to analyze (selected ones if any, otherwise all filtered)
    // Note: getBatchTargetSubmissions already filters out submissions with both feedback and grade
    const allSubmissions = getBatchTargetSubmissions();
    const targetSubmissions = selectedSubmissions.size > 0
      ? allSubmissions.filter(s => selectedSubmissions.has(s.id))
      : allSubmissions;

    if (targetSubmissions.length === 0) {
      toast({
        title: 'Teslim bulunamadı',
        description: 'Seçilen seviye ve hafta için değerlendirilmemiş teslim bulunamadı. Tüm teslimler zaten puanlanmış olabilir.',
        variant: 'destructive',
      });
      return;
    }

    setIsBatchAnalyzing(true);
    setIsBatchPaused(false);
    setBatchCancelRequested(false);
    setBatchProgress({ current: 0, total: targetSubmissions.length });
    setBatchResults(new Map());
    setBatchErrors(new Map());

    const results = new Map<string, { grade: number; feedback: string; studentName: string; submissionId: string }>();
    const errors = new Map<string, string>();

    try {
      for (let i = 0; i < targetSubmissions.length; i++) {
        // Check for cancel
        if (batchCancelRequested) {
          toast({
            title: 'Analiz iptal edildi',
            description: `${i} öğrenci analiz edildi, ${targetSubmissions.length - i} öğrenci kaldı.`,
          });
          break;
        }

        // Check for pause
        while (isBatchPaused && !batchCancelRequested) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        if (batchCancelRequested) break;

        const submission = targetSubmissions[i];
        setBatchProgress({ current: i, total: targetSubmissions.length });

        // Wait 10 seconds between analyses (except for the first one) to avoid rate limits
        if (i > 0) {
          // Check for cancel during wait
          for (let waitSeconds = 0; waitSeconds < 10; waitSeconds += 2) {
            if (batchCancelRequested) break;
            if (isBatchPaused) {
              while (isBatchPaused && !batchCancelRequested) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
              if (batchCancelRequested) break;
            }
            await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second chunks
          }
          if (batchCancelRequested) break;
        }

        try {
          // Get fresh token for each request to prevent expiration issues
          const token = await user.getIdToken(false); // false = use cache if valid, refresh if expired
          
          // Resolve drive file if needed
          let submissionToAnalyze = submission;
          if (!submission.driveFileId && !submission.storageUrl) {
            const resolved = await resolveDriveFileForSubmission(submission);
            if (resolved) {
              submissionToAnalyze = resolved;
            }
          }

          if (!submissionToAnalyze.driveFileId && !submissionToAnalyze.storageUrl) {
            errors.set(submission.id, 'Dosya bulunamadı');
            continue;
          }

          // Call AI analysis API
          const response = await fetch('/api/ai-agent/drive/download', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              fileId: submissionToAnalyze.driveFileId,
              fileName: submissionToAnalyze.fileName ?? submissionToAnalyze.assignmentTitle,
              mimeType: submissionToAnalyze.submittedFileMimeType ?? 'application/octet-stream',
              storageUrl: submissionToAnalyze.storageUrl,
              storageMimeType: submissionToAnalyze.submittedFileMimeType ?? undefined
            })
          });

          const data = await response.json();
          if (!response.ok) {
            errors.set(submission.id, data.error ?? 'AI analizi başarısız');
            continue;
          }

          // Extract grade from AI response (look for patterns like "## Puan\n85" or "X puan" or "X/100")
          const feedbackText = data.response ?? '';
          
          // Try multiple patterns to find the grade
          let gradeMatch = null;
          let grade = null;
          
          // Pattern 1: "## Puan" başlığı altında (en öncelikli)
          const puanSectionMatch = feedbackText.match(/##\s*Puan\s*\n\s*(\d+)/i) || 
                                   feedbackText.match(/##\s*Puan\s*[:\-]?\s*(\d+)/i);
          if (puanSectionMatch) {
            grade = parseInt(puanSectionMatch[1], 10);
          }
          
          // Pattern 2: "Puan: X" veya "Puan X" formatı
          if (!grade) {
            gradeMatch = feedbackText.match(/Puan[:\s]+(\d+)/i);
            if (gradeMatch) {
              grade = parseInt(gradeMatch[1], 10);
            }
          }
          
          // Pattern 3: "X puan" veya "X/100" formatı
          if (!grade) {
            gradeMatch = feedbackText.match(/(\d+)\s*(?:puan|\/100)/i);
            if (gradeMatch) {
              grade = parseInt(gradeMatch[1], 10);
            }
          }
          
          // Pattern 4: "Not: X" veya "Not X" formatı
          if (!grade) {
            gradeMatch = feedbackText.match(/Not[:\s]+(\d+)/i);
            if (gradeMatch) {
              grade = parseInt(gradeMatch[1], 10);
            }
          }
          
          // Pattern 5: "Skor: X" veya "Skor X" formatı
          if (!grade) {
            gradeMatch = feedbackText.match(/Skor[:\s]+(\d+)/i);
            if (gradeMatch) {
              grade = parseInt(gradeMatch[1], 10);
            }
          }
          
          // Validate grade
          if (grade === null || isNaN(grade) || grade < 0 || grade > 100) {
            // If no grade found, log warning and default to 50
            console.warn(`[AI Agent] Puan bulunamadı for submission ${submission.id}. AI yanıtı:`, feedbackText.substring(0, 200));
            results.set(submission.id, {
              grade: 50,
              feedback: feedbackText,
              studentName: submission.studentName,
              submissionId: submission.id,
            });
          } else {
            results.set(submission.id, {
              grade,
              feedback: feedbackText,
              studentName: submission.studentName,
              submissionId: submission.id,
            });
          }
        } catch (error) {
          errors.set(submission.id, error instanceof Error ? error.message : 'Bilinmeyen hata');
        }
      }

      setBatchResults(results);
      setBatchErrors(errors);
      const finalProgress = batchCancelRequested 
        ? { current: results.size + errors.size, total: targetSubmissions.length }
        : { current: targetSubmissions.length, total: targetSubmissions.length };
      setBatchProgress(finalProgress);

      // Save to history
      if (firestore && user) {
        try {
          const historyEntry = {
            date: serverTimestamp(),
            classroom: batchClassroom,
            week: batchWeek,
            total: targetSubmissions.length,
            success: results.size,
            errors: errors.size,
            teacherId: user.uid,
            teacherName: userProfile?.displayName ?? 'Öğretmen',
          };
          await addDocumentNonBlocking(collection(firestore, 'batchAnalysisHistory'), historyEntry);
        } catch (historyError) {
          console.warn('Failed to save batch history:', historyError);
        }
      }

      if (batchCancelRequested) {
        toast({
          title: 'Analiz iptal edildi',
          description: `${results.size} öğrenci için sonuç alındı.`,
        });
      } else {
        toast({
          title: 'Toplu analiz tamamlandı',
          description: `${results.size} öğrenci analiz edildi.${errors.size > 0 ? ` ${errors.size} hata oluştu.` : ''}`,
        });
      }
    } catch (error) {
      toast({
        title: 'Toplu analiz hatası',
        description: error instanceof Error ? error.message : 'Bilinmeyen hata',
        variant: 'destructive',
      });
    } finally {
      setIsBatchAnalyzing(false);
      setIsBatchPaused(false);
      setBatchCancelRequested(false);
    }
  };

  const handleCancelBatchAnalysis = () => {
    setBatchCancelRequested(true);
    setIsBatchPaused(false);
  };

  const handlePauseResumeBatchAnalysis = () => {
    setIsBatchPaused(prev => !prev);
  };

  const handleRetryFailedSubmissions = async () => {
    if (!user || batchErrors.size === 0) return;

    const failedIds = Array.from(batchErrors.keys());
    const failedSubmissions = submissionRows.filter(s => failedIds.includes(s.id));

    setIsBatchAnalyzing(true);
    setBatchCancelRequested(false);
    setIsBatchPaused(false);

    const results = new Map(batchResults);
    const errors = new Map<string, string>();

    try {
      const token = await user.getIdToken();

      for (let i = 0; i < failedSubmissions.length; i++) {
        if (batchCancelRequested) break;

        const submission = failedSubmissions[i];
        setBatchProgress({ current: i, total: failedSubmissions.length });

        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 60000));
        }

        try {
          let submissionToAnalyze: SubmissionRow = submission;
          if (!submission.driveFileId && !submission.storageUrl) {
            const resolved = await resolveDriveFileForSubmission(submission);
            if (resolved) submissionToAnalyze = resolved;
          }

          if (!submissionToAnalyze.driveFileId && !submissionToAnalyze.storageUrl) {
            errors.set(submission.id, 'Dosya bulunamadı');
            continue;
          }

          const response = await fetch('/api/ai-agent/drive/download', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              fileId: submissionToAnalyze.driveFileId,
              fileName: submissionToAnalyze.fileName ?? submissionToAnalyze.assignmentTitle,
              mimeType: submissionToAnalyze.submittedFileMimeType ?? 'application/octet-stream',
              storageUrl: submissionToAnalyze.storageUrl,
              storageMimeType: submissionToAnalyze.submittedFileMimeType ?? undefined
            })
          });

          const data = await response.json();
          if (!response.ok) {
            errors.set(submission.id, data.error ?? 'AI analizi başarısız');
            continue;
          }

          const feedbackText = data.response ?? '';
          
          // Try multiple patterns to find the grade (same as in handleStartBatchAnalysis)
          let grade = null;
          
          // Pattern 1: "## Puan" başlığı altında (en öncelikli)
          const puanSectionMatch = feedbackText.match(/##\s*Puan\s*\n\s*(\d+)/i) || 
                                   feedbackText.match(/##\s*Puan\s*[:\-]?\s*(\d+)/i);
          if (puanSectionMatch) {
            grade = parseInt(puanSectionMatch[1], 10);
          }
          
          // Pattern 2: "Puan: X" veya "Puan X" formatı
          if (!grade) {
            const gradeMatch = feedbackText.match(/Puan[:\s]+(\d+)/i);
            if (gradeMatch) {
              grade = parseInt(gradeMatch[1], 10);
            }
          }
          
          // Pattern 3: "X puan" veya "X/100" formatı
          if (!grade) {
            const gradeMatch = feedbackText.match(/(\d+)\s*(?:puan|\/100)/i);
            if (gradeMatch) {
              grade = parseInt(gradeMatch[1], 10);
            }
          }
          
          // Pattern 4: "Not: X" veya "Not X" formatı
          if (!grade) {
            const gradeMatch = feedbackText.match(/Not[:\s]+(\d+)/i);
            if (gradeMatch) {
              grade = parseInt(gradeMatch[1], 10);
            }
          }
          
          // Pattern 5: "Skor: X" veya "Skor X" formatı
          if (!grade) {
            const gradeMatch = feedbackText.match(/Skor[:\s]+(\d+)/i);
            if (gradeMatch) {
              grade = parseInt(gradeMatch[1], 10);
            }
          }
          
          // Validate and default to 50 if not found
          if (grade === null || isNaN(grade) || grade < 0 || grade > 100) {
            console.warn(`[AI Agent] Puan bulunamadı for retry submission ${submission.id}. AI yanıtı:`, feedbackText.substring(0, 200));
            grade = 50;
          }

          results.set(submission.id, {
            grade,
            feedback: feedbackText,
            studentName: submission.studentName,
            submissionId: submission.id,
          });
          errors.delete(submission.id);
        } catch (error) {
          errors.set(submission.id, error instanceof Error ? error.message : 'Bilinmeyen hata');
        }
      }

      setBatchResults(results);
      setBatchErrors(errors);
      setBatchProgress({ current: failedSubmissions.length, total: failedSubmissions.length });

      toast({
        title: 'Yeniden deneme tamamlandı',
        description: `${results.size} öğrenci için sonuç alındı.${errors.size > 0 ? ` ${errors.size} hata devam ediyor.` : ''}`,
      });
    } catch (error) {
      toast({
        title: 'Yeniden deneme hatası',
        description: error instanceof Error ? error.message : 'Bilinmeyen hata',
        variant: 'destructive',
      });
    } finally {
      setIsBatchAnalyzing(false);
    }
  };

  // Helper function to calculate week score
  const calculateWeekScore = ({
    currentWeekScore,
    previousGrade,
    nextGrade
  }: {
    currentWeekScore?: number;
    previousGrade: number | null | undefined;
    nextGrade: number | null;
  }): number | null => {
    const baseScore = currentWeekScore ?? 0;

    if (nextGrade === null) {
      if (previousGrade === null || previousGrade === undefined) {
        return null;
      }
      return Math.max(0, baseScore - previousGrade);
    }

    const updatedScore =
      previousGrade === null || previousGrade === undefined
        ? baseScore + nextGrade
        : baseScore - previousGrade + nextGrade;

    return Math.max(0, updatedScore);
  };

  // Helper function to update student week score
  const updateStudentWeekScore = async ({
    studentId,
    week,
    previousGrade,
    nextGrade
  }: {
    studentId: string;
    week: number | null;
    previousGrade: number | null | undefined;
    nextGrade: number | null;
  }) => {
    if (!week || week < 1 || week > 6) {
      return;
    }

    const weekScoreField = `week${week}Score` as keyof UserProfile;
    
    try {
      const studentRef = doc(firestore!, 'users', studentId);
      const studentDoc = await getDoc(studentRef);
      
      if (!studentDoc.exists()) {
        return;
      }

      const studentData = studentDoc.data() as UserProfile;
      const currentWeekScore = studentData[weekScoreField] as number | undefined;
      const newWeekScore = calculateWeekScore({
        currentWeekScore,
        previousGrade,
        nextGrade
      });

      if (newWeekScore === null) {
        return;
      }

      await updateDoc(studentRef, {
        [weekScoreField]: newWeekScore
      });
    } catch (error) {
      console.error('Failed to update student week score:', error);
    }
  };

  const handleEditBatchResult = (submissionId: string) => {
    const result = batchResults.get(submissionId);
    if (result) {
      setEditingBatchResultId(submissionId);
      setEditingBatchFeedback(result.feedback);
      setEditingBatchGrade(result.grade);
    }
  };

  const handleSaveBatchResultEdit = () => {
    if (!editingBatchResultId) return;

    // Puan validasyonu
    if (editingBatchGrade !== null && (editingBatchGrade < 0 || editingBatchGrade > 100)) {
      toast({
        title: 'Geçersiz puan',
        description: 'Puan 0-100 arasında olmalıdır.',
        variant: 'destructive',
      });
      return;
    }

    // Geri bildirim boş olamaz
    if (!editingBatchFeedback.trim()) {
      toast({
        title: 'Geri bildirim boş olamaz',
        description: 'Geri bildirim metni gereklidir.',
        variant: 'destructive',
      });
      return;
    }

    const result = batchResults.get(editingBatchResultId);
    if (result) {
      setBatchResults(prev => {
        const newMap = new Map(prev);
        newMap.set(editingBatchResultId, {
          ...result,
          feedback: editingBatchFeedback.trim(),
          grade: editingBatchGrade ?? result.grade,
        });
        return newMap;
      });
    }

    setEditingBatchResultId(null);
    setEditingBatchFeedback('');
    setEditingBatchGrade(null);
  };

  const handleCancelBatchResultEdit = () => {
    setEditingBatchResultId(null);
    setEditingBatchFeedback('');
    setEditingBatchGrade(null);
  };

  const handleConfirmBatchResults = async () => {
    if (!firestore || !user || batchResults.size === 0) return;

    setIsBatchConfirming(true);
    try {
      const token = await user.getIdToken();
      let successCount = 0;
      let errorCount = 0;

      for (const [submissionId, result] of batchResults.entries()) {
        try {
          // Get current submission to get previous grade and student info
          const submissionDoc = await getDoc(doc(firestore, 'assignmentSubmissions', submissionId));
          const previousGrade = submissionDoc.exists() ? (submissionDoc.data() as AssignmentSubmission).grade : null;
          const submissionData = submissionDoc.exists() ? (submissionDoc.data() as AssignmentSubmission) : null;
          
          // Find submission row for week info
          const submissionRow = submissionRows.find((s) => s.id === submissionId);

          // Update Firestore submission
          await updateDoc(doc(firestore, 'assignmentSubmissions', submissionId), {
            feedback: result.feedback,
            grade: result.grade,
            gradedAt: serverTimestamp(),
            gradedBy: 'AI Agent (Toplu)',
          });

          // Update student week score if we have week and student info
          if (submissionData?.studentId && submissionRow?.assignmentWeekNumber) {
            await updateStudentWeekScore({
              studentId: submissionData.studentId,
              week: submissionRow.assignmentWeekNumber,
              previousGrade,
              nextGrade: result.grade
            });
          }

          // Also write to Excel
          try {
            if (submissionRow) {
              await fetch('/api/ai-agent/excel/write', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  studentName: result.studentName,
                  feedback: result.feedback,
                  assignmentTitle: submissionRow.assignmentTitle,
                  classroomLevel: submissionRow.classroomKey,
                  week: submissionRow.assignmentWeekNumber,
                }),
              });
            }
          } catch (excelError) {
            // Excel write error is not critical
            console.warn('Excel write failed for', result.studentName, excelError);
          }

          successCount++;
        } catch (error) {
          console.error('Failed to save result for', result.studentName, error);
          errorCount++;
        }
      }

      toast({
        title: 'Toplu geri bildirim kaydedildi',
        description: `${successCount} öğrenci için geri bildirim kaydedildi.${errorCount > 0 ? ` ${errorCount} hata oluştu.` : ''}`,
      });

      // Reset state
      setBatchResults(new Map());
      setBatchErrors(new Map());
      setBatchProgress(null);
      setBatchClassroom('');
      setBatchWeek('');
    } catch (error) {
      toast({
        title: 'Kaydetme hatası',
        description: error instanceof Error ? error.message : 'Bilinmeyen hata',
        variant: 'destructive',
      });
    } finally {
      setIsBatchConfirming(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
    <div className="container mx-auto p-2 sm:p-4 space-y-2 sm:space-y-4">
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-1 sm:gap-2">
          <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="hidden sm:inline">AI Agent - Ödev Kontrolcüsü</span>
          <span className="sm:hidden">AI Agent</span>
        </h1>
      </div>
      <div className="flex items-center gap-2 mb-2 sm:mb-4">
        <Image
          src="/images/analogo.png"
          alt="UludagAIClub Logo"
          width={48}
          height={48}
          className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
          priority
        />
        <span className="text-sm sm:text-base font-semibold">UludagAIClub</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4">
        {/* Drive Files Panel */}
        <Card className="p-2 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-semibold truncate">Google Drive Dosyaları</h2>
              {currentFolderName && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Klasör: {currentFolderName}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackClick}
                disabled={folderStack.length === 0 && !currentFolderId}
                className="text-xs sm:text-sm"
              >
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Geri</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadDriveFiles(currentFolderId)}
              >
                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>

          {selectedFiles.size > 0 && (
            <Button
              className="w-full mb-2 sm:mb-4 text-xs sm:text-sm"
              onClick={analyzeSelectedFiles}
              disabled={isLoading}
            >
              <span className="truncate">Seçilenleri Analiz Et ({selectedFiles.size})</span>
            </Button>
          )}

          {driveError && (
            <div className="mb-2 sm:mb-4 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs sm:text-sm text-red-800 font-medium">Hata:</p>
              <p className="text-xs sm:text-sm text-red-700 mt-1 break-words">{driveError}</p>
              <p className="text-[10px] sm:text-xs text-red-600 mt-2 break-all">
                Servis hesabı: uludag-ai-club@studio-1335263767-c36ff.iam.gserviceaccount.com
              </p>
            </div>
          )}
          <div className="space-y-1 sm:space-y-2 max-h-[400px] sm:max-h-[600px] overflow-y-auto">
            {renderFileListContent(driveFiles, driveError) ?? 
              driveFiles.map((file) => (
                <button
                  type="button"
                  key={file.id}
                  className={`w-full text-left p-2 sm:p-3 border rounded-lg cursor-pointer transition-colors ${getFileCardClassName(file, selectedFiles)}`}
                  onClick={() => file.isFolder ? handleFolderClick(file) : handleFileSelect(file.id)}
                >
                  <div className="flex items-center gap-1 sm:gap-2">
                    {getFileIcon(file)}
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm sm:text-base truncate ${file.isFolder ? 'text-yellow-900' : ''}`}>
                        {file.name}
                        {file.isFolder && <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs text-yellow-600">(Klasör)</span>}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground truncate">
                        {file.isFolder ? 'Klasöre tıklayarak içeriğini görüntüleyin' : `${formatBytes(file.size)} · ${file.mimeType.split('/').pop()}`}
                      </div>
                    </div>
                    {!file.isFolder && (
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleFileSelect(file.id);
                        }}
                        className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                      />
                    )}
                  </div>
                </button>
              ))
            }
          </div>
        </Card>

        {/* Chat Panel */}
        <Card className="p-2 sm:p-4 flex flex-col">
          <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">Sohbet</h2>
          
          <div
            ref={chatMessagesRef}
            className="flex-1 space-y-2 sm:space-y-4 overflow-y-auto mb-2 sm:mb-4 min-h-[300px] sm:min-h-[400px] max-h-[400px] sm:max-h-[600px]"
          >
            {messages.map((message, index) => (
              <div
                key={`message-${index}-${message.timestamp.getTime()}`}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2 sm:p-3 ${
                    message.isUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.isUser ? (
                    <p className="whitespace-pre-wrap text-xs sm:text-sm break-words">{message.text}</p>
                  ) : (
                    <div
                      className="prose prose-xs sm:prose-sm max-w-none text-xs sm:text-sm"
                      dangerouslySetInnerHTML={renderMarkdown(message.text)}
                    />
                  )}
                  <div className="text-[10px] sm:text-xs opacity-70 mt-1 sm:mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-2 sm:p-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-1 sm:gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Soru sorun veya Drive'dan bir dosya seçin..."
              className="flex-1 text-xs sm:text-sm resize-none"
              rows={2}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-auto sm:h-10 flex-shrink-0"
            >
              <Send className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </Card>
      </div>

      {isTeacherUser && (
        <Card className="p-2 sm:p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Toplu AI Geri Bildirim
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Seçilen seviye ve hafta için tüm öğrencilere otomatik geri bildirim oluşturun
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Seviye
              </label>
              <Select value={batchClassroom} onValueChange={setBatchClassroom}>
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Seviye seçin" />
                </SelectTrigger>
                <SelectContent>
                  {CLASSROOM_FILTER_OPTIONS.filter(opt => opt.value !== 'all').map((option) => (
                    <SelectItem key={option.value} value={option.value} className="capitalize">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Hafta
              </label>
              <Select value={batchWeek} onValueChange={setBatchWeek}>
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Hafta seçin" />
                </SelectTrigger>
                <SelectContent>
                  {weekFilterOptions.map((weekNumber) => (
                    <SelectItem key={weekNumber} value={weekNumber.toString()}>
                      {weekNumber}. Hafta
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Filtre
              </label>
              <Select value={batchFilter} onValueChange={(value) => setBatchFilter(value as 'all' | 'no-feedback' | 'has-file')}>
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="no-feedback">Geri bildirimi olmayanlar</SelectItem>
                  <SelectItem value="has-file">Dosyası olanlar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Sıralama
              </label>
              <Select value={batchSort} onValueChange={(value) => setBatchSort(value as 'name' | 'date')}>
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">İsme göre</SelectItem>
                  <SelectItem value="date">Tarihe göre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {batchClassroom && batchWeek && (
            <>
              <div className="border rounded-lg p-3 space-y-2 max-h-[300px] overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Analiz Edilecek Teslimler ({getFilteredBatchSubmissions().length})
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => {
                      const all = getFilteredBatchSubmissions();
                      if (selectedSubmissions.size === all.length) {
                        setSelectedSubmissions(new Set());
                      } else {
                        setSelectedSubmissions(new Set(all.map(s => s.id)));
                      }
                    }}
                  >
                    {selectedSubmissions.size === getFilteredBatchSubmissions().length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                  </Button>
                </div>
                {getFilteredBatchSubmissions().length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Seçilen kriterlere uygun teslim bulunamadı.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {getFilteredBatchSubmissions().map((submission) => (
                      <div
                        key={submission.id}
                        className="flex items-center gap-2 p-2 border rounded hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubmissions.has(submission.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedSubmissions);
                            if (e.target.checked) {
                              newSet.add(submission.id);
                            } else {
                              newSet.delete(submission.id);
                            }
                            setSelectedSubmissions(newSet);
                          }}
                          className="w-4 h-4"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{submission.studentName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{submission.assignmentTitle}</p>
                        </div>
                        {submission.feedback !== 'Henüz geri bildirim yok.' && (
                          <Badge variant="outline" className="text-[10px]">Geri bildirim var</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleStartBatchAnalysis}
                  disabled={!batchClassroom || !batchWeek || isBatchAnalyzing || getFilteredBatchSubmissions().length === 0}
                  className="text-xs sm:text-sm"
                >
                  {isBatchAnalyzing ? (
                    <>
                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 animate-spin" />
                      Analiz Ediliyor...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      Analizi Başlat
                    </>
                  )}
                </Button>

                {isBatchAnalyzing && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePauseResumeBatchAnalysis}
                      className="text-xs sm:text-sm"
                    >
                      {isBatchPaused ? (
                        <>
                          <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Devam Et
                        </>
                      ) : (
                        <>
                          <Pause className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Duraklat
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelBatchAnalysis}
                      className="text-xs sm:text-sm text-destructive"
                    >
                      <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      İptal
                    </Button>
                  </>
                )}

                {batchErrors.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetryFailedSubmissions}
                    disabled={isBatchAnalyzing}
                    className="text-xs sm:text-sm"
                  >
                    <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Başarısızları Yeniden Dene ({batchErrors.size})
                  </Button>
                )}
              </div>

              {batchProgress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">İlerleme</span>
                    <span className="font-semibold">
                      {batchProgress.current} / {batchProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {(batchResults.size > 0 || batchErrors.size > 0) && (
                <div className="border rounded-lg p-3 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">Sonuçlar</p>
                  
                  {batchResults.size > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-semibold">Başarılı: {batchResults.size}</span>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto space-y-2">
                        {Array.from(batchResults.entries()).map(([id, result]) => {
                          const submission = submissionRows.find(s => s.id === id);
                          const isEditing = editingBatchResultId === id;
                          
                          return (
                            <div key={id} className="text-xs p-3 bg-green-50 rounded border border-green-200 space-y-2">
                              {isEditing ? (
                                <>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold">{result.studentName}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-[10px]"
                                      onClick={handleCancelBatchResultEdit}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  {submission && (
                                    <p className="text-[10px] text-muted-foreground mb-2">
                                      {submission.assignmentTitle}
                                    </p>
                                  )}
                                  <div className="space-y-2">
                                    <div>
                                      <Label htmlFor={`batch-feedback-${id}`} className="text-[10px] font-semibold text-muted-foreground">
                                        Geri Bildirim
                                      </Label>
                                      <Textarea
                                        id={`batch-feedback-${id}`}
                                        value={editingBatchFeedback}
                                        onChange={(e) => setEditingBatchFeedback(e.target.value)}
                                        rows={6}
                                        className="text-xs mt-1"
                                        placeholder="Geri bildirim metnini düzenleyin..."
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor={`batch-grade-${id}`} className="text-[10px] font-semibold text-muted-foreground">
                                        Puan
                                      </Label>
                                      <Input
                                        id={`batch-grade-${id}`}
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={editingBatchGrade ?? ''}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          if (value === '') {
                                            setEditingBatchGrade(null);
                                          } else {
                                            const numValue = parseInt(value, 10);
                                            if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                                              setEditingBatchGrade(numValue);
                                            }
                                          }
                                        }}
                                        placeholder="Puan girin (0-100)"
                                        className="text-xs mt-1"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={handleSaveBatchResultEdit}
                                        className="text-[10px] h-7"
                                      >
                                        Kaydet
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCancelBatchResultEdit}
                                        className="text-[10px] h-7"
                                      >
                                        İptal
                                      </Button>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold">{result.studentName}</span>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-[10px]">
                                        {result.grade} puan
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-[10px]"
                                        onClick={() => handleEditBatchResult(id)}
                                        aria-label="Düzenle"
                                      >
                                        <Edit className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  {submission && (
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                      {submission.assignmentTitle}
                                    </p>
                                  )}
                                  <div className="mt-2 p-2 bg-white rounded border border-green-100 max-h-[100px] overflow-y-auto">
                                    <p className="text-[10px] text-slate-600 whitespace-pre-wrap break-words">
                                      {result.feedback.substring(0, 200)}
                                      {result.feedback.length > 200 && '...'}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {batchErrors.size > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-red-600">
                        <XCircle className="w-4 h-4" />
                        <span className="font-semibold">Hata: {batchErrors.size}</span>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto space-y-1">
                        {Array.from(batchErrors.entries()).map(([id, error]) => {
                          const submission = submissionRows.find(s => s.id === id);
                          return (
                            <div key={id} className="text-xs p-2 bg-red-50 rounded border border-red-200">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">
                                  {submission?.studentName ?? 'Bilinmeyen öğrenci'}
                                </span>
                              </div>
                              <p className="text-[10px] text-red-600 mt-1">{error}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {batchResults.size > 0 && !isBatchAnalyzing && (
                    <Button
                      onClick={handleConfirmBatchResults}
                      disabled={isBatchConfirming}
                      className="w-full text-xs sm:text-sm"
                    >
                      {isBatchConfirming ? (
                        <>
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 animate-spin" />
                          Kaydediliyor...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Sonuçları Onayla ve Kaydet ({batchResults.size})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {isTeacherUser && (
        <Card className="p-2 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Öğrenci Teslimleri &amp; Geri Bildirimler
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Son {MAX_SUBMISSION_ITEMS} teslim listelenir
              </p>
            </div>
            <Badge variant="outline" className="self-start sm:self-auto text-[11px] sm:text-xs">
              {displayedSubmissionCount} kayıt
            </Badge>
          </div>

          <FilterSection
            classroomFilter={classroomFilter}
            weekFilter={weekFilter}
            nameSearch={nameSearch}
            onClassroomChange={setClassroomFilter}
            onWeekChange={setWeekFilter}
            onNameSearchChange={setNameSearch}
            weekOptions={weekFilterOptions}
            classroomOptions={CLASSROOM_FILTER_OPTIONS}
          />

          <div className="space-y-2 sm:space-y-3">
            {renderSubmissionsList()}
          </div>
        </Card>
      )}
    </div>
    <Dialog open={isFeedbackDialogOpen} onOpenChange={(open) => { if (!open) handleCloseFeedbackDialog(); }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>AI Geri Bildirim Önizlemesi</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {activeFeedbackSubmission
              ? `${activeFeedbackSubmission.studentName} • ${activeFeedbackSubmission.assignmentTitle}`
              : 'AI geri bildirimi'}
          </DialogDescription>
          <div className="flex items-center gap-3 mt-2">
            <Image
              src="/images/analogo.png"
              alt="UludagAIClub Logo"
              width={40}
              height={40}
              className="h-7 w-7 sm:h-9 sm:w-9 object-contain"
            />
          </div>
        </DialogHeader>
        <div className="space-y-3">
          {feedbackMetadata && (
            <div className="rounded-md border border-muted/60 bg-muted/30 p-3 text-[11px] sm:text-xs space-y-1">
              <p className="font-semibold text-muted-foreground">Dosya Bilgisi</p>
              <p className="text-foreground font-medium">
                {formatMetadataLine(feedbackMetadata, activeFeedbackSubmission?.fileName ?? 'Dosya')}
              </p>
              <div className="flex flex-wrap gap-3 text-muted-foreground">
                {formatDateTime(feedbackMetadata.createdTime) && (
                  <span>Oluşturma: {formatDateTime(feedbackMetadata.createdTime)}</span>
                )}
                {formatDateTime(feedbackMetadata.modifiedTime) && (
                  <span>Güncelleme: {formatDateTime(feedbackMetadata.modifiedTime)}</span>
                )}
              </div>
              {feedbackMetadata.webViewLink && (
                <Button variant="link" size="sm" className="px-0" asChild>
                  <a href={feedbackMetadata.webViewLink} target="_blank" rel="noreferrer">
                    Drive'da aç
                  </a>
                </Button>
              )}
            </div>
          )}
          {isFeedbackGenerating ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              AI geri bildirimi hazırlanıyor...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground">
                  {isEditMode ? 'Geri Bildirim Metni' : 'Öğrenciye Gönderilecek Metin'}
                </p>
                <Textarea
                  value={feedbackEditable}
                  onChange={(e) => setFeedbackEditable(e.target.value)}
                  rows={8}
                  className="text-sm font-mono"
                  placeholder={isEditMode ? "Geri bildirimi düzenleyin..." : "Geri bildirimi düzenleyebilirsiniz..."}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade-input" className="text-[11px] font-semibold text-muted-foreground">
                  Puan
                </Label>
                <Input
                  id="grade-input"
                  type="number"
                  min={0}
                  max={100}
                  value={editableGrade ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setEditableGrade(null);
                    } else {
                      const numValue = parseInt(value, 10);
                      if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                        setEditableGrade(numValue);
                      }
                    }
                  }}
                  placeholder="Puan girin (0-100)"
                  className="text-sm"
                />
                {editableGrade !== null && (
                  <p className="text-xs text-muted-foreground">
                    Mevcut puan: {editableGrade}
                  </p>
                )}
              </div>
              {feedbackEditable.trim() && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground">Önizleme</p>
                  <div className="border rounded-md p-4 max-h-96 overflow-y-auto overflow-x-auto bg-slate-50 dark:bg-slate-900">
                    <div
                      className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 break-words [&_table]:w-full [&_table]:min-w-full [&_table]:table-auto [&_table]:border-collapse [&_table]:my-4 [&_table]:overflow-x-auto [&_table]:block [&_thead]:table-header-group [&_tbody]:table-row-group [&_tr]:table-row [&_td]:table-cell [&_td]:px-2 [&_td]:py-1 [&_td]:border [&_th]:table-cell [&_th]:px-2 [&_th]:py-1 [&_th]:border [&_th]:font-semibold [&_th]:bg-slate-100 [&_th]:dark:bg-slate-800 [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-words"
                      style={{ 
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                      }}
                      dangerouslySetInnerHTML={renderMarkdown(feedbackEditable)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCloseFeedbackDialog} disabled={isFeedbackSaving || isExcelSaving}>
            Kapat
          </Button>
          <Button
            variant="secondary"
            onClick={handleSaveToExcel}
            disabled={isFeedbackGenerating || isFeedbackSaving || isExcelSaving || !feedbackEditable.trim()}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            {isExcelSaving ? 'Kaydediliyor...' : 'Excel\'e Kaydet'}
          </Button>
          <Button
            onClick={handleSaveFeedback}
            disabled={isFeedbackGenerating || isFeedbackSaving || isExcelSaving || !feedbackEditable.trim()}
          >
            {isFeedbackSaving ? 'Gönderiliyor...' : 'Onayla ve Gönder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Geri Bildirimi Sil</AlertDialogTitle>
          <AlertDialogDescription>
            {submissionToDelete && (
              <>
                <strong>{submissionToDelete.studentName}</strong> için geri bildirimi silmek istediğinizden emin misiniz?
                <br />
                <br />
                Bu işlem geri alınamaz.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>İptal</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDeleteFeedback}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Sil
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

