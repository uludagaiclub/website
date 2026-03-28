'use client';

import { SiteHeader } from '@/components/site-header';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Target, Award, Heart } from 'lucide-react';

export default function HakkimizdaPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SiteHeader />
      
      <main className="flex-1 pt-24 sm:pt-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-20">
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Hakkımızda
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              UludagAIClub, yapay zeka alanında öğrencileri bir araya getiren ve gelişimlerini destekleyen bir topluluktur.
            </p>
          </div>

          <div className="space-y-8 sm:space-y-12">
            {/* Vizyonumuz */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <Target className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                  Vizyonumuz
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  UludagAIClub olarak, Türkiye'nin yapay zeka ekosisteminde öncü bir topluluk olmayı hedefliyoruz. 
                  Öğrencilerin yapay zeka alanında kendilerini geliştirmelerini, projeler üretmelerini ve 
                  sektördeki gelişmeleri yakından takip etmelerini sağlamak için çalışıyoruz.
                </p>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Amacımız, yapay zeka teknolojilerini kullanarak topluma değer katacak projeler geliştiren, 
                  yenilikçi düşünen ve sürekli öğrenen bir nesil yetiştirmektir.
                </p>
              </CardContent>
            </Card>

            {/* Kimiz Biz */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <Users className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
                  Kimiz Biz?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  UludagAIClub, Uludağ Üniversitesi bünyesinde faaliyet gösteren bir yapay zeka topluluğudur. 
                  Farklı disiplinlerden öğrencileri bir araya getirerek, yapay zeka alanında bilgi paylaşımı 
                  ve proje geliştirme imkanı sunuyoruz.
                </p>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Topluluğumuz, yapay zeka konusunda meraklı, öğrenmeye açık ve proje geliştirmek isteyen 
                  tüm öğrencilere açıktır. Deneyimli eğitmenlerimiz ve mentorlarımız eşliğinde, 
                  sıfırdan başlayarak ileri seviyeye kadar eğitim programları sunuyoruz.
                </p>
              </CardContent>
            </Card>

            {/* Ne Yapıyoruz */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <Award className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
                  Ne Yapıyoruz?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      <strong className="text-foreground">Eğitim Programları:</strong> 6 haftalık kapsamlı eğitim programları ile 
                      yapay zeka temellerinden ileri seviye uygulamalara kadar geniş bir yelpazede eğitim sunuyoruz.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      <strong className="text-foreground">Workshoplar:</strong> Her dönem düzenlediğimiz workshoplar ile 
                      pratik deneyim kazanma fırsatı sunuyoruz.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      <strong className="text-foreground">Proje Geliştirme:</strong> Takımlar halinde gerçek dünya problemlerine 
                      çözüm üreten projeler geliştiriyoruz.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      <strong className="text-foreground">Yarışmalar:</strong> Teknofest başta olmak üzere çeşitli yarışmalara 
                      katılarak deneyim kazanıyoruz.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      <strong className="text-foreground">Etkinlikler:</strong> Zirveler, networking etkinlikleri ve 
                      konferanslar düzenleyerek sektörle bağlantılar kuruyoruz.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Değerlerimiz */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-rose-600" />
                  Değerlerimiz
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-sm sm:text-base mb-2 text-blue-900">İnovasyon</h3>
                    <p className="text-xs sm:text-sm text-blue-700">
                      Yenilikçi düşünce ve yaratıcı çözümler üretmeyi teşvik ediyoruz.
                    </p>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-lg">
                    <h3 className="font-semibold text-sm sm:text-base mb-2 text-indigo-900">İş Birliği</h3>
                    <p className="text-xs sm:text-sm text-indigo-700">
                      Takım çalışması ve karşılıklı destekleme kültürünü benimsiyoruz.
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-semibold text-sm sm:text-base mb-2 text-purple-900">Sürekli Öğrenme</h3>
                    <p className="text-xs sm:text-sm text-purple-700">
                      Öğrenmeyi bir yaşam tarzı olarak görüyor ve gelişimi destekliyoruz.
                    </p>
                  </div>
                  <div className="p-4 bg-rose-50 rounded-lg">
                    <h3 className="font-semibold text-sm sm:text-base mb-2 text-rose-900">Toplumsal Fayda</h3>
                    <p className="text-xs sm:text-sm text-rose-700">
                      Geliştirdiğimiz projelerin topluma değer katmasını hedefliyoruz.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

