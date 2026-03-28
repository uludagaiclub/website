'use client';

import { useCallback, useMemo, useState } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Edit, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EditStudentForm } from './edit-student-form';
import { useToast } from '@/lib/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { TeacherChat } from './teacher-chat';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ClassroomFilterValue = 'all' | NonNullable<UserProfile['classroom']>;

const CLASSROOM_FILTERS: { value: ClassroomFilterValue; label: string }[] = [
    { value: 'all', label: 'Tümü' },
    { value: 'new-signup', label: 'Yeni Kayıt' },
    { value: 'junior', label: 'Junior' },
    { value: 'junior-plus', label: 'Junior Plus' },
    { value: 'mid', label: 'Mid' },
    { value: 'mid-plus', label: 'Mid Plus' },
    { value: 'senior', label: 'Senior' }
];

export default function StudentsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<ClassroomFilterValue>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const studentsQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'users'), where('role', '==', 'student')) : null,
        [firestore]
    );
    const { data: students, isLoading } = useCollection<UserProfile>(studentsQuery);

    const handleEditClick = (student: UserProfile) => {
        setSelectedStudent(student);
        setIsFormOpen(true);
    };

    const handleSaveChanges = async (updatedStudent: Partial<UserProfile>) => {
        if (!selectedStudent || !firestore) return;

        const studentRef = doc(firestore, 'users', selectedStudent.id);
        
        // Filter out undefined values before sending to Firestore
        const cleanData = Object.entries(updatedStudent).reduce((acc, [key, value]) => {
          if (value !== undefined) {
            acc[key as keyof UserProfile] = value;
          }
          return acc;
        }, {} as Partial<UserProfile>);


        updateDoc(studentRef, cleanData)
            .then(() => {
                toast({
                    title: 'Öğrenci Güncellendi',
                    description: `${selectedStudent.displayName} adlı öğrencinin bilgileri başarıyla güncellendi.`,
                });
                setIsFormOpen(false);
                setSelectedStudent(null);
            })
            .catch(serverError => {
                const permissionError = new FirestorePermissionError({
                    path: studentRef.path,
                    operation: 'update',
                    requestResourceData: cleanData,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
    };

    const getInitials = (name: string | null | undefined) => {
        if (!name) return 'S';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const weekScores = ['week1Score', 'week2Score', 'week3Score', 'week4Score', 'week5Score', 'week6Score'] as const;
    const workshops = ['workshop1', 'workshop2', 'workshop3', 'workshop4'] as const;

    const skeletonRowCount = 5;
    const skeletonMetricCount = weekScores.length + workshops.length + 1;

    // Generate stable skeleton keys (skeleton rows are static, so stable keys are acceptable)
    const skeletonRowKeys = Array.from({ length: skeletonRowCount }, (_, i) => `students-skeleton-row-${i}`);

    const renderLoadingRows = () =>
        skeletonRowKeys.map((rowKey, rowIdx) => (
            <TableRow key={rowKey}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                                                <div className="space-y-1">
                                                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                                                    <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                {Array.from({ length: skeletonMetricCount }, (_, cellIdx) => (
                    <TableCell key={`${rowKey}-metric-${cellIdx}`} className="text-center">
                        <div className="h-6 w-10 mx-auto bg-muted animate-pulse rounded-full" />
                    </TableCell>
                                        ))}
                                    </TableRow>
        ));

    const getFilteredStudents = useCallback(
        (filter: ClassroomFilterValue) => {
            if (!students) return [];

            const normalizedQuery = searchQuery.trim().toLowerCase();

            return students.filter((student) => {
                const matchesFilter = filter === 'all' ? true : student.classroom === filter;
                if (!matchesFilter) return false;

                if (!normalizedQuery) return true;

                const emailMatch = student.email?.toLowerCase().includes(normalizedQuery);
                const nameMatch = student.displayName?.toLowerCase().includes(normalizedQuery);
                return Boolean(emailMatch || nameMatch);
            });
        },
        [students, searchQuery]
    );

    const totalCounts = useMemo(() => {
        const counts: Record<ClassroomFilterValue, number> = {
            all: students?.length ?? 0,
            'new-signup': 0,
            junior: 0,
            'junior-plus': 0,
            mid: 0,
            'mid-plus': 0,
            senior: 0
        };

        if (!students) {
            return counts;
        }

        students.forEach((student) => {
            const classroom = (student.classroom ?? 'new-signup') as ClassroomFilterValue;
            if (counts[classroom] !== undefined) {
                counts[classroom] += 1;
            }
            counts.all += 1;
        });

        return counts;
    }, [students]);

    const handleEmailStudent = (student: UserProfile) => {
        if (!student.email) return;

        const subject = encodeURIComponent(`${student.displayName ?? 'Uludağ AI Club Öğrencisi'} hakkında`);
        const mailtoUrl = `mailto:${student.email}?subject=${subject}`;
        window.open(mailtoUrl, '_blank', 'noopener,noreferrer');
    };

    const renderStudentRows = (studentList: UserProfile[]) =>
        studentList.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={student.photoURL ?? ''} alt={student.displayName ?? ''} />
                                                    <AvatarFallback>{getInitials(student.displayName)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">{student.displayName}</div>
                                                    <div className="text-sm text-muted-foreground">{student.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">{student.classroom?.replace('-', ' ')}</Badge>
                                        </TableCell>
                {weekScores.map((week) => (
                    <TableCell key={week} className="text-center">
                                                <Badge variant={student[week] ? 'default' : 'secondary'}>
                                                    {student[week] ?? 'N/A'}
                                                </Badge>
                                            </TableCell>
                                        ))}
                {workshops.map((shop) => (
                    <TableCell key={shop} className="text-center">
                                                {student[shop] && student[shop] !== '-' ? (
                                                    <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                                                ) : (
                                                    <Clock className="h-5 w-5 text-slate-400 mx-auto" />
                                                )}
                                            </TableCell>
                                        ))}
                                        <TableCell className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                disabled={!student.email}
                                                onClick={() => handleEmailStudent(student)}
                                                aria-label="E-posta gönder"
                                            >
                                                <Mail className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(student)} aria-label="Öğrenciyi düzenle">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
        ));

    const renderTableBody = (filter: ClassroomFilterValue) => {
        if (isLoading) {
            return renderLoadingRows();
        }

        const filteredStudents = getFilteredStudents(filter);

        if (filteredStudents.length > 0) {
            return renderStudentRows(filteredStudents);
        }

        return (
                                <TableRow>
                                    <TableCell colSpan={13} className="h-24 text-center">
                                        Kayıtlı öğrenci bulunamadı.
                                    </TableCell>
                                </TableRow>
        );
    };

    return (
        <div className="space-y-8">
            <TeacherChat />

            <Card>
                <CardHeader>
                    <CardTitle>Öğrenci Listesi</CardTitle>
                    <CardDescription>Tüm öğrencilerin haftalık puanlarını ve workshop katılımlarını görüntüleyin.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={selectedLevel} onValueChange={(value) => setSelectedLevel(value as ClassroomFilterValue)} className="space-y-6">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <TabsList className="flex flex-wrap gap-2">
                                {CLASSROOM_FILTERS.map((filter) => (
                                    <TabsTrigger key={filter.value} value={filter.value} className="px-4">
                                        {filter.label}
                                        <span className="ml-1 text-xs text-muted-foreground">({totalCounts[filter.value] ?? 0})</span>
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            <Input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="E-posta veya isim ile ara..."
                                className="max-w-xs"
                                aria-label="Öğrencileri e-posta veya isim ile ara"
                            />
                        </div>
                        {CLASSROOM_FILTERS.map((filter) => (
                            <TabsContent key={filter.value} value={filter.value}>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Öğrenci</TableHead>
                                            <TableHead>Sınıf</TableHead>
                                            {weekScores.map((week, index) => (
                                                <TableHead key={week} className="text-center">Hafta {index + 1}</TableHead>
                                            ))}
                                            {workshops.map((shop, index) => (
                                                <TableHead key={shop} className="text-center">WS {index + 1}</TableHead>
                                            ))}
                                            <TableHead className="text-right">İşlemler</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {renderTableBody(filter.value)}
                                    </TableBody>
                                </Table>
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>

            {selectedStudent && (
                <EditStudentForm
                    isOpen={isFormOpen}
                    setIsOpen={setIsFormOpen}
                    student={selectedStudent}
                    onSave={handleSaveChanges}
                />
            )}
        </div>
    );
}
