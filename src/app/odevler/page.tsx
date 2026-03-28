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
import { ArrowLeft, ClipboardList, Clock, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { Assignments } from "@/components/dashboard/assignments";

export default function OdevlerPage() {
  const { user, isUserLoading, firestore } = useFirebase();
  const router = useRouter();
  
  const userProfileRef = useMemoFirebase(() => 
    (user && firestore) ? doc(firestore, 'users', user.uid) : null, 
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  // Fetch all assignments
  const assignmentsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'assignments'), orderBy('createdAt', 'desc')) : null,
    [firestore]
  );
  const { data: allAssignments, isLoading: isAssignmentsLoading } = useCollection<Assignment>(assignmentsQuery);
  
  const safeAssignments = allAssignments ?? [];

  // Fetch student submissions if student
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
  
  const { data: studentSubmissions } = useCollection<AssignmentSubmission>(studentSubmissionsQuery);
  const safeStudentSubmissions = studentSubmissions ?? [];

  // Fetch all submissions if teacher
  const allSubmissionsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const role = userProfile.role?.trim().toLowerCase();
    if (role !== 'teacher') return null;
    return query(
      collection(firestore, 'assignmentSubmissions'),
      orderBy('submittedAt', 'desc')
    );
  }, [firestore, userProfile]);
  
  const { data: allSubmissions } = useCollection<AssignmentSubmission>(allSubmissionsQuery);
  const safeAllSubmissions = allSubmissions ?? [];

  const isTeacher = userProfile?.role?.trim().toLowerCase() === 'teacher';
  const isStudent = userProfile?.role?.trim().toLowerCase() === 'student';

  // Filter assignments based on user's classroom level
  const filteredAssignments = useMemo(() => {
    if (!userProfile) return [];
    if (isTeacher) return safeAssignments;
    
    const studentClassroom = userProfile.classroom;
    if (!studentClassroom || studentClassroom === 'new-signup') return [];
    
    return safeAssignments.filter((assignment) => {
      return assignment.classroomLevels?.includes(studentClassroom as any) ?? false;
    });
  }, [safeAssignments, userProfile, isTeacher]);

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isTeacher) {
      const total = safeAssignments.length;
      const active = safeAssignments.filter(a => {
        const dueDate = a.dueDate?.toDate();
        return dueDate ? dueDate >= today : false;
      }).length;
      const overdue = safeAssignments.filter(a => {
        const dueDate = a.dueDate?.toDate();
        return dueDate ? dueDate < today : false;
      }).length;
      const pendingReviews = safeAllSubmissions.filter(s => 
        s.grade === undefined || s.grade === null
      ).length;
      
      return { total, active, overdue, pendingReviews };
    } else {
      // Student stats
      const total = filteredAssignments.length;
      const submittedIds = new Set(safeStudentSubmissions.map(s => s.assignmentId));
      const completed = filteredAssignments.filter(a => submittedIds.has(a.id)).length;
      const pending = filteredAssignments.filter(a => {
        if (submittedIds.has(a.id)) return false;
        const dueDate = a.dueDate?.toDate();
        return dueDate ? dueDate >= today : false;
      }).length;
      const overdue = filteredAssignments.filter(a => {
        if (submittedIds.has(a.id)) return false;
        const dueDate = a.dueDate?.toDate();
        return dueDate ? dueDate < today : false;
      }).length;
      
      // Calculate average submission time
      const submissionsWithTiming = safeStudentSubmissions.filter(s => {
        const assignment = safeAssignments.find(a => a.id === s.assignmentId);
        return assignment && assignment.dueDate && s.submittedAt;
      });
      
      const avgDaysEarly = submissionsWithTiming.length > 0
        ? submissionsWithTiming.reduce((sum, s) => {
            const assignment = safeAssignments.find(a => a.id === s.assignmentId);
            if (!assignment?.dueDate) return sum;
            const dueTime = assignment.dueDate.toDate().getTime();
            const submitTime = s.submittedAt.toDate().getTime();
            const daysDiff = (dueTime - submitTime) / (1000 * 60 * 60 * 24);
            return sum + daysDiff;
          }, 0) / submissionsWithTiming.length
        : null;
      
      return { total, completed, pending, overdue, avgDaysEarly };
    }
  }, [isTeacher, safeAssignments, filteredAssignments, safeStudentSubmissions, safeAllSubmissions]);

  const isLoading = isUserLoading || isProfileLoading;

  useEffect(() => {
    if (isLoading) return;
    
    if (!user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);
  
  if (isLoading || isAssignmentsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid gap-6 sm:grid-cols-4 mb-8">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
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
                Ödev Akışı
              </h1>
              <p className="text-sm sm:text-base text-slate-600 mt-1">
                {isTeacher 
                  ? 'Atanan ödevleri yönetin ve öğrenci teslimlerini takip edin'
                  : 'Ödev teslimlerinizi yönetin ve son tarihleri takip edin'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {isTeacher ? (
          <div className="grid gap-6 sm:grid-cols-4">
            <Card className="bg-white/90 border border-blue-200 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Toplam Ödev
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
                <p className="text-xs text-slate-500 mt-1">Tüm seviyeler</p>
              </CardContent>
            </Card>

            <Card className="bg-white/90 border border-emerald-200 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Aktif Ödevler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.active}</div>
                <p className="text-xs text-slate-500 mt-1">Devam eden</p>
              </CardContent>
            </Card>

            <Card className="bg-white/90 border border-orange-200 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Geciken Ödevler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.overdue}</div>
                <p className="text-xs text-slate-500 mt-1">Son tarih geçti</p>
              </CardContent>
            </Card>

            <Card className="bg-white/90 border border-indigo-200 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Bekleyen İnceleme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.pendingReviews}</div>
                <p className="text-xs text-slate-500 mt-1">Notlandırılmamış</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-4">
            <Card className="bg-white/90 border border-blue-200 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Toplam Ödev
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
                <p className="text-xs text-slate-500 mt-1">Seviyenize atanan</p>
              </CardContent>
            </Card>

            <Card className="bg-white/90 border border-emerald-200 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Tamamlanan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.completed}</div>
                <p className="text-xs text-slate-500 mt-1">Teslim edildi</p>
              </CardContent>
            </Card>

            <Card className="bg-white/90 border border-orange-200 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Bekleyen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.pending}</div>
                <p className="text-xs text-slate-500 mt-1">Teslim edilmedi</p>
              </CardContent>
            </Card>

            <Card className="bg-white/90 border border-red-200 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Geciken
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.overdue}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.avgDaysEarly !== null && stats.avgDaysEarly > 0
                    ? `Ort. ${Math.abs(stats.avgDaysEarly).toFixed(1)} gün erken`
                    : 'Teslim süresi'
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Timeline Note */}
        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-indigo-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Ödev Akışı</h3>
                <p className="text-sm text-slate-600">
                  Ödevler haftalara göre gruplandırılmış ve son tarihe göre sıralanmıştır. 
                  {isStudent && ' Teslim ettiğiniz ödevler yeşil, geciken ödevler kırmızı renkte gösterilir.'}
                  {isTeacher && ' Öğrenci teslimlerini görüntülemek ve notlandırmak için ödevin üzerine tıklayın.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignments Component - The main content */}
        <div className="rounded-3xl bg-white/90 border border-slate-200 shadow-2xl overflow-hidden">
          <Assignments userProfile={userProfile ?? null} />
        </div>
      </div>
    </div>
  );
}

