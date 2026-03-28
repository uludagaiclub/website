'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, AlertCircle } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { Footer } from '@/components/footer';

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 blur-3xl"></div>
            <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10">
              <AlertCircle className="w-12 h-12 text-primary" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-6xl font-bold text-foreground">404</h1>
            <h2 className="text-2xl font-semibold text-foreground">Sayfa Bulunamadı</h2>
            <p className="text-muted-foreground">
              Aradığınız sayfa mevcut değil veya taşınmış olabilir.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="rounded-full">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Ana Sayfaya Dön
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard'a Git
              </Link>
            </Button>
          </div>

          <div className="pt-8 space-y-2 text-sm text-muted-foreground">
            <p>Yardımcı olabileceğimiz sayfalar:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
              <span>•</span>
              <Link href="/aifast" className="hover:text-primary transition-colors">AI-FAST</Link>
              <span>•</span>
              <Link href="/workshoplar" className="hover:text-primary transition-colors">Workshoplar</Link>
              <span>•</span>
              <Link href="/zirve" className="hover:text-primary transition-colors">Zirve</Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

