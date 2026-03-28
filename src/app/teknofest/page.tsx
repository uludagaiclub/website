'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Users, Trophy, Rocket, Target } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { Footer } from '@/components/footer';

const Section = ({ id, children, className }: { id?: string, children: React.ReactNode, className?: string }) => (
    <section id={id} className={cn("py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-10", className)}>
        {children}
    </section>
);

export default function TeknoFestPage() {
    const teams = [
        {
            name: "YZT TALOS",
            category: "Teknofest Robotaksi Hazır Araç Yarışması",
            description: "Otonom araç teknolojileri, sensör füzyonu ve yapay zeka ile hazır araç yarışmasına katılan takım.",
            technologies: ["ROS2", "Computer Vision", "Lidar", "Sensor Fusion", "Autonomous Driving"],
            goals: ["Otonom navigasyon", "Gerçek zamanlı karar verme", "Güvenli sürüş algoritmaları"],
            color: "bg-blue-100",
            icon: Rocket
        },
        {
            name: "YZT AITOLIA",
            category: "Yapay Zeka ve Teknoloji",
            description: "Yapay zeka teknolojileri ve yenilikçi çözümler geliştiren takım.",
            technologies: ["Machine Learning", "Deep Learning", "AI Applications", "Data Science"],
            goals: ["AI projeleri geliştirme", "Teknofest yarışmalarına katılım", "İnovatif çözümler"],
            color: "bg-purple-100",
            icon: Target
        },
        {
            name: "YZT MEVZU",
            category: "Yapay Zeka ve Teknoloji",
            description: "Yapay zeka alanında araştırma ve geliştirme yapan takım.",
            technologies: ["AI/ML", "Computer Vision", "NLP", "Robotics"],
            goals: ["Teknofest projeleri", "Araştırma ve geliştirme", "Yarışma hazırlığı"],
            color: "bg-green-100",
            icon: Users
        },
        {
            name: "YZT HAVA SAVUNMA",
            category: "Hava Savunma Sistemleri",
            description: "Hava savunma teknolojileri ve otonom sistemler geliştiren takım.",
            technologies: ["Defense Systems", "Autonomous Systems", "Sensor Technology", "AI"],
            goals: ["Hava savunma sistemleri", "Otonom teknolojiler", "Teknofest yarışmaları"],
            color: "bg-cyan-100",
            icon: Trophy
        },
        {
            name: "YZT EĞİTİMDE YAPAY ZEKA",
            category: "Eğitim Teknolojileri",
            description: "Eğitim alanında yapay zeka uygulamaları geliştiren takım.",
            technologies: ["Educational AI", "Learning Analytics", "Adaptive Learning", "NLP"],
            goals: ["Eğitim teknolojileri", "AI destekli öğrenme", "Eğitim çözümleri"],
            color: "bg-pink-100",
            icon: Target
        },
        {
            name: "YZT HERDAI",
            category: "Yapay Zeka ve Teknoloji",
            description: "Yapay zeka ve teknoloji alanında projeler geliştiren takım.",
            technologies: ["AI/ML", "Technology Innovation", "Software Development"],
            goals: ["Teknoloji projeleri", "Yapay zeka uygulamaları", "Teknofest katılımı"],
            color: "bg-yellow-100",
            icon: Rocket
        },
        {
            name: "YZT ARTİN",
            category: "Yapay Zeka ve Teknoloji",
            description: "Yapay zeka ve teknoloji alanında inovatif projeler geliştiren takım.",
            technologies: ["AI/ML", "Machine Learning", "Deep Learning", "Computer Vision"],
            goals: ["Yapay zeka projeleri", "Teknofest yarışmalarına katılım", "İnovatif çözümler"],
            color: "bg-indigo-100",
            icon: Target
        }
    ];

    const benefits = [
        "Teknofest yarışmalarına katılım imkanı",
        "Deneyimli mentorlardan destek alma",
        "Haftalık takım toplantıları ve sprint'ler",
        "Üniversite ve şirket sponsorlukları",
        "Workshop ve eğitim olanakları",
        "Networking ve kariyer fırsatları",
        "Makale ve bildiri yayınlama desteği",
        "Yarışma öncesi mock sunumlar"
    ];

    return (
        <div className="flex flex-col flex-1 bg-background text-foreground overflow-x-hidden">
            <SiteHeader />

            <main>
                {/* Hero Section */}
                <Section className="min-h-[70vh] pt-48 sm:pt-64 pb-24 bg-gradient-to-br from-[#fff5f5] via-[#ffe9d6] to-[#fff] flex items-center">
                    <div className="max-w-6xl mx-auto flex flex-col items-center text-center space-y-8">
                        <div className="inline-flex items-center justify-center gap-3 py-2 pl-3 pr-5 bg-white/70 rounded-full text-sm font-medium tracking-wide uppercase text-red-600 shadow-sm">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                            {' '}Yarışma Takımları
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-normal leading-tight tracking-tighter max-w-4xl font-headline">
                            Teknofest Takımları
                        </h1>
                        <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-light leading-normal max-w-3xl text-muted-foreground">
                            Türkiye'nin en büyük teknoloji yarışması Teknofest için hazırlanan 7 özel takımımız. Yapay zeka projeleriyle yarışmalarda yerinizi alın, mentorlardan destek alın ve takım çalışmasıyla hedeflerinize ulaşın.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Button asChild size="lg" className="rounded-full px-8 py-6 h-auto text-base font-semibold shadow-md hover:shadow-lg transition-shadow">
                                <Link href="#teams">Takımları İncele</Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="rounded-full px-8 py-6 h-auto text-base font-semibold border-red-200 text-red-700 hover:text-red-600 hover:bg-red-50">
                                <Link href="/">Ana Sayfaya Dön</Link>
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full">
                            <div className="flex items-center gap-4 bg-white/85 backdrop-blur rounded-2xl px-5 py-4 shadow-sm">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                                    <Trophy className="h-6 w-6 text-red-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-lg font-semibold text-red-700">7 Takım</p>
                                    <p className="text-sm text-muted-foreground">Farklı kategorilerde uzman ekipler</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-white/85 backdrop-blur rounded-2xl px-5 py-4 shadow-sm">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                                    <Users className="h-6 w-6 text-red-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-lg font-semibold text-red-700">Mentor Ekibi</p>
                                    <p className="text-sm text-muted-foreground">Alanında deneyimli rehberler</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-white/85 backdrop-blur rounded-2xl px-5 py-4 shadow-sm">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                                    <Rocket className="h-6 w-6 text-red-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-lg font-semibold text-red-700">Yarışma Hazırlığı</p>
                                    <p className="text-sm text-muted-foreground">Sprint, workshop ve mock sunumlar</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Takımlar */}
                <Section id="teams">
                    <div className="max-w-7xl mx-auto">
                        <p className="text-sm text-primary font-normal uppercase tracking-tight mb-6">TAKIMLARIMIZ</p>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal leading-none tracking-tight font-headline mb-8 sm:mb-12 md:mb-16">
                            7 Farklı Kategori, 7 Ayrı Takım
                        </h2>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6 lg:gap-8">
                            {teams.map((team) => {
                                const Icon = team.icon;
                                return (
                                    <div 
                                        key={team.name} 
                                        className={cn(
                                            "rounded-[28px] sm:rounded-[36px] p-6 sm:p-8 transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col h-full",
                                            team.color
                                        )}
                                    >
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                                                <Icon className="w-6 h-6 text-red-600" aria-hidden />
                                            </div>
                                        </div>
                                        <h3 className="text-[1.75rem] sm:text-3xl font-normal tracking-tight leading-tight mb-3 font-headline">
                                            {team.name}
                                        </h3>
                                        <p className="text-xs sm:text-sm font-semibold text-red-600 uppercase mb-4">
                                            {team.category}
                                        </p>
                                        <p className="text-sm sm:text-base mb-6 leading-relaxed text-muted-foreground">
                                            {team.description}
                                        </p>
                                        
                                        <div className="mb-6">
                                            <h4 className="text-sm font-semibold mb-3">Teknolojiler:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {team.technologies.map((tech) => (
                                                    <span key={tech} className="text-xs sm:text-sm bg-white/90 px-3 py-1.5 rounded-full shadow-sm">
                                                        {tech}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="mt-auto">
                                            <h4 className="text-sm font-semibold mb-3">Hedefler:</h4>
                                            <ul className="space-y-2">
                                                {team.goals.map((goal) => (
                                                    <li key={goal} className="flex items-start gap-2 text-xs sm:text-sm leading-relaxed">
                                                        <span className="mt-1 inline-flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500"></span>
                                                        <span className="text-foreground">{goal}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Section>

                {/* Avantajlar */}
                <Section className="bg-gradient-to-b from-[rgba(255,232,207,0.2)] to-transparent">
                    <div className="max-w-7xl mx-auto">
                        <p className="text-sm text-primary font-normal uppercase tracking-tight mb-6">TAKIMA KATILMANIN AVANTAJLARI</p>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal leading-none tracking-tight font-headline mb-8 sm:mb-10 md:mb-12">
                            Neler Kazanacaksın?
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            {benefits.map((benefit) => (
                                <div key={benefit} className="flex items-start gap-3 sm:gap-4 bg-white/90 p-5 sm:p-6 rounded-2xl hover:shadow-lg transition-shadow">
                                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0 mt-1" />
                                    <p className="text-sm sm:text-base leading-relaxed">{benefit}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </Section>

                {/* Timeline */}
                <Section>
                    <div className="max-w-7xl mx-auto">
                        <p className="text-sm text-primary font-normal uppercase tracking-tight mb-6">SÜREÇ</p>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal leading-none tracking-tight font-headline mb-8 sm:mb-12 md:mb-16">
                            Teknofest Yolculuğu
                        </h2>
                        <div className="space-y-6 sm:space-y-8">
                            {[
                                { phase: "Ekim - Kasım", title: "Takım Oluşumu ve Fikir Geliştirme", desc: "Takım üyeleriyle tanışma, proje fikri belirleme ve literatür taraması" },
                                { phase: "Aralık - Ocak", title: "Prototip Geliştirme", desc: "MVP oluşturma, ilk testler ve mentor feedback'leri" },
                                { phase: "Şubat - Mart", title: "İleri Geliştirme", desc: "Model iyileştirme, dataset genişletme ve optimizasyon" },
                                { phase: "Nisan", title: "Test ve Validasyon", desc: "Kapsamlı testler, hata düzeltme ve performans analizi" },
                                { phase: "Mayıs", title: "Sunum Hazırlığı", desc: "Demo hazırlama, sunum provası ve son rötuşlar" },
                                { phase: "Haziran", title: "Teknofest Yarışması", desc: "Final sunumu ve yarışma!" }
                            ].map((item) => (
                                <div 
                                    key={item.phase} 
                                    className="flex flex-col md:flex-row gap-4 md:gap-8 items-start md:items-center rounded-2xl md:rounded-none bg-white/90 md:bg-transparent p-5 md:p-0 shadow-md md:shadow-none"
                                >
                                    <div className="flex items-center md:block gap-3 md:gap-0 w-full md:w-32 md:text-right">
                                        <div className="w-3 h-3 bg-red-600 rounded-full md:hidden" />
                                        <span className="text-sm font-semibold text-red-600">{item.phase}</span>
                                    </div>
                                    <div className="hidden md:block flex-shrink-0 w-4 h-4 bg-red-600 rounded-full mt-1"></div>
                                    <div className="flex-1">
                                        <h3 className="text-lg sm:text-xl md:text-2xl font-normal mb-2 font-headline">{item.title}</h3>
                                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Section>

                {/* CTA */}
                <Section className="bg-gradient-to-b from-[rgba(225,219,255,0.3)] to-transparent">
                    <div className="max-w-7xl mx-auto text-center">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal leading-tight tracking-tight mb-6 sm:mb-8 font-headline">
                            Teknofest'te UludagAIClub bayrağını dalgalandırmaya hazır mısın?
                        </h2>
                        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
                            Takımlarımıza katıl, projeni geliştir ve Türkiye'nin en büyük teknoloji yarışmasında yerine al!
                        </p>
                        <div className="flex justify-center">
                            <Button asChild variant="outline" className="rounded-full uppercase text-base font-medium px-8 py-6 h-auto">
                                <Link href="/">Ana Sayfaya Dön</Link>
                            </Button>
                        </div>
                    </div>
                </Section>
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
}

