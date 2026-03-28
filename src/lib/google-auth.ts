
'use client';

/**
 * Get Google OAuth token with Drive scope for file uploads
 * Uses Firebase Auth credential if available, otherwise prompts user
 */
export async function getGoogleDriveToken(): Promise<string | null> {
  try {
    // Try to get token from Firebase Auth
    const { getSdks } = await import('@/firebase');
    const { auth } = getSdks();
    const user = auth.currentUser;
    
    if (user) {
      // Firebase Auth doesn't directly expose Google OAuth token
      // We need to use Google Identity Services for Drive scope
      return await getDriveTokenViaIdentityService();
    }
    
    return null;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error getting Google Drive token:', error);
    }
    return null;
  }
}

/**
 * Get Drive token using Google Identity Services
 */
async function getDriveTokenViaIdentityService(): Promise<string | null> {
  return new Promise((resolve) => {
    // Load Google Identity Services
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('NEXT_PUBLIC_GOOGLE_CLIENT_ID not set, skipping OAuth token request');
      }
      resolve(null);
      return;
    }

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Token request timeout, skipping OAuth');
      }
      resolve(null);
    }, 10000);

    // Check if script already loaded
    // @ts-ignore
    if (window.google?.accounts?.oauth2) {
      try {
        // @ts-ignore
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: (response: { access_token: string; error?: string }) => {
            clearTimeout(timeout);
            if (response.error) {
              if (process.env.NODE_ENV === 'development') {
                console.warn('OAuth error:', response.error);
              }
              resolve(null);
            } else {
              resolve(response.access_token);
            }
          },
        });
        client.requestAccessToken();
      } catch (error) {
        clearTimeout(timeout);
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error requesting token:', error);
        }
        resolve(null);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // @ts-ignore
      if (window.google?.accounts?.oauth2) {
        try {
          // @ts-ignore
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (response: { access_token: string; error?: string }) => {
              clearTimeout(timeout);
              if (response.error) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn('OAuth error:', response.error);
                }
                resolve(null);
              } else {
                resolve(response.access_token);
              }
            },
          });
          client.requestAccessToken();
        } catch (error) {
          clearTimeout(timeout);
          if (process.env.NODE_ENV === 'development') {
            console.warn('Error requesting token:', error);
          }
          resolve(null);
        }
      } else {
        clearTimeout(timeout);
        resolve(null);
      }
    };
    script.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };
    document.head.appendChild(script);
  });
}

