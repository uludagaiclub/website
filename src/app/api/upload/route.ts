import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { uploadFile } from '@/lib/google-drive';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { checkRateLimit, getClientIp, RateLimitPresets } from '@/lib/rate-limit';
import { apiLogger } from '@/lib/logger';

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

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }

    return Buffer.concat(chunks);
}

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
    apiLogger.warn('Token verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

type RateLimitInfo = {
  limit: number;
  remaining: number;
  resetTime: number;
};

type RateLimitResult =
  | { ok: true; info: RateLimitInfo }
  | { ok: false; response: NextResponse };

async function enforceStrictRateLimit(request: NextRequest): Promise<RateLimitResult> {
        const clientIp = getClientIp(request);
  const result = checkRateLimit(clientIp, RateLimitPresets.STRICT);
        
  if (result.success) {
    return {
      ok: true,
      info: {
        limit: result.limit,
        remaining: result.remaining,
        resetTime: result.resetTime,
      },
    };
  }

  const resetDate = new Date(result.resetTime);
            apiLogger.warn('Rate limit exceeded for upload', {
                ip: clientIp,
    resetTime: resetDate.toISOString(),
            });
            
  return {
    ok: false,
    response: NextResponse.json(
      {
                error: 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      },
      {
                status: 429,
                headers: {
          'X-RateLimit-Limit': result.limit.toString(),
                    'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetTime.toString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        },
                }
    ),
  };
        }
        
async function ensureAuthenticatedUser(request: NextRequest) {
        const userId = await verifyToken(request);
        if (!userId) {
            return NextResponse.json({ error: 'Yetkisiz erişim. Lütfen giriş yapın.' }, { status: 401 });
        }
  return userId;
}

async function fetchStudentProfile(firestore: ReturnType<typeof getFirestore>, userId: string) {
        const userDoc = await firestore.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
        }

        const userData = userDoc.data();
        if (!userData) {
            return NextResponse.json({ error: 'Kullanıcı verisi bulunamadı.' }, { status: 404 });
        }

        if (userData.role !== 'student') {
    return NextResponse.json(
      { error: 'Sadece öğrenciler ödev yükleyebilir.' },
      { status: 403 }
    );
        }

        if (!userData.classroom || userData.classroom === 'new-signup') {
    return NextResponse.json(
      { error: 'Sınıf bilgisi eksik veya geçersiz. Lütfen öğretmeninizle iletişime geçin.' },
      { status: 403 }
    );
        }

  return userData;
}

async function parseUploadForm(request: NextRequest) {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const assignmentId = formData.get('assignmentId') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 400 });
        }
        if (!assignmentId) {
            return NextResponse.json({ error: 'Ödev ID\'si bulunamadı.' }, { status: 400 });
        }

  return { file, assignmentId };
}

        const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
        const ALLOWED_IPYNB_MIME_TYPES = [
            'application/json',
            'application/x-ipynb+json',
            'text/plain',
  'application/octet-stream',
        ];
        const ALLOWED_DOCX_MIME_TYPES = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
  'application/octet-stream',
];

type ValidatedFile = {
  buffer: Buffer;
  fileType: 'ipynb' | 'docx';
  normalizedFileName: string;
};

/**
 * Detect file type from filename
 * Returns 'ipynb', 'docx', or null
 */
function detectFileType(normalizedName: string): 'ipynb' | 'docx' | null {
  if (normalizedName.endsWith('.ipynb')) {
    return 'ipynb';
  }
  if (normalizedName.endsWith('.docx') || normalizedName.endsWith('.doc')) {
    return 'docx';
  }
  return null;
}

/**
 * Validate file type is allowed for student's classroom
 */
function validateFileTypeForClassroom(
  fileType: 'ipynb' | 'docx' | null,
  studentClassroom: string
): NextResponse | null {
  if (!fileType) {
    return NextResponse.json(
      { error: 'Sadece .ipynb (tüm seviyeler) veya .docx (Junior) dosyaları kabul edilir.' },
      { status: 400 }
    );
        }

  if (fileType === 'docx' && studentClassroom !== 'junior') {
    return NextResponse.json(
      { error: 'Word dosyaları sadece Junior seviyesi için kabul edilir.' },
      { status: 400 }
    );
  }

  return null;
        }

/**
 * Validate MIME type matches file type
 */
function validateMimeType(
  fileType: 'ipynb' | 'docx',
  mimeType: string | null
): NextResponse | null {
  if (!mimeType) {
    return null; // MIME type is optional
  }

  if (fileType === 'ipynb' && !ALLOWED_IPYNB_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: 'Geçersiz dosya tipi. Sadece Jupyter Notebook dosyaları kabul edilir.' },
      { status: 400 }
    );
            }

  if (fileType === 'docx' && !ALLOWED_DOCX_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: 'Geçersiz dosya tipi. Sadece Word dosyaları kabul edilir.' },
      { status: 400 }
    );
            }

  return null;
        }

/**
 * Validate IPYNB file content structure
 */
function validateIpynbContent(buffer: Buffer): NextResponse | null {
  const firstByte = buffer[0];
  if (firstByte !== 0x7b && firstByte !== 0x5b) {
    return NextResponse.json(
      { error: 'Dosya içeriği geçersiz. Dosya JSON formatında olmalıdır.' },
      { status: 400 }
    );
            }

  try {
    JSON.parse(buffer.toString('utf-8'));
    return null;
  } catch {
    return NextResponse.json(
      { error: 'Geçersiz .ipynb dosyası. Dosya içeriği geçerli JSON formatında olmalıdır.' },
      { status: 400 }
    );
            }
        }

async function validateAndParseFile(
  file: File,
  studentClassroom: string
): Promise<ValidatedFile | NextResponse> {
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `Dosya boyutu ${MAX_FILE_SIZE / (1024 * 1024)}MB'dan küçük olmalıdır.` },
      { status: 400 }
    );
  }

  const normalizedName = file.name.toLowerCase();
  const parts = normalizedName.split('.');
  if (parts.length > 2) {
    return NextResponse.json(
      { error: 'Çoklu uzantılı dosyalar güvenlik nedeniyle kabul edilmez.' },
      { status: 400 }
    );
  }

  const fileType = detectFileType(normalizedName);
  const classroomValidation = validateFileTypeForClassroom(fileType, studentClassroom);
  if (classroomValidation) {
    return classroomValidation;
  }

  const buffer = await streamToBuffer(file.stream());

  const mimeValidation = validateMimeType(fileType!, file.type);
  if (mimeValidation) {
    return mimeValidation;
  }

  if (fileType === 'ipynb') {
    const contentValidation = validateIpynbContent(buffer);
    if (contentValidation) {
      return contentValidation;
    }
  }

  return {
    buffer,
    fileType: fileType!,
    normalizedFileName: normalizedName,
  };
}

async function fetchAssignment(
  firestore: ReturnType<typeof getFirestore>,
  assignmentId: string
) {
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

async function ensureAssignmentAccess(
  firestore: ReturnType<typeof getFirestore>,
  assignmentData: any,
  userData: any,
  userId: string,
  assignmentId: string
) {
        const assignmentClassrooms = assignmentData.classroomLevels ?? [];
        if (assignmentClassrooms.length > 0 && !assignmentClassrooms.includes(userData.classroom)) {
    return NextResponse.json(
      { error: 'Bu ödev sizin sınıfınız için değil.' },
      { status: 403 }
    );
        }

        const submissionsQuery = await firestore
            .collection('assignmentSubmissions')
            .where('assignmentId', '==', assignmentId)
            .where('studentId', '==', userId)
            .get();

        const MAX_SUBMISSIONS = 3;
        if (submissionsQuery.size >= MAX_SUBMISSIONS) {
    return NextResponse.json(
      { error: `Bu ödevi maksimum ${MAX_SUBMISSIONS} kez yükleyebilirsiniz.` },
      { status: 403 }
    );
        }

  return submissionsQuery.size + 1;
}

function determineSubmissionTiming(assignmentData: any) {
        const normalizeEndOfDay = (date: Date) => {
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            return end;
        };

        const dueDate = assignmentData.dueDate?.toDate ? assignmentData.dueDate.toDate() : assignmentData.dueDate;
        const lateDueDate = assignmentData.lateDueDate?.toDate ? assignmentData.lateDueDate.toDate() : assignmentData.lateDueDate;
        const dueDateEnd = dueDate ? normalizeEndOfDay(dueDate) : null;
        const lateDateEnd = lateDueDate ? normalizeEndOfDay(lateDueDate) : null;
  const now = new Date();

        if (lateDateEnd && now > lateDateEnd) {
    return NextResponse.json(
      { error: 'Geç teslim süresi sona erdi. Ödev artık teslim alınmıyor.' },
      { status: 403 }
    );
        }

        if (!lateDateEnd && dueDateEnd && now > dueDateEnd) {
    return NextResponse.json(
      { error: 'Teslim süresi sona erdi. Geç teslim süresi tanımlanmadı.' },
      { status: 403 }
    );
        }

  const submissionTiming: 'on-time' | 'late' =
    dueDateEnd && now > dueDateEnd ? 'late' : 'on-time';

  return { submissionTiming, now };
        }

function buildDescriptiveFilename(
  studentName: string,
  studentClassroom: string,
  assignmentData: any,
  submissionTiming: 'on-time' | 'late',
  normalizedFileName: string,
  timestamp: Date
) {
        const sanitizedStudentName = studentName
    .replace(/[/\\]/g, '')
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9çğıöşüÇĞIİÖŞÜ\s\-]/g, '')
            .replace(/\s+/g, '')
            .toLowerCase()
    .substring(0, 30);
        
        const classroomSlug = studentClassroom?.replace('-', '') ?? 'unknown';
  const weekNumber =
    typeof assignmentData.week === 'number' ? assignmentData.week : null;
  const weekPart = weekNumber !== null ? weekNumber.toString() : '';
  const ts = `${String(timestamp.getDate()).padStart(2, '0')}.${String(
    timestamp.getMonth() + 1
  ).padStart(2, '0')}.${timestamp.getFullYear()}:${String(timestamp.getHours()).padStart(
    2,
    '0'
  )}:${String(timestamp.getMinutes()).padStart(2, '0')}:${String(timestamp.getSeconds()).padStart(
    2,
    '0'
  )}`;
        
  const getFileExtension = (filename: string): string => {
            const parts = filename.split('.');
            return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'ipynb';
  };
        
  const fileExtension = getFileExtension(normalizedFileName);
        const timingSuffix = submissionTiming === 'on-time' ? 'vaktinde' : 'gec';

  if (weekPart) {
    return `${classroomSlug}${weekPart}-${sanitizedStudentName}-${ts}-${timingSuffix}.${fileExtension}`;
  }

  return `${classroomSlug}-${sanitizedStudentName}-${ts}-${timingSuffix}.${fileExtension}`;
}

async function uploadSubmissionFile(
  buffer: Buffer,
  descriptiveFilename: string,
  fileType: 'ipynb' | 'docx',
  studentClassroom: string,
  assignmentWeek: number | null
) {
        const fileMetadata = await uploadFile(
    buffer,
            descriptiveFilename,
    fileType === 'ipynb' ? 'application/json' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    undefined,
    assignmentWeek !== null ? { classroom: studentClassroom, week: assignmentWeek.toString() } : { classroom: studentClassroom }
  );
  return fileMetadata;
}

type SubmissionParams = {
  userId: string;
  assignmentId: string;
  assignmentData: any;
  userData: any;
  submissionNumber: number;
  fileMetadata: any;
  submissionTiming: 'on-time' | 'late';
  descriptiveFilename: string;
};

async function recordSubmission(
  firestore: ReturnType<typeof getFirestore>,
  params: SubmissionParams
) {
  const {
    userId,
    assignmentId,
    assignmentData,
    userData,
    submissionNumber,
    fileMetadata,
    descriptiveFilename
  } = params;

  const submissionData = {
            assignmentId,
            studentId: userId,
    studentName: userData.displayName ?? userData.name ?? 'Bilinmeyen Öğrenci',
    submittedAt: FieldValue.serverTimestamp(),
    submissionNumber,
    grade: null as number | null,
    feedback: null as string | null,
    submittedFileName: descriptiveFilename,
    submittedFileUrl: fileMetadata.webViewLink ?? null,
    driveFileId: fileMetadata.id ?? null,
    classroomLevel: userData.classroom ?? null,
    assignmentWeek: assignmentData.week ?? null,
  };

  await firestore.collection('assignmentSubmissions').add(submissionData);
  return submissionData;
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await enforceStrictRateLimit(request);
  if (!rateLimitResult.ok) {
    return rateLimitResult.response;
  }

  const userIdResult = await ensureAuthenticatedUser(request);
  if (userIdResult instanceof NextResponse) {
    return userIdResult;
  }
  const userId = userIdResult;

  const app = getAdminApp();
  const firestore = getFirestore(app);

  const userDataResult = await fetchStudentProfile(firestore, userId);
  if (userDataResult instanceof NextResponse) {
    return userDataResult;
  }
  const userData = userDataResult;

  const formResult = await parseUploadForm(request);
  if (formResult instanceof NextResponse) {
    return formResult;
  }
  const { file, assignmentId } = formResult;

  const fileResult = await validateAndParseFile(file, userData.classroom);
  if (fileResult instanceof NextResponse) {
    return fileResult;
  }
  const { buffer, fileType, normalizedFileName } = fileResult;

  const assignmentResult = await fetchAssignment(firestore, assignmentId);
  if (assignmentResult instanceof NextResponse) {
    return assignmentResult;
  }
  const assignmentData = assignmentResult;

  // Check if submissions are allowed for this assignment
  const allowSubmissions = assignmentData.allowSubmissions ?? true; // Default true
  if (!allowSubmissions) {
    return NextResponse.json(
      { error: 'Bu ödev için yükleme kapatılmıştır.' },
      { status: 403 }
    );
  }

  const accessResult = await ensureAssignmentAccess(
    firestore,
    assignmentData,
    userData,
    userId,
    assignmentId
  );
  if (accessResult instanceof NextResponse) {
    return accessResult;
  }
  const submissionNumber = accessResult;

  const timingResult = determineSubmissionTiming(assignmentData);
  if (timingResult instanceof NextResponse) {
    return timingResult;
  }
  const { submissionTiming, now } = timingResult;

  const descriptiveFilename = buildDescriptiveFilename(
    userData.displayName ?? userData.name ?? 'Bilinmeyen Öğrenci',
    userData.classroom,
    assignmentData,
            submissionTiming,
    normalizedFileName,
    now
  );

  try {
    const fileMetadata = await uploadSubmissionFile(
      buffer,
      descriptiveFilename,
      fileType,
      userData.classroom,
      assignmentData.week ?? null
    );

    await recordSubmission(firestore, {
      userId,
      assignmentId,
      assignmentData,
      userData,
      submissionNumber,
      fileMetadata,
      submissionTiming,
      descriptiveFilename
        });
        
    // Yükleme yapıldığında da indirme sayısını artır
    const downloadsQuery = await firestore
      .collection('assignmentDownloads')
      .where('assignmentId', '==', assignmentId)
      .where('studentId', '==', userId)
      .get();

    const MAX_DOWNLOADS = 10;
    if (downloadsQuery.size < MAX_DOWNLOADS) {
      await firestore.collection('assignmentDownloads').add({
        assignmentId,
        studentId: userId,
        fileType: 'submission', // Yükleme işlemi
        downloadedAt: new Date(),
        downloadCount: downloadsQuery.size + 1,
      });
    }
        
    apiLogger.info('Assignment submission successful', {
      userId,
      assignmentId,
      submissionNumber,
      filename: descriptiveFilename,
    });
        
    return NextResponse.json(
      {
        message: 'Ödev başarıyla yüklendi.',
        submissionNumber,
            fileId: fileMetadata.id,
        webViewLink: fileMetadata.webViewLink,
      },
      {
            status: 200,
            headers: {
          'X-RateLimit-Limit': rateLimitResult.info.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.info.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.info.resetTime.toString(),
        },
      }
    );
  } catch (error) {
    apiLogger.error('Assignment submission failed', error as Error, {
      userId,
      assignmentId,
    });
        
    return NextResponse.json(
      {
        error: (error instanceof Error ? error.message : null) ?? 'Ödev yüklenirken bir hata oluştu.',
      },
      { status: 500 }
    );
    }
}
