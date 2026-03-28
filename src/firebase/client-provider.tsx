'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  readonly children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    try {
      return initializeFirebase();
    } catch (error) {
      // Log error but don't crash the app
      console.error('Failed to initialize Firebase:', error);
      // Return a minimal structure to prevent app crash
      // The app will still render, but Firebase features won't work
      return {
        firebaseApp: null,
        auth: null,
        firestore: null,
        appCheck: undefined
      };
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}