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
    apiLogger.error('Assignment export auth error', error as Error);
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

async function exportAssignmentsToSheet(
  sheetsClient: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  submissions: any[],
  assignments: Map<string, any>
): Promise<number> {
  const sheetTitle = 'Ödev Dönüşleri';

  // Ensure sheet exists
  await ensureSheetExists(sheetsClient, spreadsheetId, sheetTitle);

  // Prepare header row
  const headers = [
    'Öğrenci Adı',
    'Öğrenci Email',
    'Sınıf Seviyesi',
    'Ödev Başlığı',
    'Hafta',
    'Teslim Tarihi',
    'Teslim Durumu',
    'Not',
    'Geri Bildirim',
    'Dosya Adı',
    'Dosya Linki',
  ];

  // Prepare data rows
  const rows = submissions.map((submission) => {
    const assignment = assignments.get(submission.assignmentId);
    const submittedAt = submission.submittedAt?.toDate?.() || null;
    const submittedAtStr = submittedAt
      ? submittedAt.toLocaleString('tr-TR', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : '';

    const status = submission.submissionTiming === 'late' ? 'Geç' : 
                   submission.submissionTiming === 'on-time' ? 'Zamanında' : 
                   'Belirtilmemiş';

    const fileName = submission.submittedFileName || 
                    (submission.submittedFiles && submission.submittedFiles.length > 0 
                      ? submission.submittedFiles.map((f: any) => f.name).join(', ')
                      : '') ||
                    '';

    const fileLink = submission.submittedFileUrl ||
                    (submission.submittedFiles && submission.submittedFiles.length > 0
                      ? submission.submittedFiles[0]?.url || ''
                      : '') ||
                    '';

    return [
      submission.studentName || '',
      submission.studentEmail || '', // Email from getStudentEmails
      submission.classroomLevel || '',
      assignment?.title || '',
      submission.assignmentWeek ? `${submission.assignmentWeek}. Hafta` : '',
      submittedAtStr,
      status,
      submission.grade !== null && submission.grade !== undefined ? String(submission.grade) : '',
      submission.feedback || '',
      fileName,
      fileLink,
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

async function getStudentEmails(firestore: ReturnType<typeof getFirestore>, studentIds: string[]): Promise<Map<string, string>> {
  const emailMap = new Map<string, string>();
  
  // Fetch student documents by ID
  const uniqueIds = [...new Set(studentIds.filter(Boolean))];
  
  // Use Promise.all to fetch documents in parallel (with reasonable concurrency)
  const batchSize = 10;
  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);
    const promises = batch.map(async (id) => {
      try {
        const doc = await firestore.collection('users').doc(id).get();
        if (doc.exists) {
          const data = doc.data();
          if (data?.email) {
            emailMap.set(id, data.email);
          }
        }
      } catch (error) {
        apiLogger.warn('Failed to fetch student email', { studentId: id, error });
      }
    });
    
    await Promise.all(promises);
  }

  return emailMap;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyTeacher(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const firestore = authResult.firestore;

    // Fetch all assignment submissions
    const submissionsSnapshot = await firestore.collection('assignmentSubmissions')
      .orderBy('submittedAt', 'desc')
      .get();

    if (submissionsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'Dışa aktarılacak ödev dönüşü bulunamadı.',
        count: 0,
      });
    }

    const submissions = submissionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Fetch all assignments for reference
    const assignmentsSnapshot = await firestore.collection('assignments').get();
    const assignments = new Map<string, any>();
    assignmentsSnapshot.forEach((doc) => {
      assignments.set(doc.id, { id: doc.id, ...doc.data() });
    });

    // Get student emails
    const uniqueStudentIds = [...new Set(submissions.map(s => s.studentId).filter(Boolean))];
    const studentEmails = await getStudentEmails(firestore, uniqueStudentIds);

    // Update submissions with email
    submissions.forEach((submission) => {
      if (submission.studentId && studentEmails.has(submission.studentId)) {
        submission.studentEmail = studentEmails.get(submission.studentId);
      }
    });

    // Get Google Sheets client
    const driveClient = getDriveReadOnlyClient();
    const spreadsheetId = await findExcelFile(driveClient);
    const sheetsClient = getSheetsClient();

    // Export to sheet
    const count = await exportAssignmentsToSheet(sheetsClient, spreadsheetId, submissions, assignments);

    return NextResponse.json({
      success: true,
      message: `${count} ödev dönüşü başarıyla Excel'e aktarıldı.`,
      count,
    });
  } catch (error) {
    apiLogger.error('Assignment export error', error as Error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Ödev dönüşleri dışa aktarılırken bir hata oluştu.',
      },
      { status: 500 }
    );
  }
}

