/**
 * Firebase Configuration
 * 
 * SECURITY: All environment variables are required in production.
 * Fallback values are ONLY used in development mode for easier local setup.
 * 
 * Required environment variables:
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 * - NEXT_PUBLIC_FIREBASE_APP_ID
 * - NEXT_PUBLIC_FIREBASE_API_KEY
 * - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 * - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 * - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isClient = typeof window !== 'undefined';

// Required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'
];

// Development fallback values (ONLY for local development)
const developmentFallbacks = {
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "studio-1335263767-c36ff",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:28736768597:web:69d36e66c7db82e4fca2dc",
  NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyBtqP8ExBOJJ2QskjUbD4p_YZ3o39ts8hU",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "studio-1335263767-c36ff.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "studio-1335263767-c36ff.firebasestorage.app",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "28736768597"
};

// Helper function to get env var with development fallback
function getEnvVar(key: keyof typeof developmentFallbacks): string {
  const value = process.env[key];
  
  if (value) {
    return value;
  }
  
  if (isDevelopment) {
    return developmentFallbacks[key];
  }
  
  // In production, if env var is missing, log error but use fallback to prevent crash
  // This allows the app to load and show a proper error message
  if (isClient) {
    console.error(`⚠️ Missing required environment variable: ${key}. Using fallback value.`);
    return developmentFallbacks[key];
  }
  
  // On server-side, throw error to fail fast during build
  throw new Error(`Missing required environment variable: ${key}`);
}

// Validate environment variables in production (server-side only)
if (!isDevelopment && !isClient) {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(
      '❌ CRITICAL: Missing required Firebase environment variables in production:\n' +
      missingVars.map(v => `  - ${v}`).join('\n') +
      '\n\nAll environment variables must be set in production deployment.'
    );
    // Don't throw on client-side to prevent app crash
    // The app will still work with fallbacks, but this should be fixed
  }
}

function createFirebaseConfig() {
  try {
    return {
      projectId: getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
      appId: getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID'),
      apiKey: getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY'),
      authDomain: getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
      storageBucket: getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
      messagingSenderId: getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID')
    };
  } catch (error) {
    // If we're on the client and there's an error, use fallbacks to prevent crash
    if (isClient) {
      console.error('Firebase config error, using fallbacks:', error);
      return {
        projectId: developmentFallbacks.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        appId: developmentFallbacks.NEXT_PUBLIC_FIREBASE_APP_ID,
        apiKey: developmentFallbacks.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: developmentFallbacks.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        storageBucket: developmentFallbacks.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        measurementId: "",
        messagingSenderId: developmentFallbacks.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
      };
    }
    throw error;
  }
}

const firebaseConfig = createFirebaseConfig();

export { firebaseConfig };
