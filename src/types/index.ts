
import { Timestamp } from 'firebase/firestore';

export type UserRole = 
    | 'teacher' 
    | 'student';

export type UserProfile = {
    id: string;
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: UserRole;
    classroom?: 'new-signup' | 'junior' | 'junior-plus' | 'mid' | 'mid-plus' | 'senior';
    createdAt?: Timestamp;
    week1Score?: number;
    week2Score?: number;
    week3Score?: number;
    week4Score?: number;
    week5Score?: number;
    week6Score?: number;
    workshop1?: string;
    workshop2?: string;
    workshop3?: string;
    workshop4?: string;
};

export type Announcement = {
    id: string;
    title: string;
    content: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    authorName: string;
    targetAudiences?: string[]; // new-signup, junior, junior-plus, mid, mid-plus, senior
}

export type AssignmentFileReference = {
    url: string;
    name: string;
};

export type Assignment = {
    id: string;
    title: string;
    description: string;
    dueDate: Timestamp;
    lateDueDate?: Timestamp;
    week?: number; // 1..6
    fileURL?: string;
    fileName?: string;
    fileURL2?: string;
    fileName2?: string;
    primaryFiles?: AssignmentFileReference[];
    resourceFileURL?: string;
    resourceFileName?: string;
    resourceFileURL2?: string;
    resourceFileName2?: string;
    resourceFiles?: AssignmentFileReference[];
    createdAt: Timestamp;
    classroomLevels: ('junior' | 'junior-plus' | 'mid' | 'mid-plus' | 'senior')[];
    points?: number;
    authorName?: string;
    updatedAt?: Timestamp;
    isWorkshop?: boolean;
    workshopTime?: string; // HH:MM format
    allowSubmissions?: boolean; // Öğrencilerin bu ödeve dosya yükleyip yükleyemeyeceğini kontrol eder (default: true)
}

export type AssignmentSubmission = {
    id: string;
    assignmentId: string;
    studentId: string;
    studentName: string;
    submittedFileUrl?: string;
    submittedFileName?: string;
    submittedFileUrl2?: string;
    submittedFileName2?: string;
    submittedCsvUrl?: string;
    submittedCsvName?: string;
    submittedCsvUrl2?: string;
    submittedCsvName2?: string;
    submittedFiles?: AssignmentFileReference[];
    submittedFileMimeType?: string;
    submittedFileSize?: string;
    submittedAt: Timestamp;
    submissionTiming?: 'on-time' | 'late';
    grade?: number;
    feedback?: string;
    gradedAt?: Timestamp;
    gradedBy?: string;
    downloadCount?: number; // İndirme sayısı
    submissionCount?: number; // Yükleme sayısı
    classroomLevel?: string;
    assignmentWeek?: number | null;
    driveFileId?: string;
}

export type Classroom = {
    id: string;
    name: string;
    level: 'junior' | 'junior-plus' | 'mid' | 'mid-plus' | 'senior';
    description?: string;
}

export type TaskStatus = string; // string for custom columns (includes 'todo', 'in-progress', 'done', etc.)

export type TeamColumn = {
    id: string;
    teamRole: UserRole; // Hangi takım için
    name: string; // Sütun adı
    status: string; // Sütun status değeri (unique identifier)
    color?: string; // Sütun rengi (hex veya tailwind class)
    order: number; // Sıralama
    createdAt: Timestamp;
    createdBy: string; // User UID
}

export type TaskStep = {
    id: string;
    text: string;
    completed: boolean;
    completedBy?: string; // User UID
    completedByName?: string;
    completedAt?: Timestamp;
}

export type Task = {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    teamRole: UserRole; // Hangi takım için
    assignedTo?: string | string[]; // Bir veya birden fazla User UID
    assignedToName?: string; // Geriye dönük uyumluluk için (virgülle ayrılmış)
    assignedToNames?: string[]; // Çoklu atamalar için gösterim
    createdBy: string; // User UID
    createdByName: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    dueDate?: Timestamp;
    fileURL?: string;
    fileName?: string;
    steps?: TaskStep[]; // Görev adımları/maddeleri
    priority?: 'low' | 'medium' | 'high';
    tags?: string[];
}

export type TeamChatMessage = {
    id: string;
    teamRole: UserRole; // Hangi takım için
    message: string;
    authorId: string; // User UID
    authorName: string;
    authorPhotoURL?: string;
    authorRole?: UserRole; // Mesaj gönderenin rolü (öğretmen, takım kaptanı, takım üyesi)
    createdAt: Timestamp;
}
