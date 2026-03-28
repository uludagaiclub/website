'use client'

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirebase, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection, query, orderBy, where } from "firebase/firestore";
import type { UserProfile, Assignment, AssignmentSubmission } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Bot, MessageSquare, TrendingUp, FileText, ArrowLeft, Download, Calendar, Award } from "lucide-react";
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/vs2015.css';

export default function GeriBildirimlerPage() {
  const { user, isUserLoading, firestore } = useFirebase();
  const router = useRouter();
  
  const userProfileRef = useMemoFirebase(() => 
    (user && firestore) ? doc(firestore, 'users', user.uid) : null, 
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  // Fetch student submissions
  const studentSubmissionsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !userProfile) return null;
    const role = userProfile.role?.trim().toLowerCase();
    if (role !== 'student') return null;
    return query(
      collection(firestore, 'assignmentSubmissions'),
      where('studentId', '==', user.uid),
      orderBy('submittedAt', 'desc')
    );
  }, [firestore, user, userProfile]);
  
  const { data: studentSubmissions, isLoading: isLoadingSubmissions } = useCollection<AssignmentSubmission>(studentSubmissionsQuery);
  const safeStudentSubmissions = studentSubmissions ?? [];

  // Fetch all assignments for details
  const assignmentsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'assignments'), orderBy('createdAt', 'desc')) : null,
    [firestore]
  );
  const { data: allAssignments } = useCollection<Assignment>(assignmentsQuery);
  
  const assignmentMap = useMemo(() => {
    const map = new Map<string, Assignment>();
    (allAssignments ?? []).forEach((assignment) => {
      map.set(assignment.id, assignment);
    });
    return map;
  }, [allAssignments]);

  // Filter submissions with feedback
  const submissionsWithFeedback = useMemo(() => {
    return safeStudentSubmissions.filter((submission) => {
      const feedback = submission.feedback;
      if (!feedback) return false;
      const trimmed = feedback.trim();
      return trimmed !== '' && 
             trimmed !== 'Henüz geri bildirim yok.' && 
             trimmed.toLowerCase() !== 'null' &&
             trimmed.toLowerCase() !== 'undefined';
    });
  }, [safeStudentSubmissions]);

  // Filtering state
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [weekFilter, setWeekFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');

  // Apply filters and sorting
  const filteredSubmissions = useMemo(() => {
    let filtered = [...submissionsWithFeedback];
    
    // Week filter
    if (weekFilter !== 'all') {
      const weekNum = parseInt(weekFilter);
      filtered = filtered.filter(sub => sub.assignmentWeek === weekNum);
    }
    
    // Grade filter
    if (gradeFilter === 'graded') {
      filtered = filtered.filter(sub => sub.grade !== undefined && sub.grade !== null);
    } else if (gradeFilter === 'ungraded') {
      filtered = filtered.filter(sub => sub.grade === undefined || sub.grade === null);
    }
    
    // Sort
    filtered.sort((a, b) => {
      const aTime = a.submittedAt?.toDate().getTime() ?? 0;
      const bTime = b.submittedAt?.toDate().getTime() ?? 0;
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
    });
    
    return filtered;
  }, [submissionsWithFeedback, sortOrder, weekFilter, gradeFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = submissionsWithFeedback.length;
    const gradedSubmissions = submissionsWithFeedback.filter(sub => sub.grade !== undefined && sub.grade !== null);
    const averageGrade = gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((sum, sub) => sum + (sub.grade ?? 0), 0) / gradedSubmissions.length
      : null;
    const lastFeedback = submissionsWithFeedback.length > 0
      ? submissionsWithFeedback[0].submittedAt?.toDate()
      : null;
    
    return { total, averageGrade, lastFeedback };
  }, [submissionsWithFeedback]);

  const isLoading = isUserLoading || isProfileLoading;

  useEffect(() => {
    if (isLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Redirect teachers
    if (userProfile?.role === 'teacher') {
      router.push('/dashboard');
    }
  }, [isLoading, user, userProfile, router]);
  
  if (isLoading || isLoadingSubmissions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid gap-6 sm:grid-cols-3 mb-8">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Don't render for teachers (will redirect)
  if (userProfile?.role !== 'student') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="icon" className="rounded-full">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
                Geri Bildirimler
              </h1>
              <p className="text-sm sm:text-base text-slate-600 mt-1">
                Ödev teslimleriniz için AI ve öğretmen geri bildirimlerini görüntüleyin
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-6 sm:grid-cols-3">
          <Card className="bg-white/90 border border-blue-200 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Toplam Geri Bildirim
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
              <p className="text-xs text-slate-500 mt-1">
                {safeStudentSubmissions.length} teslimden
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 border border-emerald-200 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Ortalama Not
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {stats.averageGrade !== null ? stats.averageGrade.toFixed(1) : '-'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {stats.averageGrade !== null ? '100 üzerinden' : 'Henüz notlandırılmış ödev yok'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 border border-indigo-200 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Son Geri Bildirim
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-slate-900">
                {stats.lastFeedback 
                  ? format(stats.lastFeedback, 'dd MMM yyyy', { locale: tr })
                  : '-'
                }
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {stats.lastFeedback 
                  ? format(stats.lastFeedback, 'HH:mm', { locale: tr })
                  : 'Henüz geri bildirim yok'
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white/90 border border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Filtrele ve Sırala</CardTitle>
            <CardDescription>Geri bildirimlerinizi organize edin</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Sıralama
                </label>
                <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'newest' | 'oldest')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Yeniden Eskiye</SelectItem>
                    <SelectItem value="oldest">Eskiden Yeniye</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Hafta
                </label>
                <Select value={weekFilter} onValueChange={setWeekFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Haftalar</SelectItem>
                    <SelectItem value="1">Hafta 1</SelectItem>
                    <SelectItem value="2">Hafta 2</SelectItem>
                    <SelectItem value="3">Hafta 3</SelectItem>
                    <SelectItem value="4">Hafta 4</SelectItem>
                    <SelectItem value="5">Hafta 5</SelectItem>
                    <SelectItem value="6">Hafta 6</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Not Durumu
                </label>
                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="graded">Notlandırılmış</SelectItem>
                    <SelectItem value="ungraded">Notlandırılmamış</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback List */}
        <div className="space-y-6">
          {filteredSubmissions.length === 0 ? (
            <Card className="bg-white/90 border border-slate-200 shadow-lg">
              <CardContent className="py-16">
                <div className="text-center">
                  <Bot className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {submissionsWithFeedback.length === 0 
                      ? 'Henüz geri bildirim yok'
                      : 'Filtre sonucu bulunamadı'
                    }
                  </h3>
                  <p className="text-sm text-slate-500 mb-6">
                    {submissionsWithFeedback.length === 0
                      ? 'Ödevlerinizi teslim ettikçe geri bildirimler burada görünecek.'
                      : 'Farklı filtre ayarlarını deneyebilirsiniz.'
                    }
                  </p>
                  {submissionsWithFeedback.length === 0 && (
                    <Link href="/dashboard#assignments-section">
                      <Button className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700">
                        <FileText className="w-4 h-4 mr-2" />
                        Ödevlere Git
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredSubmissions.map((submission) => (
              <FeedbackCard 
                key={submission.id} 
                submission={submission} 
                assignment={assignmentMap.get(submission.assignmentId)}
              />
            ))
          )}
        </div>

        {/* Results Summary */}
        {filteredSubmissions.length > 0 && (
          <div className="text-center text-sm text-slate-500">
            {filteredSubmissions.length} geri bildirim gösteriliyor
            {filteredSubmissions.length !== submissionsWithFeedback.length && 
              ` (toplam ${submissionsWithFeedback.length})`
            }
          </div>
        )}
      </div>
    </div>
  );
}

type FeedbackCardProps = {
  readonly submission: AssignmentSubmission;
  readonly assignment: Assignment | undefined;
};

function FeedbackCard({ submission, assignment }: FeedbackCardProps) {
  const assignmentTitle = assignment?.title ?? 'Ödev';
  const submittedAt = submission.submittedAt?.toDate
    ? format(submission.submittedAt.toDate(), 'dd MMM yyyy HH:mm', { locale: tr })
    : 'Tarih yok';
  
  const hasGrade = submission.grade !== undefined && submission.grade !== null;
  
  // Render markdown with syntax highlighting
  const renderMarkdown = (text: string) => {
    try {
      // Configure marked with highlight.js
      marked.setOptions({
        highlight: function(code, lang) {
          if (lang && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(code, { language: lang }).value;
            } catch (err) {
              console.error('Highlight error:', err);
            }
          }
          // Auto-detect language if not specified
          return hljs.highlightAuto(code).value;
        },
        langPrefix: 'hljs language-' // Add hljs classes for styling
      });
      
      const html = marked.parse(text) as string;
      const sanitized = DOMPurify.sanitize(html);
      return { __html: sanitized };
    } catch {
      return { __html: text };
    }
  };

  // Get submitted files
  const submittedFiles = submission.submittedFiles ?? [];
  const legacyFiles = [];
  if (submission.submittedFileUrl && submission.submittedFileName) {
    legacyFiles.push({ url: submission.submittedFileUrl, name: submission.submittedFileName });
  }
  if (submission.submittedFileUrl2 && submission.submittedFileName2) {
    legacyFiles.push({ url: submission.submittedFileUrl2, name: submission.submittedFileName2 });
  }
  const allFiles = [...submittedFiles, ...legacyFiles];

  return (
    <Card className="bg-white/90 border-2 shadow-xl overflow-hidden border-blue-300 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/50">
      <CardHeader className="border-b border-slate-200/50 bg-white/50">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-xl font-bold text-slate-900">
                {assignmentTitle}
              </CardTitle>
              {hasGrade && (
                <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold">
                  {submission.grade} puan
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Teslim: {submittedAt}</span>
              </div>
              {submission.assignmentWeek && (
                <Badge variant="outline" className="text-xs">
                  Hafta {submission.assignmentWeek}
                </Badge>
              )}
              {submission.submissionTiming && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    submission.submissionTiming === 'on-time' 
                      ? 'border-green-300 text-green-700 bg-green-50'
                      : 'border-orange-300 text-orange-700 bg-orange-50'
                  }`}
                >
                  {submission.submissionTiming === 'on-time' ? 'Zamanında' : 'Geç'}
                </Badge>
              )}
            </div>
          </div>
          <Badge className="text-xs font-bold bg-blue-500 hover:bg-blue-600">
            🤖 AI Geri Bildirim
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {/* Feedback Content */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-bold uppercase tracking-wide text-slate-700">
              Geri Bildirim
            </h4>
          </div>
          <div
            className="prose prose-sm max-w-none text-sm sm:text-base text-slate-700 leading-relaxed bg-white/60 rounded-xl p-4 border border-slate-200/50 [&_pre]:!bg-[#1e1e1e] [&_pre]:!p-5 [&_pre]:!rounded-lg [&_pre]:!my-4 [&_pre]:!overflow-x-auto [&_pre]:!shadow-xl [&_pre]:!border [&_pre]:!border-slate-800/50 [&_code]:!text-[13.5px] [&_code]:!font-mono [&_code]:!leading-[1.6] [&_pre_code]:!bg-transparent [&_pre_code]:!text-[#d4d4d4] [&_:not(pre)>code]:!bg-slate-200 [&_:not(pre)>code]:!px-2 [&_:not(pre)>code]:!py-1 [&_:not(pre)>code]:!rounded-md [&_:not(pre)>code]:!text-slate-900 [&_:not(pre)>code]:!font-mono [&_:not(pre)>code]:!text-[13px] [&_:not(pre)>code]:!font-semibold"
            dangerouslySetInnerHTML={renderMarkdown(submission.feedback ?? '')}
          />
        </div>

        {/* Submitted Files */}
        {allFiles.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-slate-600" />
              <h4 className="text-sm font-semibold text-slate-700">
                Teslim Edilen Dosyalar
              </h4>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {allFiles.map((file, index) => (
                <a
                  key={index}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors group"
                >
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  <span className="text-sm text-slate-700 group-hover:text-indigo-600 transition-colors truncate flex-1">
                    {file.name}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Graded Info */}
        {submission.gradedAt && submission.gradedBy && (
          <div className="mt-4 pt-4 border-t border-slate-200/50">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Değerlendiren: {submission.gradedBy}</span>
              <span>•</span>
              <span>
                {format(submission.gradedAt.toDate(), 'dd MMM yyyy HH:mm', { locale: tr })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

