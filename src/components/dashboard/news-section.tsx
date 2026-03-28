
'use client';
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import { ArrowRight, Newspaper } from "lucide-react";

// Data is hardcoded here, but could be fetched from a CMS or API
const allPosts = [
    {
        title: "2025 Yapay Zeka Zirvesi'nde Neler Yaşandı?",
        excerpt: "21 Ekim'de topluluğumuzun ev sahipliğinde düzenlenen Yapay Zeka Zirvesi'nin ardından öne çıkan anları, sunumları ve tartışmaları sizler için derledik.",
        imageUrl: "https://images.unsplash.com/photo-1695244186533-013b2811723c?q=80&w=800&auto=format&fit=crop",
        badge: "Zirve Özel"
    },
    {
        title: "Yapay Zekaya Giriş: Nereden Başlamalı?",
        excerpt: "Yapay zeka dünyasına ilk adımı atmak isteyenler için hazırladığımız bu rehberde, temel kavramları, öğrenme kaynaklarını ve pratik ipuçlarını bulabilirsiniz.",
        imageUrl: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?q=80&w=800&auto=format&fit=crop",
        badge: "Rehber"
    },
    {
        title: "UludagAIClub Web Sitemiz Yayında!",
        excerpt: "Topluluğumuzun dijital evi olan yeni web sitemizin amacını, özelliklerini ve gelecekteki yol haritamızı bu yazıda sizlerle paylaşıyoruz.",
        imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=800&auto=format&fit=crop",
        badge: "Duyuru"
    },
    {
        title: "Veri Biliminde Kariyer Yolu",
        excerpt: "Veri bilimi alanında kariyer hedefleyenler için adımlar, gereken yetenekler ve sektördeki fırsatlar üzerine kapsamlı bir inceleme.",
        imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop",
        badge: "Kariyer"
    },
    {
        title: "Teknofest 2025'e Nasıl Hazırlanmalıyız?",
        excerpt: "Türkiye'nin en büyük teknoloji festivali Teknofest için hazırlık sürecinde olan takımlarımıza özel stratejiler, ipuçları ve motivasyon kaynakları.",
        imageUrl: "https://images.unsplash.com/photo-1620912189862-81ae9a435048?q=80&w=800&auto=format&fit=crop",
        badge: "Yarışma"
    },
    {
        title: "Python ile Makine Öğrenmesi Projesi Geliştirme",
        excerpt: "Uçtan uca bir makine öğrenmesi projesini Python kullanarak nasıl geliştirebileceğinizi adım adım gösteren pratik bir rehber.",
        imageUrl: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=800&auto=format&fit=crop",
        badge: "Teknik"
    }
];


export function NewsSection() {
    return (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg">
            <div className="p-6 border-b border-slate-200/60">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
                        <Newspaper className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-800">Haberler ve Gelişmeler</h2>
                </div>
                <p className="text-slate-600 text-sm">Topluluktan en son haberler ve blog yazıları.</p>
            </div>
            <div className="p-6">
                <Carousel
                    opts={{
                        align: "start",
                        loop: true,
                    }}
                    className="w-full"
                >
                    <CarouselContent>
                        {allPosts.map((post) => (
                            <CarouselItem key={post.title} className="md:basis-1/2 lg:basis-1/3">
                                <div className="p-1 h-full">
                                    <Card className="h-full flex flex-col overflow-hidden bg-white/50 hover:shadow-md transition-shadow duration-200">
                                        <div className="relative w-full h-40">
                                            <Image
                                                src={post.imageUrl}
                                                alt={post.title}
                                                fill
                                                className="object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                            <span className="absolute top-2 right-2 bg-white/80 text-primary-foreground text-xs px-2 py-1 rounded-full backdrop-blur-sm font-semibold text-slate-800">
                                                {post.badge}
                                            </span>
                                        </div>
                                        <CardContent className="p-4 flex flex-col flex-1">
                                            <h3 className="font-semibold text-slate-800 mb-2 leading-snug">{post.title}</h3>
                                            <p className="text-xs text-slate-600 line-clamp-3 flex-1 mb-4">{post.excerpt}</p>
                                            <Button asChild size="sm" variant="ghost" className="mt-auto self-start p-0 h-auto text-primary hover:text-primary/80">
                                                <Link href="/blog">
                                                    Devamını Oku <ArrowRight className="w-3 h-3 ml-1" />
                                                </Link>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="absolute left-[-12px] top-1/2 -translate-y-1/2" />
                    <CarouselNext className="absolute right-[-12px] top-1/2 -translate-y-1/2" />
                </Carousel>
            </div>
        </div>
    );
}
