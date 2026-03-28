/**
 * AssignmentForm Component
 * SECURITY: Teacher-only form for creating/editing assignments with file validation
 */

'use client'

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileText, Trash2 } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, doc, Timestamp, addDoc, setDoc, serverTimestamp, Firestore } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, getStorage, UploadMetadata } from "firebase/storage";
import { format } from 'date-fns';
import { useToast } from "@/lib/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { Assignment, UserProfile } from "@/types";
import {
    MAX_FILE_SIZE,
    MAX_FILE_SIZE_MB,
    CLASSROOM_LEVELS,
    ALLOWED_CSV_MIME_TYPES,
    type ClassroomLevel,
    sanitizeFilename,
    hasDoubleExtension,
    isValidMimeType,
    isExtensionMatchingMimeType,
    validateFileHeader,
    isAdvancedClassroom,
    createEmptyFormState,
    resolveContentType,
    validateIpynbFile
} from '../utils/assignment-utils';

// ============================================================================
// TYPES
// ============================================================================

type ValidationError = { title: string; description: string };

type ValidationSuccess = {
    dueDate: Date;
    weekNum?: number;
    pointsNum: number;
    lateDueDateTimestamp: Timestamp | null;
};

type ValidationResponse =
    | { ok: true; data: ValidationSuccess }
    | { ok: false; error: ValidationError };

interface AssignmentFormProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    selectedAssignment: Assignment | null;
    setSelectedAssignment: (assignment: Assignment | null) => void;
    userProfile: UserProfile | null;
    allAssignments: Assignment[] | null;
}

// ============================================================================
// SECURITY: VALIDATION HELPERS
// ============================================================================

const showValidationError = (toast: any, error: ValidationError | null): boolean => {
    if (!error) return false;
    toast({ ...error, variant: "destructive" });
    return true;
};

/**
 * SECURITY: Ensure only teachers can create assignments
 */
const validateTeacherAccess = (canTeacherManage: boolean): ValidationError | null => {
    if (!canTeacherManage) {
        return {
            title: "Yetki Hatası",
            description: "Yalnızca öğretmenler ödev oluşturabilir."
        };
    }
    return null;
};

const validateTitleAndDescription = (data: any): ValidationError | null => {
    if (data.title && data.description) return null;
    return {
        title: "Eksik Bilgi",
        description: "Başlık ve açıklama zorunludur."
    };
};

const validateClassroomLevel = (classroomLevels: ClassroomLevel[]): ValidationError | null => {
    if (classroomLevels && classroomLevels.length > 0) return null;
    return {
        title: "Hedef Sınıf Seçin",
        description: "En az bir sınıf seviyesi seçmelisiniz."
    };
};

const ensurePrimaryFileRequirement = ({
    newPrimaryFiles,
    existingPrimaryFiles,
    removedExistingFlags
}: {
    newPrimaryFiles: File[];
    existingPrimaryFiles: Array<{ url: string | null; name: string | null } | null>;
    removedExistingFlags: Array<boolean>;
}): ValidationError | null => {
    const existingCount = existingPrimaryFiles.reduce((count, fileMetadata, index) => {
        if (!fileMetadata || removedExistingFlags[index]) {
            return count;
        }
        return fileMetadata.url ? count + 1 : count;
    }, 0);

    const newCount = newPrimaryFiles.filter((file) => !!file).length;

    if (existingCount + newCount === 0) {
        return {
            title: "Dosya Zorunlu",
            description: "En az bir .ipynb dosyası yüklemeniz gerekir."
        };
    }

    return null;
};

const parseDueDate = (dueDateStr: string): { value?: Date; error?: ValidationError } => {
    if (!dueDateStr) {
        return {
            error: {
                title: "Eksik Teslim Tarihi",
                description: "Teslim tarihini seçmelisiniz."
            }
        };
    }
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(0, 0, 0, 0);
    if (Number.isNaN(dueDate.getTime())) {
        return {
            error: {
                title: "Geçersiz Tarih",
                description: "Teslim tarihi geçersiz."
            }
        };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate < today) {
        return {
            error: {
                title: "Geçersiz Tarih",
                description: "Teslim tarihi bugünden önce olamaz."
            }
        };
    }
    return { value: dueDate };
};

const parseWeekNumber = (week: string): { value?: number; error?: ValidationError } => {
    if (!week) return { value: undefined };
    const parsed = parseInt(week, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 6) {
        return {
            error: {
                title: "Geçersiz Hafta",
                description: "Hafta değeri 1 ile 6 arasında olmalıdır."
            }
        };
    }
    return { value: parsed };
};

const parsePointsValue = (points: string): { value: number; error?: ValidationError } => {
    if (!points?.trim()) {
        return { value: 0 };
    }
    const parsed = parseInt(points, 10);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
        return {
            value: 0,
            error: {
                title: "Geçersiz Puan",
                description: "Puan değeri 0 ile 100 arasında olmalıdır."
            }
        };
    }
    return { value: parsed };
};

/**
 * SECURITY: Prevent weekly points from exceeding 100
 */
const validateWeeklyPointsLimit = ({
    assignments,
    classroomLevels,
    weekNum,
    pointsNum,
    selectedAssignmentId
}: {
    assignments: Assignment[] | null;
    classroomLevels: ClassroomLevel[];
    weekNum?: number;
    pointsNum: number;
    selectedAssignmentId?: string;
}): ValidationError | null => {
    if (!assignments || !classroomLevels || classroomLevels.length === 0 || typeof weekNum !== 'number' || pointsNum <= 0) {
        return null;
    }
    // Her seviye için kontrol yap
    for (const classroomLevel of classroomLevels) {
        const existingAssignments = assignments.filter((assignment) => {
            if (selectedAssignmentId && assignment.id === selectedAssignmentId) {
                return false;
            }
            return assignment.week === weekNum && assignment.classroomLevels?.includes(classroomLevel);
        });
        const existingTotalPoints = existingAssignments.reduce((sum, assignment) => sum + (assignment.points ?? 0), 0);
        const newTotalPoints = existingTotalPoints + pointsNum;
        if (newTotalPoints > 100) {
            const remainingPoints = 100 - existingTotalPoints;
            return {
                title: "Puan Limiti Aşıldı",
                description: `${classroomLevel.replace('-', ' ')} seviyesi için bu hafta toplam puan 100'ü geçemez. Mevcut toplam: ${existingTotalPoints} puan. En fazla ${remainingPoints} puan ekleyebilirsiniz.`
            };
        }
    }
    return null;
};

const computeLateDueDateTimestamp = (
    lateDueDateStr: string,
    dueDate: Date
): { value: Timestamp | null; error?: ValidationError } => {
    if (!lateDueDateStr) {
        return { value: null };
    }
    const lateDate = new Date(lateDueDateStr);
    lateDate.setHours(0, 0, 0, 0);
    if (lateDate < dueDate) {
        return {
            value: null,
            error: {
                title: "Geç Teslim Tarihi Geçersiz",
                description: "Geç teslim tarihi, normal teslim tarihinden önce olamaz."
            }
        };
    }
    return { value: Timestamp.fromDate(lateDate) };
};

// ============================================================================
// SECURITY: FILE UPLOAD HELPERS
// ============================================================================

/**
 * SECURITY: Upload primary assignment file with validation and metadata
 */
const uploadPrimaryFile = async ({
    primaryFile,
    classroomLevel,
    weekNum,
    userId,
    existingFile,
    fileIndex
}: {
    primaryFile: File | null;
    classroomLevel: ClassroomLevel | null;
    weekNum?: number;
    userId: string;
    existingFile?: { url?: string | null; name?: string | null };
    fileIndex?: number;
}) => {
    if (!primaryFile) {
        return {
            fileUrl: existingFile?.url ?? '',
            fileName: existingFile?.name ?? ''
        };
    }
    const storage = getStorage();
    const classroomSlug = classroomLevel ?? 'unknown';
    const weekStr = typeof weekNum === 'number' ? weekNum.toString() : 'x';
    const fileExtension = primaryFile.name.split('.').pop()?.toLowerCase() ?? 'ipynb';
    const suffix = fileIndex !== undefined && fileIndex > 0 ? `_${fileIndex + 1}` : '';
    const descriptiveFilename = sanitizeFilename(`${classroomSlug}_${weekStr}_hafta${suffix}.${fileExtension}`);
    const fileRef = ref(storage, `assignments/${userId}/${descriptiveFilename}`);
    const metadata: UploadMetadata = {
        contentType: resolveContentType(primaryFile.type, fileExtension),
        customMetadata: {
            originalFileName: primaryFile.name,
            classroomLevel: classroomSlug,
            week: weekStr
        }
    };
    await uploadBytes(fileRef, primaryFile, metadata);
    const fileUrl = await getDownloadURL(fileRef);
    return { fileUrl, fileName: descriptiveFilename };
};

const assertExtension = (name: string, allowedExtensions: string[], errorMessage: string) => {
    if (!allowedExtensions.some((ext) => name.endsWith(ext))) {
        throw new Error(errorMessage);
    }
};

const validateFileSize = (size: number) => {
    if (size > MAX_FILE_SIZE) {
        throw new Error(`Dosya boyutu ${MAX_FILE_SIZE_MB}MB'dan küçük olmalıdır.`);
    }
};

const validateMimeTypeAgainstList = (
    mimeType: string | undefined,
    allowed: string[],
    errorMessage: string
) => {
    if (mimeType && mimeType.trim() !== '' && !allowed.includes(mimeType)) {
        throw new Error(errorMessage);
    }
};

/**
 * SECURITY: Validate resource file (CSV only for all classrooms)
 */
const validateResourceFile = (resource: File) => {
    const lowerName = resource.name.toLowerCase();
    assertExtension(lowerName, ['.csv'], 'Yalnızca .csv uzantılı dosyalar kabul edilir.');
    if (hasDoubleExtension(lowerName)) {
        throw new Error("Çoklu uzantılı dosyalar güvenlik nedeniyle kabul edilmez.");
    }
    validateFileSize(resource.size);
    const parts = lowerName.split('.');
    if (parts.length !== 2 || parts[1] !== 'csv') {
        throw new Error("Sadece .csv uzantılı dosyalar kabul edilir.");
    }
    validateMimeTypeAgainstList(
        resource.type,
        ALLOWED_CSV_MIME_TYPES,
        "Dosya tipi CSV ile eşleşmiyor."
    );
};

const validateResourceFileForClassroom = (classroom: ClassroomLevel, resource: File) => {
    if (!classroom) {
        throw new Error("Önce bir sınıf seviyesi seçmelisiniz.");
    }
    validateResourceFile(resource);
};

/**
 * SECURITY: Upload resource file (CSV only) with validation
 */
const uploadResourceFile = async ({
    resource,
    resourceRemovedFlag,
    classroomLevel,
    weekNum,
    userId,
    existingResource,
    fileIndex
}: {
    resource: File | null;
    resourceRemovedFlag: boolean;
    classroomLevel: ClassroomLevel | null;
    weekNum?: number;
    userId: string;
    existingResource?: { url?: string | null; name?: string | null };
    fileIndex?: number;
}) => {
    if (!resource) {
        if (resourceRemovedFlag) {
            return { resourceFileUrl: '', resourceFileName: '' };
        }
        return {
            resourceFileUrl: existingResource?.url ?? '',
            resourceFileName: existingResource?.name ?? ''
        };
    }

    if (!classroomLevel) {
        throw new Error("Önce bir sınıf seviyesi seçmelisiniz.");
    }

    validateResourceFileForClassroom(classroomLevel, resource);

    const storage = getStorage();
    const classroomSlug = classroomLevel ?? 'unknown';
    const weekStr = typeof weekNum === 'number' ? weekNum.toString() : 'x';
    const resourceExtension = resource.name.split('.').pop()?.toLowerCase() ?? 'dat';
    const suffix = fileIndex !== undefined && fileIndex > 0 ? `_${fileIndex + 1}` : '';
    const descriptiveResourceFilename = sanitizeFilename(`${classroomSlug}_${weekStr}_hafta${suffix}.${resourceExtension}`);
    const resourceRef = ref(storage, `assignments/${userId}/resources/${descriptiveResourceFilename}`);
    const metadata: UploadMetadata = {
        contentType: resolveContentType(resource.type, resourceExtension),
        customMetadata: {
            originalFileName: resource.name,
            classroomLevel: classroomSlug,
            week: weekStr
        }
    };

    if (process.env.NODE_ENV === 'development') {
        console.log('Uploading resource file:', {
            fileName: descriptiveResourceFilename,
            contentType: metadata.contentType,
            fileSize: resource.size,
            teacherId: userId,
            path: `assignments/${userId}/resources/${descriptiveResourceFilename}`
        });
    }

    try {
        await uploadBytes(resourceRef, resource, metadata);
        const resourceFileUrl = await getDownloadURL(resourceRef);
        return {
            resourceFileUrl,
            resourceFileName: descriptiveResourceFilename
        };
    } catch (uploadError: any) {
        if (uploadError?.code === 'storage/unauthorized') {
            throw new Error('CSV dosyası yüklenirken izin hatası oluştu. Lütfen tekrar deneyin veya yöneticiye başvurun.');
        }
        if (uploadError?.code === 'storage/quota-exceeded') {
            throw new Error('Depolama kotası aşıldı. Lütfen daha küçük bir dosya yükleyin.');
        }
        throw new Error(`CSV dosyası yüklenirken hata oluştu: ${uploadError?.message ?? 'Bilinmeyen hata'}`);
    }
};

const buildAssignmentPayload = ({
    data,
    dueDate,
    weekNum,
    pointsNum,
    lateDueDate,
    primaryFile1,
    primaryFile2,
    resourceFileData1,
    resourceFileData2,
    profile,
    existingAssignment
}: {
    data: any;
    dueDate: Date;
    weekNum?: number;
    pointsNum: number;
    lateDueDate: Timestamp | null;
    primaryFile1: { fileUrl: string; fileName: string };
    primaryFile2: { fileUrl: string; fileName: string };
    resourceFileData1: { resourceFileUrl: string; resourceFileName: string };
    resourceFileData2: { resourceFileUrl: string; resourceFileName: string };
    profile: UserProfile;
    existingAssignment: Assignment | null;
}) => ({
    title: data.title,
    description: data.description,
    dueDate: Timestamp.fromDate(dueDate),
    lateDueDate,
    week: typeof weekNum === 'number' ? weekNum : null,
    classroomLevels: data.classroomLevels && data.classroomLevels.length > 0 ? data.classroomLevels : [],
    points: data.points && data.points.trim() !== '' ? pointsNum : null,
    fileURL: data.isWorkshop ? null : (primaryFile1.fileUrl || null),
    fileName: data.isWorkshop ? null : (primaryFile1.fileName || null),
    fileURL2: data.isWorkshop ? null : (primaryFile2.fileUrl || null),
    fileName2: data.isWorkshop ? null : (primaryFile2.fileName || null),
    resourceFileURL: data.isWorkshop ? null : (resourceFileData1.resourceFileUrl || null),
    resourceFileName: data.isWorkshop ? null : (resourceFileData1.resourceFileName || null),
    resourceFileURL2: data.isWorkshop ? null : (resourceFileData2.resourceFileUrl || null),
    resourceFileName2: data.isWorkshop ? null : (resourceFileData2.resourceFileName || null),
    authorName: profile.displayName ?? 'Öğretmen',
    createdAt: existingAssignment ? existingAssignment.createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
    isWorkshop: data.isWorkshop ?? false,
    workshopTime: data.isWorkshop ? (data.workshopTime ?? null) : null,
    allowSubmissions: data.allowSubmissions ?? true // Default true
});

const persistAssignment = async ({
    firestoreInstance,
    payload,
    existingAssignment
}: {
    firestoreInstance: Firestore;
    payload: any;
    existingAssignment: Assignment | null;
}) => {
    if (existingAssignment) {
        await setDoc(doc(firestoreInstance, 'assignments', existingAssignment.id), payload);
        return 'updated' as const;
    }
    await addDoc(collection(firestoreInstance, 'assignments'), payload);
    return 'created' as const;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AssignmentForm({
    isOpen,
    setIsOpen,
    selectedAssignment,
    setSelectedAssignment,
    userProfile,
    allAssignments
}: Readonly<AssignmentFormProps>) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState(createEmptyFormState());
    const [primaryFiles, setPrimaryFiles] = useState<File[]>([]);
    const [resourceFiles, setResourceFiles] = useState<File[]>([]);
    const [removedExistingPrimary, setRemovedExistingPrimary] = useState<Array<boolean>>([false, false]);
    const [removedExistingResource, setRemovedExistingResource] = useState<Array<boolean>>([false, false]);
    
    // Single file states for backward compatibility
    const [file, setFile] = useState<File | null>(null);
    const [resourceFile, setResourceFile] = useState<File | null>(null);
    const [resourceRemoved, setResourceRemoved] = useState(false);
    const resourceFileInputRef = useRef<HTMLInputElement>(null);
    
    // SECURITY: Only teachers can manage assignments
    const canManage = userProfile?.role?.trim().toLowerCase() === 'teacher';

    const existingPrimaryFiles = useMemo(
        () => [
            selectedAssignment?.fileURL
                ? { url: selectedAssignment.fileURL, name: selectedAssignment.fileName ?? null }
                : null,
            selectedAssignment?.fileURL2
                ? { url: selectedAssignment.fileURL2, name: selectedAssignment.fileName2 ?? null }
                : null
        ],
        [selectedAssignment]
    );

    useEffect(() => {
        if (selectedAssignment) {
            setFormData({
                title: selectedAssignment.title,
                description: selectedAssignment.description,
                dueDate: selectedAssignment.dueDate ? format(selectedAssignment.dueDate.toDate(), 'yyyy-MM-dd') : '',
                lateDueDate: selectedAssignment.lateDueDate ? format(selectedAssignment.lateDueDate.toDate(), 'yyyy-MM-dd') : '',
                week: (selectedAssignment.week ?? '').toString(),
                classroomLevels: selectedAssignment.classroomLevels && selectedAssignment.classroomLevels.length > 0
                    ? selectedAssignment.classroomLevels
                    : [],
                points: selectedAssignment.points?.toString() ?? '',
                isWorkshop: selectedAssignment.isWorkshop ?? false,
                workshopTime: selectedAssignment.workshopTime ?? '',
                allowSubmissions: selectedAssignment.allowSubmissions ?? true
            });
        } else {
            setFormData(createEmptyFormState());
        }
        setPrimaryFiles([]);
        setResourceFiles([]);
        setRemovedExistingPrimary([false, false]);
        setRemovedExistingResource([false, false]);
        setFile(null);
        setResourceFile(null);
        setResourceRemoved(false);
    }, [selectedAssignment]);

    const resetFormState = () => {
        setIsOpen(false);
        setSelectedAssignment(null);
        setFormData(createEmptyFormState());
        setPrimaryFiles([]);
        setResourceFiles([]);
        setRemovedExistingPrimary([false, false]);
        setRemovedExistingResource([false, false]);
        setFile(null);
        setResourceFile(null);
        setResourceRemoved(false);
    };

    /**
     * Helper: Validate preliminary form fields
     */
    const validatePreliminaryFields = (): ValidationError | null => {
        const teacherError = validateTeacherAccess(canManage);
        if (teacherError) return teacherError;

        const titleError = validateTitleAndDescription(formData);
        if (titleError) return titleError;

        return null;
    };

    /**
     * Helper: Validate and parse core form fields
     * Returns error message or parsed data
     */
    const validateCoreFields = (): { error: ValidationError } | { data: { dueDate: Date; weekNum: number; pointsNum: number } } => {
        const dueDateResult = parseDueDate(formData.dueDate);
        if (dueDateResult.error) {
            return { error: dueDateResult.error };
        }
        const dueDate = dueDateResult.value!;

        const classroomError = validateClassroomLevel(formData.classroomLevels);
        if (classroomError) {
            return { error: classroomError };
        }

        const weekResult = parseWeekNumber(formData.week);
        if (weekResult.error) {
            return { error: weekResult.error };
        }
        const weekNum = weekResult.value!;

        const pointsResult = parsePointsValue(formData.points);
        if (pointsResult.error) {
            return { error: pointsResult.error };
        }
        const pointsNum = pointsResult.value;

        return { data: { dueDate, weekNum, pointsNum } };
    };

    /**
     * Helper: Validate file and weekly limits
     */
    const validateFileAndLimits = (
        weekNum: number,
        pointsNum: number
    ): ValidationError | null => {
        // Workshop modunda dosya ve puan validasyonu yapılmaz
        if (formData.isWorkshop) {
            return null;
        }

        const primaryFileError = ensurePrimaryFileRequirement({
            newPrimaryFiles: primaryFiles,
            existingPrimaryFiles,
            removedExistingFlags: removedExistingPrimary
        });
        if (primaryFileError) return primaryFileError;

        const weeklyLimitError = validateWeeklyPointsLimit({
            assignments: allAssignments,
            classroomLevels: formData.classroomLevels,
            weekNum,
            pointsNum,
            selectedAssignmentId: selectedAssignment?.id
        });
        if (weeklyLimitError) return weeklyLimitError;

        return null;
    };

    const validateFormBeforeSubmit = (): ValidationResponse => {
        const preliminaryError = validatePreliminaryFields();
        if (preliminaryError) {
            return { ok: false, error: preliminaryError };
        }

        // Workshop modunda saat zorunlu
        if (formData.isWorkshop && !formData.workshopTime) {
            return {
                ok: false,
                error: {
                    title: "Eksik Bilgi",
                    description: "Workshop saati zorunludur."
                }
            };
        }

        const coreFieldsResult = validateCoreFields();
        if ('error' in coreFieldsResult) {
            return { ok: false, error: coreFieldsResult.error };
        }

        const { dueDate, weekNum, pointsNum } = coreFieldsResult.data;

        const fileAndLimitError = validateFileAndLimits(weekNum, pointsNum);
        if (fileAndLimitError) {
            return { ok: false, error: fileAndLimitError };
        }

        const lateDueDateResult = computeLateDueDateTimestamp(formData.lateDueDate, dueDate);
        if (lateDueDateResult.error) {
            return { ok: false, error: lateDueDateResult.error };
        }

        return {
            ok: true,
            data: {
                dueDate,
                weekNum,
                pointsNum,
                lateDueDateTimestamp: lateDueDateResult.value ?? null
            }
        };
    };

    const getFirstClassroomLevel = (): ClassroomLevel | null => {
        return formData.classroomLevels && formData.classroomLevels.length > 0 
            ? formData.classroomLevels[0] 
            : null;
    };

    const getExistingPrimaryFile = (index: number) => {
        if (removedExistingPrimary[index]) {
            return null;
        }
        if (index === 0) {
            return {
                url: selectedAssignment?.fileURL,
                name: selectedAssignment?.fileName
            };
        }
        return {
            url: selectedAssignment?.fileURL2,
            name: selectedAssignment?.fileName2
        };
    };

    const getExistingResourceFile = (index: number) => {
        if (removedExistingResource[index]) {
            return null;
        }
        if (index === 0) {
            return {
                url: selectedAssignment?.resourceFileURL,
                name: selectedAssignment?.resourceFileName
            };
        }
        return {
            url: selectedAssignment?.resourceFileURL2,
            name: selectedAssignment?.resourceFileName2
        };
    };

    const uploadAllFiles = async (weekNum: number | undefined): Promise<{
        primaryFile1: { fileUrl: string; fileName: string };
        primaryFile2: { fileUrl: string; fileName: string };
        resourceFileData1: { resourceFileUrl: string; resourceFileName: string };
        resourceFileData2: { resourceFileUrl: string; resourceFileName: string };
    }> => {
        if (formData.isWorkshop) {
            return {
                primaryFile1: { fileUrl: '', fileName: '' },
                primaryFile2: { fileUrl: '', fileName: '' },
                resourceFileData1: { resourceFileUrl: '', resourceFileName: '' },
                resourceFileData2: { resourceFileUrl: '', resourceFileName: '' }
            };
        }

        const firstClassroomLevel = getFirstClassroomLevel();
        const userId = user!.uid;

        const [primaryFile1, primaryFile2, resourceFileData1, resourceFileData2] = await Promise.all([
            uploadPrimaryFile({
                    primaryFile: primaryFiles[0] ?? file ?? null,
                    classroomLevel: firstClassroomLevel,
                    weekNum,
                userId,
                existingFile: getExistingPrimaryFile(0),
                    fileIndex: 0
            }),
            uploadPrimaryFile({
                    primaryFile: primaryFiles[1] ?? null,
                    classroomLevel: firstClassroomLevel,
                    weekNum,
                userId,
                existingFile: getExistingPrimaryFile(1),
                    fileIndex: 1
            }),
            uploadResourceFile({
                    resource: resourceFiles[0] ?? resourceFile ?? null,
                resourceRemovedFlag: resourceRemoved ?? removedExistingResource[0] ?? false,
                    classroomLevel: firstClassroomLevel,
                    weekNum,
                userId,
                existingResource: getExistingResourceFile(0),
                    fileIndex: 0
            }),
            uploadResourceFile({
                    resource: resourceFiles[1] ?? null,
                    resourceRemovedFlag: removedExistingResource[1],
                    classroomLevel: firstClassroomLevel,
                    weekNum,
                userId,
                existingResource: getExistingResourceFile(1),
                    fileIndex: 1
            })
        ]);

        return { primaryFile1, primaryFile2, resourceFileData1, resourceFileData2 };
    };

    const handleSubmissionSuccess = (isUpdated: boolean) => {
        toast({
            title: isUpdated ? "Ödev Güncellendi!" : "Ödev Oluşturuldu!",
            description: isUpdated ? "Ödev başarıyla güncellendi." : "Yeni ödev başarıyla oluşturuldu."
        });
        resetFormState();
    };

    const handleSubmissionError = (error: unknown) => {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error saving assignment:', error);
        }
        toast({
            title: "Hata!",
            description: error instanceof Error ? error.message : "Ödev kaydedilirken bir hata oluştu.",
            variant: "destructive"
        });
    };

    const handleSubmit = async () => {
        if (!firestore || !user || !userProfile) return;
        
        const validation = validateFormBeforeSubmit();
        if (!validation.ok) {
            showValidationError(toast, validation.error);
            return;
        }

        const { dueDate, weekNum, pointsNum, lateDueDateTimestamp } = validation.data;

        setIsSubmitting(true);
        try {
            const { primaryFile1, primaryFile2, resourceFileData1, resourceFileData2 } = await uploadAllFiles(weekNum);

            const assignmentPayload = buildAssignmentPayload({
                data: formData,
                dueDate,
                weekNum,
                pointsNum,
                lateDueDate: lateDueDateTimestamp,
                primaryFile1,
                primaryFile2,
                resourceFileData1,
                resourceFileData2,
                profile: userProfile,
                existingAssignment: selectedAssignment
            });

            const result = await persistAssignment({
                firestoreInstance: firestore,
                payload: assignmentPayload,
                existingAssignment: selectedAssignment
            });

            handleSubmissionSuccess(result === 'updated');
        } catch (error) {
            handleSubmissionError(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResourceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files ?? []);
        if (selectedFiles.length === 0) {
            setResourceFile(null);
            setResourceFiles([]);
            setResourceRemoved(false);
            return;
        }

        // En fazla 2 dosya
        if (selectedFiles.length > 2) {
            toast({
                title: "Çok Fazla Dosya",
                description: "En fazla 2 CSV dosyası seçebilirsiniz.",
                variant: "destructive"
            });
            e.target.value = '';
            return;
        }

        const firstClassroom = formData.classroomLevels && formData.classroomLevels.length > 0 
            ? formData.classroomLevels[0] 
            : null;
        if (!firstClassroom) {
            toast({
                title: "Dosya Hatası!",
                description: "Önce en az bir sınıf seviyesi seçmelisiniz.",
                variant: "destructive"
            });
            setResourceFile(null);
            setResourceFiles([]);
            e.target.value = '';
            return;
        }

        try {
            const validFiles: File[] = [];
            for (const selectedFile of selectedFiles) {
                validateResourceFileForClassroom(firstClassroom, selectedFile);
                validFiles.push(selectedFile);
            }

            if (validFiles.length === 1) {
                setResourceFile(validFiles[0]);
                setResourceFiles([]);
                setResourceRemoved(false);
                toast({ title: 'CSV Dosyası Seçildi', description: `${validFiles[0].name} yüklenecek.` });
            } else {
                setResourceFile(null);
                setResourceFiles(validFiles);
                setResourceRemoved(false);
                toast({
                    title: 'CSV Dosyaları Seçildi',
                    description: `${validFiles.length} CSV dosyası seçildi: ${validFiles.map(f => f.name).join(', ')}`
                });
            }
        } catch (error: any) {
            toast({ title: "Dosya Hatası!", description: error.message, variant: "destructive" });
            setResourceFile(null);
            setResourceFiles([]);
            e.target.value = '';
        }
    };

    const handleRemoveResourceFile = () => {
        setResourceFile(null);
        setResourceRemoved(true);
    };

    const validatePrimaryFileBasics = (file: File) => {
        validateFileSize(file.size);
        if (hasDoubleExtension(file.name)) {
            throw new Error("Çoklu uzantılı dosyalar güvenlik nedeniyle kabul edilmez.");
        }
    };

    const resolveClassroomForPrimaryFile = (): ClassroomLevel => {
        const classroom = formData.classroomLevels && formData.classroomLevels.length > 0 
            ? formData.classroomLevels[0] 
            : null;
        if (!classroom) {
            throw new Error("Önce en az bir hedef sınıf seviyesini seçmelisiniz.");
        }
        return classroom;
    };

    const validatePrimaryFileExtension = (fileName: string, classroom: ClassroomLevel) => {
        if (classroom === 'junior') {
            if (!fileName.endsWith('.ipynb') && !fileName.endsWith('.docx') && !fileName.endsWith('.doc')) {
                throw new Error("Junior seviyesi için sadece .ipynb ve .docx dosyaları kabul edilir.");
            }
            return;
        }

        if (isAdvancedClassroom(classroom)) {
            if (!fileName.endsWith('.ipynb')) {
                throw new Error("Bu seviyede ana ödev dosyası olarak yalnızca .ipynb dosyaları kabul edilir.");
            }
        }
    };

    const validatePrimaryFileMimeType = (file: File, fileName: string, classroom: ClassroomLevel) => {
        if (isValidMimeType(file, classroom)) {
            return;
        }

        if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
            throw new Error("Word dosyaları sadece Junior seviyesi için kabul edilir.");
        }
        if (fileName.endsWith('.csv')) {
            throw new Error("CSV dosyaları sadece Junior dışındaki seviyeler için kabul edilir.");
        }
        throw new Error("Sadece .ipynb (tüm seviyeler), .docx (Junior) veya .csv (diğer seviyeler) dosyaları kabul edilir.");
    };

    const validatePrimaryFileContent = async (file: File, fileName: string) => {
        if (!fileName.endsWith('.ipynb')) {
            return;
        }

        const isValidHeader = await validateFileHeader(file);
        if (!isValidHeader) {
            throw new Error("Geçersiz dosya içeriği.");
        }
        await validateIpynbFile(file);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files ?? []);
        if (selectedFiles.length === 0) {
            setFile(null);
            setPrimaryFiles([]);
            return;
        }

        // En fazla 2 dosya
        if (selectedFiles.length > 2) {
            toast({
                title: "Çok Fazla Dosya",
                description: "En fazla 2 dosya seçebilirsiniz.",
                variant: "destructive"
            });
            e.target.value = '';
            return;
        }

        try {
            const classroom = resolveClassroomForPrimaryFile();
            const validFiles: File[] = [];

            for (const selectedFile of selectedFiles) {
                validatePrimaryFileBasics(selectedFile);
                const fileName = selectedFile.name.toLowerCase();

                validatePrimaryFileExtension(fileName, classroom);
                validatePrimaryFileMimeType(selectedFile, fileName, classroom);

                if (!isExtensionMatchingMimeType(selectedFile, classroom)) {
                    throw new Error(`Dosya tipi uzantıyla eşleşmiyor: ${selectedFile.name}`);
                }

                await validatePrimaryFileContent(selectedFile, fileName);
                validFiles.push(selectedFile);
            }

            if (validFiles.length === 1) {
                setFile(validFiles[0]);
                setPrimaryFiles([]);
                toast({ title: "Dosya Geçerli", description: `${validFiles[0].name} yüklenebilir.` });
            } else {
                setFile(null);
                setPrimaryFiles(validFiles);
                toast({
                    title: "Dosyalar Geçerli",
                    description: `${validFiles.length} dosya seçildi: ${validFiles.map(f => f.name).join(', ')}`
                });
            }

        } catch (error: any) {
            toast({ title: "Dosya Doğrulama Hatası!", description: error.message, variant: "destructive" });
            setFile(null);
            setPrimaryFiles([]);
            e.target.value = '';
        }
    };

    /**
     * Helper: Get file accept attribute based on classroom levels
     */
    const getFileAcceptAttribute = (): string => {
        if (!formData.classroomLevels || formData.classroomLevels.length === 0) {
            return '.ipynb,.docx,.doc,.csv';
        }
        // Eğer junior seviyesi varsa, junior kuralları uygulanır
        if (formData.classroomLevels.includes('junior')) {
            return '.ipynb,.docx,.doc';
        }
        // Diğer seviyeler için sadece .ipynb
        return '.ipynb';
    };

    /**
     * Helper: Get file description text based on classroom levels
     */
    const getFileDescriptionText = (): string => {
        if (!formData.classroomLevels || formData.classroomLevels.length === 0) {
            return 'Önce en az bir sınıf seviyesi seçin.';
        }
        // Eğer junior seviyesi varsa, junior kuralları uygulanır
        if (formData.classroomLevels.includes('junior')) {
            return '.ipynb veya .docx (isteğe bağlı) - maksimum 5MB';
        }
        // Diğer seviyeler için .ipynb zorunlu
        return '.ipynb (zorunlu) - maksimum 5MB';
    };

    /**
     * Helper: Get resource file accept attribute (CSV only)
     */
    const getResourceFileAcceptAttribute = (): string => {
        return '.csv';
    };

    /**
     * Helper: Get resource file description text
     */
    const getResourceFileDescriptionText = (): string => {
        if (formData.classroomLevel) {
            return 'Yalnızca .csv dosyaları kabul edilir ve maksimum 5MB olmalıdır.';
        }
        return 'Önce bir sınıf seviyesi seçin.';
    };

    /**
     * Helper: Get submit button text based on state
     */
    const getSubmitButtonText = (): string => {
        if (isSubmitting) {
            return 'Kaydediliyor...';
        }
        if (selectedAssignment) {
            return 'Değişiklikleri Kaydet';
        }
        return formData.isWorkshop ? 'Workshop Oluştur' : 'Ödevi Oluştur';
    };

    /**
     * Helper: Get dialog title based on state
     */
    const getDialogTitle = (): string => {
        if (selectedAssignment) {
            if (selectedAssignment.isWorkshop) {
                return 'Workshop Düzenle';
            }
            return 'Ödevi Düzenle';
        }
        if (formData.isWorkshop) {
            return 'Yeni Workshop Oluştur';
        }
        return 'Yeni Ödev Oluştur';
    };

    /**
     * Helper: Get dialog description based on state
     */
    const getDialogDescription = (): string => {
        if (formData.isWorkshop) {
            return 'Workshop etkinliği için tarih, saat, açıklama ve hedef sınıf bilgilerini girin.';
        }
        if (selectedAssignment) {
            return 'Ödev içeriklerini güncelleyebilir, .ipynb ve .csv dosyalarını yeniden yükleyebilirsiniz.';
        }
        return 'Öğrenciler için yeni bir ödev oluşturun. Ana dosya .ipynb olmalı; isteğe bağlı olarak .csv kaynak dosyası ekleyebilirsiniz.';
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {getDialogTitle()}
                    </DialogTitle>
                    <DialogDescription>
                        {getDialogDescription()}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* Workshop Checkbox */}
                    <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                        <Checkbox
                            id="is-workshop"
                            checked={formData.isWorkshop}
                            onCheckedChange={(checked) => setFormData({ ...formData, isWorkshop: checked === true })}
                        />
                        <Label htmlFor="is-workshop" className="text-sm font-medium cursor-pointer">
                            Workshop Etkinliği (Dosya yükleme ve puan olmadan sadece tarih, saat ve bilgi girişi)
                        </Label>
                    </div>

                    {/* Allow Submissions Checkbox - Only for non-workshop assignments */}
                    {!formData.isWorkshop && (
                        <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-md border border-green-200">
                            <Checkbox
                                id="allow-submissions"
                                checked={formData.allowSubmissions ?? true}
                                onCheckedChange={(checked) => setFormData({ ...formData, allowSubmissions: checked === true })}
                            />
                            <Label htmlFor="allow-submissions" className="text-sm font-medium cursor-pointer">
                                Öğrenciler bu ödeve dosya yükleyebilir
                            </Label>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="assignment-title">{formData.isWorkshop ? 'Workshop' : 'Ödev'} Başlığı <span className="text-red-500">*</span></Label>
                        <Input
                            id="assignment-title"
                            placeholder={formData.isWorkshop ? 'Workshop başlığını girin' : 'Ödev başlığını girin'}
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="assignment-description">{formData.isWorkshop ? 'Workshop' : 'Ödev'} Açıklaması <span className="text-red-500">*</span></Label>
                        <Textarea
                            id="assignment-description"
                            placeholder={formData.isWorkshop ? 'Workshop açıklamasını girin' : 'Ödev açıklamasını girin'}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="assignment-due-date">{formData.isWorkshop ? 'Etkinlik' : 'Teslim'} Tarihi <span className="text-red-500">*</span></Label>
                            <Input
                                id="assignment-due-date"
                                type="date"
                                min={new Date().toISOString().split('T')[0]}
                                value={formData.dueDate}
                                onChange={(e) => {
                                    const selectedDate = e.target.value;
                                    if (selectedDate) {
                                        const date = new Date(selectedDate);
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        date.setHours(0, 0, 0, 0);

                                        if (date < today) {
                                            toast({
                                                title: "Geçersiz Tarih",
                                                description: "Teslim tarihi bugünden önce olamaz.",
                                                variant: "destructive"
                                            });
                                            return;
                                        }
                                    }
                                    setFormData({ ...formData, dueDate: selectedDate });
                                }}
                            />
                        </div>
                        {formData.isWorkshop && (
                            <div className="grid gap-2">
                                <Label htmlFor="workshop-time">Etkinlik Saati <span className="text-red-500">*</span></Label>
                                <Input
                                    id="workshop-time"
                                    type="time"
                                    value={formData.workshopTime}
                                    onChange={(e) => setFormData({ ...formData, workshopTime: e.target.value })}
                                    placeholder="HH:MM"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Workshop'un başlama saatini seçin.
                                </p>
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="assignment-week">Hafta (1-6)</Label>
                            <Select
                                value={formData.week ?? undefined}
                                onValueChange={(value) => setFormData({ ...formData, week: value })}
                            >
                                <SelectTrigger id="assignment-week">
                                    <SelectValue placeholder="Hafta seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5, 6].map((week) => (
                                        <SelectItem key={week} value={week.toString()}>
                                            {week}. Hafta
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {!formData.isWorkshop && (
                            <div className="grid gap-2">
                                <Label htmlFor="assignment-late-date">Geç Teslim Son Tarihi</Label>
                                <Input
                                    id="assignment-late-date"
                                    type="date"
                                    min={formData.dueDate ?? undefined}
                                    value={formData.lateDueDate}
                                    onChange={(e) => setFormData({ ...formData, lateDueDate: e.target.value })}
                                    disabled={!formData.dueDate}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Opsiyonel. Geç teslim kabul edeceğiniz son tarihi seçin.
                                </p>
                            </div>
                        )}
                        {!formData.isWorkshop && (
                            <div className="grid gap-2">
                                <Label htmlFor="assignment-points">Puan (0-100)</Label>
                                <Input
                                    id="assignment-points"
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="Ödev puanı"
                                    value={formData.points}
                                    onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Opsiyonel. Haftalık toplam puan 100'ü geçemez.
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="grid gap-2">
                        <Label>Hedef Sınıflar <span className="text-red-500">*</span></Label>
                        <div className="flex flex-wrap gap-4">
                            {CLASSROOM_LEVELS.map((level) => {
                                const isChecked = formData.classroomLevels.includes(level);
                                return (
                                    <div key={level} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`classroom-${level}`}
                                            checked={isChecked}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setFormData({
                                                        ...formData,
                                                        classroomLevels: [...formData.classroomLevels, level]
                                                    });
                                                } else {
                                                    setFormData({
                                                        ...formData,
                                                        classroomLevels: formData.classroomLevels.filter(l => l !== level)
                                                    });
                                                }
                                            }}
                                        />
                                        <Label
                                            htmlFor={`classroom-${level}`}
                                            className="text-sm font-normal cursor-pointer capitalize"
                                        >
                                            {level.replace('-', ' ')}
                                        </Label>
                                    </div>
                                );
                            })}
                        </div>
                        {formData.classroomLevels.length === 0 && (
                            <p className="text-xs text-red-500">En az bir sınıf seviyesi seçmelisiniz.</p>
                        )}
                    </div>

                    {!formData.isWorkshop && (
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="assignment-file">
                            Ödev Dosyası (En fazla 2 dosya)
                            {formData.classroomLevels.includes('junior') ? ' (İsteğe bağlı)' : <span className="text-red-500"> *</span>}
                        </Label>
                        <Input
                            id="assignment-file"
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            accept={getFileAcceptAttribute()}
                            disabled={!formData.classroomLevels || formData.classroomLevels.length === 0}
                        />
                        <p className="text-xs text-muted-foreground">
                            {getFileDescriptionText()}
                        </p>
                        {primaryFiles.length > 0 && (
                            <div className="mt-1 space-y-1">
                                {primaryFiles.map((f, idx) => (
                                    <p key={`${f.name}-${f.size}-${f.lastModified}`} className="text-xs text-muted-foreground">
                                        Seçilen dosya {idx + 1}: {f.name}
                                    </p>
                                ))}
                            </div>
                        )}
                        {file && primaryFiles.length === 0 && (
                            <p className="text-xs text-muted-foreground mt-1">Seçilen dosya: {file.name}</p>
                        )}
                        {!file && primaryFiles.length === 0 && selectedAssignment?.fileName && (
                            <p className="text-xs text-muted-foreground mt-1">Mevcut dosya: {selectedAssignment.fileName}</p>
                        )}
                        {!file && primaryFiles.length === 0 && selectedAssignment?.fileName2 && (
                            <p className="text-xs text-muted-foreground mt-1">Mevcut dosya 2: {selectedAssignment.fileName2}</p>
                        )}
                    </div>
                    )}
                    {!formData.isWorkshop && (
                    <div className="grid w-full max-w-sm items-start gap-2">
                        <Label htmlFor="assignment-resource-file">
                            CSV Kaynağı (En fazla 2 dosya, İsteğe bağlı)
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                ref={resourceFileInputRef}
                                id="assignment-resource-file"
                                type="file"
                                multiple
                                onChange={handleResourceFileChange}
                                accept={getResourceFileAcceptAttribute()}
                                disabled={!formData.classroomLevels || formData.classroomLevels.length === 0}
                                className="hidden"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => resourceFileInputRef.current?.click()}
                                disabled={!formData.classroomLevels || formData.classroomLevels.length === 0}
                                className="flex items-center gap-2"
                            >
                                <Upload className="h-4 w-4" />
                                CSV Dosyası Ekle
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {getResourceFileDescriptionText()}
                        </p>
                        {resourceFiles.length > 0 && (
                            <div className="mt-1 space-y-1">
                                {resourceFiles.map((f, idx) => (
                                    <div key={`${f.name}-${f.size}-${f.lastModified}`} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground flex-1">
                                            Seçilen dosya {idx + 1}: <span className="font-medium">{f.name}</span>
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {resourceFile && resourceFiles.length === 0 && (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground flex-1">
                                    Seçilen dosya: <span className="font-medium">{resourceFile.name}</span>
                                </p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    type="button"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    onClick={handleRemoveResourceFile}
                                    title="CSV dosyasını kaldır"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                        {!resourceFile && resourceFiles.length === 0 && selectedAssignment?.resourceFileName && !resourceRemoved && (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground flex-1">
                                    Mevcut dosya: <span className="font-medium">{selectedAssignment.resourceFileName}</span>
                                </p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    type="button"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    onClick={handleRemoveResourceFile}
                                    title="CSV dosyasını kaldır"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                        {!resourceFile && resourceFiles.length === 0 && selectedAssignment?.resourceFileName2 && !resourceRemoved && (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground flex-1">
                                    Mevcut dosya 2: <span className="font-medium">{selectedAssignment.resourceFileName2}</span>
                                </p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    type="button"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    onClick={handleRemoveResourceFile}
                                    title="CSV dosyasını kaldır"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                    </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {getSubmitButtonText()}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

