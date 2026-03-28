
'use client'

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFirebase, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection, query, orderBy, where } from "firebase/firestore";
import type { UserProfile, Assignment, AssignmentSubmission, Announcement } from "@/types";
import { Announcements } from "@/components/dashboard/announcements";
import { Assignments } from "@/components/dashboard/assignments";
import { ExcelRegistration } from "@/components/dashboard/excel-registration";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Bot, MessageSquare, Calendar as CalendarIcon, ArrowRight, FileText, TrendingUp, CheckCircle2, X, Bell } from "lucide-react";
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export default function DashboardPage() {
    const { user, isUserLoading, firestore } = useFirebase();
    const router = useRouter();
    
    const userProfileRef = useMemoFirebase(() => 
      (user && firestore) ? doc(firestore, 'users', user.uid) : null, 
      [user, firestore]
    );
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const assignmentsQuery = useMemoFirebase(() => 
      firestore ? query(collection(firestore, 'assignments'), orderBy('createdAt', 'desc')) : null,
      [firestore]
    );
    const { data: allAssignments, isLoading: isAssignmentsLoading } = useCollection<Assignment>(assignmentsQuery);
    
    const safeAssignments = allAssignments ?? [];
    
    // Only teachers can list students (per Firestore rules)
    const studentsQuery = useMemoFirebase(() =>
        firestore && userProfile?.role === 'teacher' 
            ? query(collection(firestore, 'users'), where('role', '==', 'student')) 
            : null,
        [firestore, userProfile?.role]
    );
    const { isLoading: areStudentsLoading } = useCollection<UserProfile>(studentsQuery);

    const teacherSubmissionsQuery = useMemoFirebase(() =>
      firestore && userProfile?.role === 'teacher'
        ? query(collection(firestore, 'assignmentSubmissions'), orderBy('submittedAt', 'desc'))
        : null,
      [firestore, userProfile?.role]
    );
    const { data: teacherSubmissions } = useCollection<AssignmentSubmission>(teacherSubmissionsQuery);
    const safeTeacherSubmissions = teacherSubmissions ?? [];

    // Fetch student submissions for feedback section
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
    
    // Fetch announcements for students
    const announcementsQuery = useMemoFirebase(() => 
      firestore ? query(collection(firestore, 'announcements'), orderBy('createdAt', 'desc')) : null,
      [firestore]
    );
    const { data: allAnnouncements } = useCollection<Announcement>(announcementsQuery);
    
    // Filter announcements based on user's classroom level (for students)
    const studentAnnouncements = useMemo(() => {
      if (!allAnnouncements || !userProfile || userProfile.role?.trim() !== 'student') return [];
      
      const studentClassroom = userProfile.classroom;
      if (!studentClassroom) return [];
      
      return allAnnouncements.filter(announcement => {
        // If no targetAudiences, show to all (backward compatibility)
        if (!announcement.targetAudiences || announcement.targetAudiences.length === 0) {
          return true;
        }
        // Show if student's classroom is in target audiences
        return announcement.targetAudiences.includes(studentClassroom);
      });
    }, [allAnnouncements, userProfile]);
    
    // Debug: Log submissions to check if they're being fetched
    useEffect(() => {
      if (userProfile?.role === 'student' && !isLoadingSubmissions) {
        console.log('[Dashboard] Student submissions:', safeStudentSubmissions.length, 'total');
        safeStudentSubmissions.forEach((sub, idx) => {
          console.log(`[Dashboard] Submission ${idx + 1}:`, {
            id: sub.id,
            assignmentId: sub.assignmentId,
            hasFeedback: !!sub.feedback,
            feedbackLength: sub.feedback?.length ?? 0,
            submittedAt: sub.submittedAt?.toDate?.()?.toISOString() ?? 'no date',
          });
        });
      }
    }, [safeStudentSubmissions, isLoadingSubmissions, userProfile?.role]);

    const weekScores = [
      userProfile?.week1Score ?? 0,
      userProfile?.week2Score ?? 0,
      userProfile?.week3Score ?? 0,
      userProfile?.week4Score ?? 0,
      userProfile?.week5Score ?? 0,
      userProfile?.week6Score ?? 0,
    ];

    const totalPoints = weekScores.reduce(
      (sum, score) => sum + (typeof score === 'number' ? score : 0),
      0
    );

    const workshopStatuses = [
      userProfile?.workshop1,
      userProfile?.workshop2,
      userProfile?.workshop3,
      userProfile?.workshop4,
    ];

    const attendedWorkshops = workshopStatuses.filter(
      (status) => status && status !== '-' && status !== null && status !== undefined
    ).length;

    const classroomLabel = userProfile?.classroom
      ? userProfile.classroom.replace('-', ' ')
      : 'Seviye bekleniyor';

    const formattedToday = new Date().toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      weekday: 'long',
    });

    const isTeacher = userProfile?.role === 'teacher';

    // Öğrenciler için sadece kendi seviyelerindeki ödevleri filtrele
    const filteredAssignments = isTeacher 
      ? safeAssignments 
      : safeAssignments.filter((assignment) => {
          const studentClassroom = userProfile?.classroom;
          if (!studentClassroom || studentClassroom === 'new-signup') return false;
          return assignment.classroomLevels?.includes(studentClassroom as any) ?? false;
        });

    const assignmentsWithDueDate = filteredAssignments
      .filter((assignment) => assignment.dueDate)
      .sort((a, b) => {
        const aTime = a.dueDate?.toDate().getTime() ?? Number.MAX_SAFE_INTEGER;
        const bTime = b.dueDate?.toDate().getTime() ?? Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });

    const upcomingAssignment = assignmentsWithDueDate.length > 0 ? assignmentsWithDueDate[0] : null;
    const upcomingDueDate =
      upcomingAssignment?.dueDate
        ? format(upcomingAssignment.dueDate.toDate(), 'dd MMM yyyy', { locale: tr })
        : null;
    const upcomingDeadlines = assignmentsWithDueDate.slice(0, 3);
    const today = new Date();
    today.setHours(0,0,0,0);
    const activeAssignmentsCount = filteredAssignments.filter((assignment) => {
      const dueDate = assignment.dueDate?.toDate();
      return dueDate ? dueDate >= today : false;
    }).length;
    const overdueAssignmentsCount = filteredAssignments.filter((assignment) => {
      const dueDate = assignment.dueDate?.toDate();
      return dueDate ? dueDate < today : false;
    }).length;
    const uniqueClassroomCount = new Set(
      filteredAssignments.flatMap((assignment) => assignment.classroomLevels ?? [])
    ).size;
    const pendingReviews = safeTeacherSubmissions.filter(
      (submission) => submission.grade === undefined || submission.grade === null
    ).length;
    const recentSubmissions = safeTeacherSubmissions.slice(0, 5);
    const assignmentMap = useMemo(() => {
      const map = new Map<string, Assignment>();
      safeAssignments.forEach((assignment) => {
        map.set(assignment.id, assignment);
      });
      return map;
    }, [safeAssignments]);

    const isLoading = isUserLoading || isProfileLoading || isAssignmentsLoading || areStudentsLoading;

    useEffect(() => {
      if (isLoading) return;
      
      if (!user) {
        router.push('/login');
      }
    }, [isLoading, user, router]);
    
    if (isLoading) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-blue-600 font-medium">Dashboard yükleniyor...</p>
            </div>
        </div>
      )
    }

    const sharedLayoutProps = {
      formattedToday,
      upcomingAssignment,
      upcomingDueDate,
      userProfile,
    };

    const content = isTeacher ? (
      <TeacherDashboardSection
        {...sharedLayoutProps}
        userName={userProfile?.displayName ?? 'Öğretmen'}
        safeAssignments={safeAssignments}
        activeAssignmentsCount={activeAssignmentsCount}
        overdueAssignmentsCount={overdueAssignmentsCount}
        pendingReviews={pendingReviews}
        uniqueClassroomCount={uniqueClassroomCount}
      />
    ) : (
      <StudentDashboardSection
        {...sharedLayoutProps}
        userName={userProfile?.displayName ?? 'Kullanıcı'}
        totalPoints={totalPoints}
        attendedWorkshops={attendedWorkshops}
        classroomLabel={classroomLabel}
        upcomingDeadlines={upcomingDeadlines}
        filteredAssignments={filteredAssignments}
        weekScores={weekScores}
        studentAnnouncements={studentAnnouncements}
      />
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
          <div className="p-4 sm:p-6 lg:p-8">{content}</div>
        </div>
      )
}

type TeacherDashboardProps = {
  readonly userName: string;
  readonly formattedToday: string;
  readonly safeAssignments: Assignment[];
  readonly activeAssignmentsCount: number;
  readonly overdueAssignmentsCount: number;
  readonly pendingReviews: number;
  readonly uniqueClassroomCount: number;
  readonly upcomingAssignment: Assignment | null;
  readonly upcomingDueDate: string | null;
  readonly userProfile: UserProfile | null | undefined;
};

function TeacherDashboardSection({
  userName,
  formattedToday,
  safeAssignments,
  activeAssignmentsCount,
  overdueAssignmentsCount,
  pendingReviews,
  uniqueClassroomCount,
  upcomingAssignment,
  upcomingDueDate,
  userProfile,
}: TeacherDashboardProps) {
  return (
              <div className="max-w-7xl mx-auto space-y-8">
                <div className="rounded-3xl bg-white/90 border border-slate-200 shadow-2xl">
                  <div className="grid gap-8 lg:grid-cols-[2fr,1fr] p-6 sm:p-8">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 font-semibold">
                        Öğretmen Paneli
                      </p>
                      <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900">
              Hoş geldin {userName}
                      </h1>
                      <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                        Ödev yayınlarını yönet, teslim durumlarını kontrol et ve öğrenci duyurularını tek yerden takip et.
                      </p>
                      <p className="mt-3 text-sm sm:text-base text-slate-500 leading-relaxed">
                        Aktif ödevlerini düzenli tut, bekleyen geri bildirimleri kapat ve tüm seviyelerde ilerlemeyi izle.
                      </p>
                      <div className="mt-8 grid gap-4 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Aktif Ödevler</span>
                          <p className="mt-2 text-2xl font-bold text-slate-900">{activeAssignmentsCount}</p>
                          <p className="text-xs text-slate-400 mt-1">{overdueAssignmentsCount} geciken</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Bekleyen Geri Bildirim</span>
                          <p className="mt-2 text-2xl font-bold text-slate-900">{pendingReviews}</p>
                          <p className="text-xs text-slate-400 mt-1">Son teslimlerden</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Hedef Seviyeler</span>
                          <p className="mt-2 text-2xl font-bold text-slate-900">{uniqueClassroomCount}</p>
                          <p className="text-xs text-slate-400 mt-1">Sınıf kapsama</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-900 text-white p-6 flex flex-col gap-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-300 font-semibold">Bugün</p>
                          <p className="text-lg font-semibold">{formattedToday}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 uppercase tracking-wide">Toplam Ödev</p>
                          <p className="text-xl font-bold text-white">{safeAssignments.length}</p>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white/10 border border-white/20 p-5 shadow-inner">
                        <p className="text-xs uppercase tracking-wide text-slate-200 font-semibold">Yaklaşan Son Tarih</p>
                        {upcomingAssignment ? (
                          <>
                            <p className="text-lg font-semibold mt-2">{upcomingAssignment.title}</p>
                            <p className="text-sm text-slate-200 mt-1">
                              Son teslim: <span className="font-semibold text-white">{upcomingDueDate}</span>
                            </p>
                            {upcomingAssignment.classroomLevels?.length ? (
                              <p className="mt-2 text-xs uppercase tracking-wide text-blue-100">
                                {upcomingAssignment.classroomLevels.join(', ')}
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <div className="py-4">
                            <p className="text-lg font-semibold">Planlanmış ödev yok</p>
                            <p className="text-sm text-slate-200 mt-1">
                              Yeni bir ödev oluşturarak haftayı planlayabilirsin.
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href="/odevler"
                          className="inline-flex items-center justify-center rounded-xl bg-white text-slate-900 font-semibold px-5 py-2.5 shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
                        >
                          Ödev Listesi
                        </Link>
                        <Link
                          href="#announcements-section"
                          className="inline-flex items-center justify-center rounded-xl border border-white/40 text-white px-5 py-2.5 hover:bg-white/10 transition"
                        >
                          Duyurular
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-6">
                    <div id="announcements-section">
            <Announcements userProfile={userProfile ?? null} />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <ExcelRegistration userProfile={userProfile ?? null} />
                      </div>
                    </div>
                    
                    {/* Ödev Yönetimi - Sadece Öğretmenler İçin */}
                    <div className="mt-8">
                      <Assignments userProfile={userProfile ?? null} />
                    </div>
                  </div>
  );
}

type StudentDashboardProps = {
  readonly userName: string;
  readonly formattedToday: string;
  readonly totalPoints: number;
  readonly attendedWorkshops: number;
  readonly classroomLabel: string;
  readonly upcomingAssignment: Assignment | null;
  readonly upcomingDueDate: string | null;
  readonly userProfile: UserProfile | null | undefined;
  readonly upcomingDeadlines: Assignment[];
  readonly filteredAssignments: Assignment[];
  readonly weekScores: number[];
  readonly studentAnnouncements: Announcement[];
};

function StudentDashboardSection({
  userName,
  formattedToday,
  totalPoints,
  attendedWorkshops,
  classroomLabel,
  upcomingAssignment,
  upcomingDueDate,
  userProfile,
  upcomingDeadlines,
  filteredAssignments,
  weekScores,
  studentAnnouncements,
}: StudentDashboardProps) {
  return (
              <div className="max-w-7xl mx-auto space-y-8">
                <div className="rounded-3xl bg-white/90 border border-slate-200 shadow-2xl">
                  <div className="grid gap-8 lg:grid-cols-[2fr,1.2fr] p-6 sm:p-8">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 font-semibold">
                        Profil Özeti
                      </p>
            <h1 className="mt-3 text-3xl sm:text-4l font-bold text-slate-900">
              Hoş geldin {userName}
                      </h1>
                      <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                        UludagAIClub öğrencisi olarak hedeflerine odaklan, ödevlerini tamamla ve AI geri bildirimleriyle gelişimini takip et.
                      </p>
                      <p className="mt-3 text-sm sm:text-base text-slate-500 leading-relaxed">
                        Güncel hedeflerini gözden geçir, puanlarını takip et ve topluluğun desteğinden yararlan.
                      </p>
                      <div className="mt-8 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Toplam Puan</span>
                          <p className="mt-2 text-2xl font-bold text-slate-900">{totalPoints}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Seviye</span>
                <p className="mt-2 text-2l font-bold text-slate-900 capitalize">{classroomLabel}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 text-white p-6 flex flex-col gap-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-indigo-100/90 font-semibold">Bugün</p>
                          <p className="text-lg font-semibold">{formattedToday}</p>
                        </div>
                        <div className="px-3 py-1.5 rounded-full bg-white/20 text-xs font-semibold capitalize">
                          {classroomLabel}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href="/odevler"
                          className="inline-flex items-center justify-center rounded-xl bg-white text-indigo-600 font-semibold px-5 py-2.5 shadow-lg shadow-indigo-900/20 transition hover:-translate-y-0.5"
                        >
                          Ödevlere Git
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
                  <QuickAccessCard />
                  <ProgressVisualization 
                    weekScores={weekScores}
                    attendedWorkshops={attendedWorkshops}
                    userProfile={userProfile}
                  />
                </div>
                
                {/* Bildirim Merkezi */}
                <NotificationCenter announcements={studentAnnouncements} />
                <div className="space-y-6 sm:space-y-8">
        </div>
    </div>
  );
}


type QuickAccessCardProps = {};

function QuickAccessCard({}: Readonly<QuickAccessCardProps>) {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowRight className="w-5 h-5 text-indigo-600" />
          Hızlı Erişim
        </CardTitle>
        <CardDescription>
          Sık kullandığınız bölümlere hızlıca ulaşın
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          <Link href="/odevler">
            <button className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2">
                <FileText className="w-4 h-4 text-orange-600" />
              </div>
              <span className="text-sm font-semibold text-slate-900">Ödevler</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </button>
          </Link>
          <Link href="/geribildirimler">
            <button className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 hover:bg-blue-50/50 transition-all group">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-slate-900">Geri Bildirimler</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </button>
          </Link>
          <Link href="/workshoplar">
            <button className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all group">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2">
                <CalendarIcon className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-slate-900">Workshop'lar</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

type ProgressVisualizationProps = {
  readonly weekScores: number[];
  readonly attendedWorkshops: number;
  readonly userProfile: UserProfile | null | undefined;
};

function ProgressVisualization({
  weekScores,
  attendedWorkshops,
  userProfile,
}: Readonly<ProgressVisualizationProps>) {
  // Haftalık puanlar için max değer (100 veya en yüksek puan)
  const maxWeekScore = Math.max(100, ...weekScores);

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          İlerleme Özeti
        </CardTitle>
        <CardDescription>
          Haftalık puanlar, workshop ve ödev durumunuz
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Haftalık Puanlar */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
              Haftalık Puanlar
            </span>
            <span className="text-xs text-slate-400">
              {weekScores.filter(s => s > 0).length}/6 hafta
            </span>
          </div>
          <div className="space-y-2">
            {weekScores.map((score, index) => {
              const percentage = maxWeekScore > 0 ? (score / maxWeekScore) * 100 : 0;
              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600 w-8">
                    H{index + 1}
                  </span>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        score > 0 ? 'bg-gradient-to-r from-indigo-500 to-blue-500' : 'bg-slate-200'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-900 w-10 text-right">
                    {score > 0 ? score : '-'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Workshop İlerlemesi */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
              Workshop İlerlemesi
            </span>
            <span className="text-xs text-slate-400">
              {attendedWorkshops}/4 tamamlandı
            </span>
          </div>
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all"
              style={{ width: `${(attendedWorkshops / 4) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            {[1, 2, 3, 4].map((num) => {
              const workshopKey = `workshop${num}` as keyof UserProfile;
              const status = userProfile?.[workshopKey];
              const attended = status && status !== '-' && status !== null && status !== undefined;
              return (
                <div
                  key={num}
                  className={`flex-1 text-center text-[10px] font-semibold py-1 rounded ${
                    attended
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  W{num}
                </div>
              );
            })}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

type NotificationCenterProps = {
  readonly announcements: Announcement[];
};

function NotificationCenter({ announcements }: Readonly<NotificationCenterProps>) {
  return (
    <Card className="bg-white/90 border border-orange-200 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-600" />
          Bildirim Merkezi
        </CardTitle>
        <CardDescription>
          Öğretmenlerinizden gelen duyurular ve bildirimler
        </CardDescription>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-orange-300" />
            </div>
            <p className="text-sm text-slate-500">Henüz duyuru yok</p>
            <p className="text-xs text-slate-400 mt-1">Yeni duyurular burada görünecek</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="rounded-2xl border-2 border-orange-200/60 bg-gradient-to-r from-orange-50/70 via-white to-red-50/50 p-5 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
                    {announcement.authorName?.charAt(0) ?? 'Ö'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 mb-1">
                      {announcement.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium">{announcement.authorName}</span>
                      <span>•</span>
                      <span>
                        {announcement.createdAt 
                          ? formatDistanceToNow(announcement.createdAt.toDate(), { addSuffix: true, locale: tr })
                          : 'az önce'}
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                    Yeni
                  </Badge>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {announcement.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
    