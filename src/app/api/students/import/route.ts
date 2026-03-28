import { NextRequest, NextResponse } from 'next/server';
import { getDriveReadOnlyClient } from '@/lib/google-drive-readonly';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
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
    apiLogger.error('Student import auth error', error as Error);
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

function validateEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function validateClassroom(classroom: string | null | undefined): classroom is 'new-signup' | 'junior' | 'junior-plus' | 'mid' | 'mid-plus' | 'senior' {
  if (!classroom || typeof classroom !== 'string') return false;
  const validClassrooms = ['new-signup', 'junior', 'junior-plus', 'mid', 'mid-plus', 'senior'];
  return validClassrooms.includes(classroom.trim().toLowerCase());
}

function parseNumericValue(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '-') return undefined;
    const parsed = parseFloat(trimmed);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function parseStringValue(value: any): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' || trimmed === '-' ? undefined : trimmed;
  }
  return String(value).trim() || undefined;
}

async function readStudentDataFromSheet(sheetsClient: ReturnType<typeof google.sheets>, spreadsheetId: string) {
  const preferredSheetNames = ['Öğrenci Listesi', 'ÖğrenciListesi', 'Student List', 'Students'];
  
  let sheetTitle: string | null = null;
  let sheetData: any[][] = [];

  // Find the sheet
  const spreadsheet = await sheetsClient.spreadsheets.get({
    spreadsheetId,
  });

  const allSheets = spreadsheet.data.sheets || [];
  const allSheetNames = allSheets.map(s => s.properties?.title || '').filter(Boolean);

  // First, try to find preferred sheet names
  for (const name of preferredSheetNames) {
    const existingSheet = allSheets.find(
      (sheet) => sheet.properties?.title === name
    );
    if (existingSheet) {
      sheetTitle = name;
      break;
    }
  }

  // If not found, try to auto-detect by checking sheet content
  if (!sheetTitle && allSheets.length > 0) {
    // Check each sheet to see if it has student data structure
    for (const sheet of allSheets) {
      const currentSheetTitle = sheet.properties?.title;
      if (!currentSheetTitle) continue;

      try {
        // Read first few rows to check structure
        const sampleResponse = await sheetsClient.spreadsheets.values.get({
          spreadsheetId,
          range: `${currentSheetTitle}!A1:M5`, // Check first 5 rows, columns A-M
        });

        if (sampleResponse.data.values && sampleResponse.data.values.length > 0) {
          const firstRow = sampleResponse.data.values[0] || [];
          const secondRow = sampleResponse.data.values[1] || [];
          
          // Check if first row might be header or first row has student-like data
          // Look for email-like patterns or student name patterns
          const hasEmailPattern = firstRow.some((cell: any) => 
            cell && typeof cell === 'string' && cell.includes('@')
          ) || secondRow.some((cell: any) => 
            cell && typeof cell === 'string' && cell.includes('@')
          );

          // Check if has enough columns (at least 2 for student name/email and classroom)
          const hasEnoughColumns = firstRow.length >= 2 || secondRow.length >= 2;

          if (hasEmailPattern || hasEnoughColumns) {
            sheetTitle = currentSheetTitle;
            apiLogger.info('Auto-detected student sheet', { sheetTitle: currentSheetTitle });
            break;
          }
        }
      } catch (error) {
        // Skip this sheet and continue
        continue;
      }
    }
  }

  // If still not found, use the first sheet as fallback
  if (!sheetTitle && allSheets.length > 0) {
    sheetTitle = allSheets[0].properties?.title || null;
    apiLogger.warn('Using first sheet as fallback', { sheetTitle });
  }

  // If no sheet found, create one
  if (!sheetTitle) {
    sheetTitle = 'ÖğrenciListesi';
    
    // Create new sheet
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
    
    apiLogger.info('Created new student sheet', { sheetTitle });
    
    // Add header row
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetTitle}!A1:M1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['Öğrenci', 'Sınıf', 'Hafta 1', 'Hafta 2', 'Hafta 3', 'Hafta 4', 'Hafta 5', 'Hafta 6', 'WS 1', 'WS 2', 'WS 3', 'WS 4', 'Email']],
      },
    });
    
    throw new Error(`"${sheetTitle}" sayfası oluşturuldu ve başlık satırı eklendi. Lütfen Google Sheets'e öğrenci verilerini ekleyip tekrar deneyin.`);
  }

  // Read all data from the sheet - try larger range first
  let response;
  try {
    response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetTitle}!A:Z`, // Daha geniş range, tüm kolonları kapsar
    });
  } catch (error) {
    // If range fails, try without specifying range (gets all data)
    try {
      response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range: sheetTitle,
      });
    } catch (error2) {
      apiLogger.error('Failed to read sheet data', error2 as Error, { sheetTitle, spreadsheetId });
      throw new Error(`Sayfa verileri okunamadı: ${error2 instanceof Error ? error2.message : 'Bilinmeyen hata'}`);
    }
  }

  // If sheet is empty, add header row and inform user
  if (!response.data.values || response.data.values.length === 0) {
    // Add header row
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetTitle}!A1:M1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['Öğrenci', 'Sınıf', 'Hafta 1', 'Hafta 2', 'Hafta 3', 'Hafta 4', 'Hafta 5', 'Hafta 6', 'WS 1', 'WS 2', 'WS 3', 'WS 4', 'Email']],
      },
    });
    
    throw new Error(`"${sheetTitle}" sayfası boştu. Başlık satırı eklendi. Lütfen Google Sheets'e öğrenci verilerini ekleyip tekrar deneyin.`);
  }

  sheetData = response.data.values;
  
  // Skip header row if it exists
  const headerRow = sheetData[0];
  const isHeaderRow = headerRow && (
    headerRow[0]?.toString().toLowerCase().includes('öğrenci') ||
    headerRow[0]?.toString().toLowerCase().includes('student') ||
    headerRow[0]?.toString().toLowerCase().includes('email') ||
    headerRow[0]?.toString().toLowerCase().includes('total') ||
    headerRow[0]?.toString().toLowerCase().includes('toplam')
  );

  const dataRows = isHeaderRow ? sheetData.slice(1) : sheetData;

  // Filter out completely empty rows
  const filteredRows = dataRows.filter(row => {
    return row && row.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '');
  });

  if (filteredRows.length === 0) {
    throw new Error(`"${sheetTitle}" sayfasında işlenecek veri bulunamadı. Tüm satırlar boş görünüyor.`);
  }

  apiLogger.info('Student data read from sheet', { 
    sheetTitle, 
    totalRows: sheetData.length, 
    dataRows: filteredRows.length,
    hasHeader: isHeaderRow 
  });

  return filteredRows;
}

async function processStudentRows(
  firestore: ReturnType<typeof getFirestore>,
  rows: any[][]
): Promise<{ updated: number; created: number; errors: string[] }> {
  let updated = 0;
  let created = 0;
  const errors: string[] = [];

  // Get all existing students by email for efficient lookup
  const allStudentsSnapshot = await firestore.collection('users')
    .where('role', '==', 'student')
    .get();
  
  const studentsByEmail = new Map<string, { id: string; data: any }>();
  allStudentsSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.email) {
      studentsByEmail.set(data.email.toLowerCase().trim(), { id: doc.id, data });
    }
  });

  // Process rows in batches (Firestore batch limit is 500 operations)
  const batchSize = 400; // Use 400 to be safe
  const batches: any[][] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    batches.push(rows.slice(i, i + batchSize));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = firestore.batch();
    const batchRows = batches[batchIndex];

    for (let rowIndex = 0; rowIndex < batchRows.length; rowIndex++) {
      const row = batchRows[rowIndex];
      const globalRowIndex = batchIndex * batchSize + rowIndex + 1;

      try {
        // Expected columns: Öğrenci (name/email), Sınıf, Hafta 1-6, WS 1-4
        // Column indices: 0=Öğrenci, 1=Sınıf, 2-7=Hafta 1-6, 8-11=WS 1-4
        const studentNameOrEmail = row[0]?.toString().trim();
        const classroom = row[1]?.toString().trim();
        const week1 = parseNumericValue(row[2]);
        const week2 = parseNumericValue(row[3]);
        const week3 = parseNumericValue(row[4]);
        const week4 = parseNumericValue(row[5]);
        const week5 = parseNumericValue(row[6]);
        const week6 = parseNumericValue(row[7]);
        const ws1 = parseStringValue(row[8]);
        const ws2 = parseStringValue(row[9]);
        const ws3 = parseStringValue(row[10]);
        const ws4 = parseStringValue(row[11]);

        if (!studentNameOrEmail) {
          errors.push(`Satır ${globalRowIndex}: Öğrenci adı/email boş`);
          continue;
        }

        // Try to extract email from the first column
        let email: string | null = null;
        let displayName: string | null = null;

        if (validateEmail(studentNameOrEmail)) {
          email = studentNameOrEmail.toLowerCase().trim();
          displayName = email.split('@')[0];
        } else {
          // If it's not an email, treat it as name and we'll need to find by name
          displayName = studentNameOrEmail;
          // Try to find email in other columns or skip
          if (row.length > 12 && validateEmail(row[12])) {
            email = row[12].toString().toLowerCase().trim();
          } else {
            errors.push(`Satır ${globalRowIndex}: Geçerli bir email bulunamadı (${studentNameOrEmail})`);
            continue;
          }
        }

        // Validate classroom
        const validClassroom = validateClassroom(classroom) ? classroom.toLowerCase() : undefined;

        // Prepare update data
        const updateData: any = {};
        if (validClassroom) updateData.classroom = validClassroom;
        if (week1 !== undefined) updateData.week1Score = week1;
        if (week2 !== undefined) updateData.week2Score = week2;
        if (week3 !== undefined) updateData.week3Score = week3;
        if (week4 !== undefined) updateData.week4Score = week4;
        if (week5 !== undefined) updateData.week5Score = week5;
        if (week6 !== undefined) updateData.week6Score = week6;
        if (ws1 !== undefined) updateData.workshop1 = ws1;
        if (ws2 !== undefined) updateData.workshop2 = ws2;
        if (ws3 !== undefined) updateData.workshop3 = ws3;
        if (ws4 !== undefined) updateData.workshop4 = ws4;

        // Find existing student or create new one
        const existingStudent = studentsByEmail.get(email);
        
        if (existingStudent) {
          // Update existing student
          const studentRef = firestore.collection('users').doc(existingStudent.id);
          batch.update(studentRef, updateData);
          updated++;
        } else {
          // Create new student
          const newStudentRef = firestore.collection('users').doc();
          const newStudentData = {
            uid: newStudentRef.id,
            email: email,
            displayName: displayName || email.split('@')[0],
            photoURL: null,
            role: 'student',
            classroom: validClassroom || 'new-signup',
            createdAt: FieldValue.serverTimestamp(),
            ...updateData,
          };
          batch.set(newStudentRef, newStudentData);
          created++;
          // Add to map for subsequent rows in same batch
          studentsByEmail.set(email, { id: newStudentRef.id, data: newStudentData });
        }
      } catch (error) {
        errors.push(`Satır ${globalRowIndex}: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
      }
    }

    // Commit batch
    try {
      await batch.commit();
    } catch (error) {
      apiLogger.error('Batch commit error', error as Error);
      errors.push(`Toplu işlem hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    }
  }

  return { updated, created, errors };
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyTeacher(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const driveClient = getDriveReadOnlyClient();
    const spreadsheetId = await findExcelFile(driveClient);
    const sheetsClient = getSheetsClient();

    // Read student data from sheet
    const rows = await readStudentDataFromSheet(sheetsClient, spreadsheetId);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Sayfada işlenecek veri bulunamadı.' },
        { status: 400 }
      );
    }

    // Process rows and update/create students
    const result = await processStudentRows(authResult.firestore, rows);

    const message = `${result.updated} öğrenci güncellendi, ${result.created} yeni öğrenci eklendi.${result.errors.length > 0 ? ` ${result.errors.length} hata oluştu.` : ''}`;

    return NextResponse.json({
      success: true,
      message,
      updated: result.updated,
      created: result.created,
      errors: result.errors.slice(0, 10), // Return first 10 errors
      totalErrors: result.errors.length,
    });
  } catch (error) {
    apiLogger.error('Student import error', error as Error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Öğrenci verileri yüklenirken bir hata oluştu.',
      },
      { status: 500 }
    );
  }
}

