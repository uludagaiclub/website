'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Users, Calendar, MapPin, Clock } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { Footer } from '@/components/footer';
import { useState } from 'react';

const Section = ({ id, children, className }: { id?: string, children: React.ReactNode, className?: string }) => (
    <section id={id} className={cn("py-20 px-4 sm:px-6 md:px-10", className)}>
        {children}
    </section>
);

type ScheduleItem = {
    time: string;
    title: string;
    type: string;
    speaker?: string;
};

export default function ZirvePage() {
    const [selectedYear, setSelectedYear] = useState('2025');
    const [isChanging, setIsChanging] = useState(false);

    const handleYearChange = (year: string) => {
        if (year !== selectedYear) {
            setIsChanging(true);
            setTimeout(() => {
                setSelectedYear(year);
                setIsChanging(false);
            }, 300);
        }
    };

    const speakers2025 = [
        {
            name: "Dr. Mehmet Yılmaz",
            title: "Chief AI Officer, TechCorp",
            expertise: "Machine Learning & Deep Learning",
            image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face",
            session: "Generative AI'nin Geleceği"
        },
        {
            name: "Ayşe Kaya",
            title: "AI Research Lead, Google",
            expertise: "Natural Language Processing",
            image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=300&h=300&fit=crop&crop=face",
            session: "LLM'ler ve Türkçe Dil Modelleri"
        },
        {
            name: "Prof. Dr. Ali Demir",
            title: "Üniversite Rektörü",
            expertise: "Computer Vision & Robotics",
            image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face",
            session: "Otonom Sistemler ve Etik"
        },
        {
            name: "Zeynep Özkan",
            title: "Startup Founder, AIHealth",
            expertise: "AI in Healthcare",
            image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face",
            session: "Sağlıkta Yapay Zeka Uygulamaları"
        },
        {
            name: "Can Yıldız",
            title: "Senior Data Scientist, Microsoft",
            expertise: "Big Data & Analytics",
            image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=face",
            session: "Veri Bilimi ve İş Zekası"
        },
        {
            name: "Dr. Fatma Şen",
            title: "AI Ethics Researcher",
            expertise: "AI Ethics & Responsible AI",
            image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop&crop=face",
            session: "Yapay Zeka ve Toplumsal Etki"
        }
    ];

    const speakers2024 = [
        {
            name: "Prof. Dr. Ayşe Demir",
            title: "AI Research Director, MIT",
            expertise: "Neural Networks & Deep Learning",
            image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=300&h=300&fit=crop&crop=face",
            session: "Derin Öğrenmenin Geleceği"
        },
        {
            name: "Dr. Can Özkan",
            title: "Senior AI Engineer, Tesla",
            expertise: "Autonomous Systems",
            image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=face",
            session: "Otonom Araçlarda AI"
        },
        {
            name: "Zeynep Yıldız",
            title: "AI Ethics Researcher, Stanford",
            expertise: "AI Ethics & Responsible AI",
            image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face",
            session: "Yapay Zeka ve Etik"
        },
        {
            name: "Mehmet Kaya",
            title: "Data Science Lead, Netflix",
            expertise: "Recommendation Systems",
            image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face",
            session: "Öneri Sistemleri ve AI"
        },
        {
            name: "Dr. Fatma Şen",
            title: "Computer Vision Expert, Google",
            expertise: "Computer Vision & Image Processing",
            image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop&crop=face",
            session: "Görüntü İşleme ve AI"
        },
        {
            name: "Ali Yılmaz",
            title: "NLP Research Scientist, OpenAI",
            expertise: "Natural Language Processing",
            image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face",
            session: "Dil Modelleri ve Gelecek"
        }
    ];

    const speakers2023 = [
        {
            name: "Prof. Dr. Emre Demir",
            title: "AI Lab Director, Harvard",
            expertise: "Machine Learning Theory",
            image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face",
            session: "Makine Öğrenmesi Teorisi"
        },
        {
            name: "Dr. Selin Özkan",
            title: "AI Product Manager, Microsoft",
            expertise: "AI Product Development",
            image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=300&h=300&fit=crop&crop=face",
            session: "AI Ürün Geliştirme"
        },
        {
            name: "Can Yıldız",
            title: "Robotics Engineer, Boston Dynamics",
            expertise: "Robotics & AI",
            image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=face",
            session: "Robotik ve Yapay Zeka"
        },
        {
            name: "Ayşe Kaya",
            title: "AI Startup Founder",
            expertise: "AI Entrepreneurship",
            image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face",
            session: "AI Girişimciliği"
        },
        {
            name: "Dr. Mehmet Şen",
            title: "AI Research Scientist, DeepMind",
            expertise: "Reinforcement Learning",
            image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face",
            session: "Pekiştirmeli Öğrenme"
        },
        {
            name: "Zeynep Demir",
            title: "AI Ethics Lead, IBM",
            expertise: "AI Governance & Ethics",
            image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop&crop=face",
            session: "AI Yönetişimi"
        }
    ];

    const getSpeakers = () => {
        switch(selectedYear) {
            case '2025': return speakers2025;
            case '2024': return speakers2024;
            case '2023': return speakers2023;
            default: return speakers2025;
        }
    };

    const getEventInfo = () => {
        switch(selectedYear) {
            case '2024':
                return {
                    date: "15-16 Kasım 2024",
                    participants: "350+",
                    speakers: "18+",
                    workshops: "12+",
                    days: "2"
                };
            case '2023':
                return {
                    date: "20-21 Ekim 2023",
                    participants: "250+",
                    speakers: "15+",
                    workshops: "10+",
                    days: "2"
                };
            case '2025':
            default:
                return {
                    date: "21-22 Ekim 2025",
                    participants: "500+",
                    speakers: "20+",
                    workshops: "15+",
                    days: "2"
                };
        }
    };

    /**
     * Helper: Get badge CSS classes based on event type
     */
    const getTypeBadgeClasses = (type: string): string => {
        switch (type) {
            case 'Keynote':
                return 'bg-red-100 text-red-800';
            case 'Panel':
                return 'bg-blue-100 text-blue-800';
            case 'Workshop':
                return 'bg-green-100 text-green-800';
            case 'Networking':
                return 'bg-purple-100 text-purple-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const schedulesByYear: Record<'2025' | '2024' | '2023', ScheduleItem[]> = {
        '2025': [
            { time: "09:00 - 09:30", title: "Kayıt ve Açılış", type: "Açılış" },
            { time: "09:30 - 10:15", title: "Generative AI'nin Geleceği", speaker: "Dr. Mehmet Yılmaz", type: "Keynote" },
            { time: "10:30 - 11:15", title: "LLM'ler ve Türkçe Dil Modelleri", speaker: "Ayşe Kaya", type: "Sunum" },
            { time: "11:30 - 12:15", title: "Otonom Sistemler ve Etik", speaker: "Prof. Dr. Ali Demir", type: "Panel" },
            { time: "13:30 - 14:15", title: "Sağlıkta Yapay Zeka Uygulamaları", speaker: "Zeynep Özkan", type: "Sunum" },
            { time: "14:30 - 15:15", title: "Veri Bilimi ve İş Zekası", speaker: "Can Yıldız", type: "Workshop" },
            { time: "15:30 - 16:15", title: "Yapay Zeka ve Toplumsal Etki", speaker: "Dr. Fatma Şen", type: "Panel" },
            { time: "16:30 - 17:00", title: "Kapanış ve Networking", type: "Networking" }
        ],
        '2024': [
            { time: "09:00 - 09:30", title: "Kayıt ve Açılış", type: "Açılış" },
            { time: "09:30 - 10:15", title: "Derin Öğrenmenin Geleceği", speaker: "Prof. Dr. Ayşe Demir", type: "Keynote" },
            { time: "10:30 - 11:15", title: "Otonom Araçlarda AI", speaker: "Dr. Can Özkan", type: "Sunum" },
            { time: "11:30 - 12:15", title: "Yapay Zeka ve Etik", speaker: "Zeynep Yıldız", type: "Panel" },
            { time: "13:30 - 14:15", title: "Öneri Sistemleri ve AI", speaker: "Mehmet Kaya", type: "Sunum" },
            { time: "14:30 - 15:15", title: "Görüntü İşleme ve AI", speaker: "Dr. Fatma Şen", type: "Workshop" },
            { time: "15:30 - 16:15", title: "Dil Modelleri ve Gelecek", speaker: "Ali Yılmaz", type: "Panel" },
            { time: "16:30 - 17:00", title: "Kapanış ve Networking", type: "Networking" }
        ],
        '2023': [
            { time: "09:00 - 09:30", title: "Kayıt ve Açılış", type: "Açılış" },
            { time: "09:30 - 10:15", title: "Makine Öğrenmesi Teorisi", speaker: "Prof. Dr. Emre Demir", type: "Keynote" },
            { time: "10:30 - 11:15", title: "AI Ürün Geliştirme", speaker: "Dr. Selin Özkan", type: "Sunum" },
            { time: "11:30 - 12:15", title: "Robotik ve Yapay Zeka", speaker: "Can Yıldız", type: "Panel" },
            { time: "13:30 - 14:15", title: "AI Girişimciliği", speaker: "Ayşe Kaya", type: "Sunum" },
            { time: "14:30 - 15:15", title: "Pekiştirmeli Öğrenme", speaker: "Dr. Mehmet Şen", type: "Workshop" },
            { time: "15:30 - 16:15", title: "AI Yönetişimi", speaker: "Zeynep Demir", type: "Panel" },
            { time: "16:30 - 17:00", title: "Kapanış ve Networking", type: "Networking" }
        ]
    };

    const getSchedule = () => {
        return schedulesByYear[selectedYear as keyof typeof schedulesByYear] ?? schedulesByYear['2025'];
    };


    return (
        <div className="flex flex-col flex-1 bg-background text-foreground overflow-x-hidden">
            <SiteHeader />

            <main>
                {/* Hero Section */}
                <Section className="min-h-[60vh] pt-32 sm:pt-48 pb-16 bg-gradient-to-b from-[rgba(255,245,245,0.4)] to-transparent">
                    <div className="max-w-7xl mx-auto">
                        <div className="inline-flex items-center gap-3 py-2 pr-6 pl-2 bg-white/70 rounded-full mb-8 text-sm font-light">
                            <span className="w-6 h-6 bg-red-500 rounded-full"></span>
                            {' '}ETKİNLİK
                        </div>
                               <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-normal leading-tight tracking-tighter max-w-4xl mb-8 font-headline">
                                   Yapay Zeka Zirvesi
                               </h1>
                        
                        {/* Yıl Seçici */}
                        <div className="flex gap-2 mb-8">
                            {['2025', '2024', '2023'].map((year) => (
                                <button
                                    key={year}
                                    onClick={() => handleYearChange(year)}
                                    disabled={isChanging}
                                    className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ease-in-out transform hover:scale-105 ${
                                        selectedYear === year
                                            ? 'bg-red-600 text-white shadow-lg scale-105'
                                            : 'bg-white/60 text-red-600 hover:bg-white/80 hover:shadow-md'
                                    } ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                               <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-light leading-normal max-w-3xl mb-8 text-muted-foreground">
                            Türkiye'nin en büyük yapay zeka etkinliği. Alanında uzman konuşmacılar, 
                            en güncel teknolojiler ve networking fırsatları sizleri bekliyor.
                        </p>
                        <div className="flex flex-wrap gap-4 mb-12">
                            <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full">
                                <Calendar className="w-4 h-4 text-red-600" />
                                <span className="text-red-600 font-semibold">{getEventInfo().date}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full">
                                <MapPin className="w-4 h-4 text-red-600" />
                                <span className="text-red-600 font-semibold">Bursa, Türkiye</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full">
                                <Users className="w-4 h-4 text-red-600" />
                                <span className="text-red-600 font-semibold">{getEventInfo().participants} Katılımcı</span>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button asChild className="rounded-full uppercase text-base font-medium px-8 py-6 h-auto group bg-red-600 hover:bg-red-700">
                                <Link href="/signup">Zirveye Katıl <span className="ml-4 transition-transform group-hover:translate-x-1">→</span></Link>
                            </Button>
                            <Button asChild variant="outline" className="rounded-full uppercase text-base font-medium px-8 py-6 h-auto">
                                <Link href="/">Ana Sayfaya Dön</Link>
                            </Button>
                        </div>
                    </div>
                </Section>

                {/* İstatistikler */}
                <Section className="bg-gradient-to-b from-transparent to-[rgba(255,232,207,0.2)]">
                    <div className="max-w-7xl mx-auto">
                        <p className="text-sm text-primary font-normal uppercase tracking-tight mb-6">ZİRVE İSTATİSTİKLERİ</p>
                               <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal leading-none tracking-tight font-headline mb-8 sm:mb-12 md:mb-16">
                                   Rakamlarla Zirve
                               </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {[
                                { number: getEventInfo().participants, label: "Katılımcı", icon: Users },
                                { number: getEventInfo().speakers, label: "Konuşmacı", icon: Users },
                                { number: getEventInfo().workshops, label: "Workshop", icon: Clock },
                                { number: getEventInfo().days, label: "Gün", icon: Calendar }
                            ].map((stat, i) => {
                                const Icon = stat.icon;
                                return (
                                    <div 
                                        key={`${selectedYear}-stat-${i}`} 
                                        className="bg-white/60 p-8 rounded-2xl text-center hover:shadow-lg transition-all duration-500 ease-in-out animate-in fade-in-0 slide-in-from-bottom-4"
                                    >
                                        <Icon className="w-8 h-8 text-red-600 mx-auto mb-4" />
                                        <h3 className="text-4xl font-bold text-red-600 mb-2">{stat.number}</h3>
                                        <p className="text-muted-foreground">{stat.label}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Section>

                {/* Konuşmacılar */}
                <Section id="speakers">
                    <div className="max-w-7xl mx-auto">
                        <p className="text-sm text-primary font-normal uppercase tracking-tight mb-6">KONUŞMACILAR</p>
                               <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal leading-none tracking-tight font-headline mb-8 sm:mb-12 md:mb-16">
                                   Alanında Uzman Konuşmacılar
                               </h2>
                        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-300 ${isChanging ? 'opacity-50' : 'opacity-100'}`}>
                            {getSpeakers().map((speaker, index) => (
                                <div 
                                    key={`${selectedYear}-${index}`} 
                                    className="bg-white rounded-2xl p-6 hover:shadow-lg transition-all duration-500 ease-in-out animate-in fade-in-0 slide-in-from-bottom-4"
                                >
                                    <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-pink-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                        <img 
                                            src={speaker.image} 
                                            alt={speaker.name}
                                            className="w-20 h-20 rounded-full object-cover"
                                        />
                                    </div>
                                    <h3 className="text-xl font-semibold text-center mb-2">{speaker.name}</h3>
                                    <p className="text-sm text-muted-foreground text-center mb-2">{speaker.title}</p>
                                    <p className="text-xs text-red-600 text-center mb-4">{speaker.expertise}</p>
                                    <div className="bg-red-50 p-3 rounded-lg">
                                        <p className="text-sm font-medium text-red-800">{speaker.session}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Section>

                {/* Program */}
                <Section className="bg-gradient-to-b from-[rgba(255,245,245,0.3)] to-transparent">
                    <div className="max-w-7xl mx-auto">
                        <p className="text-sm text-primary font-normal uppercase tracking-tight mb-6">PROGRAM</p>
                               <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal leading-none tracking-tight font-headline mb-8 sm:mb-12 md:mb-16">
                                   Etkinlik Programı
                               </h2>
                        <div className="space-y-4">
                            {getSchedule().map((item, index) => (
                                <div 
                                    key={`${selectedYear}-schedule-${index}`} 
                                    className="bg-white rounded-2xl p-6 hover:shadow-lg transition-all duration-500 ease-in-out animate-in fade-in-0 slide-in-from-bottom-4"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        <div className="flex-shrink-0">
                                            <span className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                                                {item.time}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                                            {item.speaker && (
                                                <p className="text-sm text-muted-foreground">{item.speaker}</p>
                                            )}
                                        </div>
                                        <div className="flex-shrink-0">
                                            <span className={`text-xs px-3 py-1 rounded-full ${getTypeBadgeClasses(item.type)}`}>
                                                {item.type}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Section>

                {/* CTA */}
                <Section>
                    <div className="max-w-7xl mx-auto text-center">
                        <h2 className="text-4xl sm:text-5xl font-normal leading-tight tracking-tight mb-8 font-headline">
                            Yapay zeka dünyasının en büyük buluşmasına katılmaya hazır mısınız?
                        </h2>
                        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
                            Networking fırsatları, en güncel teknolojiler ve alanında uzman konuşmacılarla tanışma fırsatı!
                        </p>
                        <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
                            <Button asChild className="rounded-full uppercase text-base font-medium px-8 py-6 h-auto group bg-red-600 hover:bg-red-700">
                                <Link href="/signup">Hemen Kayıt Ol <span className="ml-4 transition-transform group-hover:translate-x-1">→</span></Link>
                            </Button>
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
