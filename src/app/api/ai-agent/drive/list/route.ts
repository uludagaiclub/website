import { NextRequest, NextResponse } from 'next/server';
import { getDriveReadOnlyClient } from '@/lib/google-drive-readonly';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { apiLogger } from '@/lib/logger';
import { checkRateLimit, getClientIp, RateLimitPresets } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

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

// Verify Firebase ID token
async function verifyToken(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    apiLogger.error('Token verification failed', error as Error);
    return null;
  }
}

// Check if user is teacher
async function isTeacher(uid: string): Promise<boolean> {
  try {
    const adminApp = getAdminApp();
    const firestore = getFirestore(adminApp);
    const userDoc = await firestore.collection('users').doc(uid).get();
    const userData = userDoc.data();
    return userData?.role === 'teacher';
  } catch (error) {
    apiLogger.error('Failed to check user role', error as Error);
    return false;
  }
}

// Validate folderId format
function isValidFolderId(folderId: string | null): boolean {
  if (!folderId) return false;
  // Google Drive ID format: alphanumeric, hyphens, underscores, 19-33 chars
  // Also check for path traversal attempts
  const folderIdRegex = /^[a-zA-Z0-9_-]{19,33}$/;
  return folderIdRegex.test(folderId) && !folderId.includes('..') && !folderId.includes('/');
}

// Build whitelist of allowed folder IDs
function buildAllowedFolderIdsList(): string[] {
  const allowedFolderIds: string[] = [];
  const defaultFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  
  if (defaultFolderId && isValidFolderId(defaultFolderId)) {
    allowedFolderIds.push(defaultFolderId);
  }
  
  const additionalFolderIds = process.env.GOOGLE_DRIVE_ALLOWED_FOLDER_IDS?.split(',')
    .filter(id => isValidFolderId(id.trim())) ?? [];
  allowedFolderIds.push(...additionalFolderIds);
  
  return allowedFolderIds;
}

// Validate and resolve folderId from request
async function validateAndResolveFolderId(
  requestedFolderId: string | null,
  uid: string,
  driveClient: ReturnType<typeof getDriveReadOnlyClient>
): Promise<{ folderId: string } | { error: NextResponse }> {
  const defaultFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const allowedFolderIds = buildAllowedFolderIdsList();

  if (requestedFolderId) {
    if (!isValidFolderId(requestedFolderId)) {
      apiLogger.warn('Invalid folderId format', { folderId: requestedFolderId, uid });
      return {
        error: NextResponse.json(
          {
            files: [],
            error: 'Geçersiz klasör ID formatı. Klasör ID\'si yalnızca alfanumerik karakterler içermeli ve 19-33 karakter uzunluğunda olmalıdır.'
          },
          { status: 400 }
        )
      };
    }

    if (allowedFolderIds.length > 0 && !allowedFolderIds.includes(requestedFolderId)) {
      const isDescendant = await isFolderWithinAllowedHierarchy(driveClient, requestedFolderId, allowedFolderIds);
      if (!isDescendant) {
        apiLogger.warn('Unauthorized folderId access attempt', { folderId: requestedFolderId, uid, allowedFolderIds });
        return {
          error: NextResponse.json(
            { files: [], error: 'Bu klasör ID\'sine erişim yetkiniz yok.' },
            { status: 403 }
          )
        };
      }
    }

    return { folderId: requestedFolderId };
  }

  if (defaultFolderId) {
    if (!isValidFolderId(defaultFolderId)) {
      apiLogger.error('Invalid default folderId in environment', new Error(`Invalid folderId: ${defaultFolderId}`));
      return {
        error: NextResponse.json(
          { files: [], error: 'Yapılandırma hatası: Geçersiz varsayılan klasör ID formatı.' },
          { status: 500 }
        )
      };
    }
    return { folderId: defaultFolderId };
  }

  return {
    error: NextResponse.json({ files: [], error: 'GOOGLE_DRIVE_FOLDER_ID tanımlı değil.' })
  };
}

// Verify folder access and get folder info
async function verifyFolderAccess(
  driveClient: any,
  folderId: string
): Promise<{ folderInfo: any } | { error: NextResponse }> {
  try {
    const folderResponse = await driveClient.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType',
      supportsAllDrives: true,
    });
    const folderInfo = folderResponse.data;
    apiLogger.info('Folder accessed successfully', { folderId, folderName: folderInfo.name });
    return { folderInfo };
  } catch (folderError: any) {
    apiLogger.error('Failed to access folder', folderError as Error);
    const errorCode = folderError.code ?? folderError.response?.status;
    
    if (errorCode === 404) {
      return {
        error: NextResponse.json({
          files: [],
          error: `Klasör bulunamadı (ID: ${folderId}). Klasör ID'sini ve servis hesabının paylaşım izinlerini kontrol edin.`
        })
      };
    }
    
    if (errorCode === 403) {
      return {
        error: NextResponse.json({
          files: [],
          error: `Klasöre erişim izni yok (ID: ${folderId}). Servis hesabına (uludag-ai-club@studio-1335263767-c36ff.iam.gserviceaccount.com) klasör için 'Görüntüleyen' veya 'Düzenleyici' izni verin.`
        })
      };
    }

    throw folderError;
  }
}

// Get allowed file types based on excelOnly flag
function getAllowedFileTypes(excelOnly: boolean) {
  const driveAllowedExtensions = ['.csv', '.ipynb', '.doc', '.docx', '.xlsx', '.xls'];
  const driveAllowedMimeTypes = [
    'text/csv',
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];

  const excelAllowedExtensions = ['.xlsx', '.xls', '.csv'];
  const excelAllowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.google-apps.spreadsheet',
    'text/csv'
  ];

  return {
    extensions: excelOnly ? excelAllowedExtensions : driveAllowedExtensions,
    mimeTypes: excelOnly ? excelAllowedMimeTypes : driveAllowedMimeTypes
  };
}

// Check if file should be included in results
function shouldIncludeFile(
  file: any,
  allowedExtensions: string[],
  allowedMimeTypes: string[]
): boolean {
  const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
  if (isFolder) return true;

  const name = (file.name ?? '').toLowerCase();
  const isAllowedExtension = allowedExtensions.some(ext => name.endsWith(ext));
  const isAllowedMimeType = allowedMimeTypes.includes(file.mimeType ?? '');
  return isAllowedExtension || isAllowedMimeType;
}

// Filter and sort files
function filterAndSortFiles(
  files: any[],
  allowedExtensions: string[],
  allowedMimeTypes: string[]
) {
  type FileItem = {
    id: string;
    name: string;
    mimeType: string;
    size: string | null;
    modifiedTime: string | undefined;
    createdTime: string | undefined;
    isFolder: boolean;
  };

  return files
    .map(file => {
      if (!shouldIncludeFile(file, allowedExtensions, allowedMimeTypes)) {
        return null;
      }

      const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: isFolder ? null : file.size,
        modifiedTime: file.modifiedTime,
        createdTime: file.createdTime,
        isFolder
      };
    })
    .filter((item): item is FileItem => item !== null)
    .sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return 0;
    });
}

async function isFolderWithinAllowedHierarchy(
  driveClient: ReturnType<typeof getDriveReadOnlyClient>,
  folderId: string,
  allowedFolderIds: string[],
  maxDepth = 10
): Promise<boolean> {
  if (allowedFolderIds.includes(folderId)) {
    return true;
  }

  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: folderId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id) || depth >= maxDepth) {
      continue;
    }
    visited.add(id);

    try {
      const response = await driveClient.files.get({
        fileId: id,
        fields: 'id, parents',
        supportsAllDrives: true,
      });
      const parents = response.data.parents ?? [];
      for (const parentId of parents) {
        if (allowedFolderIds.includes(parentId)) {
          return true;
        }
        if (!visited.has(parentId)) {
          queue.push({ id: parentId, depth: depth + 1 });
        }
      }
    } catch (error) {
      apiLogger.warn('Failed to verify folder ancestry', { folderId: id, error: (error as Error).message });
      return false;
    }
  }

  return false;
}

// Handle Drive list errors
function handleDriveListError(error: any, request: NextRequest): NextResponse {
  apiLogger.error('Drive list error', error as Error);
  let friendlyMessage = error.message ?? 'Excel dosyaları listesi alınamadı';
  const errorCode = error.code ?? error.response?.status;
  const errorReason = Array.isArray(error.errors) && error.errors.length > 0 ? error.errors[0].reason : null;

  if (errorCode === 404 || errorReason === 'notFound') {
    const errorFolderId = new URL(request.url).searchParams.get('folderId') ?? process.env.GOOGLE_DRIVE_FOLDER_ID;
    friendlyMessage = `Klasör bulunamadı. GOOGLE_DRIVE_FOLDER_ID değerini ve servis hesabının paylaşım izinlerini kontrol edin. ID: ${errorFolderId ?? 'belirtilmedi'}`;
  } else if (errorCode === 403 || errorReason === 'insufficientPermissions') {
    friendlyMessage = 'Google Drive izni reddedildi. Servis hesabına ilgili klasör için erişim verildiğinden emin olun.';
  }

  return NextResponse.json({ files: [], error: friendlyMessage });
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, RateLimitPresets.MODERATE);
    if (!rateLimitResult.success) {
      apiLogger.warn('Rate limit exceeded for AI Agent drive list', {
        ip: clientIp,
        resetTime: new Date(rateLimitResult.resetTime).toISOString(),
      });
      return NextResponse.json(
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
      );
    }

    // Verify authentication
    const uid = await verifyToken(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is teacher
    const userIsTeacher = await isTeacher(uid);
    if (!userIsTeacher) {
      return NextResponse.json({ error: 'Only teachers can access AI Agent' }, { status: 403 });
    }

    // Get request parameters
    const { searchParams } = new URL(request.url);
    const requestedFolderId = searchParams.get('folderId');
    const excelOnly = searchParams.get('excelOnly') === 'true';

    // Get Drive client early (used for validation and listing)
    const driveClient = getDriveReadOnlyClient();

    // Validate and resolve folderId
    const folderIdResult = await validateAndResolveFolderId(requestedFolderId, uid, driveClient);
    if ('error' in folderIdResult) {
      return folderIdResult.error;
    }
    const { folderId } = folderIdResult;
    const folderAccessResult = await verifyFolderAccess(driveClient, folderId);
    if ('error' in folderAccessResult) {
      return folderAccessResult.error;
    }
    const { folderInfo } = folderAccessResult;

    // Query Drive folder
    const query = `'${folderId}' in parents and trashed = false`;
    apiLogger.info('Querying Drive folder', { folderId, query });

    const response = await driveClient.files.list({
      q: query,
      fields: 'files(id, name, mimeType, size, modifiedTime, createdTime)',
      orderBy: 'modifiedTime desc',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    apiLogger.info('Drive API response', { 
      folderId, 
      totalFiles: response.data.files?.length ?? 0,
      files: response.data.files?.map(f => ({ 
        name: f.name, 
        mimeType: f.mimeType, 
        isFolder: f.mimeType === 'application/vnd.google-apps.folder' 
      }))
    });

    // Filter and sort files
    const { extensions, mimeTypes } = getAllowedFileTypes(excelOnly);
    const files = filterAndSortFiles(response.data.files ?? [], extensions, mimeTypes);

    apiLogger.info('Drive files listed successfully', { 
      folderId, 
      totalCount: files.length,
      folderCount: files.filter((f): f is typeof f & { isFolder: true } => f.isFolder).length,
      fileCount: files.filter((f): f is typeof f & { isFolder: false } => !f.isFolder).length
    });

    return NextResponse.json(
      { 
        files, 
        folderId,
        folderName: folderInfo?.name ?? null
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        },
      }
    );
  } catch (error: any) {
    return handleDriveListError(error, request);
  }
}

