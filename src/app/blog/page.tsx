
'use client';
import { useState } from 'react';
import './blog.css';
import { SiteHeader } from '@/components/site-header';
import { Footer } from '@/components/footer';
import { cn } from '@/lib/utils';

const Section = ({ id, children, className }: { id?: string, children: React.ReactNode, className?: string }) => (
    <section id={id} className={cn("py-20 px-4 sm:px-6 md:px-10", className)}>
        {children}
    </section>
);


export default function BlogPage() {
    const [activePost, setActivePost] = useState(0);

    const allPosts = [
        {
            title: "2025 Yapay Zeka Zirvesi'nde Neler Yaşandı?",
            excerpt: "21 Ekim'de topluluğumuzun ev sahipliğinde düzenlenen Yapay Zeka Zirvesi'nin ardından öne çıkan anları, sunumları ve tartışmaları sizler için derledik.",
            author: "UludagAIClub",
            date: "Oct 22, 2024",
            imageUrl: "https://images.unsplash.com/photo-1695244186533-013b2811723c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            badge: "Zirve Özel"
        },
        {
            title: "Yapay Zekaya Giriş: Nereden Başlamalı?",
            excerpt: "Yapay zeka dünyasına ilk adımı atmak isteyenler için hazırladığımız bu rehberde, temel kavramları, öğrenme kaynaklarını ve pratik ipuçlarını bulabilirsiniz.",
            author: "Eğitim Ekibi",
            date: "Sep 15, 2024",
            imageUrl: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            badge: "Rehber"
        },
        {
            title: "UludagAIClub Web Sitemiz Yayında!",
            excerpt: "Topluluğumuzun dijital evi olan yeni web sitemizin amacını, özelliklerini ve gelecekteki yol haritamızı bu yazıda sizlerle paylaşıyoruz.",
            author: "Yönetim Kurulu",
            date: "Aug 30, 2024",
            imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            badge: "Duyuru"
        },
        {
            title: "Veri Biliminde Kariyer Yolu",
            excerpt: "Veri bilimi alanında kariyer hedefleyenler için adımlar, gereken yetenekler ve sektördeki fırsatlar üzerine kapsamlı bir inceleme.",
            author: "Kariyer Ekibi",
            date: "Nov 05, 2024",
            imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            badge: "Kariyer"
        },
        {
            title: "Teknofest 2025'e Nasıl Hazırlanmalıyız?",
            excerpt: "Türkiye'nin en büyük teknoloji festivali Teknofest için hazırlık sürecinde olan takımlarımıza özel stratejiler, ipuçları ve motivasyon kaynakları.",
            author: "Teknofest Mentorleri",
            date: "Nov 12, 2024",
            imageUrl: "https://images.unsplash.com/photo-1620912189862-81ae9a435048?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            badge: "Yarışma"
        },
        {
            title: "Python ile Makine Öğrenmesi Projesi Geliştirme",
            excerpt: "Uçtan uca bir makine öğrenmesi projesini Python kullanarak nasıl geliştirebileceğinizi adım adım gösteren pratik bir rehber.",
            author: "Proje Ekibi",
            date: "Nov 20, 2024",
            imageUrl: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%G%3D%3D",
            badge: "Teknik"
        }
    ];

    const featuredPosts = allPosts.filter(p => 
        p.title === "Python ile Makine Öğrenmesi Projesi Geliştirme" ||
        p.title === "UludagAIClub Web Sitemiz Yayında!" ||
        p.title === "Yapay Zekaya Giriş: Nereden Başlamalı?"
    );


    return (
        <div className="flex flex-col flex-1 bg-background text-foreground overflow-x-hidden">
            <SiteHeader />
            <main>
                <section className="hero">
                    <div className="container">
                        <div className="hero-badge">BLOG</div>
                        <h1 className="hero-title">Güncel Gelişmeler ve Haberler</h1>
                        <p className="hero-description">
                            UludagAIClub ekibinden en son haberler, içgörüler ve ürün güncellemeleri ile güncel kalın.
                        </p>
                        <div className="tags">
                            <button type="button" className="tag">Yapay Zeka</button>
                            <button type="button" className="tag">Eğitim</button>
                            <button type="button" className="tag">Teknoloji</button>
                            <button type="button" className="tag">Topluluk</button>
                        </div>
                    </div>
                </section>

                <section className="container">
                    <button type="button" className="featured-post">
                        <div className="featured-image">
                            <img src={featuredPosts[activePost].imageUrl} alt="Featured" />
                        </div>
                        <div className="featured-content">
                            <span className="featured-badge">{featuredPosts[activePost].badge}</span>
                            <h2 className="featured-title">{featuredPosts[activePost].title}</h2>
                            <p className="featured-excerpt">{featuredPosts[activePost].excerpt}</p>
                            <div className="post-meta">
                                <span>{featuredPosts[activePost].date}</span>
                                <span>•</span>
                                <span>By {featuredPosts[activePost].author}</span>
                            </div>
                            <span className="read-more">
                                Devamını Oku →
                            </span>
                        </div>
                    </button>
                    <div className="dots">
                        {featuredPosts.map((post, index) => (
                            <button
                                type="button"
                                key={post.title}
                                className={`dot ${activePost === index ? 'active' : ''}`}
                                onClick={() => setActivePost(index)}
                                aria-label={`Go to post: ${post.title}`}
                            ></button>
                        ))}
                    </div>
                </section>

                <section className="container" style={{ marginTop: '80px' }}>
                    <h3 className="all-posts-title">Tüm Yazılar</h3>
                    <div className="posts-grid">
                        {allPosts.map((post) => (
                            <button type="button" className="post-card" key={post.title}>
                                <div className="post-image">
                                    <img src={post.imageUrl} alt={post.title} />
                                </div>
                                <div className="post-content">
                                    <h3 className="post-title">{post.title}</h3>
                                    <p className="post-excerpt">{post.excerpt}</p>
                                    <div className="post-footer">
                                        <div className="author">
                                            <div className="author-avatar"></div>
                                            <span>{post.author}</span>
                                        </div>
                                        <span>{post.date}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}

