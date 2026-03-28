import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { checkRateLimit, getClientIp, RateLimitPresets } from '@/lib/rate-limit';
import { apiLogger } from '@/lib/logger';

// Initialize Firebase Admin SDK
function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  try {
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
  } catch (error) {
    apiLogger.error('Failed to initialize Firebase Admin', error as Error);
    throw error;
  }
}

// Verify Firebase ID token from Authorization header
async function verifyToken(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split('Bearer ')[1];
    const app = getAdminApp();
    const auth = getAuth(app);
    
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    apiLogger.warn('Token verification failed', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

type RateLimitInfo = {
  limit: number;
  remaining: number;
  resetTime: number;
};

type RateLimitResultSuccess = {
  ok: true;
  info: RateLimitInfo;
  clientIp: string;
};

type RateLimitResultFailure = {
  ok: false;
  response: NextResponse;
};

async function enforceRateLimit(request: NextRequest): Promise<RateLimitResultSuccess | RateLimitResultFailure> {
  const clientIp = getClientIp(request);
  const rateLimitResult = checkRateLimit(clientIp, RateLimitPresets.MODERATE);

  if (rateLimitResult.success) {
    return {
      ok: true,
      clientIp,
      info: {
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
      },
    };
  }

  const resetDate = new Date(rateLimitResult.resetTime);
  apiLogger.warn('Rate limit exceeded for download', {
    ip: clientIp,
    resetTime: resetDate.toISOString(),
  });

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
        },
      }
    ),
  };
}

async function fetchUserData(
  firestore: ReturnType<typeof getFirestore>,
  userId: string
): Promise<any> {
  const userDoc = await firestore.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
  }

  const userData = userDoc.data();
  if (!userData) {
    return NextResponse.json({ error: 'Kullanıcı verisi bulunamadı.' }, { status: 404 });
  }
  return userData;
}

async function fetchAssignmentData(
  firestore: ReturnType<typeof getFirestore>,
  assignmentId: string
): Promise<any> {
  const assignmentDoc = await firestore.collection('assignments').doc(assignmentId).get();
  if (!assignmentDoc.exists) {
    return NextResponse.json({ error: 'Ödev bulunamadı.' }, { status: 404 });
  }

  const assignmentData = assignmentDoc.data();
  if (!assignmentData) {
    return NextResponse.json({ error: 'Ödev verisi bulunamadı.' }, { status: 404 });
  }
  return assignmentData;
}

async function ensureStudentAccess(
  firestore: ReturnType<typeof getFirestore>,
  opts: {
    userData: any;
    assignmentData: any;
    assignmentId: string;
    userId: string;
    fileType: string;
  }
): Promise<NextResponse | null> {
  const { userData, assignmentData, assignmentId, userId, fileType } = opts;

  if (userData.role !== 'teacher') {
    if (userData.role !== 'student') {
      return NextResponse.json(
        { error: 'Sadece öğrenciler ve öğretmenler ödev indirebilir.' },
        { status: 403 }
      );
    }

    const assignmentClassrooms = assignmentData.classroomLevels ?? [];
    if (assignmentClassrooms.length > 0 && !assignmentClassrooms.includes(userData.classroom)) {
      return NextResponse.json(
        { error: 'Bu ödev sizin sınıfınız için değil.' },
        { status: 403 }
      );
    }

    // Tüm dosya tipleri için indirme sayısını kontrol et ve kaydet (homework, döküman, csv1, csv2)
      const downloadsQuery = await firestore
        .collection('assignmentDownloads')
        .where('assignmentId', '==', assignmentId)
        .where('studentId', '==', userId)
        .get();

      const MAX_DOWNLOADS = 10;
      if (downloadsQuery.size >= MAX_DOWNLOADS) {
        return NextResponse.json(
          { error: `Bu ödevi maksimum ${MAX_DOWNLOADS} kez indirebilirsiniz.` },
          { status: 403 }
        );
      }

      await firestore.collection('assignmentDownloads').add({
        assignmentId,
        studentId: userId,
      fileType: fileType, // 'notebook', 'resource' vb.
        downloadedAt: new Date(),
        downloadCount: downloadsQuery.size + 1,
      });
  }

  return null;
}

async function buildResourceDownloadPayload(
  app: ReturnType<typeof getAdminApp>,
  assignmentData: any
): Promise<{ downloadUrl: string; fileName: string } | NextResponse> {
  if (!assignmentData.resourceFileURL) {
    return NextResponse.json({ error: 'CSV dosyası bulunamadı.' }, { status: 404 });
  }

  const week = assignmentData.week;
  const classroomLevels = assignmentData.classroomLevels ?? [];
  const classroom = classroomLevels.length > 0 ? classroomLevels[0] : null;
  const resourceUrl = assignmentData.resourceFileURL.split('?')[0] ?? '';
  const inferredExtension = resourceUrl.split('.').pop()?.toLowerCase() ?? 'csv';

  let resourceFileName = 'resource.csv';
  if (classroom && week && week >= 1 && week <= 6) {
    resourceFileName = `${classroom}_${week}_hafta.${inferredExtension}`;
  } else if (week && week >= 1 && week <= 6) {
    resourceFileName = `week_${week}_hafta.${inferredExtension}`;
  }

  // forceAttachment=true ile dosyanın indirilmesini sağla
  const signedUrl = await generateSignedUrl(app, assignmentData.resourceFileURL, true, resourceFileName);

  return { downloadUrl: signedUrl, fileName: resourceFileName };
}

function buildPrimaryFileName(assignmentData: any) {
  const week = assignmentData.week;
  const classroomLevels = assignmentData.classroomLevels ?? [];
  const classroom = classroomLevels.length > 0 ? classroomLevels[0] : null;

  let fileExtension = 'ipynb';
  const existingFileName = assignmentData.fileName ?? '';
  if (existingFileName) {
    const cleanFileName = existingFileName.replace(/^[a-zA-Z0-9_-]+_/, '');
    fileExtension = cleanFileName.split('.').pop()?.toLowerCase() ?? 'ipynb';
  } else {
    const fileUrl = assignmentData.fileURL ?? '';
    const urlExtension = fileUrl.split('.').pop()?.toLowerCase() ?? 'ipynb';
    if (['ipynb', 'docx', 'doc', 'csv'].includes(urlExtension)) {
      fileExtension = urlExtension;
    }
  }

  if (classroom && week && week >= 1 && week <= 6) {
    return `${classroom}_${week}_hafta.${fileExtension}`;
  }
  if (week && week >= 1 && week <= 6) {
    return `week_${week}_hafta.${fileExtension}`;
  }
  return `assignment.${fileExtension}`;
}

interface ParsedStorageUrl {
  bucketName: string | null;
  filePath: string | null;
}

function parseGsUrl(storageUrl: string): ParsedStorageUrl {
  const gsMatch = /^gs:\/\/([^/]+)\/(.+)$/.exec(storageUrl);
    if (gsMatch) {
    return {
      bucketName: gsMatch[1],
      filePath: gsMatch[2],
    };
  }
  return { bucketName: null, filePath: null };
}

function extractBucketNameFromHttpUrl(storageUrl: string): string | null {
  const bucketMatch = /\/v0\/b\/([^/]+)\/o\//.exec(storageUrl);
  return bucketMatch ? bucketMatch[1] : null;
    }
    
function decodeFilePath(encodedPath: string): string {
      try {
    return decodeURIComponent(encodedPath.replace(/\+/g, ' '));
      } catch (decodeError) {
        apiLogger.warn('Failed to decode file path', {
          error: decodeError instanceof Error ? decodeError.message : String(decodeError),
      encodedPath: encodedPath.substring(0, 100),
        });
        // Decode başarısız olursa, olduğu gibi kullan
    return encodedPath.replace(/\+/g, ' ');
  }
}

function extractFilePathFromHttpUrl(storageUrl: string): string | null {
  const urlRegex = /\/o\/([^?]+)/;
  const urlMatch = urlRegex.exec(storageUrl);
  if (!urlMatch) {
    return null;
  }
  return decodeFilePath(urlMatch[1]);
}

function parseHttpUrl(storageUrl: string): ParsedStorageUrl {
  return {
    bucketName: extractBucketNameFromHttpUrl(storageUrl),
    filePath: extractFilePathFromHttpUrl(storageUrl),
  };
}

function parseStorageUrl(storageUrl: string): ParsedStorageUrl {
  if (storageUrl.startsWith('gs://')) {
    return parseGsUrl(storageUrl);
      }
  return parseHttpUrl(storageUrl);
  }

function validateParsedUrl(parsed: ParsedStorageUrl, storageUrl: string): boolean {
  if (!parsed.filePath) {
    apiLogger.warn('Could not extract file path from storage URL', {
      storageUrl: storageUrl.substring(0, 200),
    });
    return false;
  }

  if (!parsed.bucketName) {
    apiLogger.warn('Could not extract bucket name from storage URL', {
      storageUrl: storageUrl.substring(0, 200),
    });
    return false;
  }

  return true;
}

function getFileFromBucket(
  app: ReturnType<typeof getAdminApp>,
  bucketName: string,
  filePath: string
): { file: any; filePath: string } | null {
  try {
    const bucket = getStorage(app).bucket(bucketName);
    const file = bucket.file(filePath);
    return { file, filePath };
  } catch (error) {
    apiLogger.error('Failed to get file from storage bucket', {
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      filePath: filePath.substring(0, 200),
      bucketName: bucketName.substring(0, 200),
    });
    return null;
  }
}

function ensureFilePath(filePath: string | null): string | null {
  if (!filePath) {
    return null;
  }
  return filePath.substring(0, 200);
}

function ensureBucketName(bucketName: string | null): string | null {
  if (!bucketName) {
    return null;
  }
  return bucketName.substring(0, 200);
}

function resolveParsedStorageUrl(
  parsed: ParsedStorageUrl,
  storageUrl: string
): { bucketName: string; filePath: string } | null {
  if (!validateParsedUrl(parsed, storageUrl)) {
    return null;
  }

  const bucketName = parsed.bucketName!;
  const filePath = parsed.filePath!;

  return { bucketName, filePath };
}

async function getFileFromStorage(
  app: ReturnType<typeof getAdminApp>,
  storageUrl: string
): Promise<{ file: any; filePath: string } | null> {
  const parsed = resolveParsedStorageUrl(parseStorageUrl(storageUrl), storageUrl);
  if (!parsed) {
    return null;
  }

  return getFileFromBucket(app, parsed.bucketName, parsed.filePath);
}

async function generateSignedUrl(
  app: ReturnType<typeof getAdminApp>,
  storageUrl: string,
  forceAttachment = false,
  fileName?: string
): Promise<string> {
  let signedUrl = storageUrl;
  const fileInfo = await getFileFromStorage(app, storageUrl);
  if (!fileInfo) {
    return signedUrl;
  }

  try {
    const { file } = fileInfo;
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000,
    });

    if (forceAttachment) {
      // Eğer dosya adı verilmişse onu kullan, yoksa path'ten çıkar
      const finalFileName = fileName ?? (fileInfo.filePath.split('/').pop() ?? 'file');
      const encodedFileName = encodeURIComponent(finalFileName);
      return `${url}&response-content-disposition=attachment%3Bfilename%3D${encodedFileName}`;
    }

    return url;
  } catch (error) {
    apiLogger.warn('Failed to generate signed URL', {
      error: error instanceof Error ? error.message : String(error),
      storageUrl: storageUrl.substring(0, 100),
    });
    return signedUrl;
  }
}

async function streamFileFromStorage(
  app: ReturnType<typeof getAdminApp>,
  storageUrl: string,
  fileName: string
): Promise<NextResponse> {
  const fileInfo = await getFileFromStorage(app, storageUrl);
  if (!fileInfo) {
    apiLogger.warn('File info not found for stream download', {
      storageUrl: storageUrl.substring(0, 200),
    });
    return NextResponse.json({ error: 'Dosya bulunamadı. URL formatı geçersiz olabilir.' }, { status: 404 });
  }

  try {
    const { file, filePath } = fileInfo;
    
    // Dosyanın varlığını kontrol et
    const [exists] = await file.exists();
    if (!exists) {
      apiLogger.warn('File does not exist in storage', {
        filePath: filePath.substring(0, 200),
        storageUrl: storageUrl.substring(0, 200),
      });
      return NextResponse.json({ error: 'Dosya bulunamadı. Depolama alanında mevcut değil.' }, { status: 404 });
    }

    // Dosyayı indir
    const [buffer] = await file.download();
    const encodedFileName = encodeURIComponent(fileName);

    apiLogger.info('File streamed successfully', {
      fileName: fileName.substring(0, 100),
      filePath: filePath.substring(0, 200),
      fileSize: buffer.length,
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    apiLogger.error('Failed to stream file from storage', {
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      storageUrl: storageUrl.substring(0, 200),
      filePath: fileInfo.filePath.substring(0, 200),
    });
    return NextResponse.json({ 
      error: 'Dosya indirilemedi. Lütfen tekrar deneyin.',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    }, { status: 500 });
  }
}

function buildRateLimitHeaders(info: RateLimitInfo) {
  return {
    'X-RateLimit-Limit': info.limit.toString(),
    'X-RateLimit-Remaining': info.remaining.toString(),
    'X-RateLimit-Reset': info.resetTime.toString(),
  };
}

interface RequestParams {
  assignmentId: string;
  fileType: string;
  stream: boolean;
  fileIndex: number;
}

async function parseRequestParams(
  params: Promise<{ assignmentId: string }>,
  request: NextRequest
): Promise<RequestParams> {
  const { assignmentId } = await params;
  const fileType = request.nextUrl.searchParams.get('fileType') ?? 'notebook';
  const stream = request.nextUrl.searchParams.get('stream') === 'true';
  const fileIndexParam = request.nextUrl.searchParams.get('fileIndex');
  const fileIndex = fileIndexParam ? parseInt(fileIndexParam, 10) : 0;
  
  return { assignmentId, fileType, stream, fileIndex };
}

function getResourceStorageUrl(assignmentData: any, fileIndex: number): string | null {
  if (fileIndex === 0) {
    return assignmentData.resourceFileURL ?? null;
  }
  
  const url = assignmentData.resourceFileURL2 ?? null;
  if (url) {
    return url;
  }
  
  if (assignmentData.resourceFiles && assignmentData.resourceFiles.length > fileIndex) {
    return assignmentData.resourceFiles[fileIndex]?.url ?? null;
  }
  
  return null;
}

function generateSecondFileUrl(firstFileUrl: string): string | null {
  const pathMatch = /\/o\/([^?]+)/.exec(firstFileUrl);
  if (!pathMatch) {
    return null;
  }

  try {
    const encodedPath = pathMatch[1];
    const decodedPath = decodeURIComponent(encodedPath);
    const secondPath = decodedPath.replace(/\.(\w+)$/, '_2.$1');
    
    const bucketMatch = /\/v0\/b\/([^/]+)\//.exec(firstFileUrl);
    if (!bucketMatch) {
      return null;
    }
    
    const bucketName = bucketMatch[1];
    const storageUrl = `gs://${bucketName}/${secondPath}`;
    
    apiLogger.info('Generated second file URL from first file', {
      firstFileUrl: firstFileUrl.substring(0, 100),
      secondPath,
      generatedUrl: storageUrl,
    });
    
    return storageUrl;
  } catch (error) {
    apiLogger.warn('Failed to generate second file URL', {
      error: error instanceof Error ? error.message : String(error),
      firstFileUrl: firstFileUrl.substring(0, 100),
    });
    return null;
  }
}

function getPrimaryStorageUrlForIndex0(assignmentData: any): string | null {
  const url = assignmentData.fileURL ?? null;
  if (url) {
    return url;
  }
  
  if (assignmentData.primaryFiles && assignmentData.primaryFiles.length > 0) {
    return assignmentData.primaryFiles[0]?.url ?? null;
  }
  
  return null;
}

function getPrimaryStorageUrlForIndex1(assignmentData: any): string | null {
  let url = assignmentData.fileURL2 ?? null;
  if (url) {
    return url;
  }
  
  if (assignmentData.primaryFiles && assignmentData.primaryFiles.length > 1) {
    url = assignmentData.primaryFiles[1]?.url ?? null;
    if (url) {
      return url;
    }
  }
  
  if (assignmentData.fileURL) {
    return generateSecondFileUrl(assignmentData.fileURL);
  }
  
  return null;
}

function getPrimaryStorageUrl(assignmentData: any, fileIndex: number): string | null {
  if (fileIndex === 0) {
    return getPrimaryStorageUrlForIndex0(assignmentData);
  }
  
  if (fileIndex === 1) {
    return getPrimaryStorageUrlForIndex1(assignmentData);
  }
  
  return null;
}

function getStreamStorageUrl(assignmentData: any, fileType: string, fileIndex: number): string | null {
  if (fileType === 'resource') {
    return getResourceStorageUrl(assignmentData, fileIndex);
  }
  
  const url = getPrimaryStorageUrl(assignmentData, fileIndex);
  
  apiLogger.info('File selection for download', {
    fileIndex,
    hasFileURL: !!assignmentData.fileURL,
    hasFileURL2: !!assignmentData.fileURL2,
    primaryFilesLength: assignmentData.primaryFiles?.length ?? 0,
    selectedStorageUrl: url ? url.substring(0, 150) : null,
  });
  
  return url;
}

function buildResourceStreamFileName(assignmentData: any, storageUrl: string, fileIndex: number): string {
  const week = assignmentData.week;
  const classroomLevels = assignmentData.classroomLevels ?? [];
  const classroom = classroomLevels.length > 0 ? classroomLevels[0] : null;
  const resourceUrl = storageUrl.split('?')[0] ?? '';
  const inferredExtension = resourceUrl.split('.').pop()?.toLowerCase() ?? 'csv';
  
  let baseName = '';
  if (classroom && week && week >= 1 && week <= 6) {
    baseName = `${classroom}_${week}_hafta`;
  } else if (week && week >= 1 && week <= 6) {
    baseName = `week_${week}_hafta`;
  } else {
    baseName = 'resource';
  }
  
  return fileIndex === 1 
    ? `${baseName}_2.${inferredExtension}`
    : `${baseName}.${inferredExtension}`;
}

function buildPrimaryStreamFileName(assignmentData: any, fileIndex: number): string {
  const baseName = buildPrimaryFileName(assignmentData);
  return fileIndex === 1 
    ? baseName.replace(/\.(\w+)$/, '_2.$1')
    : baseName;
}

function buildStreamFileName(assignmentData: any, fileType: string, storageUrl: string, fileIndex: number): string {
  if (fileType === 'resource') {
    return buildResourceStreamFileName(assignmentData, storageUrl, fileIndex);
  }
  return buildPrimaryStreamFileName(assignmentData, fileIndex);
}

async function handleStreamDownload(
  app: ReturnType<typeof getAdminApp>,
  assignmentData: any,
  fileType: string,
  fileIndex: number,
  assignmentId: string,
  userId: string,
  rateLimitResult: RateLimitResultSuccess,
  startTime: number
): Promise<NextResponse> {
  const storageUrl = getStreamStorageUrl(assignmentData, fileType, fileIndex);
  
  if (!storageUrl) {
    const errorMessage = fileType === 'resource' 
      ? `CSV dosyası ${fileIndex + 1} bulunamadı.` 
      : `Ödev dosyası ${fileIndex + 1} bulunamadı.`;
    return NextResponse.json({ error: errorMessage }, { status: 404 });
  }

  const fileName = buildStreamFileName(assignmentData, fileType, storageUrl, fileIndex);

  apiLogger.info('File stream download successful', {
    assignmentId: assignmentId.substring(0, 50),
    fileName: fileName.substring(0, 100),
    userId: userId.substring(0, 50),
  });

  apiLogger.logResponse(
    'GET',
    `/api/assignments/${assignmentId}/download?stream=true`,
    200,
    Date.now() - startTime
  );

  const response = await streamFileFromStorage(app, storageUrl, fileName);
  const headers = new Headers(response.headers);
  Object.entries(buildRateLimitHeaders(rateLimitResult.info)).forEach(([key, value]) => {
    headers.set(key, value);
  });
  
  return new NextResponse(response.body, {
    status: response.status,
    headers,
  });
}

async function handleJsonDownload(
  app: ReturnType<typeof getAdminApp>,
  assignmentData: any,
  fileType: string,
  fileIndex: number,
  assignmentId: string,
  userId: string,
  rateLimitResult: RateLimitResultSuccess,
  startTime: number
): Promise<NextResponse> {
  const payload = fileType === 'resource'
    ? await buildResourceDownloadPayload(app, assignmentData)
    : await buildPrimaryDownloadPayload(app, assignmentData, fileIndex);

  if (payload instanceof NextResponse) {
    return payload;
  }

  apiLogger.info('File download successful', {
    assignmentId: assignmentId.substring(0, 50),
    fileName: payload.fileName.substring(0, 100),
    userId: userId.substring(0, 50),
  });

  apiLogger.logResponse(
    'GET',
    `/api/assignments/${assignmentId}/download`,
    200,
    Date.now() - startTime
  );

  return NextResponse.json(payload, {
    status: 200,
    headers: buildRateLimitHeaders(rateLimitResult.info),
  });
}

async function buildPrimaryDownloadPayload(
  app: ReturnType<typeof getAdminApp>,
  assignmentData: any,
  fileIndex: number = 0
): Promise<{ downloadUrl: string; fileName: string } | NextResponse> {
  // Dosya URL'lerini kontrol et: fileURL, fileURL2 veya primaryFiles array
  let fileUrl: string | null = null;
  let fileName: string | null = null;

  if (fileIndex === 0) {
    // İlk dosya
    fileUrl = assignmentData.fileURL ?? null;
    fileName = assignmentData.fileName ?? null;
    
    // primaryFiles array varsa onu kullan
    if (!fileUrl && assignmentData.primaryFiles && assignmentData.primaryFiles.length > 0) {
      fileUrl = assignmentData.primaryFiles[0]?.url ?? null;
      fileName = assignmentData.primaryFiles[0]?.name ?? null;
    }
  } else if (fileIndex === 1) {
    // İkinci dosya
    fileUrl = assignmentData.fileURL2 ?? null;
    fileName = assignmentData.fileName2 ?? null;
    
    // primaryFiles array varsa onu kullan
    if (!fileUrl && assignmentData.primaryFiles && assignmentData.primaryFiles.length > 1) {
      fileUrl = assignmentData.primaryFiles[1]?.url ?? null;
      fileName = assignmentData.primaryFiles[1]?.name ?? null;
    }
  }

  if (!fileUrl) {
    return NextResponse.json({ error: `Ödev dosyası ${fileIndex + 1} bulunamadı.` }, { status: 404 });
  }

  // Dosya adı yoksa buildPrimaryFileName kullan
  const finalFileName = fileName ?? buildPrimaryFileName(assignmentData);
  // İkinci dosya için dosya adına "_2" ekle
  const finalFileNameWithIndex = fileIndex === 1 && !fileName 
    ? finalFileName.replace(/\.(\w+)$/, '_2.$1')
    : finalFileName;

  // forceAttachment=true ile dosyanın indirilmesini sağla
  const signedUrl = await generateSignedUrl(app, fileUrl, true, finalFileNameWithIndex);
  return { downloadUrl: signedUrl, fileName: finalFileNameWithIndex };
}

type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

async function authenticateDownloadRequest(
  request: NextRequest,
  assignmentId: string,
  rateLimitResult: RateLimitResultSuccess
): Promise<AuthResult> {
  const userId = await verifyToken(request);
  if (!userId) {
    apiLogger.warn('Unauthorized download attempt', { assignmentId, ip: rateLimitResult.clientIp });
    return {
      ok: false,
      response: NextResponse.json({ error: 'Yetkisiz erişim. Lütfen giriş yapın.' }, { status: 401 }),
    };
  }

  return { ok: true, userId };
}

type AssignmentContextResult =
  | { ok: true; app: ReturnType<typeof getAdminApp>; assignmentData: any }
  | { ok: false; response: NextResponse };

async function loadAssignmentContext(
  userId: string,
  assignmentId: string,
  fileType: string
): Promise<AssignmentContextResult> {
  const app = getAdminApp();
  const firestore = getFirestore(app);

  const userData = await fetchUserData(firestore, userId);
  if (userData instanceof NextResponse) {
    return { ok: false, response: userData };
  }

  const assignmentData = await fetchAssignmentData(firestore, assignmentId);
  if (assignmentData instanceof NextResponse) {
    return { ok: false, response: assignmentData };
  }

  const accessResult = await ensureStudentAccess(firestore, {
    userData,
    assignmentData,
    assignmentId,
    userId,
    fileType,
  });
  if (accessResult instanceof NextResponse) {
    return { ok: false, response: accessResult };
  }

  return { ok: true, app, assignmentData };
}

async function fulfillDownloadRequest(
  params: RequestParams,
  context: { app: ReturnType<typeof getAdminApp>; assignmentData: any },
  userId: string,
  rateLimitResult: RateLimitResultSuccess,
  startTime: number
): Promise<NextResponse> {
  const { app, assignmentData } = context;
  const { assignmentId, fileType, stream, fileIndex } = params;

  if (stream) {
    return handleStreamDownload(
      app,
      assignmentData,
      fileType,
      fileIndex,
      assignmentId,
      userId,
      rateLimitResult,
      startTime
    );
  }

  return handleJsonDownload(
    app,
    assignmentData,
    fileType,
    fileIndex,
    assignmentId,
    userId,
    rateLimitResult,
    startTime
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const startTime = Date.now();

  try {
    const rateLimitResult = await enforceRateLimit(request);
    if (!rateLimitResult.ok) {
      return rateLimitResult.response;
    }

    const requestParams = await parseRequestParams(params, request);
    const { assignmentId, fileType } = requestParams;
    
    const authResult = await authenticateDownloadRequest(request, assignmentId, rateLimitResult);
    if (!authResult.ok) {
      return authResult.response;
    }

    const userId = authResult.userId;
    apiLogger.logRequest('GET', `/api/assignments/${assignmentId}/download`, userId);

    const contextResult = await loadAssignmentContext(userId, assignmentId, fileType);
    if (!contextResult.ok) {
      return contextResult.response;
    }

    return fulfillDownloadRequest(requestParams, contextResult, userId, rateLimitResult, startTime);
  } catch (error: any) {
    apiLogger.logApiError('File download failed', error, {
      method: 'GET',
      path: `/api/assignments/download`,
      statusCode: 500,
    });

    return NextResponse.json(
      {
        error: 'Dosya indirilirken bir hata oluştu. Lütfen tekrar deneyin.',
      },
      { status: 500 }
    );
  }
}


