
import { google } from 'googleapis';
import { Readable } from 'stream';

// Lazy-load environment variables to avoid build-time errors
function getServiceAccountKey() {
  const SERVICE_ACCOUNT_KEY_BASE64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  const SERVICE_ACCOUNT_KEY_STRING = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (!SERVICE_ACCOUNT_KEY_BASE64 && !SERVICE_ACCOUNT_KEY_STRING) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 veya GOOGLE_SERVICE_ACCOUNT_KEY ortam değişkeni ayarlanmadı.");
  }

  try {
    const jsonString = SERVICE_ACCOUNT_KEY_BASE64
      ? Buffer.from(SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString('utf8')
      : (SERVICE_ACCOUNT_KEY_STRING as string);
    return JSON.parse(jsonString);
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Failed to parse service account key from environment. Provide valid JSON (prefer base64).", e);
    }
    throw new Error("Service account key could not be parsed.");
  }
}

// Define the required scopes for Google Drive
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

/**
 * Creates an authenticated Google Drive API client.
 * @returns A Google Drive v3 API client instance.
 */
function getDriveClient() {
  const SERVICE_ACCOUNT_KEY = getServiceAccountKey();
  const WORKSPACE_IMPERSONATE_EMAIL = process.env.GOOGLE_WORKSPACE_IMPERSONATE_EMAIL;
  
  const rawKey = (SERVICE_ACCOUNT_KEY.private_key as string) || '';
  const normalizedPrivateKey = rawKey.includes('\\n')
    ? rawKey.replace(/\\n/g, '\n')
    : rawKey;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: SERVICE_ACCOUNT_KEY.client_email,
      private_key: normalizedPrivateKey,
      project_id: SERVICE_ACCOUNT_KEY.project_id,
      type: SERVICE_ACCOUNT_KEY.type,
      private_key_id: SERVICE_ACCOUNT_KEY.private_key_id,
      client_id: SERVICE_ACCOUNT_KEY.client_id,
      auth_uri: SERVICE_ACCOUNT_KEY.auth_uri,
      token_uri: SERVICE_ACCOUNT_KEY.token_uri,
      auth_provider_x509_cert_url: SERVICE_ACCOUNT_KEY.auth_provider_x509_cert_url,
      client_x509_cert_url: SERVICE_ACCOUNT_KEY.client_x509_cert_url,
      universe_domain: SERVICE_ACCOUNT_KEY.universe_domain,
    } as any,
    scopes: SCOPES,
    clientOptions: WORKSPACE_IMPERSONATE_EMAIL ? { subject: WORKSPACE_IMPERSONATE_EMAIL } : undefined,
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Creates a Google Drive client using OAuth token (for user uploads)
 */
function getDriveClientWithOAuthToken(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

// Helper: Debug logging for development environment
function logDev(prefix: string, data: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(prefix, data);
  }
}

function logDevError(prefix: string, data: any) {
  if (process.env.NODE_ENV === 'development') {
    console.error(prefix, data);
  }
}

// Helper: Validate and get base folder ID
function validateBaseFolderId(): string {
  const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
  
  if (!GOOGLE_DRIVE_FOLDER_ID) {
    logDevError('[Drive] ERROR: GOOGLE_DRIVE_FOLDER_ID is not set. Available env vars:', 
      Object.keys(process.env).filter(k => k.includes('GOOGLE'))
    );
    throw new Error("GOOGLE_DRIVE_FOLDER_ID ortam değişkeni ayarlanmadı.");
  }
  
  return GOOGLE_DRIVE_FOLDER_ID;
}

// Helper: Log environment check
function logEnvironmentCheck() {
  logDev('[Drive] Environment check:', {
    GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID ? 'SET' : 'NOT SET',
    GOOGLE_SERVICE_ACCOUNT_KEY_BASE64: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 ? 'SET' : 'NOT SET',
    GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
  });
}

// Helper: Resolve target folder with nested folder creation
async function resolveTargetFolder(
  drive: ReturnType<typeof google.drive>,
  baseFolderId: string,
  options?: { classroom?: string; week?: string }
): Promise<string> {
  let targetParentId = baseFolderId;

  if (options?.classroom) {
    logDev('[Drive] Ensuring classroom folder:', `${options.classroom} under ${targetParentId}`);
    targetParentId = await ensureFolderExists(drive, targetParentId, options.classroom);
    logDev('[Drive] Classroom folder ID:', targetParentId);
  }

  if (options?.week) {
    logDev('[Drive] Ensuring week folder:', `${options.week} under ${targetParentId}`);
    targetParentId = await ensureFolderExists(drive, targetParentId, options.week);
    logDev('[Drive] Week folder ID:', targetParentId);
  }

  return targetParentId;
}

// Helper: Format upload error message
function formatUploadError(error: any, targetParentId: string, baseFolderId: string): Error {
  const detailed = error?.response?.data?.error?.message ?? error?.message ?? 'Bilinmeyen hata';
  
  logDevError("[Drive] Upload error:", detailed);
  logDevError("[Drive] Target folder ID:", targetParentId);
  logDevError("[Drive] Base folder ID:", baseFolderId);
  logDevError("[Drive] Full error:", JSON.stringify(error?.response?.data, null, 2));
  
  const isQuotaError = detailed.includes('storage quota') || detailed.includes('Service Accounts do not have storage');
  
  if (isQuotaError) {
    const SERVICE_ACCOUNT_KEY = getServiceAccountKey();
    return new Error(
      `Drive yükleme hatası: Klasör Shared Drive içinde olmalı ve servis hesabı (${SERVICE_ACCOUNT_KEY.client_email}) sürücü düzeyinde 'Düzenleyici' olmalı. Klasör ID: ${baseFolderId}`
    );
  }
  
  return new Error(detailed);
}

/**
 * Uploads a file to a specified Google Drive folder.
 * @param fileBuffer The file content as a Buffer.
 * @param fileName The desired name for the file in Google Drive.
 * @param mimeType The MIME type of the file.
 * @param userAccessToken Optional OAuth access token from user (if provided, uses user's Drive quota)
 * @returns The metadata of the uploaded file.
 */
export async function uploadFile(
  fileBuffer: Buffer, 
  fileName: string, 
  mimeType: string,
  userAccessToken?: string,
  options?: { classroom?: string; week?: string }
) {
  logEnvironmentCheck();
  const baseFolderId = validateBaseFolderId();
  
  logDev('[Drive] Starting upload:', {
    baseFolderId,
      fileName,
      classroom: options?.classroom,
      week: options?.week,
      fileSize: fileBuffer.length,
      usingOAuth: !!userAccessToken
    });
  
  const drive = userAccessToken 
    ? getDriveClientWithOAuthToken(userAccessToken)
    : getDriveClient();

  const targetParentId = await resolveTargetFolder(drive, baseFolderId, options);

  const fileMetadata = {
    name: fileName,
    parents: [targetParentId],
  } as const;

  const media = {
    mimeType: mimeType,
    body: Readable.from(fileBuffer),
  };

  try {
    logDev('[Drive] Creating file:', {
        fileName: fileMetadata.name,
        parentId: targetParentId,
        mimeType: media.mimeType
      });
    
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id,name,parents,webViewLink',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    
    logDev('[Drive] File created successfully:', {
        fileId: response.data.id,
        fileName: response.data.name,
        parents: response.data.parents,
        webViewLink: response.data.webViewLink
      });
    
    return response.data;
  } catch (error: any) {
    throw formatUploadError(error, targetParentId, baseFolderId);
  }
}

// Create a folder under a parent if not exists, return its ID
async function ensureFolderExists(
  drive: ReturnType<typeof google.drive>,
  parentId: string,
  folderName: string
): Promise<string> {
  // Try to find existing folder by name under parent
  const listRes = await drive.files.list({
    q: `name = '${escapeQuery(folderName)}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const existing = listRes.data.files?.[0];
  if (existing?.id) return existing.id;

  // Create if not exists
  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });
  if (!createRes.data.id) throw new Error('Klasör oluşturulamadı');
  return createRes.data.id;
}

function escapeQuery(value: string): string {
  return value.replace(/'/g, "\\'");
}
