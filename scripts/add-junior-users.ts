import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Firebase başlatma
// serviceAccountKey.json dosyasını proje root'unda arayın
const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
const fallbackServiceAccountPath = path.join(process.cwd(), 'studio-1335263767-c36ff-5db36d74e8f4.json');

let serviceAccountPathToUse = serviceAccountPath;
if (!fs.existsSync(serviceAccountPath)) {
  if (fs.existsSync(fallbackServiceAccountPath)) {
    serviceAccountPathToUse = fallbackServiceAccountPath;
    console.log(`⚠️  serviceAccountKey.json bulunamadı, ${fallbackServiceAccountPath} kullanılıyor`);
  } else {
    throw new Error('Service account key dosyası bulunamadı. Lütfen serviceAccountKey.json dosyasını proje root\'una ekleyin.');
  }
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPathToUse, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const users: UserData[] = [
  { isim: "Veysi Çağlayan", email: "032590012@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "Zeynep Demirkan", email: "zeyneppc139@gmail.com", seviye: "junior" },
  { isim: "Elanur Bayar", email: "022370063@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "Hasan Feyzi Turan", email: "turanfeyzi20@gmail.com", seviye: "junior" },
  { isim: "Efe ipek", email: "032590023@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "Levent Erdem Çevikol", email: "leventerdemcevikol1@gmail.com", seviye: "junior" },
  { isim: "Valeriya leyla doğru", email: "valeriyadogru@gmail.com", seviye: "junior" },
  { isim: "Zeliha uğurlu", email: "zelihaugurlu1679@gmail.com", seviye: "junior" },
  { isim: "meryem gümüş", email: "032490023@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "Aslan Eray Karavaş", email: "222587056@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "Egemen Gavas", email: "egemengavas@gmail.com", seviye: "junior" },
  { isim: "Ali Uçar", email: "samsungucar41@gmail.com", seviye: "junior" },
  { isim: "Esma Çam", email: "332461036@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "Ebral Yapıcı", email: "ebralyapici60@gmail.com", seviye: "junior" },
  { isim: "Sude Nur Aydoğdu", email: "sudenuraydogdu51@gmail.com", seviye: "junior" },
  { isim: "Emine Serap KANCA", email: "062590019@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "nazlı akyıldız", email: "meeslyharley@icloud.com", seviye: "junior" },
  { isim: "Ayşe nur sunkur", email: "sunkuraysenu@gmail.com", seviye: "junior" },
  { isim: "Bilge Kaan Buhur", email: "buhurkaan@gmail.com", seviye: "junior" },
  { isim: "Alara Keser", email: "alara.keser@stu.pirireis.edu.tr", seviye: "junior" },
  { isim: "Esra Kalkan", email: "ek1607690@gmail.com", seviye: "junior" },
  { isim: "Egehan Özen", email: "ozenegehan0@gmail.com", seviye: "junior" },
  { isim: "Cemre kaya", email: "082212048@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "Ecesu İNCE", email: "eceincesu56@gmail.com", seviye: "junior" },
  { isim: "Elif Güzel", email: "elifguzel048@gmail.com", seviye: "junior" },
  { isim: "Elifnur KACAR", email: "eelifnurkacar@gmail.com", seviye: "junior" },
  { isim: "Sümeyye Saçkan", email: "Sackansumeyye6@gmail.com", seviye: "junior" },
  { isim: "Osman Kıran", email: "032411100@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "Betül İnce", email: "bxtxln.0@gmail.com", seviye: "junior" },
  { isim: "Esma Çakı", email: "esmacaki15@gmail.com", seviye: "junior" },
  { isim: "Zeynep Özbey", email: "zzeynepozbeyy@gmail.com", seviye: "junior" },
  { isim: "Merve Esmer", email: "mmervesmerr@gmail.com", seviye: "junior" },
  { isim: "Emir Gürsoy", email: "emirgammming@gmail.com", seviye: "junior" },
  { isim: "Sudenaz Sütçü", email: "032440064@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "Nejla Mulayim", email: "ntysoftware@gmail.com", seviye: "junior" },
  { isim: "Ülkünur Dilmen", email: "dilmenulkunur@gmail.com", seviye: "junior" },
  { isim: "ZEYNEP AKYOL", email: "zyn.aky04@gamil.com", seviye: "junior" },
  { isim: "Gülizar Karaman", email: "gulizarkaraman716@gmail.com", seviye: "junior" },
  { isim: "hatice kübra daş", email: "haticekubradas2@gmail.com", seviye: "junior" },
  { isim: "Rumeysa Karaağaç", email: "rumeysakaraagac05@gmail.com", seviye: "junior" },
  { isim: "ZEHRA ENDES", email: "endesszehra@gmail.com", seviye: "junior" },
  { isim: "Merve ilhan", email: "Merve303xq@gmail.com", seviye: "junior" },
  { isim: "alper burhan", email: "alper_burhan90@hotmail.com", seviye: "junior" },
  { isim: "Esmanur Serin", email: "esmaserin5816@gmail.com", seviye: "junior" },
  { isim: "Rumeysa Kulaksız", email: "rmyskymtklk@gmail.com", seviye: "junior" },
  { isim: "Arda Özcan", email: "222586016@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "Iclal Timur", email: "iclaltimur@gmail.com", seviye: "junior" },
  { isim: "seydi ahmet enes memişoğlu", email: "ahmetenesmemisoglu4301@gmail.com", seviye: "junior" },
  { isim: "Mustafa Kerem Aydın", email: "m.kerem028@gmail.com", seviye: "junior" },
  { isim: "Henna Zeynep Düşünüklü", email: "hennadusunuklu0@gmail.com", seviye: "junior" },
  { isim: "Yağmur ÜSTÜNER", email: "yagmurustuner428@gmail.com", seviye: "junior" },
  { isim: "Pelin Özkan", email: "Pelinaozkan@gmail.com", seviye: "junior" },
  { isim: "aylin karpuz", email: "aylinkarpuz@icloud.com", seviye: "junior" },
  { isim: "Ayşenur Yeniçeri", email: "082420008@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "ARDA EGE ADA", email: "ardae.83866@gmail.com", seviye: "junior" },
  { isim: "umut kaya", email: "umtkaya2006@gmail.com", seviye: "junior" },
  { isim: "Baran Düğme", email: "barandugme01@gmail.com", seviye: "junior" },
  { isim: "Mehmet onal", email: "kmhmtnl@gmail.com", seviye: "junior" },
  { isim: "Muhammed cemil avci", email: "avcicemil1313@gmail.com", seviye: "junior" },
  { isim: "Mehmet Batın Sabit", email: "mehmetbatins@gmail.com", seviye: "junior" },
  { isim: "Ezel Ustabaş", email: "222587049@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "Muhammed Musa KUNDAKÇI", email: "musakundakci16@gmail.com", seviye: "junior" },
  { isim: "Sude Naz Berdan", email: "sunaz9818@gmail.com", seviye: "junior" },
  { isim: "Pelin Cömert", email: "032490041@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "Enes boylu", email: "boylu0096@gmail.com", seviye: "junior" },
  { isim: "Ecrin Tilkitaş", email: "tilkitasecrin@gmail.com", seviye: "junior" },
  { isim: "Elif Naz Tatlıca", email: "tatlicaelifnaz@gmail.com", seviye: "junior" },
  { isim: "ayşenur devrüş", email: "aysenurdevrus@gmail.com", seviye: "junior" },
  { isim: "Onur YAMAÇ", email: "onuryamac16@gmail.com", seviye: "junior" },
  { isim: "Nehir Tosun", email: "032590026@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "Sude Şeflek", email: "sefleksude@gmail.com", seviye: "junior" },
  { isim: "Eda Üstün", email: "edaustun0816@gmail.com", seviye: "junior" },
  { isim: "Kaan Şener", email: "kaansener11@gmail.com", seviye: "junior" },
  { isim: "Tarzan İsmayıllı", email: "tazranyusuf@gmail.com", seviye: "junior" },
  { isim: "Cavit Dikmen", email: "cdikmen2004@gmail.com", seviye: "junior" },
  { isim: "Eda Maras", email: "082212005@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "Ender Malkoç", email: "malkocender@gmail.com", seviye: "junior" },
  { isim: "Tuba Ekiz", email: "tubaekiz13@gmail.com", seviye: "junior" },
  { isim: "Hanife Beyza Tunç", email: "tuncbeyza687@gmail.com", seviye: "junior" },
  { isim: "Ömer Eren Göksu", email: "omererengoksu@gmail.com", seviye: "junior" },
  { isim: "ELİF GÜNDOĞDU", email: "gundogduelif14@gmail.com", seviye: "junior" },
  { isim: "Kerem Eymen Okatar", email: "aikeremokatar@gmail.com", seviye: "junior" },
  { isim: "selim ayvaz", email: "selim.esk16@gmail.com", seviye: "junior" },
  { isim: "Tuğçe Akmeşe", email: "tugceeaakmese@gmail.com", seviye: "junior" },
  { isim: "Alper Uysal", email: "032220596@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "Dilşad Öztaban", email: "oztabandilsad5@gmail.com", seviye: "junior" },
  { isim: "Berat Yılmaz", email: "by.yilmazberat@gmail.com", seviye: "junior" },
  { isim: "Semih Çalık", email: "semihclk314@gmail.com", seviye: "junior" },
  { isim: "Furkan GÖDEK", email: "samsunlufurki5516@gmail.com", seviye: "junior" },
  { isim: "MUHTEREM YİĞİT DOĞAN", email: "352531062@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "yakup arıevi", email: "arieviyakup@gmail.com", seviye: "junior" },
  { isim: "Ela ÇOLAKOĞLU", email: "elacolakoglu682@gmail.com", seviye: "junior" },
  { isim: "Ayşe ÖLMEZ", email: "cikolate253@gmail.com", seviye: "junior" },
  { isim: "Bilge Arabacı", email: "bilgearabaci78@gmail.com", seviye: "junior" },
  { isim: "Berk Oruç", email: "032411018@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "Selman Aydoğdu", email: "av.selmanaydogdu@gmail.com", seviye: "junior" },
  { isim: "Koray Bahar", email: "koraybahar68@gmail.com", seviye: "junior" },
  { isim: "Hasan Kahyaoğlu", email: "032440035@ogr.uludag.edu.tr", seviye: "junior" },
  { isim: "Betül Dilsiz", email: "betuldilsiz2006@gmail.com", seviye: "junior" },
  // Junior-plus öğrenciler
  { isim: "Eren Boran", email: "e.boran876@gmail.com", seviye: "junior-plus" },
  { isim: "Yiğithan Yavuz", email: "222587057@ogr.uludag.edu.tr", seviye: "junior-plus" },
  { isim: "Kağan Kırılmış", email: "kagankirilmis@gmail.com", seviye: "junior-plus" },
  { isim: "enes irgin", email: "enesirgin680@gmail.com", seviye: "junior-plus" },
  { isim: "Betül Sekmen", email: "betulsekmen2005@gmail.com", seviye: "junior-plus" },
  { isim: "Ulaş Güneş Geyik", email: "ulasgunesgeyikk@gmail.com", seviye: "junior-plus" },
  { isim: "Emir Yılmaz", email: "emir_suha@outlook.com", seviye: "junior-plus" },
  { isim: "Nehir Keyfli", email: "nehirkeyfli54@gmail.com", seviye: "junior-plus" },
  { isim: "Talha Çalim", email: "calimtalha07@gmail.com", seviye: "junior-plus" },
  { isim: "Zeynep Bal", email: "Balzeynep933@gmail.com", seviye: "junior-plus" },
  { isim: "Emirhan Börekci", email: "emirhanborekci2022@gmail.com", seviye: "junior-plus" },
  { isim: "Rumeysa Özdoğan", email: "rumeysaozdogann16@gmail.com", seviye: "junior-plus" },
  { isim: "Emre Arıkan", email: "222587@ogr.uludag.edu.tr", seviye: "junior-plus" },
  { isim: "MEHMET ONUR HARMAN", email: "harmanonur01@gmail.com", seviye: "junior-plus" },
  { isim: "OĞUZ EREN", email: "032290038@ogr.uludag.edu.tr", seviye: "junior-plus" },
  { isim: "Kübra Akdoğan", email: "202530022@ogr.uludag.edu.tr", seviye: "junior-plus" },
  { isim: "Alper Patan", email: "alperpatan@hotmail.com", seviye: "junior-plus" },
  { isim: "Kerem Bilgiç", email: "keremblgc76@gmail.com", seviye: "junior-plus" },
  { isim: "Melisa Yüceer", email: "melisayuceer@gmail.com", seviye: "junior-plus" },
  { isim: "Hale Alacan", email: "alacanhale34@gmail.com", seviye: "junior-plus" },
  { isim: "Emincan Ortaköy", email: "hbortakoy@gmail.com", seviye: "junior-plus" },
  { isim: "Sena Çuhadar", email: "dogrand@proton.me", seviye: "junior-plus" },
  { isim: "Berrah Ataselim", email: "ataselimberrah@gmail.com", seviye: "junior-plus" },
  { isim: "Ünzile Aydınöz", email: "unzile.a.12345@gmail.com", seviye: "junior-plus" },
  { isim: "Melis Gülin Turgut", email: "melisgulinturgut@gmail.com", seviye: "junior-plus" },
  { isim: "SILA SALDIZ", email: "032340072@ogr.uludag.edu.tr", seviye: "junior-plus" },
  { isim: "sude tüzner", email: "sudetznr10@gmail.com", seviye: "junior-plus" },
  { isim: "Niyazi Han Akbulut", email: "032490091@ogr.uludag.edu.tr", seviye: "junior-plus" },
  { isim: "Elif Yağmur KANLI", email: "2eyk3361@gmail.com", seviye: "junior-plus" },
  { isim: "Ceren Çam", email: "cerencam5050@gmail.com", seviye: "junior-plus" },
  { isim: "cemile cennet uğurlu", email: "ccugurlu904@gmail.com", seviye: "junior-plus" },
  { isim: "Ömer Talha Aydım", email: "omereroz123@gmail.com", seviye: "junior-plus" },
  { isim: "Zeynep Şahin", email: "zeynepsahinn383@gmail.com", seviye: "junior-plus" },
  { isim: "Simge Yeter", email: "simgeyeter.7@gmail.com", seviye: "junior-plus" },
  { isim: "Enes Bilgin", email: "0enesbilgin0@gmail.com", seviye: "junior-plus" },
  { isim: "Elif Aydın", email: "elo.aydin2007@gmail.com", seviye: "junior-plus" },
  { isim: "Berra Yılmaz", email: "berra06yilmaz@gmail.com", seviye: "junior-plus" },
  // Mid öğrenciler
  { isim: "zeynep zilan korkmaz", email: "zeyzilankrkmz3435@gmail.com", seviye: "mid" },
  { isim: "Mustafa Mert Kılıç", email: "alsoalfire320@gmail.com", seviye: "mid" },
  { isim: "Yavuz Alp Özgür", email: "032390062@ogr.uludag.edu.tr", seviye: "mid" },
  { isim: "Hidayet Ülker", email: "hidayetulker4@gmail.com", seviye: "mid" },
  { isim: "Yusuf Emre Özdemir", email: "yusufemre7009@gmail.com", seviye: "mid" },
  { isim: "Begüm Işık Eruysal", email: "begumeruysal@gmail.com", seviye: "mid" },
  { isim: "Ömer Coşkun", email: "ocoskun684@gmail.com", seviye: "mid" },
  { isim: "Veysel can Özkan", email: "veyselcanozkn@gmail.com", seviye: "mid" },
  { isim: "ertugrul batin altin", email: "ertugrulbatin_altin24@trabzon.edu.tr", seviye: "mid" },
  { isim: "aişe ışık", email: "isikayse132323@gmail.com", seviye: "mid" },
  { isim: "Fatıma IŞIK", email: "isikfatma715@gmail.com", seviye: "mid" },
  { isim: "İsmail Enes Ertaş", email: "ismailenesertas26@gmail.com", seviye: "mid" },
  { isim: "Elif Özdemir", email: "elf.05ozdmr@gmail.com", seviye: "mid" },
  { isim: "Yaren dağdelen", email: "yarendgdln2323@gmail.com", seviye: "mid" },
  { isim: "Mukaddes Bahar Erol", email: "m.baharerol13@gmail.com", seviye: "mid" },
  { isim: "ersoy erdemir", email: "ersoyerdemir18@gmail.com", seviye: "mid" },
  { isim: "Mehmet kartal", email: "mehhmettzk7@gmail.com", seviye: "mid" },
  { isim: "Kayra Koyaş", email: "0001kayra@gmail.com", seviye: "mid" },
  { isim: "Muammer Çimen", email: "032140088@ogr.uludag.edu.tr", seviye: "mid" },
  { isim: "Zeynep Söyler", email: "zsoyler80@gmail.com", seviye: "mid" },
  // Mid-plus öğrenciler
  { isim: "Cenk Çetin", email: "dev.cenkcetin@gmail.com", seviye: "mid-plus" },
  { isim: "Begüm Melike Büyük", email: "032380027@ogr.uludag.edu.tr", seviye: "mid-plus" },
  { isim: "ikra gürler", email: "ikragurler1@gmail.com", seviye: "mid-plus" },
  { isim: "bora koruyucu", email: "borakoruyucu1@gmail.com", seviye: "mid-plus" },
  { isim: "Efe Furkan karakuş", email: "karakusefe3@gmail.com", seviye: "mid-plus" },
  { isim: "Sinan Serhat Aşkın", email: "sinanserhat03@gmail.com", seviye: "mid-plus" },
  { isim: "omer cakan", email: "omercakan5@gmail.com", seviye: "mid-plus" },
  { isim: "Begüm Gülsün", email: "begum.gulsunn@gmail.com", seviye: "mid-plus" },
  { isim: "Ata İlhan Köktürk", email: "352531022@ogr.uludag.edu.tr", seviye: "mid-plus" },
  // Senior öğrenciler
  { isim: "Mehmet Kerem Çilsaldı", email: "keremcilsaldi@hotmail.com", seviye: "senior" },
  { isim: "valeriya leyla doğru", email: "valeriyadogru@gmail.com", seviye: "senior" }
];

interface UserData {
  isim: string;
  email: string;
  seviye: string;
  role?: string; // Opsiyonel, varsayılan "student"
}

interface FirestoreUserData {
  classroom: string;
  createdAt: admin.firestore.FieldValue;
  displayName: string;
  email: string;
  photoURL: string;
  role: string;
  uid: string;
}

function generateRandomId(): string {
  // Use cryptographically secure random number generator
  const randomBytes = crypto.randomBytes(16);
  return randomBytes.toString('base64url').substring(0, 28);
}

async function addUsers(): Promise<void> {
  try {
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        const userData: FirestoreUserData = {
          classroom: user.seviye,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          displayName: user.isim,
          email: user.email.trim(), // Email'deki boşlukları temizle
          photoURL: "",
          role: user.role ?? "student", // Varsayılan "student", belirtilmişse kullan
          uid: generateRandomId()
        };

        await db.collection('users').doc(userData.uid).set(userData);
        console.log(`✅ ${user.isim} eklendi - ${user.email}`);
        successCount++;
        
        // 100ms bekleme ekleyerek rate limit'i aşmamak için
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ ${user.isim} eklenemedi:`, errorMessage);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 İşlem Tamamlandı!`);
    console.log(`✅ Başarılı: ${successCount}`);
    console.log(`❌ Hatalı: ${errorCount}`);
    console.log(`📊 Toplam: ${users.length}`);
    
  } catch (error) {
    console.error('❌ Genel Hata:', error);
    process.exit(1);
  }
}

// Script'i çalıştır
addUsers()
  .then(() => {
    console.log('\n✅ Script başarıyla tamamlandı');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script hatası:', error);
    process.exit(1);
  });

