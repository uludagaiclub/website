import { NextRequest, NextResponse } from 'next/server';
import { getDriveReadOnlyClient } from '@/lib/google-drive-readonly';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { apiLogger } from '@/lib/logger';
import { google } from 'googleapis';

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
    apiLogger.error('Excel write auth error', error as Error);
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  }
}

async function findExcelFile(driveClient: ReturnType<typeof getDriveReadOnlyClient>) {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID not configured.');
  }

  // Root klasörde "UludagAIClub" adlı spreadsheet'i bul (büyük/küçük harf duyarsız)
  const response = await driveClient.files.list({
    q: `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
    fields: 'files(id,name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (!response.data.files || response.data.files.length === 0) {
    throw new Error(`Root klasörde (ID: ${rootFolderId}) Excel dosyası bulunamadı.`);
  }

  // "UludagAIClub" adlı dosyayı bul (büyük/küçük harf duyarsız)
  const excelFile = response.data.files.find(
    (file) => file.name?.toLowerCase().includes('uludagaiclub')
  );

  if (!excelFile?.id) {
    apiLogger.warn('UludagAIClub Excel file not found', {
      availableFiles: response.data.files.map(f => f.name),
      rootFolderId,
    });
    throw new Error(
      `UludagAIClub Excel dosyası bulunamadı. ` +
      `Mevcut dosyalar: ${response.data.files.map(f => f.name).join(', ')}. ` +
      `Root klasör ID: ${rootFolderId}`
    );
  }

  apiLogger.info('Excel file found', {
    fileId: excelFile.id,
    fileName: excelFile.name,
  });

  return excelFile.id;
}

async function appendToExcel(
  sheetsClient: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  data: {
    studentName: string;
    date: string;
    feedback: string;
    assignmentTitle?: string;
    classroomLevel?: string;
    week?: number | null;
  }
) {
  const { studentName, date, feedback, assignmentTitle, classroomLevel, week } = data;

  // Excel'e eklenecek satır
  const row = [
    studentName,
    date,
    assignmentTitle || '',
    classroomLevel || '',
    week ? `${week}. Hafta` : '',
    feedback,
  ];

  try {
    // Önce sheet'i kontrol et, yoksa oluştur
    const spreadsheet = await sheetsClient.spreadsheets.get({
      spreadsheetId,
    });

    const sheetTitle = 'AI Geri Bildirimler';
    let sheetId: number | null = null;

    // Sheet var mı kontrol et
    const existingSheet = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === sheetTitle
    );

    if (!existingSheet) {
      // Sheet yoksa oluştur
      const addSheetResponse = await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetTitle,
                },
              },
            },
          ],
        },
      });
      sheetId = addSheetResponse.data.replies?.[0]?.addSheet?.properties?.sheetId ?? null;
    } else {
      sheetId = existingSheet.properties?.sheetId ?? null;
    }

    if (sheetId === null) {
      throw new Error('Sheet oluşturulamadı veya bulunamadı.');
    }

    // İlk satırda başlık var mı kontrol et
    const headerRange = `${sheetTitle}!A1:F1`;
    let headerResponse;
    try {
      headerResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange,
    });
    } catch (error) {
      // Range boşsa hata verebilir, bu normal
      headerResponse = { data: { values: undefined } };
    }

    const hasHeaders = headerResponse.data.values && headerResponse.data.values.length > 0 && headerResponse.data.values[0] && headerResponse.data.values[0].length > 0;

    if (!hasHeaders) {
      // Başlık satırını update ile ekle (append değil, çünkü A1'e yazmak istiyoruz)
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetTitle}!A1:F1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['Öğrenci Adı', 'Tarih', 'Ödev Başlığı', 'Sınıf Seviyesi', 'Hafta', 'AI Geri Bildirimi']],
        },
      });
    }

    // Yeni satırı ekle (append mevcut verilerin sonuna ekler)
    await sheetsClient.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetTitle}!A:F`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row],
      },
    });

    apiLogger.info('Excel row appended', {
      spreadsheetId,
      sheetTitle,
      studentName,
    });

    return { success: true };
  } catch (error) {
    apiLogger.error('Excel append error', error as Error, {
      spreadsheetId,
      studentName,
    });
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyTeacher(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const body = await request.json();
    const {
      studentName,
      feedback,
      assignmentTitle,
      classroomLevel,
      week,
    } = body as {
      studentName: string;
      feedback: string;
      assignmentTitle?: string;
      classroomLevel?: string;
      week?: number | null;
    };

    if (!studentName || !feedback) {
      return NextResponse.json(
        { error: 'studentName ve feedback alanları zorunludur.' },
        { status: 400 }
      );
    }

    const driveClient = getDriveReadOnlyClient();
    const spreadsheetId = await findExcelFile(driveClient);

    // Google Sheets API client oluştur
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
    if (!serviceAccountKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 not set');
    }

    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountKey, 'base64').toString('utf-8')
    );

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key?.replace(/\\n/g, '\n'),
        project_id: serviceAccount.project_id,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetsClient = google.sheets({ version: 'v4', auth });

    const date = new Date().toLocaleString('tr-TR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    await appendToExcel(sheetsClient, spreadsheetId, {
      studentName,
      date,
      feedback,
      assignmentTitle,
      classroomLevel,
      week,
    });

    return NextResponse.json({
      success: true,
      message: 'Excel dosyasına başarıyla yazıldı.',
    });
  } catch (error) {
    apiLogger.error('Excel write error', error as Error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Excel dosyasına yazılırken bir hata oluştu.',
      },
      { status: 500 }
    );
  }
}

