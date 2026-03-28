/**
 * Assignments Main Component
 * SECURITY: Manages assignment listing, grading, and student submissions
 */

'use client'

import { useState, useMemo, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Assignment, UserProfile, AssignmentSubmission } from "@/types";
import { PlusCircle, Download, Edit, Trash2, Calendar as CalendarIcon, Users, Loader2, Star, CheckCircle2, Bot, ClipboardList, AlertTriangle, Award, Lock, Unlock } from "lucide-react";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, serverTimestamp, doc, deleteDoc, updateDoc, where, getDoc } from "firebase/firestore";
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useToast } from "@/lib/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// Import from new modular structure
import { AssignmentForm } from './components/AssignmentForm';
import { useAssignmentDownloads, MAX_ASSIGNMENT_DOWNLOADS } from './hooks/useAssignmentDownloads';
import {
    MAX_SUBMISSIONS_PER_ASSIGNMENT,
    type ClassroomLevel,
    type WeekScoreField,
    hasDoubleExtension,
    isValidMimeType,
    isExtensionMatchingMimeType,
    validateFileHeader,
    validateIpynbFile,
    MAX_FILE_SIZE,
    MAX_FILE_SIZE_MB
} from './utils/assignment-utils';

type AssignmentsProps = {
    readonly userProfile: UserProfile | null;
};

export function Assignments({ userProfile }: Readonly<AssignmentsProps>) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
    
    const [submissionFile, setSubmissionFile] = useState<File | null>(null);
    const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const {
        studentDownloadCounts,
        isLoadingCounts,
        handleAssignmentFileDownload,
        handleResourceFileDownload,
        incrementDownloadCountForSubmission
    } = useAssignmentDownloads({ user, userProfile, toast });
    
    // Grading states for teachers
    const [gradingSubmission, setGradingSubmission] = useState<AssignmentSubmission | null>(null);
    const [isGradingDialogOpen, setIsGradingDialogOpen] = useState(false);
    const [gradeValue, setGradeValue] = useState<string>('');
    const [feedbackText, setFeedbackText] = useState<string>('');

    const normalizedRole = userProfile?.role?.trim().toLowerCase() ?? '';
    const isTeacher = normalizedRole === 'teacher';
    const isStudent = normalizedRole === 'student';
    const canManageAssignments = isTeacher;
    
    const parseGradeValue = (value: string): { grade: number | null; isNumeric: boolean } => {
        const trimmed = value?.trim();
        if (!trimmed) {
            return { grade: null, isNumeric: true };
        }
        const parsed = Number.parseInt(trimmed, 10);
        if (Number.isNaN(parsed)) {
            return { grade: null, isNumeric: false };
        }
        return { grade: parsed, isNumeric: true };
    };

    const isGradeWithinRange = (grade: number | null) =>
        grade === null || (grade >= 0 && grade <= 100);

    const updateSubmissionRecord = async ({
        submissionId,
        grade,
        feedback,
        gradedBy
    }: {
        submissionId: string;
        grade: number | null;
        feedback: string;
        gradedBy: string | null | undefined;
    }) => {
        if (!firestore) return;
        const submissionRef = doc(firestore, 'assignmentSubmissions', submissionId);
        await updateDoc(submissionRef, {
            grade,
            feedback: feedback.trim() || null,
            gradedAt: serverTimestamp(),
            gradedBy: gradedBy ?? 'Öğretmen'
        });
    };

    const findAssignmentById = (
        assignments: Assignment[] | null,
        assignmentId: string
    ): Assignment | null => assignments?.find((assignment) => assignment.id === assignmentId) ?? null;

    const resolveWeekScoreField = (week?: number | null): WeekScoreField | null => {
        if (!week || week < 1 || week > 6) {
            return null;
        }
        return `week${week}Score` as WeekScoreField;
    };

    const fetchStudentRecord = async (studentId: string) => {
        if (!firestore) return null;
        const studentRef = doc(firestore, 'users', studentId);
        const studentDoc = await getDoc(studentRef);
        if (!studentDoc.exists()) {
            return null;
        }
        return { studentRef, studentData: studentDoc.data() as UserProfile };
    };

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

    const updateStudentWeekScore = async ({
        studentId,
        weekScoreField,
        previousGrade,
        nextGrade
    }: {
        studentId: string;
        weekScoreField: WeekScoreField;
        previousGrade: number | null | undefined;
        nextGrade: number | null;
    }) => {
        const studentRecord = await fetchStudentRecord(studentId);
        if (!studentRecord) {
            return;
        }

        const currentWeekScore = studentRecord.studentData[weekScoreField];
        const newWeekScore = calculateWeekScore({
            currentWeekScore,
            previousGrade,
            nextGrade
        });

        if (newWeekScore === null) {
            return;
        }

        await updateDoc(studentRecord.studentRef, {
            [weekScoreField]: newWeekScore
        });
    };

    const resetGradingState = () => {
        setIsGradingDialogOpen(false);
        setGradingSubmission(null);
        setGradeValue('');
        setFeedbackText('');
    };
    
    const assignmentsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, 'assignments'), orderBy('createdAt', 'desc')) : null,
        [firestore]
    );
    const { data: allAssignments, isLoading } = useCollection<Assignment>(assignmentsQuery);
    const totalAssignments = allAssignments?.length ?? 0;
    const assignmentsWithPlannedDueDates = allAssignments
        ? [...allAssignments].filter((assignment) => assignment.dueDate)
        : [];
    const closestAssignment = assignmentsWithPlannedDueDates.length
        ? [...assignmentsWithPlannedDueDates].sort(
            (a, b) =>
                (a.dueDate?.toDate().getTime() ?? Number.MAX_SAFE_INTEGER) -
                (b.dueDate?.toDate().getTime() ?? Number.MAX_SAFE_INTEGER)
          )[0]
        : null;
    const closestDueDate = closestAssignment?.dueDate
        ? format(closestAssignment.dueDate.toDate(), 'dd MMM yyyy', { locale: tr })
        : null;
    
    // Fetch submissions for students (their own submissions)
    // Only query when userProfile is loaded and role is confirmed as 'student'
    const submissionsQuery = useMemoFirebase(
        () => {
            if (!firestore || !user || !userProfile) return null;
            const role = userProfile.role?.trim().toLowerCase();
            if (role !== 'student') return null;
            return query(
                collection(firestore, 'assignmentSubmissions'),
                where('studentId', '==', user.uid),
                orderBy('submittedAt', 'desc')
            );
        },
        [firestore, user, userProfile]
    );
    const { data: studentSubmissions } = useCollection<AssignmentSubmission>(submissionsQuery);
    
    // Fetch all submissions for teachers
    const allSubmissionsQuery = useMemoFirebase(
        () => firestore && canManageAssignments
            ? query(collection(firestore, 'assignmentSubmissions'), orderBy('submittedAt', 'desc'))
            : null,
        [firestore, canManageAssignments]
    );
    const { data: allSubmissions } = useCollection<AssignmentSubmission>(allSubmissionsQuery);
    
    const assignments = useMemo(() => {
        if (!allAssignments || !userProfile) return [];
        if (canManageAssignments) return allAssignments;
        const studentLevel = userProfile.classroom;
        if (!studentLevel) return [];
        return allAssignments.filter(assignment => assignment.classroomLevels && assignment.classroomLevels.length > 0 ? assignment.classroomLevels.includes(studentLevel as any) : true);
    }, [allAssignments, userProfile, canManageAssignments]);

    const filteredAssignments = useMemo(() => {
        if (!assignments || !userProfile) return [];
        if (canManageAssignments) return assignments;
        return assignments.filter(assignment => assignment.classroomLevels?.includes(userProfile.classroom as ClassroomLevel));
    }, [assignments, userProfile, canManageAssignments]);

    const assignmentsByWeek = useMemo(() => {
        if (!filteredAssignments) return [];
        const sorted = [...filteredAssignments].sort((a, b) => {
            const weekA = typeof a.week === 'number' ? a.week : 999;
            const weekB = typeof b.week === 'number' ? b.week : 999;
            if (weekA !== weekB) return weekA - weekB;
            const dueA = a.dueDate?.toMillis?.() ?? 0;
            const dueB = b.dueDate?.toMillis?.() ?? 0;
            return dueA - dueB;
        });

        const groupsMap = new Map<string, { key: string; weekNumber: number | null; label: string; assignments: Assignment[] }>();

        sorted.forEach((assignment) => {
            const weekNumber = typeof assignment.week === 'number' ? assignment.week : null;
            const key = weekNumber !== null ? `week-${weekNumber}` : 'week-other';
            if (!groupsMap.has(key)) {
                const label = weekNumber !== null ? `${weekNumber}. Hafta` : 'Hafta bilgisi bulunmuyor';
                groupsMap.set(key, { key, weekNumber, label, assignments: [] });
            }
            groupsMap.get(key)!.assignments.push(assignment);
        });

        return Array.from(groupsMap.values()).sort((a, b) => {
            const weekA = a.weekNumber ?? 999;
            const weekB = b.weekNumber ?? 999;
            return weekA - weekB;
        });
    }, [filteredAssignments]);

    const handleAddNew = () => {
        setSelectedAssignment(null);
        setIsFormOpen(true);
    };
    
    const handleEdit = (assignment: Assignment) => {
        setSelectedAssignment(assignment);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (assignment: Assignment) => {
        setAssignmentToDelete(assignment);
        setIsDeleteAlertOpen(true);
    };
    
    // Get submission for a specific assignment (for students)
    // Returns the most recent submission if multiple submissions exist
    const getSubmissionForAssignment = (assignmentId: string): AssignmentSubmission | undefined => {
        if (!studentSubmissions) return undefined;
        const submissionsForAssignment = studentSubmissions.filter(sub => sub.assignmentId === assignmentId);
        if (submissionsForAssignment.length === 0) return undefined;
        
        // Sort by submittedAt descending (most recent first) and return the first one
        // This ensures we always get the latest submission even if orderBy didn't work as expected
        return submissionsForAssignment.sort((a, b) => {
            const dateA = a.submittedAt?.toDate?.()?.getTime() ?? 0;
            const dateB = b.submittedAt?.toDate?.()?.getTime() ?? 0;
            return dateB - dateA; // Descending order (newest first)
        })[0];
    };
    
    // Get submission count for a specific assignment (for students)
    const getSubmissionCountForAssignment = (assignmentId: string): number => {
        if (!studentSubmissions) return 0;
        return studentSubmissions.filter(sub => sub.assignmentId === assignmentId).length;
    };
    
    // Get download count for a specific assignment (for students)
    const getDownloadCountForAssignment = (assignmentId: string): number => {
        if (!user?.uid) return 0;
        const downloadKey = `${user.uid}_${assignmentId}`;
        return studentDownloadCounts[downloadKey] ?? 0;
    };
    
    // Get submissions for a specific assignment (for teachers)
    const getSubmissionsForAssignment = (assignmentId: string): AssignmentSubmission[] => {
        if (!allSubmissions) return [];
        return allSubmissions.filter(sub => sub.assignmentId === assignmentId);
    };
    
    // Handle grading (for teachers)
    const handleGradeClick = (submission: AssignmentSubmission) => {
        setGradingSubmission(submission);
        setGradeValue(submission.grade?.toString() ?? '');
        setFeedbackText(submission.feedback ?? '');
        setIsGradingDialogOpen(true);
    };
    
    const handleSaveGrade = async () => {
        if (!firestore || !gradingSubmission || !userProfile) return;
        
        const { grade: gradeNum, isNumeric } = parseGradeValue(gradeValue);
        if (!isNumeric) {
            toast({
                title: "Geçersiz Puan",
                description: "Puan sayısal bir değer olmalıdır.",
                variant: "destructive"
            });
            return;
        }

        if (!isGradeWithinRange(gradeNum)) {
            toast({ 
                title: "Geçersiz Puan", 
                description: "Puan 0 ile 100 arasında olmalıdır.", 
                variant: "destructive" 
            });
            return;
        }
        
        try {
            await updateSubmissionRecord({
                submissionId: gradingSubmission.id,
                grade: gradeNum,
                feedback: feedbackText,
                gradedBy: userProfile.displayName
            });

            const assignment = findAssignmentById(allAssignments, gradingSubmission.assignmentId);
            const weekScoreField = resolveWeekScoreField(assignment?.week);

            if (weekScoreField) {
                await updateStudentWeekScore({
                    studentId: gradingSubmission.studentId,
                    weekScoreField,
                    previousGrade: gradingSubmission.grade,
                    nextGrade: gradeNum
                });
            }
            
            toast({ 
                title: "Puanlama Kaydedildi", 
                description: "Ödev başarıyla puanlandı, geri bildirim eklendi ve haftalık puan güncellendi." 
            });
            
            resetGradingState();
        } catch (error) {
            console.error('Puanlama hatası:', error);
            toast({ 
                title: "Hata!", 
                description: "Puanlama kaydedilirken bir hata oluştu.", 
                variant: "destructive" 
            });
        }
    };

    const handleDelete = async () => {
        if (!assignmentToDelete || !firestore) return;
        const assignmentRef = doc(firestore, 'assignments', assignmentToDelete.id);
        const deletedTitle = assignmentToDelete.title;
        try {
            await deleteDoc(assignmentRef);
            toast({ title: "Ödev Silindi", description: `'${deletedTitle}' başlıklı ödev silindi.` });
        } catch (error) {
            console.error('Error deleting assignment:', error);
             toast({ variant: "destructive", title: "Hata", description: "Ödev silinirken bir hata oluştu." });
        }
        setIsDeleteAlertOpen(false);
        setAssignmentToDelete(null);
    };

    const handleToggleSubmissions = async (assignment: Assignment) => {
        if (!firestore || !assignment.id) return;
        
        const assignmentRef = doc(firestore, 'assignments', assignment.id);
        const newAllowSubmissions = !(assignment.allowSubmissions ?? true); // Default true, toggle ediyoruz
        
        try {
            await updateDoc(assignmentRef, {
                allowSubmissions: newAllowSubmissions,
                updatedAt: serverTimestamp()
            });
            
            toast({ 
                title: newAllowSubmissions ? "Yükleme Açıldı" : "Yükleme Kapatıldı", 
                description: `Öğrenciler artık bu ödeve ${newAllowSubmissions ? 'dosya yükleyebilir' : 'dosya yükleyemez'}.` 
            });
        } catch (error) {
            console.error('Error toggling submissions:', error);
            toast({ 
                variant: "destructive", 
                title: "Hata", 
                description: "Yükleme durumu değiştirilirken bir hata oluştu." 
            });
        }
    };
    
    const getLevelVariant = (level: ClassroomLevel) => {
        switch(level) {
            case 'junior': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'junior-plus': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
            case 'mid': return 'bg-green-100 text-green-800 border-green-200';
            case 'mid-plus': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'senior': return 'bg-purple-100 text-purple-800 border-purple-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    }

    const handleSubmitAssignment = async (assignment: Assignment) => {
        if (!firestore || !user || !userProfile || !submissionFile) return;
        
        // Check submission limit before uploading
        const submissionCount = getSubmissionCountForAssignment(assignment.id);
        if (submissionCount >= MAX_SUBMISSIONS_PER_ASSIGNMENT) {
            toast({
                title: "Yükleme Limiti Aşıldı",
                description: `Bu ödevi maksimum ${MAX_SUBMISSIONS_PER_ASSIGNMENT} kez yükleyebilirsiniz. Limit: ${submissionCount}/${MAX_SUBMISSIONS_PER_ASSIGNMENT}`,
                variant: "destructive"
            });
            return;
        }

        setSubmittingAssignmentId(assignment.id);
        setIsUploading(true);

        try {
            // Get Firebase ID token for authentication
            const token = await user.getIdToken();

            // Only send assignmentId and file - all other data comes from server
        const formData = new FormData();
        formData.append("file", submissionFile);
        formData.append("assignmentId", assignment.id);

            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error ?? 'Dosya yüklenirken bir hata oluştu.');
            }

            // Yükleme başarılı oldu, indirme sayısını artır (backend zaten Firestore'a kaydetti)
            incrementDownloadCountForSubmission(assignment.id);

            const remainingUploads = MAX_SUBMISSIONS_PER_ASSIGNMENT - (submissionCount + 1);
            toast({
                title: "Ödev Teslim Edildi!",
                description: `Ödeviniz başarıyla yüklendi. Kalan yükleme hakkı: ${remainingUploads}/${MAX_SUBMISSIONS_PER_ASSIGNMENT}`
            });
            
        } catch (error: any) {
            if (process.env.NODE_ENV === 'development') console.error('Error submitting assignment:', error);
            toast({ title: "Hata!", description: error.message ?? "Ödev teslim edilirken bir hata oluştu.", variant: "destructive" });
        } finally {
            setSubmittingAssignmentId(null);
            setSubmissionFile(null);
            setIsUploading(false);
        }
    };
    
    const validateStudentSubmissionFile = async (file: File, classroom?: string | null) => {
        if (file.size > MAX_FILE_SIZE) {
            throw new Error(`Dosya boyutu ${MAX_FILE_SIZE_MB}MB'dan küçük olmalıdır.`);
        }

        if (hasDoubleExtension(file.name)) {
                                                                                    throw new Error("Çoklu uzantılı dosyalar güvenlik nedeniyle kabul edilmez.");
        }
                                                                                
        const lowerName = file.name.toLowerCase();
                                                                                if (classroom === 'junior') {
            const isJuniorFile =
                lowerName.endsWith('.ipynb') || lowerName.endsWith('.docx') || lowerName.endsWith('.doc');
            if (!isJuniorFile) {
                                                                                        throw new Error("Junior seviyesi için sadece .ipynb ve .docx dosyaları kabul edilir.");
                                                                                    }
        } else if (!lowerName.endsWith('.ipynb')) {
                                                                                        throw new Error("Sadece .ipynb dosyaları kabul edilir.");
                                                                                }
                                                                                
        if (!isValidMimeType(file, classroom)) {
            if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
                                                                                        throw new Error("Word dosyaları sadece Junior seviyesi için kabul edilir.");
            }
                                                                                        throw new Error("Sadece .ipynb (tüm seviyeler) veya .docx (Junior) dosyaları kabul edilir.");
                                                                                    }

        if (!isExtensionMatchingMimeType(file, classroom)) {
                                                                                    throw new Error("Dosya tipi uzantıyla eşleşmiyor.");
        }

        if (lowerName.endsWith('.ipynb')) {
            const isValidHeader = await validateFileHeader(file);
            if (!isValidHeader) {
                throw new Error("Geçersiz dosya içeriği.");
            }
            await validateIpynbFile(file);
        }
    };

    const handleStudentFileInputChange = async (
        assignment: Assignment,
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) {
            setSubmissionFile(null);
            setSubmittingAssignmentId(null);
            return;
        }

        try {
            await validateStudentSubmissionFile(selectedFile, userProfile?.classroom ?? null);
                                                            setSubmissionFile(selectedFile);
                                                                                setSubmittingAssignmentId(assignment.id);
                                                        } catch (error: any) {
                                                            toast({ title: "Dosya Hatası!", description: error.message, variant: "destructive" });
                                                            setSubmissionFile(null);
                                                            setSubmittingAssignmentId(null);
            event.target.value = '';
        }
    };

    // Helper: Render submission status badges
    const renderSubmissionHeader = (submission: AssignmentSubmission, assignment: Assignment) => {
        return (
                                                                        <div className="flex flex-wrap items-center gap-3 mb-4">
                                                                            <div className="flex items-center gap-2">
                                                                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                                                <span className="text-base font-bold text-green-800">Ödev Teslim Edildi</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2.5 ml-auto">
                                                                                {submission.submissionTiming && (
                                                                                    <Badge
                                                                                        variant={submission.submissionTiming === 'late' ? 'destructive' : 'secondary'}
                                                                                        className="text-xs font-semibold px-3 py-1.5 shadow-md"
                                                                                    >
                                                                                        {submission.submissionTiming === 'late' ? 'Geç Teslim' : 'Zamanında Teslim'}
                                                                                    </Badge>
                                                                                )}
                                                                                {submission.grade !== undefined && submission.grade !== null && (
                                                                                    <Badge variant="default" className="text-xs font-bold px-4 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg">
                                                                                        <Star className="w-3.5 h-3.5 mr-1.5" />
                                                                                        {submission.grade} / {assignment.points ?? 100}
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                        </div>
        );
    };

    // Helper: Render submission warnings (late submission, graded date)
    const renderSubmissionWarnings = (submission: AssignmentSubmission) => {
        return (
            <>
                                                                        {submission.submissionTiming === 'late' && (
                                                                            <div className="mb-4 p-3 rounded-xl bg-amber-50/80 border border-amber-200/60 flex items-start gap-2 text-amber-700">
                                                                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                                                <p className="text-xs sm:text-sm font-medium">
                                                                                    Bu teslim geç teslim süresi içerisinde yapıldı.
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                        {submission.gradedAt && (
                                                                            <div className="mb-5 p-3 rounded-xl bg-green-50/80 border border-green-200/60">
                                                                                <p className="text-xs sm:text-sm font-semibold text-green-700">
                                                                                    ✅ Puanlandı: {format(submission.gradedAt.toDate(), 'dd MMM yyyy HH:mm', { locale: tr })}
                                                                                </p>
                                                                            </div>
                                                                        )}
            </>
        );
    };

    // Helper: Render submission feedback section
    const renderSubmissionFeedback = (submission: AssignmentSubmission) => {
        if (submission.feedback) {
            return (
                                                                            <div className="rounded-2xl border-2 border-blue-300/70 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/50 p-6 shadow-lg">
                                                                                <div className="flex items-start gap-4 mb-4">
                                                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/25 to-indigo-500/25 flex items-center justify-center flex-shrink-0 shadow-md border border-blue-200/50">
                                                                                        <Bot className="w-7 h-7 text-blue-600" />
                                                                                    </div>
                                                                                    <div className="flex-1">
                                                                                        <div className="flex items-center gap-2.5 mb-3">
                                                                                            <p className="text-sm font-bold text-blue-800 uppercase tracking-wide">AI Agent Geri Bildirimi</p>
                                                                                            <Badge variant="outline" className="text-[10px] px-2.5 py-1 border-blue-400 text-blue-700 bg-blue-100/80 font-bold shadow-sm">
                                                                                                AI
                                                                                            </Badge>
                                                                                        </div>
                                                                                        <p className="text-sm sm:text-base text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
                                                                                            {submission.feedback}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
            );
        }

        return (
                                                                            <div className="rounded-2xl border-2 border-slate-300/50 bg-gradient-to-br from-slate-50/80 to-white p-5">
                                                                                <div className="flex items-center gap-4">
                    <Bot className="w-6 h-6 text-slate-600" />
                    <p className="text-sm font-semibold text-slate-600">
                        Henüz AI geri bildirimi yok.
                    </p>
                                                                                    </div>
                                                                                    </div>
        );
    };

    // Helper: Render submission card content
    const renderSubmissionCard = (submission: AssignmentSubmission, assignment: Assignment) => (
        <div className="mt-7 pt-6 border-t-2 border-green-300/70">
            <div className="bg-gradient-to-br from-green-50/90 via-emerald-50/70 to-white rounded-3xl p-6 sm:p-7 border-2 border-green-300/70 shadow-xl">
                {renderSubmissionHeader(submission, assignment)}
                {renderSubmissionWarnings(submission)}
                                                                                </div>
                                                                            </div>
    );

    const renderTeacherSubmissionRow = (submission: AssignmentSubmission, assignment: Assignment) => (
                                                                    <div
                                                                        key={submission.id}
                                                                        className="bg-gradient-to-r from-slate-50/80 via-white to-blue-50/30 rounded-xl p-4 border-2 border-slate-200/50 hover:border-blue-200 hover:shadow-md transition-all flex items-center justify-between"
                                                                    >
                                                                        <div className="flex-1">
                                                                            <p className="text-sm font-medium text-slate-800">
                                                                                {submission.studentName}
                                                                            </p>
                                                                            <p className="text-xs text-slate-500">
                                                                                {submission.submittedAt &&
                                                                                    format(submission.submittedAt.toDate(), 'dd MMM yyyy HH:mm', { locale: tr })}
                                                                            </p>
                                                                            {submission.submissionTiming && (
                                                                                <Badge
                                                                                    variant={submission.submissionTiming === 'late' ? 'destructive' : 'secondary'}
                                                                                    className="mt-1 text-xs"
                                                                                >
                                                                                    {submission.submissionTiming === 'late'
                                                                                        ? 'Geç Teslim'
                                                                                        : 'Zamanında Teslim'}
                                                                                </Badge>
                                                                            )}
                                                                            {submission.grade !== undefined && submission.grade !== null && (
                                                                                <Badge variant="default" className="mt-1">
                                                                                    {submission.grade} / {assignment.points ?? 100}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="shadow-md hover:shadow-lg transition-all border-blue-200 hover:border-blue-300 font-medium"
                                                                            onClick={() => handleGradeClick(submission)}
                                                                        >
                                                                            <Star className="w-4 h-4 mr-1.5" />
                {submission.grade !== undefined && submission.grade !== null ? 'Düzenle' : 'Puanla'}
                                                                        </Button>
                                                                    </div>
    );

    const renderTeacherSubmissions = (assignment: Assignment) => {
        if (!canManageAssignments) return null;
        // Workshop'lar için teslim edilen ödevler bölümü gösterilmez
        if (assignment.isWorkshop) return null;
        const submissions = getSubmissionsForAssignment(assignment.id);
        if (!submissions.length) return null;

        return (
            <div className="mt-5 pt-5 border-t-2 border-blue-200/50">
                <div className="space-y-3">
                    <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Teslim Edilen Ödevler ({submissions.length})
                    </p>
                    {submissions.map((submission) => renderTeacherSubmissionRow(submission, assignment))}
                                                            </div>
                                                        </div>
        );
    };

    const renderStudentSection = (assignment: Assignment) => {
        // Workshop'lar için öğrenci bölümü gösterilmez
        if (assignment.isWorkshop) {
            return null;
        }

        const submission = getSubmissionForAssignment(assignment.id);
        const inputId = `file-${assignment.id}`;
        const canSubmit = submissionFile && submittingAssignmentId === assignment.id;
        
        // Get submission count and download count
        const submissionCount = getSubmissionCountForAssignment(assignment.id);
        const downloadCount = getDownloadCountForAssignment(assignment.id);
        const canUploadMore = submissionCount < MAX_SUBMISSIONS_PER_ASSIGNMENT;
        const canDownloadMore = downloadCount < MAX_ASSIGNMENT_DOWNLOADS;
        
        // Check if submissions are allowed for this assignment
        const allowSubmissions = assignment.allowSubmissions ?? true; // Default true

        const hasSubmitted = Boolean(submission);

        return (
            <>
                <div className="flex items-center gap-2 mt-4">
                    {!allowSubmissions ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                            <Lock className="w-4 h-4 text-orange-600" />
                            <span className="text-sm text-orange-700 font-medium">
                                Bu ödev için yükleme kapatılmıştır.
                            </span>
                        </div>
                    ) : (
                        <>
                            <input
                                type="file"
                                id={inputId}
                                className="hidden"
                                onChange={(event) => handleStudentFileInputChange(assignment, event)}
                                accept={userProfile?.classroom === 'junior' ? '.ipynb,.docx,.doc' : '.ipynb'}
                            />
                            <Button
                                size="default"
                                variant="outline"
                                className="shadow-lg hover:shadow-xl transition-all border-2 border-blue-300 hover:border-blue-400 font-semibold px-5 py-2.5"
                                onClick={() => document.getElementById(inputId)?.click()}
                                disabled={isUploading || !canUploadMore || !allowSubmissions}
                                title={!allowSubmissions ? 'Bu ödev için yükleme kapatılmıştır' : !canUploadMore ? `Bu ödevi maksimum ${MAX_SUBMISSIONS_PER_ASSIGNMENT} kez yükleyebilirsiniz` : 'Dosya seç'}
                            >
                                📎 Dosya Seç
                            </Button>
                            {submission?.submittedAt && (
                                <span className="text-xs text-slate-600">
                                    Ödevini yükledin • {format(submission.submittedAt.toDate(), 'dd MMM yyyy HH:mm', { locale: tr })}
                                </span>
                            )}
                            {canSubmit && (
                                <Button
                                    size="default"
                                    onClick={() => handleSubmitAssignment(assignment)}
                                    disabled={isUploading || !canUploadMore || !allowSubmissions}
                                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-xl hover:shadow-2xl transition-all font-bold px-6 py-2.5"
                                    title={!allowSubmissions ? 'Bu ödev için yükleme kapatılmıştır' : !canUploadMore ? `Yükleme limitine ulaştınız (${MAX_SUBMISSIONS_PER_ASSIGNMENT}/${MAX_SUBMISSIONS_PER_ASSIGNMENT})` : 'Teslim et'}
                                >
                                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Teslim Et
                                </Button>
                            )}
                        </>
                    )}
                </div>
                {submission && renderSubmissionCard(submission, assignment)}
            </>
        );
    };

    const renderClassroomLevels = (classroomLevels: string[] | undefined) => {
        if (!classroomLevels || classroomLevels.length === 0) {
            return null;
        }
        
        return (
            <div className="flex flex-wrap items-center gap-2.5 mb-5">
                {classroomLevels.map((level) => (
                    <Badge
                        key={level}
                        variant="outline"
                        className={cn("text-xs font-bold px-3.5 py-1.5 shadow-md", getLevelVariant(level as ClassroomLevel))}
                    >
                        {level.replace('-', ' ')}
                    </Badge>
                ))}
            </div>
        );
    };

    const handleDocumentDownload = (assignment: Assignment) => {
        handleAssignmentFileDownload(assignment, 0);
    };

    const handleHomeworkDownload = (assignment: Assignment) => {
        console.log('Homework button clicked, fileIndex=1, assignmentId=', assignment.id);
        handleAssignmentFileDownload(assignment, 1);
    };

    const shouldShowDocumentButton = (assignment: Assignment): boolean => {
        return !!(assignment.fileURL || (assignment.primaryFiles && assignment.primaryFiles.length > 0));
    };

    const shouldShowHomeworkButton = (assignment: Assignment): boolean => {
        return !!(assignment.fileURL2 || 
                  (assignment.primaryFiles && assignment.primaryFiles.length > 1) || 
                  assignment.fileURL);
    };

    const getButtonDisabledState = (assignmentId: string): boolean => {
        return isStudent && getDownloadCountForAssignment(assignmentId) >= MAX_ASSIGNMENT_DOWNLOADS;
    };

    const getButtonTitle = (assignmentId: string, defaultTitle: string): string => {
        const isDisabled = getButtonDisabledState(assignmentId);
        return isDisabled
            ? `İndirme limitine ulaştınız (${MAX_ASSIGNMENT_DOWNLOADS}/${MAX_ASSIGNMENT_DOWNLOADS})`
            : defaultTitle;
    };

    const createEditHandler = (assignment: Assignment) => () => handleEdit(assignment);
    const createDeleteHandler = (assignment: Assignment) => () => handleDeleteClick(assignment);
    const createToggleSubmissionsHandler = (assignment: Assignment) => () => handleToggleSubmissions(assignment);

    const renderManagementButtons = (assignment: Assignment) => {
        if (!canManageAssignments) {
            return null;
        }

        const allowSubmissions = assignment.allowSubmissions ?? true; // Default true

        return (
            <>
                <Button 
                    size="sm" 
                    variant="outline" 
                    className={`shadow-md hover:shadow-lg transition-all font-medium ${
                        allowSubmissions 
                            ? 'border-green-200 hover:border-green-300 hover:bg-green-50' 
                            : 'border-orange-200 hover:border-orange-300 hover:bg-orange-50'
                    }`}
                    onClick={createToggleSubmissionsHandler(assignment)}
                    title={allowSubmissions ? 'Yüklemeyi Kapat' : 'Yüklemeyi Aç'}
                >
                    {allowSubmissions ? (
                        <Unlock className="w-4 h-4 text-green-600" />
                    ) : (
                        <Lock className="w-4 h-4 text-orange-600" />
                    )}
                </Button>
                <Button size="sm" variant="outline" className="shadow-md hover:shadow-lg transition-all border-slate-200 hover:border-slate-300 font-medium" onClick={createEditHandler(assignment)}>
                    <Edit className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" className="shadow-md hover:shadow-lg transition-all border-red-200 hover:border-red-300 hover:bg-red-50 font-medium" onClick={createDeleteHandler(assignment)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
            </>
        );
    };

    const renderAssignment = (assignment: Assignment) => {
        // Create bound handlers to avoid nested arrow functions in JSX
        const onDocumentDownload = () => handleDocumentDownload(assignment);
        const onHomeworkDownload = () => handleHomeworkDownload(assignment);
        const onResourceDownload1 = () => handleResourceFileDownload(assignment, 0);
        const onResourceDownload2 = () => handleResourceFileDownload(assignment, 1);

        return (
            <div
                key={assignment.id}
                className="bg-gradient-to-br from-white via-blue-50/60 to-indigo-50/60 rounded-3xl p-6 sm:p-7 border-2 border-blue-200/70 hover:border-blue-400/80 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5"
            >
                <div className="flex items-start justify-between mb-5">
                    <div className="flex-1">
                        <h4 className="font-bold text-xl sm:text-2xl text-slate-900 mb-4 leading-tight">{assignment.title}</h4>
                        <p className="text-sm sm:text-base text-slate-700 mb-5 line-clamp-3 leading-relaxed">{assignment.description}</p>
                        {renderClassroomLevels(assignment.classroomLevels)}
                        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                            {assignment.dueDate && (
                                <div className="flex items-center gap-1.5 text-slate-600 bg-white/80 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                                    <CalendarIcon className="w-3.5 h-3.5" />
                                    <span className="font-medium">
                                        {format(assignment.dueDate.toDate(), 'dd MMM yyyy', { locale: tr })}
                                    </span>
                                </div>
                            )}
                            {assignment.points && (
                                <div className="flex items-center gap-1.5 text-slate-600 bg-white/80 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                                    <Award className="w-3.5 h-3.5" />
                                    <span className="font-medium">{assignment.points} puan</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t border-blue-100/50">
                    {!assignment.isWorkshop && (
                        <>
                            {shouldShowDocumentButton(assignment) && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="shadow-md hover:shadow-lg transition-all border-purple-200 hover:border-purple-300 font-medium"
                                    onClick={onDocumentDownload}
                                    disabled={getButtonDisabledState(assignment.id)}
                                    title={getButtonTitle(assignment.id, 'Döküman dosyasını indir')}
                                >
                                    <Download className="w-3 h-3" />
                                    <span className="ml-1 text-xs">Döküman</span>
                                </Button>
                            )}
                            {shouldShowHomeworkButton(assignment) && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="shadow-md hover:shadow-lg transition-all border-orange-200 hover:border-orange-300 font-medium"
                                    onClick={onHomeworkDownload}
                                    disabled={getButtonDisabledState(assignment.id)}
                                    title={getButtonTitle(assignment.id, 'Homework dosyasını indir')}
                                >
                                    <Download className="w-3 h-3" />
                                    <span className="ml-1 text-xs">Homework</span>
                                </Button>
                            )}
                            {assignment.resourceFileURL && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="shadow-md hover:shadow-lg transition-all border-green-200 hover:border-green-300 font-medium"
                                    onClick={onResourceDownload1}
                                    title="CSV1 kaynak dosyasını indir"
                                >
                                    <Download className="w-3 h-3" />
                                    <span className="ml-1 text-xs">CSV1</span>
                                </Button>
                            )}
                            {assignment.resourceFileURL2 && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="shadow-md hover:shadow-lg transition-all border-green-200 hover:border-green-300 font-medium"
                                    onClick={onResourceDownload2}
                                    title="CSV2 kaynak dosyasını indir"
                                >
                                    <Download className="w-3 h-3" />
                                    <span className="ml-1 text-xs">CSV2</span>
                                </Button>
                            )}
                        </>
                    )}
                    {renderManagementButtons(assignment)}
                </div>
                {/* Student View */}
                {isStudent && renderStudentSection(assignment)}
                {/* Teacher View */}
                {renderTeacherSubmissions(assignment)}
            </div>
        );
    };

    /**
     * Helper: Render assignments list with proper conditional logic
     */
    const renderAssignmentsList = () => {
        if (isLoading) {
            return (
                <>
                    {Array.from({ length: 3 }, (_, i) => (
                        <div key={`assignment-skeleton-${i}`} className="bg-slate-50 rounded-xl p-4 animate-pulse">
                            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-slate-200 rounded w-full mb-3"></div>
                            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                        </div>
                    ))}
                </>
            );
        }

        if (!assignmentsByWeek || assignmentsByWeek.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white/80 border border-dashed border-slate-200 rounded-2xl shadow-inner">
                    <div className="p-4 rounded-full bg-blue-50 text-blue-600 shadow-sm">
                        <ClipboardList className="w-6 h-6" />
                    </div>
                    <p className="text-lg font-semibold text-slate-800 mt-4">Henüz bir ödev yok</p>
                    <p className="text-sm text-slate-500 mt-2 max-w-md">
                        {isStudent
                            ? 'Öğretmenler yeni ödev yayınladığında burada listelenecek. Bildirimleri takip etmeyi unutma.'
                            : 'Henüz öğrencilere atadığınız bir ödev bulunmuyor. Yeni bir ödev oluşturarak süreci başlatabilirsiniz.'}
                    </p>
                </div>
            );
        }

        return (
            <>
                {assignmentsByWeek.map(group => (
                    <div key={group.key} className="space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md"></div>
                            <span className="text-xs sm:text-sm uppercase tracking-wider font-bold text-slate-600">{group.label}</span>
                        </div>
                        <div className="space-y-5">
                            {group.assignments.map(renderAssignment)}
                        </div>
                    </div>
                ))}
            </>
        );
    };

    return (
        <>
            <div className="bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/40 backdrop-blur-md rounded-3xl border-2 border-blue-200/60 shadow-2xl overflow-hidden">
                <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-500/12 via-indigo-500/10 to-blue-500/12 border-b-2 border-blue-200/40">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white text-blue-600 flex items-center justify-center shadow-xl ring-4 ring-blue-100/60 border border-blue-100">
                                <ClipboardList className="w-7 h-7" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold mb-1">Ödev Akışı</p>
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
                                    {userProfile?.role === 'student' ? 'Atanan Ödevler ve Geri Bildirimler' : 'Atanan Ödevler'}
                                </h2>
                                <p className="text-sm text-slate-600">
                                    {userProfile?.role === 'student' 
                                        ? 'Ödev teslimlerinizi yönetin, indirme haklarınızı takip edin ve AI geri bildirimlerini tek ekranda görün.'
                                        : 'Tüm sınıflar için verdiğiniz ödevleri yönetin, teslim durumlarını ve öğrenci geri bildirimlerini kontrol edin.'}
                                </p>
                            </div>
                        </div>
                        {userProfile?.role !== 'student' && (
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="rounded-2xl bg-white/80 border border-blue-100 px-4 py-2 shadow-sm">
                                    <span className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Aktif Ödev</span>
                                    <p className="text-lg font-bold text-slate-900">{totalAssignments}</p>
                                </div>
                                <div className="rounded-2xl bg-white/80 border border-blue-100 px-4 py-2 shadow-sm">
                                    <span className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Son Tarih</span>
                                    <p className="text-lg font-bold text-slate-900">
                                        {closestDueDate ?? 'Belirsiz'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="p-6 sm:p-8">
                    <div className="space-y-5">
                        {renderAssignmentsList()}
                    </div>
                </div>
                
            {canManageAssignments && (
                    <div className="p-6 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border-t border-blue-200/30">
                        <Button onClick={handleAddNew} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 rounded-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] text-base">
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Yeni Ödev Ekle
                    </Button>
                    </div>
            )}
            </div>

            {/* Grading Dialog for Teachers */}
            <Dialog open={isGradingDialogOpen} onOpenChange={setIsGradingDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Ödev Puanla ve Geri Bildirim Ver</DialogTitle>
                        <DialogDescription>
                            {gradingSubmission && `${gradingSubmission.studentName} adlı öğrencinin ödevini puanlayın ve geri bildirim yazın.`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="grade">Puan (0-100)</Label>
                            <Input
                                id="grade"
                                type="number"
                                min="0"
                                max="100"
                                placeholder="Örn: 85"
                                value={gradeValue}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || /^\d+$/.test(value)) {
                                        if (value === '') {
                                            setGradeValue(value);
                                        } else {
                                            const numValue = parseInt(value, 10);
                                            if (numValue >= 0 && numValue <= 100) {
                                                setGradeValue(value);
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="feedback">Geri Bildirim</Label>
                            <Textarea
                                id="feedback"
                                placeholder="Öğrenciye geri bildirim yazın..."
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                rows={6}
                                className="resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsGradingDialogOpen(false)}>
                            İptal
                        </Button>
                        <Button onClick={handleSaveGrade} className="bg-blue-600 hover:bg-blue-700">
                            Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {canManageAssignments && (
            <AssignmentForm
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                    selectedAssignment={selectedAssignment}
                    setSelectedAssignment={setSelectedAssignment}
                userProfile={userProfile}
                    allAssignments={allAssignments}
            />
            )}

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ödevi Silmek Üzeresiniz</AlertDialogTitle>
                        <AlertDialogDescription>
                            "{assignmentToDelete?.title}" başlıklı ödevi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Sil</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
