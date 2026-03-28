'use client';

import { SiteHeader } from '@/components/site-header';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, FileText, Scale, Lock } from 'lucide-react';

export default function KVKKPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SiteHeader />
      
      <main className="flex-1 pt-24 sm:pt-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-20">
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Kişisel Verilerin Korunması Kanunu (KVKK) Aydınlatma Metni
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Son güncelleme: {new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="space-y-8 sm:space-y-12">
            {/* Başlık */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                    HSD ULUDAĞ YAPAY ZEKA GELİŞİM KAMPI İNTERNET SİTESİ
                  </h2>
                  <h3 className="text-xl sm:text-2xl font-semibold text-foreground">
                    KİŞİSEL VERİLERİN KORUNMASI VE İŞLENMESİ AYDINLATMA METNİ
                  </h3>
                </div>
              </CardContent>
            </Card>

            {/* Veri Sorumlusu */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                  VERİ SORUMLUSU
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm sm:prose-base max-w-none text-muted-foreground leading-relaxed">
                  <p>
                    6698 sayılı Kişisel Verilerin Korunması Kanunu ("Kanun") uyarınca, Saray Mah. Ahmet Tevfik ileri Cad. Onur Ofis Park İş Merkezi Sit. A1Blok Apt. No.10 B/1 Ümraniye İstanbul adresinde bulunan veri sorumlusu Huawei Telekomünikasyon Dış Tic. Ltd. Şti. ("Şirket/HSD Uludağ") tarafından belirli kişisel verileriniz işlenmektedir. İşbu Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") ve ilgili mevzuat kapsamında sizlere sunduğumuz hizmetler sırasında kişisel verilerinizin işlenmesi, saklanması ve aktarılması ile ilgili sizleri bilgilendirmek amacıyla hazırlanmıştır.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* İşlenen Kişisel Verileriniz */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
                  İŞLENEN KİŞİSEL VERİLERİNİZ, KİŞİSEL VERİLERİ İŞLEME AMAÇLARI VE HUKUKİ SEBEPLER
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose prose-sm sm:prose-base max-w-none text-muted-foreground leading-relaxed">
                  <p>
                    Şirketimiz tarafından, ilgili kişilerin aşağıdaki tabloda belirtilen kişisel verileri internet sitesi aracılığıyla elde edilmektedir.
                  </p>
                  <p>
                    Kişisel verileriniz Şirketimiz tarafından aşağıdaki amaçlar ve hukuki sebepler ile KVKK'nın 5. ve 6. maddelerinde belirtilen kişisel veri işleme şartları ve amaçları kapsamında işlenecektir:
                  </p>
                </div>

                {/* Tablo - Kimlik */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-3 text-left font-semibold">Veri Kategorisi</th>
                        <th className="border border-gray-300 p-3 text-left font-semibold">İşleme Amacı</th>
                        <th className="border border-gray-300 p-3 text-left font-semibold">Hukuki Sebep</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-3 font-medium" rowSpan={7}>Kimlik</td>
                        <td className="border border-gray-300 p-3">Uludagaiclub platformuna kayıt ve kullanıcı giriş süreçlerinin yürütülmesi,</td>
                        <td className="border border-gray-300 p-3" rowSpan={7}>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması kaydıyla, sözleşmenin taraflarına ait kişisel verilerin işlenmesinin gerekli olması (KVKK m. 5 f. 2 c bendi)</li>
                            <li>Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi için zorunlu olması (KVKK m. 5 f. 2 ç bendi)</li>
                            <li>Bir hakkın tesisi, kullanılması veya korunması için veri işlemenin zorunlu olması (KVKK m. 5 f. 2 e bendi)</li>
                            <li>İlgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla, veri sorumlusunun meşru menfaatleri için veri işlenmesinin zorunlu olması (KVKK m. 5 f. 2 f bendi)</li>
                          </ul>
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-3">Faaliyetlerin Mevzuata Uygun Yürütülmesi</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-3">Firma / Ürün / Hizmetlere Bağlılık Süreçlerinin Yürütülmesi, Katılımcılara kamp süreci, etkinlik ve duyurular hakkında bilgilendirme yapılması</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-3">İletişim Faaliyetlerinin Yürütülmesi</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-3">Saklama Ve Arşiv Faaliyetlerinin Yürütülmesi</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-3">Sözleşme Süreçlerinin Yürütülmesi</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-3">Talep / Şikayetlerin Takibi</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-3"></td>
                        <td className="border border-gray-300 p-3">Yetkili Kişi, Kurum Ve Kuruluşlara Bilgi Verilmesi</td>
                        <td className="border border-gray-300 p-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tablo - İletişim */}
                <div className="overflow-x-auto mt-6">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-3 text-left font-semibold">Veri Kategorisi</th>
                        <th className="border border-gray-300 p-3 text-left font-semibold">İşleme Amacı</th>
                        <th className="border border-gray-300 p-3 text-left font-semibold">Hukuki Sebep</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-3 font-medium" rowSpan={6}>İletişim</td>
                        <td className="border border-gray-300 p-3">Faaliyetlerin Mevzuata Uygun Yürütülmesi</td>
                        <td className="border border-gray-300 p-3" rowSpan={6}>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması kaydıyla, sözleşmenin taraflarına ait kişisel verilerin işlenmesinin gerekli olması (KVKK m. 5 f. 2 c bendi)</li>
                            <li>Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi için zorunlu olması (KVKK m. 5 f. 2 ç bendi)</li>
                            <li>Bir hakkın tesisi, kullanılması veya korunması için veri işlemenin zorunlu olması (KVKK m. 5 f. 2 e bendi)</li>
                          </ul>
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-3">Firma / Ürün / Hizmetlere Bağlılık Süreçlerinin Yürütülmesi</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-3">İletişim Faaliyetlerinin Yürütülmesi</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-3">Saklama Ve Arşiv Faaliyetlerinin Yürütülmesi</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-3">Sözleşme Süreçlerinin Yürütülmesi</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-3">Talep / Şikayetlerin Takibi</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-3"></td>
                        <td className="border border-gray-300 p-3">Yetkili Kişi, Kurum Ve Kuruluşlara Bilgi Verilmesi</td>
                        <td className="border border-gray-300 p-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tablo - İşlem Güvenliği */}
                <div className="overflow-x-auto mt-6">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-3 text-left font-semibold">Veri Kategorisi</th>
                        <th className="border border-gray-300 p-3 text-left font-semibold">İşleme Amacı</th>
                        <th className="border border-gray-300 p-3 text-left font-semibold">Hukuki Sebep</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-3 font-medium" rowSpan={3}>İşlem Güvenliği</td>
                        <td className="border border-gray-300 p-3">Bilgi Güvenliği Süreçlerinin Yürütülmesi</td>
                        <td className="border border-gray-300 p-3" rowSpan={3}>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması kaydıyla, sözleşmenin taraflarına ait kişisel verilerin işlenmesinin gerekli olması (KVKK m. 5 f. 2 c bendi)</li>
                            <li>Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi için zorunlu olması (KVKK m. 5 f. 2 ç bendi)</li>
                          </ul>
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-3">Erişim Yetkilerinin Yürütülmesi</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-3">Faaliyetlerin Mevzuata Uygun Yürütülmesi</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Kişisel Verilerin Aktarıldığı Taraflar */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <Scale className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                  KİŞİSEL VERİLERİN AKTARILDIĞI TARAFLAR VE AKTARIM AMAÇLARI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose prose-sm sm:prose-base max-w-none text-muted-foreground leading-relaxed">
                  <p>
                    Kişisel verileriniz; KVKK'nın 8. ve 9. maddelerinde belirtilen kişisel veri işleme şartları ve amaçları çerçevesinde aşağıda yer verilen üçüncü taraflara ve belirtilen amaçlarla aktarılabilecektir:
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-3 text-left font-semibold">Üçüncü Taraf</th>
                        <th className="border border-gray-300 p-3 text-left font-semibold">Veri Kategorileri</th>
                        <th className="border border-gray-300 p-3 text-left font-semibold">Aktarımın Hukuki Sebebi</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-3">İştirakler, Topluluk Şirketleri ve Tedarikçiler</td>
                        <td className="border border-gray-300 p-3">Kimlik, İletişim</td>
                        <td className="border border-gray-300 p-3">
                          <ul className="list-disc list-inside space-y-1">
                            <li>Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi için zorunlu olması (KVKK m. 5 f. 2 ç bendi)</li>
                            <li>Bir hakkın tesisi, kullanılması veya korunması için veri işlemenin zorunlu olması (KVKK m. 5 f. 2 e bendi)</li>
                            <li>İlgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla, veri sorumlusunun meşru menfaatleri için veri işlenmesinin zorunlu olması (KVKK m. 5 f. 2 f bendi)</li>
                          </ul>
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-3">Yetkili Kamu Kurum ve Kuruluşları</td>
                        <td className="border border-gray-300 p-3">Kimlik, İletişim</td>
                        <td className="border border-gray-300 p-3">
                          <ul className="list-disc list-inside space-y-1">
                            <li>Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi için zorunlu olması (KVKK m. 5 f. 2 ç bendi)</li>
                            <li>Bir hakkın tesisi, kullanılması veya korunması için veri işlemenin zorunlu olması (KVKK m. 5 f. 2 e bendi)</li>
                          </ul>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Kişisel Verilerinizin Toplanma Yöntemi */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
                  KİŞİSEL VERİLERİNİZIN TOPLANMA YÖNTEMI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm sm:prose-base max-w-none text-muted-foreground leading-relaxed">
                  <p>
                    Kişisel verileriniz, "uludagaiclub" platformuna Google hesabınız aracılığıyla kayıt ve giriş yapılması sırasında otomatik yöntemlerle toplanmaktadır. Bu kapsamda ad, soyad ve e-posta adresiniz Google tarafından paylaşılan bilgiler doğrultusunda sistemimize aktarılmaktadır.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Kişisel Verilerin Paylaşıldığı Üçüncü Kişiler */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <Lock className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
                  KİŞİSEL VERİLERİN PAYLAŞILDIĞI ÜÇÜNCÜ KİŞİLER VE PAYLAŞIM AMAÇLARI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm sm:prose-base max-w-none text-muted-foreground leading-relaxed">
                  <p>
                    Kişisel verileriniz, bu aydınlatma metninin "İşlenen Kişisel Verileriniz, Kişisel Verileri İşleme Amaçları ve Hukuki Sebepleri" başlığında belirtilen hukuki sebep ve amaçlar kapsamında hizmet saglayan hizmet sağlayıcılar, ifa yardimcilari, iş ortakları ile paylaşılmaktadır. Kamp sürecinde kullanılan sistemlerin teknik altyapısının sağlanması kapsamında hizmet alınan üçüncü taraf hizmet sağlayıcıları (örneğin bulut sistemleri, barındırma veya sertifika sağlayıcı kuruluşlar) ile kişisel veriler paylaşılabilmektedir.
                  </p>
                  <p>
                    Kişisel verileriniz ayrıca, kamu kurum ve kuruluşların Şirketimizden talepte bulunması ya da kamu kurum ve kuruluşlara bilgi sunulması ihtiyacının ortaya çıkması halinde yetkili kamu kurum ve kuruluşlarıyla ve/veya işin yerine getirilmesi için paylaşılması gereken üçüncü kişi iş ortaklarıyla KVKK'nun 8. ve 9. maddelerine uygun olarak paylaşabilir.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Kişisel Verilerin Saklanma Süresi */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                  KİŞİSEL VERİLERİN SAKLANMA SÜRESİ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm sm:prose-base max-w-none text-muted-foreground leading-relaxed">
                  <p>
                    Kişisel verilerinizi işlendikleri amaç için gerekli olan süre kadar saklanmaktadır. Veri saklama süreleri, farklı işleme amaçlarına ve hizmetlere bağlı olarak değişebilir. Kişisel verilerinizin saklama süresi sona erdikten ve belirli kişisel verilerinizi işlemeye devam edilmesini gerektiren herhangi bir yasal gereklilik bulunmamasi halinde kişisel verileriniz yürürlükteki yasalara göre silinecek, yok edilecek veya anonim hale getirilecektir.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Kişisel Verilerinize İlişkin Haklarınız */}
            <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <Scale className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                  KİŞİSEL VERİLERİNİZE İLİŞKİN HAKLARINIZ ve BAŞVURU YÖNTEMİ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose prose-sm sm:prose-base max-w-none text-muted-foreground leading-relaxed">
                  <p>
                    Kişisel Verilerin Korunması Kanunu'nun 11. maddesi uyarınca veri sahibi olarak;
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
                    <li>İşlenmişse buna ilişkin bilgi talep etmek</li>
                    <li>İşlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
                    <li>Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme,</li>
                    <li>Eksik veya yanlış işlenmiş verilerinizin düzeltilmesini isteme,</li>
                    <li>Kanun'a uygun olarak silinmesini veya yok edilmesini isteme,</li>
                    <li>Bu işlemlerin kişisel verilerin aktarıldığı üçüncü kişilere bildirilmesini talep etme,</li>
                    <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme,</li>
                    <li>Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme</li>
                  </ul>
                  <p className="mt-4">
                    haklarına sahipsiniz.
                  </p>
                  <p className="mt-4">
                    Kişisel Verilerin Korunması Kanunu'nun 11. maddesinde duzenlenen haklarınızı kullanmak ve taleplerinizi Huawei'e iletmek için aşağıdaki yöntemleri kullanabilirsiniz:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                    <li>Taleplerinizi yazılı olarak, Saray Mah. Ahmet Tevfik İleri Cad. Onur Ofis Park İş Merkezi Sit. A1Blok Apt. No.10 B/1 Ümraniye/İstanbul adresine gönderebilirsiniz.</li>
                    <li>Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ'de belirtilen diğer yöntemleri tercih edebilirsiniz.</li>
                  </ul>
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

