
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, AppCheck } from 'firebase/app-check';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (getApps().length) {
    return getSdks(getApp());
  }
  
  // In a deployed Firebase App Hosting environment, the SDK is automatically
  // initialized with the correct configuration. We can check for this by
  // seeing if the default app is already initialized.
  try {
    const app = initializeApp();
    return getSdks(app);
  } catch (e) {
    // If automatic initialization fails (e.g., in a local development environment
    // where the necessary environment variables aren't set), we fall back to
    // using the explicit firebaseConfig object.
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        'Firebase auto-initialization failed. This is expected in local development, but may indicate an issue in production if not intended. Falling back to explicit config. Error:',
        e
      );
    }
    const app = initializeApp(firebaseConfig);
    return getSdks(app);
  }
}

/**
 * Initialize App Check to protect against abuse
 * @param firebaseApp Firebase app instance
 * @returns App Check instance or undefined if not configured
 */
function initializeAppCheckIfConfigured(firebaseApp: FirebaseApp): AppCheck | undefined {
  // Check if App Check is already initialized
  if (typeof window === 'undefined') {
    return undefined; // Skip on server-side
  }

  const recaptchaKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_KEY;
  const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
  
  // Enable debug mode for local development
  if (process.env.NODE_ENV === 'development' && debugToken) {
    // Debug token allows local testing without reCAPTCHA
    // Set this in Firebase Console > App Check > Apps > Debug tokens
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }
  
  // If no key is provided, skip App Check initialization
  if (!recaptchaKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '⚠️  App Check is not initialized. Set NEXT_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_KEY to enable bot protection.\n' +
        'Get your reCAPTCHA v3 site key from: https://console.firebase.google.com/project/_/appcheck'
      );
    }
    return undefined;
  }

  try {
    // Initialize App Check with reCAPTCHA Enterprise
    const appCheck = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
      isTokenAutoRefreshEnabled: true, // Automatically refresh tokens
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ App Check initialized successfully');
    }

    return appCheck;
  } catch (error) {
    // App Check might already be initialized or there's a configuration error
    if (process.env.NODE_ENV === 'development') {
      console.warn('App Check initialization warning:', error);
    }
    return undefined;
  }
}

export function getSdks(firebaseApp: FirebaseApp) {
  // Initialize App Check (will be skipped if key not provided)
  const appCheck = initializeAppCheckIfConfigured(firebaseApp);

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    appCheck
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';

    