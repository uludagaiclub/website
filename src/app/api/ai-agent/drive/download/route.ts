import { NextRequest, NextResponse } from 'next/server';
import { getDriveReadOnlyClient } from '@/lib/google-drive-readonly';
import { FileAgent } from '@/lib/file-agent';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { apiLogger } from '@/lib/logger';
import { checkRateLimit, getClientIp, RateLimitPresets } from '@/lib/rate-limit';
import * as mammoth from 'mammoth';
import { ChatGroq } from '@langchain/groq';
import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

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

// Lazy initialization of LangChain model (only at runtime, not build time)
function getModel() {
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    return null; // Return null instead of throwing during build
  }

  return new ChatGroq({
    apiKey: groqApiKey,
    model: process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
    temperature: 0.7,
    maxTokens: 8192,
  });
}

const fileAgent = new FileAgent();

const DEFAULT_MAX_INPUT_TOKENS = parseInt(process.env.MODEL_MAX_INPUT_TOKENS ?? '5500', 10);
const APPROX_CHARS_PER_TOKEN = 4;

function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / APPROX_CHARS_PER_TOKEN);
}

function enforceTokenLimit(rawContent: string, options: { maxTokens?: number; sourceName?: string; keepTailRatio?: number } = {}) {
  const {
    maxTokens = DEFAULT_MAX_INPUT_TOKENS,
    sourceName = 'dosya',
    keepTailRatio = 0.3
  } = options;

  const originalTokens = estimateTokenCount(rawContent);

  if (originalTokens <= maxTokens) {
    return {
      content: rawContent,
      truncated: false,
      originalTokens,
      limitedTokens: originalTokens,
      originalLength: rawContent.length
    };
  }

  const maxChars = Math.max(1000, maxTokens * APPROX_CHARS_PER_TOKEN);
  const tailChars = Math.max(200, Math.floor(maxChars * keepTailRatio));
  const headChars = Math.max(800, maxChars - tailChars);

  const head = rawContent.slice(0, headChars);
  const tail = rawContent.slice(-tailChars);

  const truncatedContent = [
    head.trimEnd(),
    `\n\n[İÇERİK KISALTILDI: "${sourceName}" dosyası model limitlerini aştığı için yalnızca ilk ve son bölümler dahil edildi. Toplam karakter: ${rawContent.length}]\n`,
    tail.trimStart()
  ].join('');

  const limitedTokens = estimateTokenCount(truncatedContent);

  if (process.env.NODE_ENV === 'development') {
    console.warn(`Content for ${sourceName} truncated from ~${originalTokens} tokens to ~${limitedTokens} tokens (limit ${maxTokens}).`);
  }

  return {
    content: truncatedContent,
    truncated: true,
    originalTokens,
    limitedTokens,
    originalLength: rawContent.length
  };
}

async function analyzeAssignment(sessionId: string, originalName: string, processedContent: string) {
  const chatPrompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `Sen Ödev Kontrolcüsüsün. TÜM YANITLARINI TÜRKÇE ve DETAYLI VER!

Görev: Dosya içeriğine dayanarak ödevi değerlendir ve PUAN VER.

1. ÖĞRENCİ ADI BULMA:
   - ÖNCE dosya adından öğrenci adını çıkar (örn: "juniorplus1-talhaçalım-30.11.2025" → "Talha Çalım")
   - Dosya adında tire (-) veya alt çizgi (_) ile ayrılmış isimleri kontrol et
   - Dosya içeriğinde de öğrenci adını ara (değişken adları, yorumlar, print ifadeleri)
   - Bulamazsan "Bilinmiyor" yaz

2. Ödev kapsamını (konu ve alt başlıklar) ve soru durumlarını çıkar.
3. Her soru için: Başlık, Beklenen, Mevcut, Durum (doğru/yanlış/boş), Detaylı gerekçe, gerekiyorsa düzeltme önerisi ver.
4. Yanıtı kesinlikle şu MARKDOWN başlıklarıyla döndür:
   ## Öğrenci
   ## Detaylı Analiz
   ## Toplamlar
   ## Puan
   ## Geri Bildirim
   ## Düzeltme Kodları

ÖNEMLİ PUAN VERME KURALLARI:
- MUTLAKA "## Puan" başlığı altında puan ver (0-100 arası tam sayı)
- Puan formatı: "## Puan\n85" veya "## Puan\n85 puan" veya "## Puan\n85/100"
- Puanı şu kriterlere göre ver:
  * Tüm sorular doğruysa: 90-100
  * Çoğu soru doğruysa: 70-89
  * Yarısı doğruysa: 50-69
  * Azı doğruysa: 30-49
  * Çoğu yanlış/boşsa: 0-29
- Puanı mutlaka "## Puan" başlığı altında belirt, aksi halde sistem puanı bulamaz!

Kurallar:
- Sadece dosya içeriğine göre değerlendir; varsayım yapma. Belirsizse "Belirsiz" de.
- Toplamlar bölümünde doğru/yanlış/boş soru adetlerini ver.
- Geri Bildirim bölümünde DETAYLI ve KİŞİSELLEŞTİRİLMİŞ öneriler hazırla:
  * Öğrenci adını kullan (örn: "Talha, ödevinde şunları yapmalısın...")
  * Her soru için özel geri bildirim ver
  * Yapıcı ve teşvik edici ol
  * Somut örnekler ve adımlar içer
  * En az 4-5 maddelik detaylı öneriler sun
- Düzeltme Kodları bölümünde yalnızca gerekli kod bloklarını Markdown olarak sağla; kod yoksa "Kod gerekmiyor" yaz.
- Detaylı Analiz bölümünde her soru için kapsamlı açıklama yap.`
    ),
    HumanMessagePromptTemplate.fromTemplate("{input}")
  ]);

  // Create chain without message history (stateless)
  // Lazy initialization - only at runtime, not build time
  const model = getModel();
  if (!model) {
    throw new Error('AI model initialization failed. Please check environment variables (GROQ_API_KEY).');
  }
  const chain = chatPrompt.pipe(model);

  const {
    content: limitedContent,
    truncated,
    originalTokens,
    limitedTokens,
    originalLength
  } = enforceTokenLimit(processedContent, { sourceName: originalName });

  // Excel dosyası kontrolü
  const isExcelFile = originalName.toLowerCase().endsWith('.xlsx') || 
                     originalName.toLowerCase().endsWith('.xls') ||
                     originalName.toLowerCase().includes('excel') ||
                     originalName.toLowerCase().includes('sheet');

  let message: string;
  if (isExcelFile) {
    message = `Bu Excel dosyası öğrenci kayıtları içermektedir. Aşağıdaki ${originalName} dosyasındaki öğrenci bilgilerini (isim, soyisim, tarih, saat, not, geri bildirim) analiz et ve özetle:\n\n${limitedContent}`;
  } else {
    message = `Dosya Adı: ${originalName}\n\nÖNEMLİ: Dosya adından öğrenci ismini çıkar (tire veya alt çizgi ile ayrılmış kısımları kontrol et). Örnek: "juniorplus1-talhaçalım-30.11.2025" → "Talha Çalım"\n\nAşağıdaki dosya içeriğini değerlendir:\n\n${limitedContent}`;
  }

  if (truncated) {
    message = `UYARI: Girdi içeriği model sınırlarını aştığı için otomatik kısaltıldı. Değerlendirirken eksik kısımlar olabileceğini belirt.\n\n${message}`;
  }

  // Direct invoke without history
  const response = await chain.invoke({ input: message });

  const responseText = (response.content as string) ?? JSON.stringify(response);

  return {
    responseText,
    truncated,
    tokenInfo: {
      originalTokens,
      limitedTokens,
      originalLength
    }
  };
}

type SupportedFileType = 'ipynb' | 'csv' | 'excel' | 'python' | 'word-docx' | 'word-doc';

function normalizeFileMeta(fileName: string, mimeType: string = '') {
  const lowerName = (fileName ?? '').toLowerCase();
  const normalizedMime = (mimeType ?? '').toLowerCase();
  return { lowerName, normalizedMime };
}

function detectFileType(lowerName: string, normalizedMime: string): SupportedFileType | null {
  const isIpynb = normalizedMime === 'application/x-ipynb+json'
    || normalizedMime === 'application/json'
    || lowerName.endsWith('.ipynb');

  if (isIpynb) {
    return 'ipynb';
  }

  if (normalizedMime === 'text/csv' || lowerName.endsWith('.csv')) {
    return 'csv';
  }

  const isExcel = normalizedMime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    || normalizedMime === 'application/vnd.ms-excel'
    || lowerName.endsWith('.xlsx')
    || lowerName.endsWith('.xls');

  if (isExcel) {
    return 'excel';
  }

  if (lowerName.endsWith('.py')) {
    return 'python';
  }

  const isWordDocx = normalizedMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || lowerName.endsWith('.docx');

  if (isWordDocx) {
    return 'word-docx';
  }

  const isLegacyWord = normalizedMime === 'application/msword' || lowerName.endsWith('.doc');
  if (isLegacyWord) {
    return 'word-doc';
  }

  return null;
}

async function processIpynbContent(rawContent: Buffer | string): Promise<string> {
    const content = typeof rawContent === 'string' ? rawContent : rawContent.toString('utf8');
    const plainText = await fileAgent.processIPYNB(content);

    if (typeof fileAgent.ipynbToAssignmentsMarkdown === 'function') {
      try {
        const structured = await fileAgent.ipynbToAssignmentsMarkdown(content);
      if (structured?.trim()) {
          return [
            '### Özet',
            structured.trim(),
            '',
            '### Ham İçerik',
            plainText
          ].join('\n');
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('ipynbToAssignmentsMarkdown başarısız, ham içerik kullanılacak:', err);
        }
      }
    }

    return plainText;
  }

async function processCsvContent(rawContent: Buffer | string): Promise<string> {
    const content = typeof rawContent === 'string' ? rawContent : rawContent.toString('utf8');
  return fileAgent.processCSV(content);
  }

async function processExcelContent(rawContent: Buffer | string): Promise<string> {
    const excelBuffer = Buffer.isBuffer(rawContent) ? rawContent : Buffer.from(rawContent);
  return fileAgent.processExcel(excelBuffer);
  }

async function processPythonContent(rawContent: Buffer | string): Promise<string> {
    return typeof rawContent === 'string' ? rawContent : rawContent.toString('utf8');
  }

async function processWordDocxContent(rawContent: Buffer | string): Promise<string> {
    try {
      const buffer = Buffer.isBuffer(rawContent) ? rawContent : Buffer.from(rawContent);
      const result = await mammoth.extractRawText({ buffer });
      return result.value ?? 'Word dosyası içeriği okunamadı.';
    } catch (err) {
      console.error('Word dosyası işleme hatası:', err);
      throw new Error(`Word dosyası işlenemedi: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

function processLegacyWordContent(): string {
    return 'Bu Word dosyası formatı (.doc) şu anda desteklenmiyor. Lütfen .docx formatında yükleyin.';
  }

async function prepareFileContentForAnalysis(fileName: string, rawContent: Buffer | string, mimeType: string = ''): Promise<string> {
  const { lowerName, normalizedMime } = normalizeFileMeta(fileName, mimeType);
  const fileType = detectFileType(lowerName, normalizedMime);

  switch (fileType) {
    case 'ipynb':
      return processIpynbContent(rawContent);
    case 'csv':
      return processCsvContent(rawContent);
    case 'excel':
      return processExcelContent(rawContent);
    case 'python':
      return processPythonContent(rawContent);
    case 'word-docx':
      return processWordDocxContent(rawContent);
    case 'word-doc':
      return processLegacyWordContent();
    default:
  throw new Error(`Desteklenmeyen dosya türü: ${fileName}`);
  }
}

function isDriveNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const possibleError = error as { code?: number; response?: { status?: number } };
  const status = possibleError.response?.status ?? possibleError.code;
  return status === 404;
}

interface FileDownloadResult {
  fileBuffer: Buffer | null;
  fileMetadata: {
    id?: string | null;
    name?: string | null;
    size?: string | null;
    mimeType?: string | null;
    webViewLink?: string | null;
    createdTime?: string | null;
    modifiedTime?: string | null;
  } | null;
  resolvedFileName: string;
  resolvedMimeType: string;
  source: 'drive' | 'storage' | null;
  storageDownloadMeta: { size?: string | null; mimeType?: string | null } | null;
  exportMimeTypeUsed: string | null;
}

function createRateLimitResponse(rateLimitResult: { resetTime: number; limit: number }): NextResponse {
  const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
  return NextResponse.json(
    {
      error: 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.',
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}

function validateRequest(fileName: string | undefined, fileId: string | undefined): NextResponse | null {
  if (!fileName) {
    return NextResponse.json({ error: 'fileName alanı gerekli.' }, { status: 400 });
  }

  if (!fileId) {
    return NextResponse.json(
      { error: 'Drive fileId alanı gerekli.', code: 'DRIVE_FILE_REQUIRED' },
      { status: 400 },
    );
  }

  return null;
}

function getExportMimeType(mimeType: string): string | null {
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (mimeType === 'application/vnd.google-apps.document') {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return null;
}

async function downloadFromDrive(
  fileId: string,
  fileName: string,
  mimeType: string | undefined
): Promise<FileDownloadResult> {
  const driveClient = getDriveReadOnlyClient();
  
  let fileMetadata: any;
  try {
    const metadataResponse = await driveClient.files.get({
      fileId,
      fields: 'id,name,size,mimeType,webViewLink,createdTime,modifiedTime,parents',
      supportsAllDrives: true,
    });
    fileMetadata = metadataResponse.data;
  } catch (error: any) {
    apiLogger.error('Drive file metadata fetch failed', {
      fileId,
      fileName,
      error: error.message,
      code: error.code,
    });
    
    if (error.code === 404 || error.message?.includes('not found')) {
      throw new Error(`Drive dosyası bulunamadı (ID: ${fileId}). Dosya taşınmış, silinmiş veya servis hesabının erişim izni yok olabilir.`);
    }
    
    if (error.code === 403 || error.message?.includes('permission') || error.message?.includes('access')) {
      throw new Error(`Drive dosyasına erişim reddedildi (ID: ${fileId}). Servis hesabının bu dosyaya 'Görüntüleyen' veya 'Düzenleyen' izni olduğundan emin olun.`);
    }
    
    throw error;
  }

  const resolvedFileName = fileMetadata.name ?? fileName;
  const resolvedMimeType = mimeType ?? fileMetadata.mimeType ?? 'application/octet-stream';
  
  const exportMimeType = getExportMimeType(resolvedMimeType);
  let fileBuffer: Buffer;

  try {
    if (exportMimeType) {
      const response = await driveClient.files.export({
        fileId: fileId,
        mimeType: exportMimeType
      }, {
        responseType: 'arraybuffer',
        supportsAllDrives: true,
      });
      fileBuffer = Buffer.from(response.data as ArrayBuffer);
    } else {
      const response = await driveClient.files.get({
        fileId: fileId,
        alt: 'media',
        supportsAllDrives: true,
      }, {
        responseType: 'arraybuffer'
      });
      fileBuffer = Buffer.from(response.data as ArrayBuffer);
    }
  } catch (error: any) {
    apiLogger.error('Drive file download failed', {
      fileId,
      fileName: resolvedFileName,
      mimeType: resolvedMimeType,
      exportMimeType,
      error: error.message,
      code: error.code,
    });
    
    if (error.code === 404 || error.message?.includes('not found')) {
      throw new Error(`Drive dosyası indirilemedi (ID: ${fileId}). Dosya taşınmış, silinmiş veya servis hesabının erişim izni yok olabilir.`);
    }
    
    if (error.code === 403 || error.message?.includes('permission') || error.message?.includes('access')) {
      throw new Error(`Drive dosyasına erişim reddedildi (ID: ${fileId}). Servis hesabının bu dosyaya 'Görüntüleyen' veya 'Düzenleyen' izni olduğundan emin olun. Dosyayı Google Drive'da bulup servis hesabı email'ini ekleyin: uludag-ai-club@studio-1335263767-c36ff.iam.gserviceaccount.com`);
    }
    
    throw error;
  }

  return {
    fileBuffer,
    fileMetadata,
    resolvedFileName,
    resolvedMimeType,
    source: 'drive',
    storageDownloadMeta: null,
    exportMimeTypeUsed: exportMimeType
  };
}

function createFileNotFoundResponse(fileId: string | undefined): NextResponse {
  const errorPayload = fileId
    ? { error: 'Drive dosyası bulunamadı. Dosya taşınmış veya silinmiş olabilir.', code: 'DRIVE_FILE_NOT_FOUND' }
    : { error: 'AI analizi için dosya kaynağı bulunamadı.', code: 'FILE_SOURCE_NOT_FOUND' };
  return NextResponse.json(errorPayload, { status: 404 });
}

interface BuildSuccessResponseParams {
  responseText: string;
  truncated: boolean;
  tokenInfo: { originalTokens: number; limitedTokens: number; originalLength: number };
  fileMetadata: FileDownloadResult['fileMetadata'];
  resolvedFileName: string;
  resolvedMimeType: string;
  source: 'drive' | 'storage' | null;
  storageDownloadMeta: FileDownloadResult['storageDownloadMeta'];
  fileId: string | undefined;
  rateLimitResult: { limit: number; remaining: number; resetTime: number };
}

function buildSuccessResponse(params: BuildSuccessResponseParams): NextResponse {
  const {
    responseText,
    truncated,
    tokenInfo,
    fileMetadata,
    resolvedFileName,
    resolvedMimeType,
    source,
    storageDownloadMeta,
    fileId,
    rateLimitResult,
  } = params;

  const responseMetadata = {
    id: fileMetadata?.id ?? (source === 'drive' ? fileId : null),
    name: resolvedFileName,
    size: fileMetadata?.size ?? storageDownloadMeta?.size ?? null,
    mimeType: fileMetadata?.mimeType ?? storageDownloadMeta?.mimeType ?? resolvedMimeType,
    webViewLink: fileMetadata?.webViewLink ?? null,
    createdTime: fileMetadata?.createdTime ?? null,
    modifiedTime: fileMetadata?.modifiedTime ?? null,
  };
  
  return NextResponse.json(
    { 
      response: responseText, 
      truncated, 
      tokenInfo,
      metadata: responseMetadata,
      source
    },
    {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
      },
    }
  );
}

type RateLimitOutcome =
  | { ok: true; clientIp: string; details: RateLimitResult }
  | { ok: false; response: NextResponse };

function enforceRateLimitForRequest(request: NextRequest): RateLimitOutcome {
  const clientIp = getClientIp(request);
  const rateLimitResult = checkRateLimit(clientIp, RateLimitPresets.MODERATE);

  if (!rateLimitResult.success) {
    apiLogger.warn('Rate limit exceeded for AI Agent drive download', {
      ip: clientIp,
      resetTime: new Date(rateLimitResult.resetTime).toISOString(),
    });
    return { ok: false, response: createRateLimitResponse(rateLimitResult) };
  }

  return { ok: true, clientIp, details: rateLimitResult };
}

type AuthOutcome =
  | { ok: true; uid: string }
  | { ok: false; response: NextResponse };

async function authenticateTeacherRequest(request: NextRequest): Promise<AuthOutcome> {
  const uid = await verifyToken(request);
  if (!uid) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const userIsTeacher = await isTeacher(uid);
  if (!userIsTeacher) {
    return { ok: false, response: NextResponse.json({ error: 'Only teachers can access AI Agent' }, { status: 403 }) };
  }

  return { ok: true, uid };
}

interface DownloadRequestPayload {
  fileId?: string;
  fileName: string;
  mimeType?: string;
}

type DownloadOutcome =
  | { ok: true; download: FileDownloadResult }
  | { ok: false; response: NextResponse };

async function fetchFileForAnalysis(payload: DownloadRequestPayload): Promise<DownloadOutcome> {
  if (!payload.fileId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Drive fileId alanı gerekli.', code: 'DRIVE_FILE_REQUIRED' },
        { status: 400 },
      ),
    };
  }

  try {
    const downloadResult = await downloadFromDrive(payload.fileId, payload.fileName, payload.mimeType);
    return { ok: true, download: downloadResult };
  } catch (driveError) {
    if (isDriveNotFoundError(driveError)) {
      apiLogger.warn('Drive file missing', {
        fileId: payload.fileId,
      });
      return { ok: false, response: createFileNotFoundResponse(payload.fileId) };
    }
    throw driveError;
  }
}

type ProcessedContentOutcome =
  | { ok: true; content: string }
  | { ok: false; response: NextResponse };

async function prepareContentOrRespond(downloadResult: FileDownloadResult): Promise<ProcessedContentOutcome> {
  const effectiveMimeType = downloadResult.exportMimeTypeUsed ?? downloadResult.resolvedMimeType;

  try {
    const processedContent = await prepareFileContentForAnalysis(
      downloadResult.resolvedFileName,
      downloadResult.fileBuffer!,
      effectiveMimeType
    );
    return { ok: true, content: processedContent };
  } catch (processErr) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: processErr instanceof Error ? processErr.message : 'File processing error' },
        { status: 400 }
      ),
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitOutcome = enforceRateLimitForRequest(request);
    if (!rateLimitOutcome.ok) {
      return rateLimitOutcome.response;
    }

    const authOutcome = await authenticateTeacherRequest(request);
    if (!authOutcome.ok) {
      return authOutcome.response;
    }

    const { fileId, fileName, mimeType } = await request.json();

    const validationError = validateRequest(fileName, fileId);
    if (validationError) {
      return validationError;
    }

    const downloadOutcome = await fetchFileForAnalysis({
      fileId,
      fileName: fileName!,
      mimeType,
    });
    if (!downloadOutcome.ok) {
      return downloadOutcome.response;
    }

    const contentOutcome = await prepareContentOrRespond(downloadOutcome.download);
    if (!contentOutcome.ok) {
      return contentOutcome.response;
    }

    // Analyze assignment
    const sessionId = authOutcome.uid;
    const { responseText, truncated, tokenInfo } = await analyzeAssignment(
      sessionId,
      downloadOutcome.download.resolvedFileName,
      contentOutcome.content
    );

    return buildSuccessResponse({
      responseText,
      truncated,
      tokenInfo,
      fileMetadata: downloadOutcome.download.fileMetadata,
      resolvedFileName: downloadOutcome.download.resolvedFileName,
      resolvedMimeType: downloadOutcome.download.resolvedMimeType,
      source: downloadOutcome.download.source,
      storageDownloadMeta: downloadOutcome.download.storageDownloadMeta,
      fileId,
      rateLimitResult: rateLimitOutcome.details,
    });
  } catch (error: any) {
    apiLogger.error('Drive download error', error as Error);
    return NextResponse.json({ 
      error: process.env.NODE_ENV === 'development' 
        ? (error.message ?? 'Bilinmeyen hata')
        : 'Dosya indirilemedi veya işlenemedi'
    }, { status: 500 });
  }
}

