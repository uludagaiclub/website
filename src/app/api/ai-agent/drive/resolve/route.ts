import { NextRequest, NextResponse } from 'next/server';
import { getDriveReadOnlyClient } from '@/lib/google-drive-readonly';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { apiLogger } from '@/lib/logger';

const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';

type DriveFile = {
  id: string;
  name: string;
  mimeType?: string | null;
  size?: string | null;
  webViewLink?: string | null;
  createdTime?: string | null;
  modifiedTime?: string | null;
};

const TURKISH_CHAR_MAP: Record<string, string> = {
  'ş': 's',
  'Ş': 's',
  'ı': 'i',
  'İ': 'i',
  'ğ': 'g',
  'Ğ': 'g',
  'ü': 'u',
  'Ü': 'u',
  'ö': 'o',
  'Ö': 'o',
  'ç': 'c',
  'Ç': 'c',
};

const CLASSROOM_ALIAS_MAP: Record<string, string[]> = {
  junior: ['junior', 'jr'],
  'junior-plus': ['juniorplus', 'junior-plus', 'junior+'],
  mid: ['mid', 'orta'],
  'mid-plus': ['midplus', 'mid-plus', 'mid+'],
  senior: ['senior'],
};

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  if (!serviceAccountKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 not set');
  }

  const serviceAccount = JSON.parse(
    Buffer.from(serviceAccountKey, 'base64').toString('utf-8')
  );

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

async function verifyTeacher(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  }

  try {
    const token = authHeader.substring(7);
    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);
    const decodedToken = await auth.verifyIdToken(token);

    const firestore = getFirestore(adminApp);
    const userDoc = await firestore.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'teacher') {
      return { ok: false, response: NextResponse.json({ error: 'Only teachers can access this endpoint' }, { status: 403 }) } as const;
    }

    return { ok: true, uid: decodedToken.uid, firestore } as const;
  } catch (error) {
    apiLogger.error('Drive resolve auth error', error as Error);
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  }
}

function sanitizeValue(value: string | null | undefined): string {
  if (!value) return '';
  let normalized = value;
  for (const [original, replacement] of Object.entries(TURKISH_CHAR_MAP)) {
    normalized = normalized.replaceAll(original, replacement);
  }
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function buildWeekCandidates(week?: number | null): string[] {
  if (!week || week < 1) return [];
  const weekStr = week.toString();
  return [
    `hafta${weekStr}`,
    `${weekStr}hafta`,
    `${weekStr}`,
    `week${weekStr}`,
    `${weekStr}week`,
    `${weekStr}hafta${weekStr}`,
    `${weekStr}incihafta`,
  ].map(sanitizeValue);
}

async function listFolders(driveClient: ReturnType<typeof getDriveReadOnlyClient>, parentId: string) {
  const folders: DriveFile[] = [];
  let pageToken: string | undefined;
  try {
    do {
      const response = await driveClient.files.list({
        q: `'${parentId}' in parents and trashed = false and mimeType = '${DRIVE_FOLDER_MIME}'`,
        fields: 'files(id,name),nextPageToken',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 1000,
        pageToken,
      });
      folders.push(...(response.data.files ?? []));
      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);
  } catch (error) {
    apiLogger.error('Error listing folders', {
      parentId,
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw new Error(`Klasörler listelenirken hata oluştu: ${(error as Error).message}`);
  }
  return folders;
}

async function listFiles(driveClient: ReturnType<typeof getDriveReadOnlyClient>, parentId: string) {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  try {
    do {
      const response = await driveClient.files.list({
        q: `'${parentId}' in parents and trashed = false and mimeType != '${DRIVE_FOLDER_MIME}'`,
        fields: 'files(id,name,mimeType,size,webViewLink,createdTime,modifiedTime),nextPageToken',
        orderBy: 'modifiedTime desc',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 200,
        pageToken,
      });
      files.push(...(response.data.files ?? []));
      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);
  } catch (error) {
    apiLogger.error('Error listing files', {
      parentId,
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw new Error(`Dosyalar listelenirken hata oluştu: ${(error as Error).message}`);
  }
  return files;
}

function findBestMatchingFolder(
  folders: DriveFile[],
  classroomLevel?: string | null
): DriveFile | null {
  if (!classroomLevel) {
    return folders[0] ?? null;
  }
  const target = sanitizeValue(classroomLevel);
  const aliases = [
    target,
    ...(CLASSROOM_ALIAS_MAP[classroomLevel as keyof typeof CLASSROOM_ALIAS_MAP] ?? []),
  ].map(sanitizeValue);

  let bestMatch: DriveFile | null = null;
  let bestScore = -1;

  folders.forEach((folder) => {
    const folderKey = sanitizeValue(folder.name);
    let score = 0;
    aliases.forEach((alias) => {
      if (!alias) return;
      if (folderKey === alias) {
        score = 100;
      } else if (folderKey.includes(alias) || alias.includes(folderKey)) {
        score = Math.max(score, 50);
      }
    });
    if (score > bestScore) {
      bestScore = score;
      bestMatch = folder;
    }
  });

  return bestMatch ?? folders[0] ?? null;
}

function findBestWeekFolder(folders: DriveFile[], weekCandidates: string[]): DriveFile | null {
  if (weekCandidates.length === 0) {
    return null;
  }

  let best: DriveFile | null = null;
  let bestScore = -1;

  folders.forEach((folder) => {
    const folderKey = sanitizeValue(folder.name);
    weekCandidates.forEach((candidate) => {
      if (!candidate) return;
      if (folderKey === candidate) {
        best = folder;
        bestScore = 100;
      } else if (folderKey.includes(candidate) || candidate.includes(folderKey)) {
        if (bestScore < 50) {
          best = folder;
          bestScore = 50;
        }
      }
    });
  });

  return best;
}

function scoreStudentNameMatch(fileKey: string, studentName: string): number {
  const studentNameNormalized = sanitizeValue(studentName);
  const studentNameParts = studentNameNormalized.split(/\s+/).filter(p => p.length > 2);
  
  // Tam isim eşleşmesi (en yüksek puan)
  if (fileKey.includes(studentNameNormalized)) {
    return 10;
  }
  
  if (studentNameParts.length === 0) {
    return 0;
  }
  
  // İsim parçalarının eşleşmesi
  let matchedParts = 0;
  studentNameParts.forEach(part => {
    if (fileKey.includes(part)) {
      matchedParts++;
    }
  });
  
  if (matchedParts === 0) {
    return 0;
  }
  
  // En az bir parça eşleştiyse puan ver
  return (matchedParts / studentNameParts.length) * 8;
}

function cleanFileName(fileName: string): string {
  // Tarih formatlarını kaldır (28.11.2025, 28-11-2025, vb.)
  const withoutDate = fileName.replace(/\d{1,2}[._-]\d{1,2}[._-]\d{2,4}/g, '');
  // Saat formatlarını kaldır (17:02:42, vb.)
  const withoutTime = withoutDate.replace(/\d{1,2}:\d{2}(:\d{2})?/g, '');
  // Uzantıyı kaldır (.ipynb, .csv, vb.)
  return withoutTime.replace(/\.\w+$/, '');
}

function scoreOriginalFileNameMatch(fileKey: string, originalFileName: string): number {
  const originalNormalized = sanitizeValue(originalFileName);
  const originalNoExt = cleanFileName(originalNormalized);
  
  if (fileKey.includes(originalNormalized)) {
    return 8; // Tam eşleşme
  }
  
  if (originalNoExt && fileKey.includes(originalNoExt)) {
    return 6; // Tarih/saat olmadan eşleşme
  }
  
  // Dosya adının parçalarını kontrol et (mid2, junior1, vb.)
  const originalParts = originalNoExt.split(/[._-]/).filter(p => p.length > 1);
  let partScore = 0;
  originalParts.forEach(part => {
    if (fileKey.includes(part)) {
      partScore += 2;
    }
  });
  
  return partScore;
}

function scoreClassroomLevelMatch(fileKey: string, classroomLevel: string, week?: number | null): number {
  const levelNormalized = sanitizeValue(classroomLevel);
  let score = 0;
  
  // Tam eşleşme
  if (fileKey.includes(levelNormalized)) {
    score += 3;
  }
  
  // Hafta ile birlikte eşleşme (mid2, junior1, vb.)
  if (week) {
    const levelWithWeek = `${levelNormalized}${week}`;
    if (fileKey.includes(levelWithWeek)) {
      score += 5; // Sınıf + hafta kombinasyonu daha yüksek puan
    }
  }
  
  return score;
}

function scoreWeekMatch(fileKey: string, week: number): number {
  const weekStr = week.toString();
  let score = 0;
  
  // Direkt hafta numarası
  if (fileKey.includes(weekStr)) {
    score += 3;
  }
  
  // Hafta kelimesi ile birlikte
  const weekPatterns = [`hafta${weekStr}`, `${weekStr}hafta`, `week${weekStr}`, `${weekStr}week`];
  weekPatterns.forEach(pattern => {
    if (fileKey.includes(pattern)) {
      score += 2;
    }
  });
  
  return score;
}

function scoreAssignmentTitleMatch(fileKey: string, assignmentTitle: string): number {
  const titleNormalized = sanitizeValue(assignmentTitle);
  if (fileKey.includes(titleNormalized)) {
    return 3;
  }
  return 0;
}

function scoreFile(
  file: DriveFile,
  criteria: {
    studentName?: string;
    originalFileName?: string;
    assignmentTitle?: string;
    classroomLevel?: string;
    week?: number | null;
  }
) {
  const fileKey = sanitizeValue(file.name);
  let score = 0;

  if (criteria.studentName) {
    score += scoreStudentNameMatch(fileKey, criteria.studentName);
  }

  if (criteria.originalFileName) {
    score += scoreOriginalFileNameMatch(fileKey, criteria.originalFileName);
  }

  if (criteria.classroomLevel) {
    score += scoreClassroomLevelMatch(fileKey, criteria.classroomLevel, criteria.week);
  }

  if (criteria.week) {
    score += scoreWeekMatch(fileKey, criteria.week);
  }

  if (criteria.assignmentTitle) {
    score += scoreAssignmentTitleMatch(fileKey, criteria.assignmentTitle);
  }

  return score;
}

async function resolveFile({
  classroomLevel,
  week,
  studentName,
  fileName,
  assignmentTitle,
}: {
  classroomLevel?: string | null;
  week?: number | null;
  studentName: string;
  fileName?: string | null;
  assignmentTitle?: string | null;
}) {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID not configured.');
  }

  const driveClient = getDriveReadOnlyClient();

  apiLogger.info('Starting file resolution', {
    rootFolderId,
    classroomLevel,
    week,
    studentName,
    fileName,
  });

  let rootChildren: DriveFile[];
  try {
    rootChildren = await listFolders(driveClient, rootFolderId);
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('Permission denied') || errorMessage.includes('403') || errorMessage.includes('insufficient')) {
      apiLogger.error('Drive folder access denied', {
        rootFolderId,
        error: errorMessage,
      });
      throw new Error(
        `Drive klasörüne erişim reddedildi (403). ` +
        `Klasör ID: ${rootFolderId}. ` +
        `Servis hesabının bu klasöre 'Görüntüleyen' veya 'Düzenleyen' izni olduğundan emin olun. ` +
        `Google Drive'da klasöre sağ tıklayıp 'Paylaş' > Servis hesabı email'ini ekleyin.`
      );
    }
    throw error;
  }

  apiLogger.info('Root folder children', {
    count: rootChildren.length,
    folders: rootChildren.map(f => f.name),
  });

  if (rootChildren.length === 0) {
    throw new Error(
      `Drive kök klasöründe (ID: ${rootFolderId}) alt klasör bulunamadı. ` +
      `Klasörün paylaşım ayarlarını kontrol edin ve servis hesabına 'Görüntüleyen' veya 'Düzenleyen' izni verin.`
    );
  }

  const classFolder = findBestMatchingFolder(rootChildren, classroomLevel);
  apiLogger.info('Classroom folder found', {
    classroomLevel,
    folderName: classFolder?.name,
    folderId: classFolder?.id,
  });

  const candidateFolderIds: string[] = [];

  if (classFolder) {
    const weekCandidates = buildWeekCandidates(week);
    const weekFolders = await listFolders(driveClient, classFolder.id);
    apiLogger.info('Week folders found', {
      week,
      weekCandidates,
      count: weekFolders.length,
      folders: weekFolders.map(f => f.name),
    });

    const weekFolder = findBestWeekFolder(weekFolders, weekCandidates);
    apiLogger.info('Best week folder', {
      weekFolderName: weekFolder?.name,
      weekFolderId: weekFolder?.id,
    });

    if (weekFolder) {
      candidateFolderIds.push(weekFolder.id);
    }
    candidateFolderIds.push(classFolder.id);
  }

  // Fallback: root folder
  candidateFolderIds.push(rootFolderId);
  
  apiLogger.info('Candidate folders for search', {
    candidateFolderIds,
  });

  // Tüm klasörlerde dosyaları topla ve en iyi eşleşmeyi bul
  const allFiles: Array<{ file: DriveFile; folderId: string; score: number }> = [];

  for (const folderId of candidateFolderIds) {
    try {
      const files = await listFiles(driveClient, folderId);
      if (files.length === 0) {
        apiLogger.info('No files found in folder', { folderId });
        continue;
      }

      files.forEach((file) => {
        const score = scoreFile(file, {
          studentName,
          originalFileName: fileName ?? file.name,
          assignmentTitle,
          classroomLevel,
          week,
        });
        allFiles.push({ file, folderId, score });
      });
    } catch (error) {
      apiLogger.warn('Error listing files in folder', {
        folderId,
        error: (error as Error).message,
      });
    }
  }

  if (allFiles.length === 0) {
    apiLogger.warn('No files found in any candidate folder', {
      candidateFolderIds,
      studentName,
      fileName,
      classroomLevel,
      week,
    });
    return null;
  }

  // En yüksek score'a sahip dosyayı seç
  // Eğer hiçbir dosya score almamışsa (hepsi 0), yine de en son değiştirilmiş dosyayı seç
  allFiles.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Score eşitse, modifiedTime'a göre sırala (en yeni önce)
    const timeA = a.file.modifiedTime ? new Date(a.file.modifiedTime).getTime() : 0;
    const timeB = b.file.modifiedTime ? new Date(b.file.modifiedTime).getTime() : 0;
    return timeB - timeA;
  });

  // Top 5 dosyayı logla
  const topFiles = allFiles.slice(0, 5).map(f => ({
    name: f.file.name,
    fileId: f.file.id,
    score: f.score,
    folderId: f.folderId,
  }));
  apiLogger.info('Top file matches', {
    totalFiles: allFiles.length,
    topFiles,
    studentName,
    fileName,
  });

  const bestMatch = allFiles[0];
  apiLogger.info('Best file match found', {
    fileName: bestMatch.file.name,
    fileId: bestMatch.file.id,
    score: bestMatch.score,
    folderId: bestMatch.folderId,
    studentName,
    originalFileName: fileName,
  });

  // Eğer score çok düşükse (0 veya çok düşük), uyarı ver
  if (bestMatch.score === 0) {
    apiLogger.warn('Best match has score 0 - file may not match criteria', {
      fileName: bestMatch.file.name,
      studentName,
      originalFileName: fileName,
    });
  }

  return { file: bestMatch.file, folderId: bestMatch.folderId };
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyTeacher(request);
    if (!authResult.ok) {
      return authResult.response;
    }
    const { firestore } = authResult;

    const body = await request.json();
    const {
      submissionId,
      classroomLevel,
      assignmentWeek,
      studentName,
      fileName,
      assignmentTitle,
    } = body as {
      submissionId?: string;
      classroomLevel?: string;
      assignmentWeek?: number | null;
      studentName?: string;
      fileName?: string;
      assignmentTitle?: string;
    };

    if (!studentName) {
      return NextResponse.json(
        { error: 'studentName alanı zorunludur.' },
        { status: 400 }
      );
    }

    apiLogger.info('Resolving drive file', {
      studentName,
      fileName,
      classroomLevel,
      assignmentWeek,
      assignmentTitle,
    });

    const resolved = await resolveFile({
      classroomLevel,
      week: assignmentWeek,
      studentName,
      fileName,
      assignmentTitle,
    });

    if (!resolved) {
      apiLogger.warn('Drive file not found', {
        studentName,
        fileName,
        classroomLevel,
        assignmentWeek,
      });
      return NextResponse.json(
        { 
          error: 'Drive üzerinde eşleşen dosya bulunamadı.',
          details: {
            studentName,
            fileName,
            classroomLevel,
            week: assignmentWeek,
          }
        },
        { status: 404 }
      );
    }

    const { file } = resolved;

    if (submissionId && firestore) {
      try {
        await firestore.collection('assignmentSubmissions').doc(submissionId).update({
          driveFileId: file.id,
          submittedFileName: file.name ?? fileName ?? null,
          submittedFileMimeType: file.mimeType ?? null,
          submittedFileSize: file.size ?? null,
          updatedAt: new Date(),
        });
      } catch (error) {
        apiLogger.warn('Submission update failed after drive resolve', {
          submissionId,
          error: (error as Error).message,
        });
      }
    }

    return NextResponse.json({
      driveFileId: file.id,
      fileName: file.name ?? null,
      mimeType: file.mimeType ?? null,
      size: file.size ?? null,
      webViewLink: file.webViewLink ?? null,
    });
  } catch (error) {
    apiLogger.error('Drive resolve error', error as Error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Drive dosyası çözümlenemedi.' },
      { status: 500 }
    );
  }
}

