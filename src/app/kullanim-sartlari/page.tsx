'use client';

import { SiteHeader } from '@/components/site-header';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertTriangle, CheckCircle, XCircle, Scale } from 'lucide-react';

export default function KullanimSartlariPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SiteHeader />
      
      <main className="flex-1 pt-24 sm:pt-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-20">
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Kullanım Şartları
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Son güncelleme: {new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="space-y-8 sm:space-y-12">
            {/* Giriş */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                  Giriş
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  UludagAIClub web sitesini ve hizmetlerini kullanarak, aşağıdaki kullanım şartlarını 
                  kabul etmiş sayılırsınız. Lütfen bu şartları dikkatlice okuyunuz.
                </p>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Bu şartları kabul etmiyorsanız, lütfen hizmetlerimizi kullanmayınız.
                </p>
              </CardContent>
            </Card>

            {/* Kullanım Koşulları */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
                  Kullanım Koşulları
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base mb-2 text-foreground">Hesap Oluşturma</h3>
                    <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-muted-foreground ml-4">
                      <li>Hesap oluştururken doğru ve güncel bilgiler vermelisiniz</li>
                      <li>Hesabınızın güvenliğinden siz sorumlusunuz</li>
                      <li>Şifrenizi veya hesap bilgilerinizi başkalarıyla paylaşmamalısınız</li>
                      <li>Hesabınızda şüpheli aktivite fark ederseniz derhal bize bildirmelisiniz</li>
                    </ul>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold text-sm sm:text-base mb-2 text-foreground">Kabul Edilebilir Kullanım</h3>
                    <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-muted-foreground ml-4">
                      <li>Hizmetlerimizi yalnızca yasal amaçlar için kullanmalısınız</li>
                      <li>Başkalarının haklarını ihlal eden içerik paylaşmamalısınız</li>
                      <li>Zararlı yazılım, virüs veya kötü amaçlı kod yüklememelisiniz</li>
                      <li>Sistemin güvenliğini tehdit eden faaliyetlerde bulunmamalısınız</li>
                      <li>Spam, phishing veya dolandırıcılık faaliyetlerinde bulunmamalısınız</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Yasaklanan Faaliyetler */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <XCircle className="w-6 h-6 sm:w-7 sm:h-7 text-red-600" />
                  Yasaklanan Faaliyetler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-xs sm:text-sm text-red-900">
                      <strong>Telif Hakkı İhlali:</strong> Başkalarının telif haklarına sahip içerikleri 
                      izinsiz paylaşmak yasaktır.
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-xs sm:text-sm text-red-900">
                      <strong>Hile ve Kopya:</strong> Ödevlerde hile yapmak, kopya çekmek veya başkalarının 
                      çalışmalarını kendi çalışmanız gibi göstermek yasaktır.
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-xs sm:text-sm text-red-900">
                      <strong>Zararlı İçerik:</strong> Nefret söylemi, tehdit, taciz veya zararlı içerik 
                      paylaşmak kesinlikle yasaktır.
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-xs sm:text-sm text-red-900">
                      <strong>Sistem Kötüye Kullanımı:</strong> Sistemin güvenliğini tehdit eden, 
                      otomatik botlar kullanan veya hizmetleri kötüye kullanan faaliyetler yasaktır.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fikri Mülkiyet */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <Scale className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
                  Fikri Mülkiyet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Web sitemizdeki tüm içerikler (metin, grafik, logo, yazılım vb.) UludagAIClub'a aittir 
                  ve telif hakları ile korunmaktadır.
                </p>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Öğrenciler tarafından oluşturulan içerikler (ödevler, projeler vb.) öğrencilere aittir. 
                  Ancak, bu içerikleri eğitim amaçlı kullanma hakkımız saklıdır.
                </p>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  İçeriklerimizi izinsiz kopyalamak, dağıtmak veya ticari amaçlarla kullanmak yasaktır.
                </p>
              </CardContent>
            </Card>

            {/* Sorumluluk Reddi */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-600" />
                  Sorumluluk Reddi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Hizmetlerimiz "olduğu gibi" sunulmaktadır. Hizmetlerimizin kesintisiz, hatasız veya 
                  güvenli olacağını garanti etmiyoruz.
                </p>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Hizmetlerimizdeki içeriklerin doğruluğu, güncelliği veya uygunluğu konusunda sorumluluk 
                  kabul etmiyoruz.
                </p>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Hizmetlerimizi kullanımınızdan kaynaklanan herhangi bir zarardan sorumlu değiliz.
                </p>
              </CardContent>
            </Card>

            {/* Hesap İptali ve Sonlandırma */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">Hesap İptali ve Sonlandırma</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Hesabınızı istediğiniz zaman iptal edebilirsiniz. Hesap iptali, verilerinizin silinmesi 
                  anlamına gelir.
                </p>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Kullanım şartlarını ihlal etmeniz durumunda, hesabınız uyarı verilmeden sonlandırılabilir. 
                  Bu durumda verileriniz silinebilir ve hizmetlerimize erişiminiz engellenebilir.
                </p>
              </CardContent>
            </Card>

            {/* Değişiklikler */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">Şart Değişiklikleri</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Bu Kullanım Şartları zaman zaman güncellenebilir. Önemli değişiklikler yapıldığında, 
                  kullanıcılarımızı bilgilendireceğiz. Güncel şartlar her zaman bu sayfada yayınlanacaktır.
                </p>
              </CardContent>
            </Card>

            {/* İletişim */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">İletişim</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Kullanım şartları hakkında sorularınız varsa, lütfen bizimle iletişime geçin:
                </p>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>E-posta:</strong> uludagaiclub@uludag.edu.tr
                  </p>
                  <p className="text-sm text-blue-900 mt-2">
                    <strong>Web:</strong> yapayzekatoplulugu.uludag.edu.tr
                  </p>
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

