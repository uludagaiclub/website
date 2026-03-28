import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

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
    console.error('Failed to initialize Firebase Admin:', error);
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
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // SECURITY FIX: Require authentication
    const userId = await verifyToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Yetkisiz erişim. Lütfen giriş yapın.' }, { status: 401 });
    }

    // SECURITY FIX: Only allow teachers to access this endpoint
    const app = getAdminApp();
    const firestore = getFirestore(app);
    const userDoc = await firestore.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    const userData = userDoc.data();
    if (!userData || userData.role !== 'teacher') {
      return NextResponse.json({ 
        error: 'Bu endpoint sadece öğretmenler tarafından erişilebilir.' 
      }, { status: 403 });
    }

    // Test all environment variables (safe to expose to teachers for debugging)
    const envVars = {
      GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID ?? 'NOT SET',
      GOOGLE_SERVICE_ACCOUNT_KEY_BASE64: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 ? 'SET (hidden)' : 'NOT SET',
      GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? 'SET (hidden)' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV ?? 'NOT SET',
      // List all GOOGLE_* env vars
      allGoogleVars: Object.keys(process.env)
        .filter(k => k.includes('GOOGLE'))
        .map(k => ({ [k]: process.env[k] ? 'SET' : 'NOT SET' })),
      // List all env vars (first 20 for debugging)
      allEnvVars: Object.keys(process.env).slice(0, 20),
    };

    return NextResponse.json({
      message: 'Environment variables test',
      timestamp: new Date().toISOString(),
      environment: envVars,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Test env API Error:', error);
    return NextResponse.json({ 
      error: error.message ?? 'Sunucu hatası oluştu.' 
    }, { status: 500 });
  }
}

