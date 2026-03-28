import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CookieConsentBanner } from '@/components/cookie-consent-banner';

export const metadata: Metadata = {
  title: {
    default: 'UludagAIClub - Yapay Zeka Öğrenci Topluluğu',
    template: '%s | UludagAIClub'
  },
  description: 'UludagAIClub - Yapay zeka eğitimi, workshoplar, projeler ve topluluk. Junior, Mid, Senior seviyelerinde AI öğrenme platformu.',
  keywords: ['yapay zeka', 'AI', 'makine öğrenmesi', 'veri bilimi', 'python', 'bulut', 'AI eğitimi'],
  authors: [{ name: 'UludagAIClub' }],
  creator: 'UludagAIClub',
  publisher: 'UludagAIClub',
  metadataBase: new URL('https://uludagaiclub.web.app'),
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: 'https://uludagaiclub.web.app',
    siteName: 'UludagAIClub',
    images: [
      {
        url: '/images/junior.png',
        width: 1200,
        height: 630,
        alt: 'UludagAIClub'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UludagAIClub - Yapay Zeka Öğrenci Topluluğu',
    description: 'Yapay zeka eğitimi, workshoplar, projeler ve topluluk'
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning style={{ scrollBehavior: 'smooth' }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <FirebaseClientProvider>
          <ErrorBoundary>
            <div className="flex-1 flex flex-col">
              {children}
            </div>
            <Toaster />
            <CookieConsentBanner />
          </ErrorBoundary>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
