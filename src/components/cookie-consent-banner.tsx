'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Cookie, X } from 'lucide-react';
import Link from 'next/link';

const COOKIE_CONSENT_KEY = 'cookie-consent';

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    localStorage.setItem(`${COOKIE_CONSENT_KEY}-date`, new Date().toISOString());
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
    localStorage.setItem(`${COOKIE_CONSENT_KEY}-date`, new Date().toISOString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 animate-in slide-in-from-bottom duration-300">
      <Card className="max-w-4xl mx-auto shadow-2xl border-2 bg-background/95 backdrop-blur-sm">
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              <Cookie className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-base sm:text-lg font-semibold text-foreground">
                  Çerez Kullanımı
                </h3>
                <button
                  onClick={handleReject}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Kapat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Web sitemiz, size en iyi deneyimi sunmak için çerezler kullanmaktadır. 
                Çerezler, site işlevselliğini sağlamak ve kullanıcı deneyimini iyileştirmek için kullanılır. 
                Detaylı bilgi için{' '}
                <Link href="/gizlilik-politikasi" className="text-primary hover:underline font-medium">
                  Gizlilik Politikamızı
                </Link>
                {' '}ve{' '}
                <Link href="/kvkk" className="text-primary hover:underline font-medium">
                  KVKK Aydınlatma Metnimizi
                </Link>
                {' '}inceleyebilirsiniz.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <Button onClick={handleAccept} className="flex-1 sm:flex-initial">
                  Kabul Et
                </Button>
                <Button 
                  onClick={handleReject} 
                  variant="outline" 
                  className="flex-1 sm:flex-initial"
                >
                  Reddet
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

