
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

const navItems = [
  { href: '/#product', label: 'aiagent' },
  { href: '/#usecases', label: 'kamp' },
  { href: '/#resources', label: 'etkinliklerimiz' },
  { href: '/#teknofest', label: 'yarışma takımları' },
];

export function SiteHeader() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="fixed top-0 left-0 right-0 py-3 sm:py-4 md:py-6 px-4 sm:px-6 md:px-10 z-50">
            <div className="max-w-7xl mx-auto bg-white/85 backdrop-blur-md rounded-3xl py-2.5 sm:py-3.5 px-4 sm:px-6 md:px-10 flex items-center justify-between gap-3 sm:gap-5 shadow-[5px_6px_18px_0_rgba(157,194,255,0.20)] border border-white/60">
                <Link
                    href="/"
                    className="flex-shrink-0 text-base sm:text-lg md:text-xl font-semibold font-headline tracking-tight text-slate-800 flex items-center gap-2 whitespace-nowrap antialiased overflow-visible pr-1 sm:pr-2 mr-3 sm:mr-5"
                >
                    UludagAIClub
                </Link>
                <nav className="hidden lg:flex flex-1 justify-center min-w-0 ml-4 sm:ml-6 lg:ml-8 xl:ml-12">
                    <ul className="flex items-center gap-10 xl:gap-14 list-none">
                        {navItems.map(item => (
                            <li key={item.href}>
                                <a href={item.href} className="text-foreground text-xs sm:text-sm font-light uppercase tracking-tight transition-colors hover:text-primary flex items-center gap-2 font-mono group">
                                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 border-2 border-foreground rounded-full group-hover:bg-primary group-hover:border-primary transition-all"></span>
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
                 <div className="hidden lg:flex items-center gap-3">
                    <Button asChild variant="ghost" className="rounded-full uppercase text-xs sm:text-sm font-medium tracking-tight font-mono px-5 sm:px-6 py-2 sm:py-3 h-auto">
                        <Link href="/login">Giriş Yap</Link>
                    </Button>
                    <Button asChild className="rounded-full uppercase text-xs sm:text-sm font-medium tracking-tight font-mono px-5 sm:px-6 py-2 sm:py-3 h-auto">
                        <Link href="/signup">Kayıt Ol</Link>
                    </Button>
                </div>
                <div className="lg:hidden">
                    <Button onClick={() => setIsMenuOpen(true)} variant="ghost" size="icon" className="min-w-[44px] min-h-[44px]">
                        <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                </div>
            </div>
            {isMenuOpen && (
                <div className="lg:hidden fixed inset-0 bg-background z-50 flex flex-col items-center justify-center px-4">
                    <Button onClick={() => setIsMenuOpen(false)} variant="ghost" size="icon" className="absolute top-4 right-4 sm:top-6 sm:right-6 min-w-[44px] min-h-[44px]">
                        <X className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                    <nav>
                        <ul className="flex flex-col gap-6 sm:gap-8 items-center list-none">
                            {navItems.map(item => (
                                <li key={item.href}>
                                    <a href={item.href} onClick={() => setIsMenuOpen(false)} className="text-foreground text-xl sm:text-2xl font-light uppercase tracking-tight transition-colors hover:text-primary flex items-center gap-2 font-mono min-h-[44px]">
                                        {item.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <div className="mt-6 sm:mt-8 flex flex-col gap-3 sm:gap-4 items-center w-full max-w-xs">
                       <Button asChild variant="ghost" className="rounded-full uppercase text-base sm:text-lg font-medium tracking-tight font-mono px-6 sm:px-8 py-3 sm:py-4 h-auto w-full min-h-[44px]">
                           <Link href="/login" onClick={() => setIsMenuOpen(false)}>Giriş Yap</Link>
                       </Button>
                       <Button asChild className="rounded-full uppercase text-base sm:text-lg font-medium tracking-tight font-mono px-6 sm:px-8 py-3 sm:py-4 h-auto w-full min-h-[44px]">
                           <Link href="/signup" onClick={() => setIsMenuOpen(false)}>Kayıt Ol</Link>
                       </Button>
                   </div>
                </div>
            )}
        </header>
    );
}
