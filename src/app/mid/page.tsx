'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle2, Cpu, TrendingUp, GitBranch } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { Footer } from '@/components/footer';

const Section = ({ id, children, className }: { id?: string, children: React.ReactNode, className?: string }) => (
    <section id={id} className={cn("py-20 px-4 sm:px-6 md:px-10", className)}>
        {children}
    </section>
);

export default function MidPage() {
    const weeks = [
        {
            week: 1,
            title: "Makine Öğrenmesine Giriş",
            topics: ["Supervised vs Unsupervised Learning", "Classification vs Regression", "Model Evaluation Metrikleri", "Cross-Validation"],
            icon: Cpu,
            color: "bg-green-100"
        },
        {
            week: 2,
            title: "Regression Algoritmaları",
            topics: ["Linear Regression", "Polynomial Regression", "Ridge ve Lasso Regression", "Gradient Descent"],
            icon: TrendingUp,
            color: "bg-emerald-100"
        },
        {
            week: 3,
            title: "Classification Algoritmaları",
            topics: ["Logistic Regression", "K-Nearest Neighbors (KNN)", "Naive Bayes", "Support Vector Machines (SVM)"],
            icon: GitBranch,
            color: "bg-teal-100"
        },
        {
            week: 4,
            title: "Karar Ağaçları ve Ensemble",
            topics: ["Decision Trees", "Random Forest", "Bagging ve Boosting", "XGBoost ve LightGBM"],
            icon: Cpu,
            color: "bg-lime-100"
        },
        {
            week: 5,
            title: "Unsupervised Learning",
            topics: ["K-Means Clustering", "Hierarchical Clustering", "DBSCAN", "Principal Component Analysis (PCA)"],
            icon: TrendingUp,
            color: "bg-yellow-100"
        },
        {
            week: 6,
            title: "Model Optimization & Proje",
            topics: ["Hyperparameter Tuning", "Feature Selection", "Model Deployment Temelleri", "End-to-End ML Projesi"],
            icon: GitBranch,
            color: "bg-orange-100"
        }
    ];

    const skills = [
        "Makine öğrenmesi algoritmalarını anlama ve uygulayabilme",
        "Classification ve Regression problemlerini çözebilme",
        "Model performansını değerlendirebilme ve iyileştirebilme",
        "Ensemble metotları ile güçlü modeller oluşturma",
        "Unsupervised learning teknikleri ile veri keşfi yapma",
        "End-to-end makine öğrenmesi projesi geliştirebilme"
    ];

    return (
        <div className="flex flex-col flex-1 bg-background text-foreground overflow-x-hidden">
            <SiteHeader />

            <main>
                {/* Hero Section */}
                <Section className="min-h-[60vh] pt-32 sm:pt-48 pb-16 bg-gradient-to-b from-[rgba(220,252,231,0.4)] to-transparent">
                    <div className="max-w-7xl mx-auto">
                        <div className="inline-flex items-center gap-3 py-2 pr-6 pl-2 bg-white/70 rounded-full mb-8 text-sm font-light">
                            <span className="w-6 h-6 bg-green-500 rounded-full"></span>
                            {' '}
                            EĞİTİM SEVİYESİ
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-normal leading-tight tracking-tighter max-w-4xl mb-8 font-headline">
                            Mid
                        </h1>
                        <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-light leading-normal max-w-3xl mb-8 text-muted-foreground">
                            Makine öğrenmesi algoritmalarını derinlemesine öğrenin. Supervised ve Unsupervised learning teknikleriyle gerçek dünya problemlerini çözmeye başlayın.
                        </p>
                        <div className="flex flex-wrap gap-4 mb-12">
                            <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full">
                                <span className="text-green-600 font-semibold">⏱️ 6 Hafta</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full">
                                <span className="text-green-600 font-semibold">📚 Orta Seviye</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full">
                                <span className="text-green-600 font-semibold">🤖 ML Odaklı</span>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button asChild className="rounded-full uppercase text-base font-medium px-8 py-6 h-auto group bg-green-600 hover:bg-green-700">
                                <Link href="/login">Kayıt Ol <span className="ml-4 transition-transform group-hover:translate-x-1">→</span></Link>
                            </Button>
                            <Button asChild variant="outline" className="rounded-full uppercase text-base font-medium px-8 py-6 h-auto">
                                <Link href="/dashboard">Dashboard'a Git</Link>
                            </Button>
                        </div>
                    </div>
                </Section>

                {/* Kazanımlar */}
                <Section id="skills" className="bg-gradient-to-b from-transparent to-[rgba(255,232,207,0.2)]">
                    <div className="max-w-7xl mx-auto">
                        <p className="text-sm text-primary font-normal uppercase tracking-tight mb-6">ÖĞRENECEKLER</p>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal leading-none tracking-tight font-headline mb-8 sm:mb-10 md:mb-12">
                            Bu Kampta Neler Kazanacaksın?
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {skills.map((skill) => (
                                <div key={skill} className="flex items-start gap-4 bg-white/60 p-6 rounded-2xl backdrop-blur-sm hover:shadow-lg transition-shadow">
                                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                                    <p className="text-lg">{skill}</p>
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
                                            {week.topics.map((topic) => (
                                                <li key={`${week.week}-${topic}`} className="flex items-start gap-2">
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

                {/* Araçlar */}
                <Section className="bg-gradient-to-b from-[rgba(225,219,255,0.3)] to-transparent">
                    <div className="max-w-7xl mx-auto">
                        <p className="text-sm text-primary font-normal uppercase tracking-tight mb-6">KULLANILACAK ARAÇLAR</p>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal leading-none tracking-tight font-headline mb-8 sm:mb-10 md:mb-12">
                            Teknoloji Stack
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {[
                                { name: "Scikit-learn", desc: "ML algoritmaları" },
                                { name: "Pandas & NumPy", desc: "Veri işleme" },
                                { name: "Matplotlib", desc: "Görselleştirme" },
                                { name: "Jupyter", desc: "İnteraktif geliştirme" }
                            ].map((tool) => (
                                <div key={tool.name} className="bg-white rounded-2xl p-6 text-center hover:shadow-lg transition-shadow">
                                    <h4 className="font-semibold text-lg mb-2">{tool.name}</h4>
                                    <p className="text-sm text-muted-foreground">{tool.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </Section>

                {/* CTA */}
                <Section>
                    <div className="max-w-7xl mx-auto text-center">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal leading-tight tracking-tight mb-6 sm:mb-8 font-headline">
                            Makine öğrenmesi yolculuğunuza başlamaya hazır mısınız?
                        </h2>
                        <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
                            <Button asChild className="rounded-full uppercase text-base font-medium px-8 py-6 h-auto group bg-green-600 hover:bg-green-700">
                                <Link href="/login">Kayıt Ol <span className="ml-4 transition-transform group-hover:translate-x-1">→</span></Link>
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

