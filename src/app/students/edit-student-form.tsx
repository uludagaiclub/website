
'use client';

import { useState, useEffect } from 'react';
import type { UserProfile, UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ROLE_DISPLAY_NAMES, USER_ROLES } from '@/lib/roles';

type ClassroomLevel = 'new-signup' | 'junior' | 'junior-plus' | 'mid' | 'mid-plus' | 'senior';
const CLASSROOM_LEVELS: ClassroomLevel[] = ['new-signup', 'junior', 'junior-plus', 'mid', 'mid-plus', 'senior'];
const weekScores = ['week1Score', 'week2Score', 'week3Score', 'week4Score', 'week5Score', 'week6Score'] as const;
const workshops = ['workshop1', 'workshop2', 'workshop3', 'workshop4'] as const;

interface EditStudentFormProps {
  readonly isOpen: boolean;
  readonly setIsOpen: (open: boolean) => void;
  readonly student: UserProfile;
  readonly onSave: (updatedData: Partial<UserProfile>) => Promise<void>;
}

export function EditStudentForm({ isOpen, setIsOpen, student, onSave }: Readonly<EditStudentFormProps>) {
    const [formData, setFormData] = useState<Partial<UserProfile>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (student) {
            // Populate form only when the student prop changes
            setFormData({
                role: student.role,
                classroom: student.classroom,
                week1Score: student.week1Score,
                week2Score: student.week2Score,
                week3Score: student.week3Score,
                week4Score: student.week4Score,
                week5Score: student.week5Score,
                week6Score: student.week6Score,
                workshop1: student.workshop1,
                workshop2: student.workshop2,
                workshop3: student.workshop3,
                workshop4: student.workshop4,
            });
        }
    }, [student]);

    const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof UserProfile) => {
        const value = e.target.value;
        // Use null for empty values to prevent Firestore 'undefined' error
        setFormData(prev => ({ ...prev, [field]: value === '' ? null : Number(value) }));
    };

    const handleWorkshopChange = (checked: boolean, field: keyof UserProfile) => {
        setFormData(prev => ({ ...prev, [field]: checked ? 'Katıldı' : '-' }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        // Filter out any undefined values before saving to Firestore
        const cleanFormData = Object.entries(formData).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key as keyof UserProfile] = value;
            }
            return acc;
        }, {} as Partial<UserProfile>);
        
        await onSave(cleanFormData);
        setIsSubmitting(false);
    };

    if (!student) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Öğrenci Bilgilerini Düzenle</DialogTitle>
                    <DialogDescription>
                        {student.displayName} adlı öğrencinin bilgilerini güncelleyin.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    {/* Role Selection */}
                    <div className="grid gap-2">
                        <Label htmlFor="role" className="font-semibold">
                            Rol
                        </Label>
                        <Select
                            value={formData.role}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as UserRole }))}
                        >
                            <SelectTrigger id="role">
                                <SelectValue placeholder="Rol seçin" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={USER_ROLES.STUDENT}>
                                    {ROLE_DISPLAY_NAMES[USER_ROLES.STUDENT]}
                                </SelectItem>
                                <SelectItem value={USER_ROLES.TEAM_CAPTAIN}>
                                    {ROLE_DISPLAY_NAMES[USER_ROLES.TEAM_CAPTAIN]}
                                </SelectItem>
                                <SelectItem value={USER_ROLES.TALOS_TEAM_MEMBER}>
                                    {ROLE_DISPLAY_NAMES[USER_ROLES.TALOS_TEAM_MEMBER]}
                                </SelectItem>
                                <SelectItem value={USER_ROLES.MEVZU_TEAM_MEMBER}>
                                    {ROLE_DISPLAY_NAMES[USER_ROLES.MEVZU_TEAM_MEMBER]}
                                </SelectItem>
                                <SelectItem value={USER_ROLES.HAVA_SAVUNMA_TEAM_MEMBER}>
                                    {ROLE_DISPLAY_NAMES[USER_ROLES.HAVA_SAVUNMA_TEAM_MEMBER]}
                                </SelectItem>
                                <SelectItem value={USER_ROLES.AITOLIA_TEAM_MEMBER}>
                                    {ROLE_DISPLAY_NAMES[USER_ROLES.AITOLIA_TEAM_MEMBER]}
                                </SelectItem>
                                <SelectItem value={USER_ROLES.EGITIMDE_YAPAY_ZEKA_TEAM_MEMBER}>
                                    {ROLE_DISPLAY_NAMES[USER_ROLES.EGITIMDE_YAPAY_ZEKA_TEAM_MEMBER]}
                                </SelectItem>
                                <SelectItem value={USER_ROLES.HERDAI_TEAM_MEMBER}>
                                    {ROLE_DISPLAY_NAMES[USER_ROLES.HERDAI_TEAM_MEMBER]}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator />

                    {/* Classroom Level */}
                    <div className="grid gap-2">
                        <Label htmlFor="classroom-level" className="font-semibold">
                            Sınıf Seviyesi
                        </Label>
                        <Select
                            value={formData.classroom}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, classroom: value as ClassroomLevel }))}
                        >
                            <SelectTrigger id="classroom-level">
                                <SelectValue placeholder="Sınıf seçin" />
                            </SelectTrigger>
                            <SelectContent>
                                {CLASSROOM_LEVELS.map(level => (
                                    <SelectItem key={level} value={level} className="capitalize">
                                        {level.replace('-', ' ')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator />

                    {/* Weekly Scores */}
                    <div className="grid gap-4">
                        <Label className="font-semibold">Haftalık Puanlar</Label>
                        <div className="grid grid-cols-2 gap-4">
                            {weekScores.map((week, index) => (
                                <div key={week} className="grid gap-2">
                                    <Label htmlFor={`week-${index + 1}`} className="text-sm">Hafta {index + 1}</Label>
                                    <Input
                                        id={`week-${index + 1}`}
                                        type="number"
                                        placeholder="-"
                                        value={formData[week] ?? ''}
                                        onChange={(e) => handleNumericChange(e, week)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <Separator />

                    {/* Workshops */}
                    <div className="grid gap-4">
                        <Label className="font-semibold">Workshop Katılımı</Label>
                        <div className="grid grid-cols-2 gap-4">
                            {workshops.map((shop, index) => (
                                <div key={shop} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`workshop-${index + 1}`}
                                        checked={formData[shop] === 'Katıldı'}
                                        onCheckedChange={(checked) => handleWorkshopChange(!!checked, shop)}
                                    />
                                    <Label htmlFor={`workshop-${index + 1}`} className="text-sm font-normal">
                                        Workshop {index + 1}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>İptal</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isSubmitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
