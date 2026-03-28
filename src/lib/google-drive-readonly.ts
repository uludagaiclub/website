import { google } from 'googleapis';

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

// Define the required scopes for Google Drive (read-only for AI Agent)
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

/**
 * Creates an authenticated Google Drive API client with read-only access.
 * @returns A Google Drive v3 API client instance.
 */
export function getDriveReadOnlyClient() {
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

