
'use client'

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Home, Users, Menu, Bot, HelpCircle } from "lucide-react"
import { Logo } from "@/components/logo"
import { UserNav } from "@/components/user-nav"
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import type { UserProfile } from "@/types"
import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { Separator } from "./ui/separator"
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Image from "next/image"

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  roles: ('student' | 'teacher')[];
  external?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ['student', 'teacher'] },
  { href: "/students", icon: Users, label: "Öğrenciler", roles: ['teacher'] },
  { href: "/dashboard/ai-agent", icon: Bot, label: "AI Agent", roles: ['teacher'] },
];

const homeNavItem = { href: "/", icon: Home, label: "Ana Sayfa" };

type NavLinksProps = {
  itemsToRender: NavItem[];
  pathname: string;
  isMobile?: boolean;
  onMobileMenuClose: () => void;
};

const NavLinks = ({ itemsToRender, pathname, isMobile = false, onMobileMenuClose }: NavLinksProps) => (
  <>
    {itemsToRender.map((item) => {
      const isActive = !item.external && (pathname === item.href || (item.href !== '/dashboard' && item.href !== '/' && pathname.startsWith(item.href)));

      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => isMobile && onMobileMenuClose()}
          prefetch={item.external ? false : undefined}
          target={item.external ? "_blank" : undefined}
          rel={item.external ? "noopener noreferrer" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
            isActive && "text-primary bg-muted",
            isMobile && "text-lg"
          )}
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </Link>
      );
    })}
    <Separator className={cn("my-2", isMobile ? "block" : "hidden")} />
    <Link
      href={homeNavItem.href}
      onClick={() => isMobile && onMobileMenuClose()}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
        pathname === homeNavItem.href && "text-primary bg-muted",
        isMobile ? "text-lg" : "md:hidden lg:flex"
      )}
    >
      <homeNavItem.icon className="h-5 w-5" />
      {homeNavItem.label}
    </Link>
  </>
);

type DashboardLayoutProps = {
  readonly children: ReactNode;
};

export function DashboardLayout({ children }: Readonly<DashboardLayoutProps>) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isUserLoading, firestore } = useFirebase();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  const userProfileRef = useMemoFirebase(() => (user && firestore) ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const isLoading = isUserLoading || isProfileLoading;

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push('/login');
    }

  }, [isLoading, user, router, userProfile, pathname]);
  
  const getNavItemsForRole = () => {
    if (isLoading || !userProfile) return [];
    
    const role = userProfile.role?.trim();
    
    // Sadece role === 'student' veya role === 'teacher' ise menü göster
    if (role === 'student' || role === 'teacher') {
      return navItems.filter(item => item.roles.includes(role));
    }
    
    return [];
  }

  const itemsToRender = getNavItemsForRole();

  if (isLoading || !user || !userProfile) {
      return (
          <div className="flex h-screen w-screen items-center justify-center bg-background">
              <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
          </div>
      )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
       <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-40 justify-between">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-lg font-semibold md:text-base mr-4"
          >
            <Logo />
            <span className="sr-only">UludagAIClub</span>
          </Link>
          
          {/* Nasıl Kullanırım - Logo'nun yanında, sadece öğrenciler için */}
          {userProfile?.role === 'student' && (
            <HowToUseDialog />
          )}
          
          <div className="flex items-center gap-4 lg:gap-6 ml-6 lg:ml-10">
             <NavLinks 
               itemsToRender={itemsToRender}
               pathname={pathname}
               onMobileMenuClose={() => setIsMobileMenuOpen(false)}
             />
          </div>
        </nav>
        
        {/* Sağ taraf: Öğrenci bilgileri ve kullanıcı menüsü */}
        <div className="flex items-center gap-3 sm:gap-4 ml-auto">
          <UserNav />
        </div>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader className="mb-4">
                <SheetTitle>
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-lg font-semibold"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <Logo />
                        <span>UludagAIClub</span>
                    </Link>
                </SheetTitle>
                <SheetDescription>
                    Uygulama içinde gezinmek için aşağıdaki bağlantıları kullanın.
                </SheetDescription>
            </SheetHeader>
            <nav className="grid gap-2 text-lg font-medium">
              <NavLinks 
                itemsToRender={itemsToRender}
                pathname={pathname}
                isMobile={true}
                onMobileMenuClose={() => setIsMobileMenuOpen(false)}
              />
            </nav>
          </SheetContent>
        </Sheet>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {children}
      </main>
      <footer className="border-t bg-background/80 px-4 py-6 text-sm text-muted-foreground md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <p className="font-medium text-slate-700">
              © {currentYear} Uludağ AI Club. Tüm hakları saklıdır.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-wide text-slate-500">
            <Link href="/" className="hover:text-primary transition-colors">Anasayfa</Link>
            <span className="hidden md:inline">•</span>
            <Link href="/kvkk" className="hover:text-primary transition-colors">KVKK</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function HowToUseDialog() {
  const [isOpen, setIsOpen] = useState(false);

  const tutorialSteps = [
    {
      title: "1. Yeni Ödevler",
      description: "Ödev sayfasına giderek atanan ödevlerinizi görüntüleyin ve teslim edin.",
      image: "/images/tutorial-odevler.png"
    },
    {
      title: "2. Geri Bildirimler",
      description: "AI ve öğretmen geri bildirimlerinizi görüntüleyerek gelişiminizi takip edin.",
      image: "/images/tutorial-geribildirimler.png"
    },
    {
      title: "3. Workshop'lar",
      description: "Gelişim Kampı workshoplarına katılın ve ilerlemenizi takip edin.",
      image: "/images/tutorial-workshoplar.png"
    },
    {
      title: "4. Bildirim Merkezi",
      description: "Dashboard'da öğretmenlerinizden gelen duyuruları kontrol edin.",
      image: "/images/tutorial-bildirimler.png"
    },
    {
      title: "5. Profil Menüsü",
      description: "Önce sağ üstteki profil logosuna tıklayın ve 'Profil Düzenle' seçeneğini seçin.",
      image: "/images/tutorial-profil-1.png"
    },
    {
      title: "6. Bilgileri Güncelleme",
      description: "Ad ve soyadınızı girin, ardından 'Kaydet' butonuna tıklayarak profilinizi güncelleyin.",
      image: "/images/tutorial-profil-2.png"
    }
  ];

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-9 px-3 gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
        onClick={() => setIsOpen(true)}
      >
        <HelpCircle className="w-4 h-4" />
        <span className="text-xs font-semibold hidden lg:inline">Nasıl Kullanırım?</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-indigo-600" />
              Nasıl Kullanırım?
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6">
            <Carousel className="w-full">
              <CarouselContent>
                {tutorialSteps.map((step, index) => (
                  <CarouselItem key={index}>
                    <div className="space-y-4">
                      <div className="relative w-full h-[400px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl overflow-hidden border-2 border-slate-300">
                        <Image
                          src={step.image}
                          alt={step.title}
                          fill
                          className="object-contain p-4"
                          priority={index === 0}
                        />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
                        <p className="text-sm text-slate-600">{step.description}</p>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </Carousel>
            
            <div className="mt-6 pt-4 border-t text-center">
              <p className="text-xs text-slate-500">
                Sağ ve sol oklarla veya kaydırarak ilerleyebilirsiniz
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
    