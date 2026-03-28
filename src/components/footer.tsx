'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Github, Linkedin, Globe } from 'lucide-react';

export function Footer() {
  return (
    <footer className="pt-12 sm:pt-16 md:pt-24 pb-6 sm:pb-8 px-4 sm:px-6 md:px-10 bg-gradient-to-b from-[rgba(213,225,255,0.2)] to-transparent">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 md:gap-12 mb-12 sm:mb-16">
          <div className="space-y-3 sm:space-y-4 col-span-1 sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <Image 
                src="/images/analogo.png" 
                alt="UludagAIClub Logo" 
                width={40} 
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
              <Image 
                src="/images/hsdsiyah.png" 
                alt="Havelsan Logo" 
                width={100} 
                height={40}
                className="h-6 sm:h-8 md:h-10 w-auto object-contain opacity-80"
              />
              <Link href="/" className="text-xl font-semibold font-headline tracking-tight">UludagAIClub</Link>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">Yapay zeka alanında kendinizi geliştirin, projeler üretin ve topluluğun bir parçası olun.</p>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-xs font-semibold tracking-wider">EĞİTİM SEVİYELERİ</h4>
            <ul className="space-y-1.5 sm:space-y-2 list-none">
              <li><a href="/junior" className="text-xs font-medium text-foreground transition-opacity hover:opacity-70">Junior</a></li>
              <li><a href="/junior-plus" className="text-xs font-medium text-foreground transition-opacity hover:opacity-70">Junior Plus</a></li>
              <li><a href="/mid" className="text-xs font-medium text-foreground transition-opacity hover:opacity-70">Mid</a></li>
              <li><a href="/mid-plus" className="text-xs font-medium text-foreground transition-opacity hover:opacity-70">Mid Plus</a></li>
              <li><a href="/senior" className="text-xs font-medium text-foreground transition-opacity hover:opacity-70">Senior</a></li>
            </ul>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-xs font-semibold tracking-wider">TOPLULUK</h4>
            <ul className="space-y-1.5 sm:space-y-2 list-none">
              <li><a href="/teknofest" className="text-xs font-medium text-foreground transition-opacity hover:opacity-70">Teknofest Takımları</a></li>
              <li><a href="/hakkimizda" className="text-xs font-medium text-foreground transition-opacity hover:opacity-70">Hakkımızda</a></li>
              <li><a href="/misyonumuz" className="text-xs font-medium text-foreground transition-opacity hover:opacity-70">Misyonumuz</a></li>
              <li><a href="/gizlilik-politikasi" className="text-xs font-medium text-foreground transition-opacity hover:opacity-70">Gizlilik Politikası</a></li>
              <li><a href="/kullanim-sartlari" className="text-xs font-medium text-foreground transition-opacity hover:opacity-70">Kullanım Şartları</a></li>
              <li><a href="/kvkk" className="text-xs font-medium text-foreground transition-opacity hover:opacity-70">KVKK Aydınlatma Metni</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-black/10 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm text-foreground gap-4">
          <p className="text-center sm:text-left">© 2025 UludagAIClub. Tüm hakları saklıdır.</p>
          <div className="flex items-center gap-3 sm:gap-4">
            <a href="https://www.instagram.com/uludagaiclub" target="_blank" rel="noopener noreferrer" className="text-foreground transition-opacity hover:opacity-70 min-w-[44px] min-h-[44px] flex items-center justify-center">
              <Instagram className="h-4 w-4 sm:h-5 sm:w-5" />
            </a>
            <a href="https://www.linkedin.com/company/uludagaiclub" target="_blank" rel="noopener noreferrer" className="text-foreground transition-opacity hover:opacity-70 min-w-[44px] min-h-[44px] flex items-center justify-center">
              <Linkedin className="h-4 w-4 sm:h-5 sm:w-5" />
            </a>
            <a href="https://github.com/uludagai-club" target="_blank" rel="noopener noreferrer" className="text-foreground transition-opacity hover:opacity-70 min-w-[44px] min-h-[44px] flex items-center justify-center">
              <Github className="h-4 w-4 sm:h-5 sm:w-5" />
            </a>
            <a href="https://yapayzekatoplulugu.uludag.edu.tr" target="_blank" rel="noopener noreferrer" className="text-foreground transition-opacity hover:opacity-70 min-w-[44px] min-h-[44px] flex items-center justify-center">
              <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
            </a>
          </div>
          <p className="hidden sm:block">Bursa, Türkiye</p>
        </div>
      </div>
    </footer>
  );
}
