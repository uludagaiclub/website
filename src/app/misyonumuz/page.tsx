'use client';

import { SiteHeader } from '@/components/site-header';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Lightbulb, Rocket, Globe } from 'lucide-react';

export default function MisyonumuzPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SiteHeader />
      
      <main className="flex-1 pt-24 sm:pt-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-20">
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Misyonumuz
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Yapay zeka alanında yetkin, yenilikçi ve topluma değer katan bireyler yetiştirmek.
            </p>
          </div>

          <div className="space-y-8 sm:space-y-12">
            {/* Ana Misyon */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <Target className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                  Ana Misyonumuz
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  UludagAIClub olarak misyonumuz, yapay zeka teknolojilerini öğrenmek ve uygulamak isteyen 
                  öğrencilere kapsamlı eğitim, pratik deneyim ve mentorluk desteği sunarak, onları bu alanda 
                  yetkin hale getirmektir.
                </p>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Topluluğumuz, öğrencilerin yapay zeka alanındaki potansiyellerini keşfetmelerine ve 
                  geliştirmelerine yardımcı olmak, gerçek dünya problemlerine çözüm üreten projeler geliştirmelerini 
                  sağlamak ve sektörle bağlantılar kurmalarına destek olmak için çalışmaktadır.
                </p>
              </CardContent>
            </Card>

            {/* Hedeflerimiz */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <Lightbulb className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-600" />
                  Hedeflerimiz
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                    <h3 className="font-semibold text-sm sm:text-base mb-2 text-blue-900">Eğitim ve Gelişim</h3>
                    <p className="text-xs sm:text-sm text-blue-700 leading-relaxed">
                      Öğrencilere yapay zeka alanında sıfırdan ileri seviyeye kadar kapsamlı eğitim programları sunmak, 
                      pratik projelerle deneyim kazandırmak ve sürekli öğrenme kültürü oluşturmak.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                    <h3 className="font-semibold text-sm sm:text-base mb-2 text-purple-900">Proje Geliştirme</h3>
                    <p className="text-xs sm:text-sm text-purple-700 leading-relaxed">
                      Gerçek dünya problemlerine çözüm üreten, yenilikçi ve topluma değer katan projeler geliştirmek, 
                      bu projeleri yarışmalarda ve etkinliklerde sergilemek.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                    <h3 className="font-semibold text-sm sm:text-base mb-2 text-green-900">Topluluk Oluşturma</h3>
                    <p className="text-xs sm:text-sm text-green-700 leading-relaxed">
                      Yapay zeka alanında meraklı öğrencileri bir araya getirerek güçlü bir topluluk oluşturmak, 
                      bilgi paylaşımını teşvik etmek ve karşılıklı destekleme kültürü geliştirmek.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-100">
                    <h3 className="font-semibold text-sm sm:text-base mb-2 text-orange-900">Sektör Bağlantıları</h3>
                    <p className="text-xs sm:text-sm text-orange-700 leading-relaxed">
                      Yapay zeka sektöründeki şirketler, araştırmacılar ve uzmanlarla bağlantılar kurmak, 
                      staj ve kariyer fırsatları sunmak ve sektördeki gelişmeleri yakından takip etmek.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Nasıl Ulaşıyoruz */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <Rocket className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
                  Nasıl Ulaşıyoruz?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      <strong className="text-foreground">Kapsamlı Eğitim Programları:</strong> 6 haftalık yapılandırılmış 
                      eğitim programları ile temel bilgilerden ileri uygulamalara kadar geniş bir yelpazede eğitim sunuyoruz.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      <strong className="text-foreground">Pratik Odaklı Yaklaşım:</strong> Teorik bilgiyi pratik projelerle 
                      birleştirerek öğrencilerin gerçek deneyim kazanmalarını sağlıyoruz.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      <strong className="text-foreground">Mentorluk Desteği:</strong> Deneyimli eğitmenler ve mentorlar 
                      eşliğinde bireysel gelişim desteği sunuyoruz.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      <strong className="text-foreground">Takım Çalışması:</strong> Projelerde takım halinde çalışarak 
                      iş birliği ve iletişim becerilerini geliştiriyoruz.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      <strong className="text-foreground">Yarışma ve Etkinlikler:</strong> Teknofest ve diğer yarışmalara 
                      katılarak öğrencilerin deneyim kazanmalarını ve projelerini sergilemelerini sağlıyoruz.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Etki Alanımız */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <Globe className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
                  Etki Alanımız
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  UludagAIClub olarak, sadece üniversite içinde değil, Türkiye'nin yapay zeka ekosisteminde de 
                  aktif rol oynamayı hedefliyoruz. Geliştirdiğimiz projeler, düzenlediğimiz etkinlikler ve 
                  yetiştirdiğimiz öğrencilerle sektöre katkı sağlamayı amaçlıyoruz.
                </p>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Topluluğumuzun üyeleri, mezun olduktan sonra da yapay zeka alanında başarılı kariyerler 
                  sürdürmekte ve sektörde öncü roller üstlenmektedir. Bu başarı hikayeleri, misyonumuzun 
                  ne kadar etkili olduğunun en güzel göstergesidir.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

