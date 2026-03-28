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
    apiLogger.error('Student export auth error', error as Error);
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  }
}

async function findExcelFile(driveClient: ReturnType<typeof getDriveReadOnlyClient>) {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID not configured.');
  }

  const response = await driveClient.files.list({
    q: `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
    fields: 'files(id,name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (!response.data.files || response.data.files.length === 0) {
    throw new Error(`Root klasörde (ID: ${rootFolderId}) Excel dosyası bulunamadı.`);
  }

  const excelFile = response.data.files.find(
    (file) => file.name?.toLowerCase().includes('uludagaiclub')
  );

  if (!excelFile || !excelFile.id) {
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

  return excelFile.id;
}

function getSheetsClient() {
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

  return google.sheets({ version: 'v4', auth });
}

async function ensureSheetExists(
  sheetsClient: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetTitle: string
): Promise<void> {
  const spreadsheet = await sheetsClient.spreadsheets.get({
    spreadsheetId,
  });

  const existingSheet = spreadsheet.data.sheets?.find(
    (sheet) => sheet.properties?.title === sheetTitle
  );

  if (!existingSheet) {
    await sheetsClient.spreadsheets.batchUpdate({
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
  }
}

async function exportStudentsToSheet(
  sheetsClient: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  students: any[]
): Promise<number> {
  const sheetTitle = 'ÖğrenciListesi';

  // Ensure sheet exists
  await ensureSheetExists(sheetsClient, spreadsheetId, sheetTitle);

  // Prepare header row
  const headers = [
    'Öğrenci',
    'Sınıf',
    'Hafta 1',
    'Hafta 2',
    'Hafta 3',
    'Hafta 4',
    'Hafta 5',
    'Hafta 6',
    'WS 1',
    'WS 2',
    'WS 3',
    'WS 4',
    'Email',
  ];

  // Prepare data rows
  const rows = students.map((student) => {
    return [
      student.displayName || student.email?.split('@')[0] || '',
      student.classroom || '',
      student.week1Score !== undefined && student.week1Score !== null ? String(student.week1Score) : '',
      student.week2Score !== undefined && student.week2Score !== null ? String(student.week2Score) : '',
      student.week3Score !== undefined && student.week3Score !== null ? String(student.week3Score) : '',
      student.week4Score !== undefined && student.week4Score !== null ? String(student.week4Score) : '',
      student.week5Score !== undefined && student.week5Score !== null ? String(student.week5Score) : '',
      student.week6Score !== undefined && student.week6Score !== null ? String(student.week6Score) : '',
      student.workshop1 || '',
      student.workshop2 || '',
      student.workshop3 || '',
      student.workshop4 || '',
      student.email || '',
    ];
  });

  // Clear existing data and write new data
  await sheetsClient.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetTitle}!A:Z`,
  });

  // Write headers and data
  await sheetsClient.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetTitle}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers, ...rows],
    },
  });

  return rows.length;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyTeacher(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const firestore = authResult.firestore;

    // Fetch all students
    const studentsSnapshot = await firestore.collection('users')
      .where('role', '==', 'student')
      .get();

    if (studentsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'Dışa aktarılacak öğrenci bulunamadı.',
        count: 0,
      });
    }

    const students = studentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get Google Sheets client
    const driveClient = getDriveReadOnlyClient();
    const spreadsheetId = await findExcelFile(driveClient);
    const sheetsClient = getSheetsClient();

    // Export to sheet
    const count = await exportStudentsToSheet(sheetsClient, spreadsheetId, students);

    return NextResponse.json({
      success: true,
      message: `${count} öğrenci verisi başarıyla Excel'e aktarıldı.`,
      count,
    });
  } catch (error) {
    apiLogger.error('Student export error', error as Error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Öğrenci verileri dışa aktarılırken bir hata oluştu.',
      },
      { status: 500 }
    );
  }
}

