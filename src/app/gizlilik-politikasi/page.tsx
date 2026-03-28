'use client';

import { SiteHeader } from '@/components/site-header';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Eye, FileText, Mail } from 'lucide-react';

export default function GizlilikPolitikasiPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SiteHeader />
      
      <main className="flex-1 pt-24 sm:pt-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-20">
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Gizlilik Politikası
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
                  <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                  Giriş
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  UludagAIClub olarak, kullanıcılarımızın gizliliğini korumak bizim için son derece önemlidir. 
                  Bu Gizlilik Politikası, web sitemizi ve hizmetlerimizi kullanırken topladığımız, 
                  kullandığımız ve paylaştığımız kişisel bilgiler hakkında bilgi vermektedir.
                </p>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Bu politikayı dikkatlice okuyunuz. Hizmetlerimizi kullanarak, bu politikanın şartlarını 
                  kabul etmiş sayılırsınız.
                </p>
              </CardContent>
            </Card>

            {/* Toplanan Bilgiler */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <Eye className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
                  Topladığımız Bilgiler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base mb-2 text-foreground">Kişisel Bilgiler</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3">
                      Hesap oluştururken ve hizmetlerimizi kullanırken şu bilgileri toplayabiliriz:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-muted-foreground ml-4">
                      <li>Ad ve soyad</li>
                      <li>E-posta adresi</li>
                      <li>Profil fotoğrafı (Google hesabınızdan)</li>
                      <li>Öğrenci numarası veya kimlik bilgileri</li>
                      <li>Sınıf seviyesi ve eğitim durumu</li>
                    </ul>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold text-sm sm:text-base mb-2 text-foreground">Kullanım Bilgileri</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3">
                      Hizmetlerimizi kullanırken otomatik olarak toplanan bilgiler:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-muted-foreground ml-4">
                      <li>IP adresi</li>
                      <li>Tarayıcı türü ve versiyonu</li>
                      <li>Cihaz bilgileri</li>
                      <li>Kullanım istatistikleri</li>
                      <li>Ödev teslim ve indirme kayıtları</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bilgilerin Kullanımı */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
                  Bilgilerin Kullanımı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
                  Topladığımız bilgileri aşağıdaki amaçlar için kullanıyoruz:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Hizmetlerimizi sağlamak ve iyileştirmek
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Eğitim programlarını yönetmek ve öğrenci ilerlemesini takip etmek
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Ödev ve proje yönetimi
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      İletişim ve bildirimler göndermek
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Güvenlik ve dolandırıcılık önleme
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Yasal yükümlülüklerimizi yerine getirmek
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bilgi Paylaşımı */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <Lock className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
                  Bilgi Paylaşımı
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Kişisel bilgilerinizi üçüncü taraflarla paylaşmıyoruz, ancak aşağıdaki durumlar istisnadır:
                </p>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs sm:text-sm text-blue-900">
                      <strong>Hizmet Sağlayıcılar:</strong> Firebase, Google Cloud gibi hizmet sağlayıcılar 
                      verilerimizi barındırmak için kullanılmaktadır. Bu sağlayıcılar verilerinizi yalnızca 
                      hizmet sağlama amacıyla kullanır.
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xs sm:text-sm text-yellow-900">
                      <strong>Yasal Gereklilikler:</strong> Yasal bir zorunluluk veya mahkeme kararı durumunda 
                      bilgileriniz paylaşılabilir.
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs sm:text-sm text-green-900">
                      <strong>Güvenlik:</strong> Güvenlik tehditlerini önlemek veya kullanıcı güvenliğini 
                      korumak için gerekli durumlarda bilgi paylaşımı yapılabilir.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Veri Güvenliği */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-red-600" />
                  Veri Güvenliği
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Verilerinizin güvenliğini sağlamak için endüstri standardı güvenlik önlemleri alıyoruz:
                </p>
                <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-muted-foreground ml-4">
                  <li>SSL/TLS şifreleme ile veri iletimi</li>
                  <li>Firebase Authentication ile güvenli kimlik doğrulama</li>
                  <li>Düzenli güvenlik güncellemeleri ve izleme</li>
                  <li>Erişim kontrolleri ve yetkilendirme</li>
                  <li>Düzenli yedekleme ve veri koruma</li>
                </ul>
              </CardContent>
            </Card>

            {/* Çerezler */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">Çerezler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Web sitemiz, kullanıcı deneyimini iyileştirmek ve hizmetlerimizi sağlamak için çerezler kullanmaktadır. 
                  Çerezler, tarayıcınızda saklanan küçük metin dosyalarıdır.
                </p>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Çerezleri tarayıcı ayarlarınızdan yönetebilirsiniz, ancak bazı çerezler devre dışı bırakıldığında 
                  hizmetlerimizin bazı özellikleri çalışmayabilir.
                </p>
              </CardContent>
            </Card>

            {/* Haklarınız */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">Haklarınız</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
                  KVKK kapsamında aşağıdaki haklara sahipsiniz:
                </p>
                <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-muted-foreground ml-4">
                  <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                  <li>İşlenen verileriniz hakkında bilgi talep etme</li>
                  <li>Verilerinizin düzeltilmesini isteme</li>
                  <li>Verilerinizin silinmesini isteme</li>
                  <li>Verilerinizin üçüncü kişilere aktarılmasına itiraz etme</li>
                </ul>
              </CardContent>
            </Card>

            {/* İletişim */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <Mail className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                  İletişim
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Gizlilik politikamız hakkında sorularınız veya endişeleriniz varsa, lütfen bizimle iletişime geçin:
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

            {/* Değişiklikler */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">Politika Değişiklikleri</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Bu Gizlilik Politikası zaman zaman güncellenebilir. Önemli değişiklikler yapıldığında, 
                  kullanıcılarımızı e-posta veya web sitesi üzerinden bilgilendireceğiz. 
                  Politikanın güncel versiyonu her zaman bu sayfada yayınlanacaktır.
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

