'use client'

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ArrowLeft, Calendar as CalendarIcon, CheckCircle2, Clock, TrendingUp } from "lucide-react";

export default function WorkshoplarPage() {
  const { user, isUserLoading, firestore } = useFirebase();
  const router = useRouter();
  
  const userProfileRef = useMemoFirebase(() => 
    (user && firestore) ? doc(firestore, 'users', user.uid) : null, 
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  // Countdown states
  const [workshop2Countdown, setWorkshop2Countdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  const [workshop3Countdown, setWorkshop3Countdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  // Workshop 2 countdown
  useEffect(() => {
    const workshop2Date = new Date('2025-12-04T18:00:00+03:00');
    
    const updateCountdown = () => {
      const now = new Date();
      const diff = workshop2Date.getTime() - now.getTime();
      
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setWorkshop2Countdown({ days, hours, minutes, seconds });
      } else {
        setWorkshop2Countdown(null);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Workshop 3 countdown
  useEffect(() => {
    const workshop3Date = new Date('2025-12-11T18:00:00+03:00');
    
    const updateCountdown = () => {
      const now = new Date();
      const diff = workshop3Date.getTime() - now.getTime();
      
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setWorkshop3Countdown({ days, hours, minutes, seconds });
      } else {
        setWorkshop3Countdown(null);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const workshops = [
    {
      number: 1,
      title: 'Workshop 1',
      description: "Gelişim Kampı'nın ilk workshopu ile başlıyoruz! 🚀\n\nBu oturumda GitHub ve versiyon kontrol sistemlerini uygulamalı olarak öğreneceğiz. Proje süreçlerinde işinizi kolaylaştıracak temel adımları birlikte keşfedeceğiz.\n\n📍 Gençlik Evi — 26 Kasım Çarşamba, 19.00",
      isAvailable: true,
  },
  {
      number: 2,
      title: 'Workshop 2',
      description: "Gelişim Kampının sıradaki durağı: Cloud 101! ☁🚀\n\nBu hafta bulut bilişim dünyasına giriş yapıyoruz! Melike Acar ve Beytullah Atasoy'un katılımlarıyla gerçekleşecek bu etkinlikte, sektörden tecrübeleri dinleme ve Cloud teknolojilerini yakından tanıma fırsatı bulacağız.\n\nŞehir dışında olan arkadaşlarımız için online yayın açılacaktır, böylece herkes rahatça katılım sağlayabilir.\n\n❗Ayrıca workshoplar için katılım takibi yapılacaktır.\n\n📍 UÜ Mühendislik Amfisi (Müh. Kantin Üst Katı) | 🗓 4 Aralık Perşembe | ⏰ 18.00",
      isAvailable: true,
      countdown: workshop2Countdown,
      },
      {
      number: 3,
      title: 'Workshop 3',
      description: "Klasik CV gönderme sürecini bir kenara bırakıyoruz.\n\nBu workshop'ta, projelerini bilen, yeteneklerini anlatan ve işe alım sorularını senin adına cevaplayabilen bir dijital ikiz geliştiriyoruz!\n\nBetül Bayram ile birlikte, böyle bir yapay zekanın nasıl tasarlandığını, nasıl eğitildiğini ve gerçek senin dijital bir yansımasına nasıl dönüştüğünü adım adım inceleyeceğiz.\n\nKatılmak isteyen herkesi bekleriz! ✨\n\n📍 Mühendislik Amfisi | 🗓 11 Aralık Perşembe | ⏰ 18.00",
      isAvailable: true,
      countdown: workshop3Countdown,
  },
  {
      number: 4,
      title: "Workshop 4 - CV 2.0: Seni Temsil Eden Dijital İkizini Kodla",
      description:
        "CV 2.0: Seni Temsil Eden Dijital İkizini Kodla\n\n" +
        "Klasik CV gönderme sürecini bir kenara bırakıyoruz.\n\n" +
        "Bu workshop'ta, projelerini bilen, yeteneklerini anlatan ve işe alım sorularını senin adına cevaplayabilen bir dijital ikiz geliştiriyoruz!\n\n" +
        "Betül Bayram ile birlikte, böyle bir yapay zekanın nasıl tasarlandığını, nasıl eğitildiğini ve gerçek senin dijital bir yansımasına nasıl dönüştüğünü adım adım inceleyeceğiz.\n\n" +
        "Katılmak isteyen herkesi bekleriz! ✨\n\n" +
        "📍 Mühendislik Amfisi\n" +
        "⏰ 18.00\n" +
        "📅 11 Aralık Perşembe",
      isAvailable: true,
    },
  ];

  const getWorkshopStatus = (workshopNumber: number) => {
    const workshopKey = `workshop${workshopNumber}` as keyof UserProfile;
    const status = userProfile?.[workshopKey];
    return status && status !== '-' && status !== null && status !== undefined;
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const total = 4;
    const attended = workshops.filter(w => getWorkshopStatus(w.number)).length;
    const remaining = total - attended;
    const progress = (attended / total) * 100;
    
    return { total, attended, remaining, progress };
  }, [userProfile]);

  const isLoading = isUserLoading || isProfileLoading;

  useEffect(() => {
    if (isLoading) return;
    
    if (!user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid gap-6 sm:grid-cols-3 mb-8">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="icon" className="rounded-full">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
                Workshop'lar
            </h1>
              <p className="text-sm sm:text-base text-slate-600 mt-1">
                Gelişim Kampı workshop etkinlikleri ve katılım durumunuz
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-6 sm:grid-cols-3">
          <Card className="bg-white/90 border border-blue-200 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Toplam Workshop
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
              <p className="text-xs text-slate-500 mt-1">Gelişim Kampı programı</p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 border border-emerald-200 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Katıldığınız
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.attended}</div>
              <p className="text-xs text-slate-500 mt-1">Tamamlanan workshop</p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 border border-orange-200 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Kalan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.remaining}</div>
              <p className="text-xs text-slate-500 mt-1">Workshop devam ediyor</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Card */}
        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-indigo-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-2">Workshop İlerlemeniz</h3>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all"
                    style={{ width: `${stats.progress}%` }}
                  />
                    </div>
                <p className="text-sm text-slate-600">
                  {stats.attended} / {stats.total} workshop tamamlandı ({stats.progress.toFixed(0)}%)
                      </p>
                    </div>
                  </div>
          </CardContent>
        </Card>

        {/* Workshop Cards */}
        <Card className="bg-white/90 border border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-600" />
              Workshop Detayları
            </CardTitle>
            <CardDescription>
              Her workshop'un detaylı bilgileri ve katılım durumunuz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
              {workshops.map((workshop) => {
                const attended = getWorkshopStatus(workshop.number);
                return (
                  <div
                    key={workshop.number}
                    className={`rounded-2xl border-2 p-6 transition-all ${
                      attended
                        ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/70 via-white to-green-50/50 shadow-lg'
                        : workshop.isAvailable
                        ? 'border-blue-300 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/50 shadow-md'
                        : 'border-slate-200 bg-gradient-to-br from-slate-50/70 via-white to-gray-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                            attended
                              ? 'bg-emerald-500 text-white shadow-md'
                              : workshop.isAvailable
                              ? 'bg-blue-500 text-white shadow-md'
                              : 'bg-slate-300 text-slate-600'
                          }`}
                        >
                          {workshop.number}
                        </div>
                        <div>
                          <p className={`text-base font-bold ${
                            attended ? 'text-emerald-800' : workshop.isAvailable ? 'text-blue-800' : 'text-slate-600'
                          }`}>
                            {workshop.title}
                          </p>
                          {attended && (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 mt-1 border-emerald-400 text-emerald-700 bg-emerald-100/80">
                              ✓ Katıldı
                            </Badge>
                          )}
                            </div>
                          </div>
                        </div>
                    <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed mb-4">
                      {workshop.description}
                    </p>
                    {workshop.isAvailable && !attended && workshop.countdown && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-xs font-semibold text-slate-500 mb-3">Kalan Süre:</p>
                        <div className="flex gap-2">
                          {workshop.countdown.days > 0 && (
                            <div className="flex-1 flex flex-col items-center bg-blue-100 rounded-lg px-3 py-2">
                              <span className="font-bold text-blue-700 text-lg">{workshop.countdown.days}</span>
                              <span className="text-[10px] text-blue-600">gün</span>
                            </div>
                          )}
                          <div className="flex-1 flex flex-col items-center bg-blue-100 rounded-lg px-3 py-2">
                            <span className="font-bold text-blue-700 text-lg">{String(workshop.countdown.hours).padStart(2, '0')}</span>
                            <span className="text-[10px] text-blue-600">saat</span>
                          </div>
                          <div className="flex-1 flex flex-col items-center bg-blue-100 rounded-lg px-3 py-2">
                            <span className="font-bold text-blue-700 text-lg">{String(workshop.countdown.minutes).padStart(2, '0')}</span>
                            <span className="text-[10px] text-blue-600">dak</span>
                            </div>
                          <div className="flex-1 flex flex-col items-center bg-blue-100 rounded-lg px-3 py-2">
                            <span className="font-bold text-blue-700 text-lg">{String(workshop.countdown.seconds).padStart(2, '0')}</span>
                            <span className="text-[10px] text-blue-600">sn</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
          </div>
    </div>
  );
}
