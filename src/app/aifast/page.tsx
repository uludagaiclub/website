'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle2, Zap, Users, Clock, Target, Award } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { Footer } from '@/components/footer';
import { useState } from 'react';

const Section = ({ id, children, className }: { id?: string, children: React.ReactNode, className?: string }) => (
    <section id={id} className={cn("py-20 px-4 sm:px-6 md:px-10", className)}>
        {children}
    </section>
);

export default function AifastPage() {
    const [selectedYear, setSelectedYear] = useState('2025');

    const weeks = [
        {
            week: 1,
            title: "AI Temelleri ve Proje Seçimi",
            topics: ["AI ekosistemi ve trendler", "Proje fikri geliştirme", "Veri toplama ve hazırlama", "MVP planlama"],
            icon: Target,
            color: "bg-green-100"
        },
        {
            week: 2,
            title: "Model Geliştirme - 1",
            topics: ["Scikit-learn ile temel modeller", "Veri ön işleme teknikleri", "Model eğitimi ve değerlendirme", "Hyperparameter tuning"],
            icon: Zap,
            color: "bg-emerald-100"
        },
        {
            week: 3,
            title: "Model Geliştirme - 2",
            topics: ["Deep learning modelleri", "TensorFlow/PyTorch kullanımı", "Transfer learning", "Model optimizasyonu"],
            icon: Zap,
            color: "bg-lime-100"
        },
        {
            week: 4,
            title: "Deployment ve Production",
            topics: ["Model deployment stratejileri", "API geliştirme", "Cloud platformları", "Monitoring ve logging"],
            icon: Clock,
            color: "bg-yellow-100"
        },
        {
            week: 5,
            title: "İleri Seviye Teknikler",
            topics: ["LLM entegrasyonu", "RAG sistemleri", "Multi-agent architectures", "Performance optimization"],
            icon: Award,
            color: "bg-orange-100"
        },
        {
            week: 6,
            title: "Proje Tamamlama ve Sunum",
            topics: ["Final proje geliştirme", "Portfolio hazırlama", "Demo hazırlama", "Sunum teknikleri"],
            icon: Users,
            color: "bg-pink-100"
        }
    ];

    const getMentors = () => {
        if (selectedYear === '2026') {
            return [
                {
                    name: "Yakında",
                    title: "Mentorlar Belirleniyor",
                    expertise: "Detaylar Yakında",
                    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face",
                    experience: "Yakında"
                },
                {
                    name: "Yakında",
                    title: "Mentorlar Belirleniyor",
                    expertise: "Detaylar Yakında",
                    image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=300&h=300&fit=crop&crop=face",
                    experience: "Yakında"
                },
                {
                    name: "Yakında",
                    title: "Mentorlar Belirleniyor",
                    expertise: "Detaylar Yakında",
                    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=face",
                    experience: "Yakında"
                }
            ];
        }
        return mentors2025;
    };

    const mentors2025 = [
        {
            name: "Dr. Mehmet Yılmaz",
            title: "Senior AI Engineer, Google",
            expertise: "Machine Learning & Deep Learning",
            image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face",
            experience: "8+ yıl"
        },
        {
            name: "Ayşe Kaya",
            title: "AI Research Lead, Microsoft",
            expertise: "NLP & LLM",
            image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=300&h=300&fit=crop&crop=face",
            experience: "6+ yıl"
        },
        {
            name: "Can Yıldız",
            title: "ML Engineer, Amazon",
            expertise: "Computer Vision & MLOps",
            image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=face",
            experience: "5+ yıl"
        }
    ];

    const benefits = [
        "Haftalık 1-on-1 mentor görüşmeleri",
        "Gerçek veri setleri ile proje geliştirme",
        "Industry expert'lerden feedback",
        "Portfolio hazırlama ve CV optimizasyonu",
        "Networking ve kariyer fırsatları",
        "Sertifika ve başarı belgesi",
        "Proje showcase ve demo günü",
        "İş bulma desteği ve referanslar"
    ];

    return (
        <div className="flex flex-col flex-1 bg-background text-foreground overflow-x-hidden">
            <SiteHeader />

            <main>
                {/* Hero Section */}
                <Section className="min-h-[60vh] pt-32 sm:pt-48 pb-16 bg-gradient-to-b from-[rgba(240,253,244,0.4)] to-transparent">
                    <div className="max-w-7xl mx-auto">
                        <div className="inline-flex items-center gap-3 py-2 pr-6 pl-2 bg-white/70 rounded-full mb-8 text-sm font-light">
                            <span className="w-6 h-6 bg-green-500 rounded-full"></span>
                            {' '}
                            HIZLI GELİŞİM
                        </div>
                               <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-normal leading-tight tracking-tighter max-w-4xl mb-8 font-headline">
                                   AI-FAST
                               </h1>
                        
                        {/* Yıl Seçici */}
                        <div className="flex gap-2 mb-8">
                            {['2025', '2026'].map((year) => (
                                <button
                                    key={year}
                                    onClick={() => setSelectedYear(year)}
                                    className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ease-in-out transform hover:scale-105 ${
                                        selectedYear === year
                                            ? 'bg-green-600 text-white shadow-lg scale-105'
                                            : 'bg-white/60 text-green-600 hover:bg-white/80 hover:shadow-md'
                                    }`}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                               <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-light leading-normal max-w-3xl mb-8 text-muted-foreground">
                            Hızlı AI geliştirme programı. 6 haftada sıfırdan AI projesi geliştirin. 
                            Mentor desteği, hands-on projeler ve gerçek dünya uygulamaları.
                        </p>
                        <div className="flex flex-wrap gap-4 mb-12">
                            <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full">
                                <Clock className="w-4 h-4 text-green-600" />
                                <span className="text-green-600 font-semibold">6 Hafta</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full">
                                <Users className="w-4 h-4 text-green-600" />
                                <span className="text-green-600 font-semibold">1-on-1 Mentor</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full">
                                <Zap className="w-4 h-4 text-green-600" />
                                <span className="text-green-600 font-semibold">Hızlı Gelişim</span>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button asChild className="rounded-full uppercase text-base font-medium px-8 py-6 h-auto group bg-green-600 hover:bg-green-700">
                                <Link href="/signup">AI-FAST'a Başvur <span className="ml-4 transition-transform group-hover:translate-x-1">→</span></Link>
                            </Button>
                            <Button asChild variant="outline" className="rounded-full uppercase text-base font-medium px-8 py-6 h-auto">
                                <Link href="/">Ana Sayfaya Dön</Link>
                            </Button>
                        </div>
                    </div>
                </Section>

                {/* Avantajlar */}
                <Section className="bg-gradient-to-b from-transparent to-[rgba(255,232,207,0.2)]">
                    <div className="max-w-7xl mx-auto">
                        <p className="text-sm text-primary font-normal uppercase tracking-tight mb-6">PROGRAM AVANTAJLARI</p>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal leading-none tracking-tight font-headline mb-8 sm:mb-10 md:mb-12">
                            Neler Kazanacaksın?
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {benefits.map((benefit, index) => (
                                <div 
                                    key={`${selectedYear}-benefit-${index}`} 
                                    className="flex items-start gap-4 bg-white/60 p-6 rounded-2xl backdrop-blur-sm hover:shadow-lg transition-all duration-500 ease-in-out animate-in fade-in-0 slide-in-from-bottom-4"
                                >
                                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                                    <p className="text-base">{benefit}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </Section>

                {/* Müfredat */}
                <Section id="curriculum">
                    <div className="max-w-7xl mx-auto">
                        <p className="text-sm text-primary font-normal uppercase tracking-tight mb-6">6 HAFTALIK PROGRAM</p>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal leading-none tracking-tight font-headline mb-8 sm:mb-12 md:mb-16">
                            Haftalık Müfredat
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {weeks.map((week) => {
                                const Icon = week.icon;
                                return (
                                    <div 
                                        key={week.week} 
                                        className={cn(
                                            "rounded-[40px] p-8 transition-all hover:-translate-y-2 hover:shadow-2xl",
                                            week.color
                                        )}
                                    >
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                                                <Icon className="w-6 h-6 text-green-600" />
                                            </div>
                                            <span className="text-sm font-semibold uppercase tracking-tight">Hafta {week.week}</span>
                                        </div>
                                        <h3 className="text-3xl font-normal tracking-tight leading-tight mb-6 font-headline">
                                            {week.title}
                                        </h3>
                                        <ul className="space-y-3">
                                            {week.topics.map((topic, i) => (
                                                <li key={`week-${week.week}-topic-${i}`} className="flex items-start gap-2">
                                                    <span className="text-green-600 mt-1">•</span>
                                                    <span className="text-base">{topic}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Section>

                {/* Mentorlar */}
                <Section className="bg-gradient-to-b from-[rgba(240,253,244,0.3)] to-transparent">
                    <div className="max-w-7xl mx-auto">
                        <p className="text-sm text-primary font-normal uppercase tracking-tight mb-6">MENTORLAR</p>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal leading-none tracking-tight font-headline mb-8 sm:mb-12 md:mb-16">
                            Deneyimli Mentorlar
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {getMentors().map((mentor, index) => (
                                <div 
                                    key={`${selectedYear}-mentor-${index}`} 
                                    className="bg-white rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-500 ease-in-out animate-in fade-in-0 slide-in-from-bottom-4"
                                >
                                    <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                        <img 
                                            src={mentor.image} 
                                            alt={mentor.name}
                                            className="w-20 h-20 rounded-full object-cover"
                                        />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">{mentor.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-2">{mentor.title}</p>
                                    <p className="text-xs text-green-600 mb-2">{mentor.expertise}</p>
                                    <p className="text-xs text-muted-foreground">{mentor.experience} deneyim</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </Section>

                {/* Başarı Hikayeleri */}
                <Section>
                    <div className="max-w-7xl mx-auto">
                        <p className="text-sm text-primary font-normal uppercase tracking-tight mb-6">BAŞARI HİKAYELERİ</p>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal leading-none tracking-tight font-headline mb-8 sm:mb-12 md:mb-16">
                            Mezunlarımızın Hikayeleri
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {(selectedYear === '2026' ? [
                                {
                                    name: "Yakında",
                                    role: "Başarı Hikayeleri",
                                    story: "2026 AI-FAST programı tamamlandığında başarı hikayeleri burada görünecek.",
                                    project: "Yakında"
                                },
                                {
                                    name: "Yakında",
                                    role: "Başarı Hikayeleri",
                                    story: "2026 AI-FAST programı tamamlandığında başarı hikayeleri burada görünecek.",
                                    project: "Yakında"
                                },
                                {
                                    name: "Yakında",
                                    role: "Başarı Hikayeleri",
                                    story: "2026 AI-FAST programı tamamlandığında başarı hikayeleri burada görünecek.",
                                    project: "Yakında"
                                }
                            ] : [
                                {
                                    name: "Ahmet Yılmaz",
                                    role: "AI Engineer, TechCorp",
                                    story: "AI-FAST sayesinde 6 haftada sıfırdan AI projesi geliştirdim ve şimdi TechCorp'ta AI Engineer olarak çalışıyorum.",
                                    project: "E-ticaret öneri sistemi"
                                },
                                {
                                    name: "Zeynep Kaya",
                                    role: "Data Scientist, Startup",
                                    story: "Program sayesinde hem teknik hem de soft skill'lerimi geliştirdim. Şimdi kendi startup'ımı kurdum.",
                                    project: "Sağlık verisi analizi"
                                },
                                {
                                    name: "Can Demir",
                                    role: "ML Engineer, Google",
                                    story: "Mentor desteği ve hands-on projeler sayesinde Google'da ML Engineer pozisyonuna kabul edildim.",
                                    project: "Computer vision uygulaması"
                                }
                            ]).map((story, index) => (
                                <div 
                                    key={`${selectedYear}-story-${index}`} 
                                    className="bg-white rounded-2xl p-6 hover:shadow-lg transition-all duration-500 ease-in-out animate-in fade-in-0 slide-in-from-bottom-4"
                                >
                                    <h3 className="text-lg font-semibold mb-2">{story.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-3">{story.role}</p>
                                    <p className="text-base mb-4">{story.story}</p>
                                    <div className="bg-green-50 p-3 rounded-lg">
                                        <p className="text-sm font-medium text-green-800">Proje: {story.project}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Section>

                {/* CTA */}
                <Section className="bg-gradient-to-b from-[rgba(240,253,244,0.3)] to-transparent">
                    <div className="max-w-7xl mx-auto text-center">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal leading-tight tracking-tight mb-6 sm:mb-8 font-headline">
                            {selectedYear === '2026' 
                                ? "2026 AI-FAST programı yakında başlıyor!" 
                                : "AI kariyerinizi hızlandırmaya hazır mısınız?"
                            }
                        </h2>
                        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
                            {selectedYear === '2026' 
                                ? "2026 AI-FAST programı için detaylar yakında açıklanacak. Haberdar olmak için takipte kalın!"
                                : "6 haftada sıfırdan AI projesi geliştirin, mentor desteği alın ve kariyerinizi hızlandırın!"
                            }
                        </p>
                        <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
                            {selectedYear === '2026' ? (
                                <>
                                    <Button asChild className="rounded-full uppercase text-base font-medium px-8 py-6 h-auto group bg-green-600 hover:bg-green-700">
                                        <Link href="/signup">Bildirim Al <span className="ml-4 transition-transform group-hover:translate-x-1">→</span></Link>
                                    </Button>
                                    <Button asChild variant="outline" className="rounded-full uppercase text-base font-medium px-8 py-6 h-auto">
                                        <Link href="/">Ana Sayfaya Dön</Link>
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button asChild className="rounded-full uppercase text-base font-medium px-8 py-6 h-auto group bg-green-600 hover:bg-green-700">
                                        <Link href="/signup">Hemen Başvur <span className="ml-4 transition-transform group-hover:translate-x-1">→</span></Link>
                                    </Button>
                                    <Button asChild variant="outline" className="rounded-full uppercase text-base font-medium px-8 py-6 h-auto">
                                        <Link href="/">Ana Sayfaya Dön</Link>
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </Section>
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
}
