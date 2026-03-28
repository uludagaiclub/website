
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { SiteHeader } from '@/components/site-header';
import { Footer } from '@/components/footer';
import { motion } from "framer-motion"
import { Pacifico } from "next/font/google"

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-pacifico",
})

const Section = ({ id, children, className }: { id?: string, children: React.ReactNode, className?: string }) => (
  <section id={id} className={cn("py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-10", className)}>
    {children}
  </section>
);

const SectionDivider = () => (
  <div className="relative h-16 sm:h-20 md:h-24 flex items-center justify-center">
    <div className="absolute inset-x-6 sm:inset-x-20 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
    <div className="relative flex items-center gap-2 px-4 py-1 rounded-full bg-white/80 backdrop-blur border border-white/70 shadow-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
      <span className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-slate-500">UludagAIClub</span>
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
    </div>
  </div>
);

type ElegantShapeProps = {
  readonly className?: string;
  readonly delay?: number;
  readonly width?: number;
  readonly height?: number;
  readonly rotate?: number;
  readonly gradient?: string;
};

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
}: Readonly<ElegantShapeProps>) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: rotate,
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        style={{
          width,
          height,
        }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            "backdrop-blur-[2px] border-2 border-white/[0.15]",
            "shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]",
          )}
        />
      </motion.div>
    </motion.div>
  )
}


export default function LandingPage() {
    const useCases = [
        { tag: "EĞİTİM SEVİYESİ", title: "Junior", imageUrl: "/images/junior.png" },
        { tag: "EĞİTİM SEVİYESİ", title: "Junior Plus", imageUrl: "/images/junior-plus.png" },
        { tag: "EĞİTİM SEVİYESİ", title: "Mid", imageUrl: "/images/mid.png" },
        { tag: "EĞİTİM SEVİYESİ", title: "Mid Plus", imageUrl: "/images/mid-plus.png" },
        { tag: "EĞİTİM SEVİYESİ", title: "Senior", imageUrl: "/images/senior.png" },
    ];

    const platformFeatures = [
        { title: "Yapay Zeka\nZirvesi", description: "Türkiye'nin en büyük yapay zeka etkinliği. Alanında uzman konuşmacılar ve networking fırsatları.", className: "bg-[rgba(255,245,245,0.6)]", href: "/zirve"},
        { title: "AIFEST", description: "Bir günde 6 sektörden 6 kişiyle uygulamalı yapay zeka eğitimleri ve workshop'lar.", className: "bg-[rgba(240,253,244,0.6)]", href: "/aifast"},
        { title: "Workshoplar", description: "Her dönem, alanında deneyimli eğitmenlerle uygulamalı yapay zeka eğitimleri.", className: "bg-[rgba(225,219,255,0.6)]", href: "/workshoplar"},
        { title: "Daha Fazlası", description: "Tanışma etkinlikleri, networking geceleri, hackathon'lar ve topluluk buluşmaları ile AI ekosisteminin merkezinde yer alın.", className: "bg-[rgba(213,225,255,0.6)]", href: "#"},
    ];

    const featureMedia = [
        { src: "/images/yztzirvefotosu.jpeg", alt: "Yapay Zeka Zirvesi Fotoğrafı" },
        { src: "/images/aıfesstkartfoto.jpeg", alt: "AI Fest Etkinlik Fotoğrafı" },
        { src: "/images/workshopla.jpeg", alt: "Workshoplar Etkinlik Fotoğrafı" },
        { src: "/images/dahafazlasıkartıfotosu.jpeg", alt: "Daha Fazlası Etkinlik Fotoğrafı" },
    ] as const;

    const renderFeatureMedia = (index: number) => {
        const media = featureMedia[index];
        if (!media) {
            return (
                <div className="w-full h-24 sm:h-32 md:h-40 bg-gradient-to-br from-purple-100 to-orange-100 rounded-2xl"></div>
            );
        }

        return (
            <div className="w-full h-24 sm:h-32 md:h-40 rounded-2xl overflow-hidden relative">
                <Image
                    src={media.src}
                    alt={media.alt}
                    fill
                    className="object-cover"
                    priority
                />
            </div>
        );
    };

    return (
        <div className="flex flex-col flex-1 bg-background text-foreground overflow-x-hidden">
            <SiteHeader />

            <main>
                {/* Hero Section */}
                <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-b from-[rgba(213,225,255,0.3)] to-transparent">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] blur-3xl" />

                    <div className="absolute inset-0 overflow-hidden">
                        <ElegantShape
                            delay={0.3}
                            width={600}
                            height={140}
                            rotate={12}
                            gradient="from-indigo-500/[0.15]"
                            className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
                        />

                        <ElegantShape
                            delay={0.5}
                            width={500}
                            height={120}
                            rotate={-15}
                            gradient="from-rose-500/[0.15]"
                            className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
                        />

                        <ElegantShape
                            delay={0.4}
                            width={300}
                            height={80}
                            rotate={-8}
                            gradient="from-violet-500/[0.15]"
                            className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
                        />

                        <ElegantShape
                            delay={0.6}
                            width={200}
                            height={60}
                            rotate={20}
                            gradient="from-amber-500/[0.15]"
                            className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
                        />

                        <ElegantShape
                            delay={0.7}
                            width={150}
                            height={40}
                            rotate={-25}
                            gradient="from-cyan-500/[0.15]"
                            className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]"
                        />
                    </div>

                    <div className="relative z-10 container mx-auto px-4 sm:px-6 md:px-8 pt-24 sm:pt-32 md:pt-48 pb-12 sm:pb-16">
                        <div className="max-w-3xl mx-auto text-center">
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1, delay: 0.3 }}
                                className="mb-8 md:mb-12"
                            >
                                <div className="relative inline-block">
                                    <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-44 md:h-44 bg-white rounded-full p-2 shadow-lg mx-auto">
                                        <Image 
                                            src="/images/analogo.png" 
                                            alt="UludagAIClub Logo" 
                                            width={120} 
                                            height={120}
                                            className="w-full h-full object-cover rounded-full"
                                            priority
                                        />
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div 
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1, delay: 0.7 }}
                            >
                                <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-6 md:mb-8 tracking-tight">
                                    <span
                                        className={cn(
                                            "bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-gray-700 to-rose-600 ",
                                            pacifico.className,
                                        )}
                                    >
                                        Yapay zeka yolculuğunuza buradan başlayın.
                                    </span>
                                </h1>
                            </motion.div>

                            <motion.div 
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1, delay: 0.9 }}
                                className="flex flex-col sm:flex-row gap-6 items-center justify-center"
                            >
                                <Link href="/signup" className="text-sm sm:text-lg md:text-xl font-light tracking-tight relative pl-3 sm:pl-4 transition-colors hover:text-primary hover:underline">
                                    <span className="absolute top-1/2 -translate-y-1/2 left-0 w-1.5 sm:w-2 h-1.5 sm:h-2 bg-[#8E80D1] rounded-sm"></span>
                                    {' '}
                                    Bir hesap oluştur
                                </Link>
                                <Button asChild className="rounded-full uppercase text-sm sm:text-base font-medium px-6 sm:px-8 py-3 sm:py-4 h-auto group bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-700 hover:to-rose-700 text-white">
                                    <Link href="/login">Hemen Başla <span className="ml-2 sm:ml-4 transition-transform group-hover:translate-x-1">→</span></Link>
                                </Button>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1, delay: 1 }}
                                className="mt-8 sm:mt-10 md:mt-12 flex justify-center"
                            >
                                <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 rounded-2xl bg-white/80 px-6 sm:px-8 py-5 shadow-xl backdrop-blur border border-white/60">
                                    {[
                                        { label: "Aktif Üye", value: "1200+", accent: "text-slate-800" },
                                        { label: "Koordinasyon Üyesi", value: "50+", accent: "text-rose-600" },
                                        { label: "Kamp Öğrencisi", value: "400+", accent: "text-emerald-600" },
                                        { label: "Takım Üyesi", value: "100+", accent: "text-indigo-600" },
                                    ].map((item) => (
                                        <div
                                            key={item.label}
                                            className="flex flex-col items-center text-center rounded-xl bg-white/75 px-6 py-4 shadow-sm border border-white/60 min-w-[150px]"
                                        >
                                            <span className="text-[11px] sm:text-xs uppercase tracking-[0.3em] text-slate-500">
                                                {item.label}
                                            </span>
                                            <span className={cn("text-xl sm:text-2xl font-semibold tracking-tight mt-2", item.accent)}>
                                                {item.value}
                                            </span>
                                        </div>
                                    ))}
                                    <span className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-rose-500 opacity-70 blur-sm animate-pulse" />
                                </div>
                            </motion.div>

                            <motion.div 
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1, delay: 1.1 }}
                                className="mt-8 sm:mt-12 md:mt-16"
                            >
                                <div className="flex justify-center">
                                    <Image 
                                        src="/images/hsdsiyah.png" 
                                        alt="Havelsan Logo" 
                                        width={300} 
                                        height={120}
                                        className="w-auto h-16 sm:h-24 md:h-32 lg:h-40 object-contain opacity-80 hover:opacity-100 transition-opacity"
                                        priority
                                    />
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-[rgba(213,225,255,0.3)] via-transparent to-[rgba(213,225,255,0.3)] pointer-events-none" />
                </div>

                <SectionDivider />

                {/* Agents Section */}
                <Section id="product" className="bg-gradient-to-b from-[rgba(255,232,207,0.2)] to-transparent">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-8 sm:mb-12">
                            <p className="text-xs sm:text-sm text-primary font-normal uppercase tracking-tight mb-4 sm:mb-6">AI ASİSTAN</p>
                            <h2 className="text-2xl sm:text-4xl md:text-6xl font-normal leading-tight tracking-tight font-headline mb-4 sm:mb-6">
                                Yapay Zeka Asistanınızla<br className="hidden sm:block" />
                                <span className="text-primary">Ödevlerinizi Kontrol Edin</span>
                            </h2>
                            <p className="text-base sm:text-lg md:text-xl font-light leading-relaxed max-w-3xl text-slate-600">
                                Kamp öğrencilerimiz için özel olarak tasarlanmış AI asistanı ile ödevlerinizi daha verimli yönetin ve geri bildirim alın.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12">
                            <div className="bg-gradient-to-br from-blue-50/80 to-blue-100/60 backdrop-blur-sm rounded-2xl p-6 sm:p-8 md:p-10 border border-blue-200/50 hover:border-blue-300/70 transition-all duration-200 hover:shadow-lg">
                                <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-800 mb-4 sm:mb-5">Ödevinizi Yükleyin</h3>
                                <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                                    Tamamladığınız ödevlerinizi sisteme yükleyin ve AI asistanımızın kontrolüne hazır hale getirin.
                                </p>
                            </div>
                            
                            <div className="bg-gradient-to-br from-green-50/80 to-green-100/60 backdrop-blur-sm rounded-2xl p-6 sm:p-8 md:p-10 border border-green-200/50 hover:border-green-300/70 transition-all duration-200 hover:shadow-lg">
                                <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-800 mb-4 sm:mb-5">AI Asistan Kontrol Etsin</h3>
                                <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                                    Yapay zeka asistanımız ödevinizi detaylı bir şekilde analiz eder ve kapsamlı bir kontrol gerçekleştirir.
                                </p>
                            </div>
                            
                            <div className="bg-gradient-to-br from-purple-50/80 to-purple-100/60 backdrop-blur-sm rounded-2xl p-6 sm:p-8 md:p-10 border border-purple-200/50 hover:border-purple-300/70 transition-all duration-200 hover:shadow-lg">
                                <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-800 mb-4 sm:mb-5">Hatalarınızı Geri Bildirim Alın</h3>
                                <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                                    AI asistanımız tespit ettiği hataları ve iyileştirme önerilerini detaylı bir geri bildirim raporu olarak size sunar.
                                </p>
                            </div>
                        </div>
                    </div>
                </Section>

                <SectionDivider />

                {/* Testimonials / Metrics */}
                {/* Use Cases */}
                <Section id="usecases">
                    <div className="max-w-7xl mx-auto">
                        <p className="text-xs sm:text-sm text-primary font-normal uppercase tracking-tight mb-4 sm:mb-6">BU KAMPTA SİZİ NELER BEKLİYOR</p>
                        <h2 className="text-2xl sm:text-4xl md:text-6xl font-normal leading-none tracking-tight font-headline">Kamp Müfredatları</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mt-8 sm:mt-12 md:mt-16">
                            {useCases.map((uc) => {
                                const getRoute = (title: string) => {
                                    if (title === "Junior") return "/junior";
                                    if (title === "Junior Plus") return "/junior-plus";
                                    if (title === "Mid") return "/mid";
                                    if (title === "Mid Plus") return "/mid-plus";
                                    if (title === "Senior") return "/senior";
                                    return "#";
                                };
                                
                                return (
                                    <Link href={getRoute(uc.title)} key={uc.title} className="bg-gray-50 rounded-[20px] sm:rounded-[30px] md:rounded-[40px] p-4 sm:p-5 md:p-6 transition-all hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10 block">
                                        <p className="text-[10px] sm:text-xs font-medium uppercase tracking-tighter mb-2 sm:mb-4">{uc.tag}</p>
                                        <h3 className="text-xl sm:text-2xl md:text-3xl font-normal tracking-tight leading-tight mb-3 sm:mb-4 whitespace-pre-line font-headline">{uc.title}</h3>
                                        <div className="w-full h-32 sm:h-40 md:h-48 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl sm:rounded-2xl my-4 sm:my-6 relative overflow-hidden">
                                            <Image
                                                src={uc.imageUrl}
                                                alt={uc.title}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <span className="flex items-center justify-between text-xs sm:text-sm text-primary font-medium uppercase tracking-tight group">
                                            DAHA FAZLA <span className="transition-transform group-hover:translate-x-1">→</span>
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </Section>
                
                <SectionDivider />
                
                {/* Platform */}
                <Section id="resources" className="bg-gradient-to-b from-[rgba(225,219,255,0.3)] to-transparent">
                     <div className="max-w-7xl mx-auto">
                         <div className="mb-8 sm:mb-12">
                            <p className="text-xs sm:text-sm text-primary font-normal uppercase tracking-tight mb-4 sm:mb-6">ETKİNLİKLERİMİZ</p>
                            <h2 className="text-2xl sm:text-4xl md:text-6xl font-normal leading-none tracking-tight font-headline">
                                Yapay Zeka Dünyasında <br className="hidden sm:block" />
                                <span className="text-primary">Öncü Etkinlikler</span>
                            </h2>
                            <p className="text-base sm:text-lg md:text-xl font-light mt-6 sm:mt-8 leading-relaxed max-w-3xl">
                                Zirveler, hızlı gelişim programları, workshoplar ve daha fazlası ile <strong>yapay zeka ekosisteminin merkezinde</strong> yer alın.
                            </p>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                             {platformFeatures.map((feat, i) => (
                                <div key={feat.title} className={`bg-white rounded-[30px] sm:rounded-[40px] md:rounded-[54px] p-5 sm:p-6 md:p-8 block ${feat.className}`}>
                                     {renderFeatureMedia(i)}
                                     <h3 className="text-lg sm:text-xl md:text-2xl font-normal leading-tight tracking-tighter mt-4 sm:mt-6 whitespace-pre-line font-headline">{feat.title}</h3>
                                     <p className="text-xs sm:text-sm md:text-base font-light leading-tight mt-3 sm:mt-4">{feat.description}</p>
                                </div>
                             ))}
                         </div>
                     </div>
                </Section>

                <SectionDivider />

                {/* Teknofest Takımları */}
                <Section id="teknofest" className="bg-gradient-to-b from-[rgba(255,248,220,0.3)] to-transparent">
                    <div className="max-w-7xl mx-auto">
                        <p className="text-xs sm:text-sm text-primary font-normal uppercase tracking-tight mb-4 sm:mb-6">YARIŞMA TAKIMLARI</p>
                        <h2 className="text-2xl sm:text-4xl md:text-6xl font-normal leading-none tracking-tight font-headline">Teknofest Takımları</h2>
                        <p className="text-base sm:text-lg md:text-xl font-light mt-6 sm:mt-8 leading-relaxed max-w-3xl">
                            Yarışma takımlarımızla Teknofest'te yarışın. Proje geliştirme, takım çalışması ve yarışma deneyimi kazanın.
                        </p>
                        <div className="mt-8 sm:mt-12">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6">
                                <div className="bg-white rounded-[30px] sm:rounded-[40px] md:rounded-[54px] p-5 sm:p-6 md:p-8 bg-[rgba(255,245,245,0.6)]">
                                    <div className="w-full aspect-[9/11] rounded-2xl overflow-hidden relative">
                                        <Image 
                                            src="/images/yarışmatakımlarıfoto1.jpeg" 
                                            alt="Yarışma Takımları Fotoğrafı" 
                                            fill
                                            className="object-cover"
                                            priority
                                        />
                                    </div>
                                </div>
                                
                                <div className="bg-white rounded-[30px] sm:rounded-[40px] md:rounded-[54px] p-5 sm:p-6 md:p-8 bg-[rgba(240,253,244,0.6)]">
                                    <div className="w-full aspect-[9/11] rounded-2xl overflow-hidden relative">
                                        <Image 
                                            src="/images/yarışmatakımlarıfoto2.jpeg" 
                                            alt="Yarışma Takımları Fotoğrafı 2" 
                                            fill
                                            className="object-cover"
                                            priority
                                        />
                                    </div>
                                </div>
                                
                                <div className="bg-white rounded-[30px] sm:rounded-[40px] md:rounded-[54px] p-5 sm:p-6 md:p-8 bg-[rgba(225,219,255,0.6)]">
                                    <div className="w-full aspect-[9/11] rounded-2xl overflow-hidden relative">
                                        <Image 
                                            src="/images/yarışmatakımlarıfoto3.jpeg" 
                                            alt="Yarışma Takımları Fotoğrafı 3" 
                                            fill
                                            className="object-cover"
                                            priority
                                        />
                                    </div>
                                </div>
                                
                                <div className="bg-white rounded-[30px] sm:rounded-[40px] md:rounded-[54px] p-5 sm:p-6 md:p-8 bg-[rgba(213,225,255,0.6)]">
                                    <div className="w-full aspect-[9/11] rounded-2xl overflow-hidden relative">
                                        <Image 
                                            src="/images/yarışmatakımlarıfoto4.jpeg" 
                                            alt="Yarışma Takımları Fotoğrafı 4" 
                                            fill
                                            className="object-cover"
                                            priority
                                        />
                                    </div>
                                </div>
                                
                                <div className="bg-white rounded-[30px] sm:rounded-[40px] md:rounded-[54px] p-5 sm:p-6 md:p-8 bg-[rgba(255,248,220,0.6)]">
                                    <div className="w-full aspect-[9/11] rounded-2xl overflow-hidden relative">
                                        <Image 
                                            src="/images/yarışmatakımlarıfoto5.jpeg" 
                                            alt="Yarışma Takımları Fotoğrafı 5" 
                                            fill
                                            className="object-cover"
                                            priority
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 sm:mt-12 text-center">
                                <Button asChild className="rounded-full uppercase text-sm sm:text-base font-medium px-6 sm:px-8 py-3 sm:py-4 h-auto group">
                                    <Link href="/teknofest">Takımlarımızı Keşfedin <span className="ml-2 sm:ml-4 transition-transform group-hover:translate-x-1">→</span></Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </Section>

                <SectionDivider />

                {/* CTA */}
                <Section className="bg-white">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
                            {/* Sol Logo - Analog */}
                            <div className="flex-shrink-0 order-2 md:order-1">
                                <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-white p-2 shadow-lg">
                                    <Image 
                                        src="/images/analogo.png" 
                                        alt="UludagAIClub Logo" 
                                        width={120} 
                                        height={120}
                                        className="w-full h-full object-cover rounded-full opacity-80 hover:opacity-100 transition-opacity"
                                    />
                                </div>
                            </div>

                            {/* Orta Kısım - Metin ve Butonlar */}
                            <div className="flex-1 text-center order-1 md:order-2">
                                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal leading-tight tracking-tight mb-6 sm:mb-8 font-headline">
                                    Yapay zeka yolculuğunuza bugün başlayın
                                </h2>
                                <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-12 max-w-2xl mx-auto">
                                    UludagAIClub topluluğuna katılın, kamp programlarımıza dahil olun ve yapay zeka alanında kendinizi geliştirin.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                                    <Button asChild className="rounded-full uppercase text-sm sm:text-base font-medium px-6 sm:px-8 py-3 sm:py-4 h-auto group bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-700 hover:to-rose-700 text-white">
                                        <Link href="/signup">Kayıt Ol <span className="ml-2 sm:ml-4 transition-transform group-hover:translate-x-1">→</span></Link>
                                    </Button>
                                    <Button asChild variant="outline" className="rounded-full uppercase text-sm sm:text-base font-medium px-6 sm:px-8 py-3 sm:py-4 h-auto">
                                        <Link href="/login">Giriş Yap</Link>
                                    </Button>
                                </div>
                            </div>

                            {/* Sağ Logo - HSD */}
                            <div className="flex-shrink-0 order-3">
                                <Image 
                                    src="/images/hsdsiyah.png" 
                                    alt="Havelsan Logo" 
                                    width={200} 
                                    height={80}
                                    className="w-auto h-16 sm:h-20 md:h-24 lg:h-32 object-contain opacity-80 hover:opacity-100 transition-opacity"
                                />
                            </div>
                        </div>
                    </div>
                </Section>

            </main>

            <Footer />
        </div>
    );
}
    
