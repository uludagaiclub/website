import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Firebase başlatma
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

// Email'e göre seviye mapping'i (script'teki listeden)
// Bu listeyi add-junior-users.ts'den alabiliriz
const emailToClassroomMap: Record<string, string> = {
  // Junior öğrenciler
  "032590012@ogr.uludag.edu.tr": "junior",
  "zeyneppc139@gmail.com": "junior",
  "022370063@ogr.uludag.edu.tr": "junior",
  "turanfeyzi20@gmail.com": "junior",
  "032590023@ogr.uludag.edu.tr": "junior",
  "leventerdemcevikol1@gmail.com": "junior",
  "valeriyadogru@gmail.com": "junior",
  "zelihaugurlu1679@gmail.com": "junior",
  "032490023@ogr.uludag.edu.tr": "junior",
  "222587056@ogr.uludag.edu.tr": "junior",
  "egemengavas@gmail.com": "junior",
  "samsungucar41@gmail.com": "junior",
  "332461036@ogr.uludag.edu.tr": "junior",
  "ebralyapici60@gmail.com": "junior",
  "sudenuraydogdu51@gmail.com": "junior",
  "062590019@ogr.uludag.edu.tr": "junior",
  "meeslyharley@icloud.com": "junior",
  "sunkuraysenu@gmail.com": "junior",
  "buhurkaan@gmail.com": "junior",
  "alara.keser@stu.pirireis.edu.tr": "junior",
  "ek1607690@gmail.com": "junior",
  "ozenegehan0@gmail.com": "junior",
  "082212048@ogr.uludag.edu.tr": "junior",
  "eceincesu56@gmail.com": "junior",
  "elifguzel048@gmail.com": "junior",
  "eelifnurkacar@gmail.com": "junior",
  "Sackansumeyye6@gmail.com": "junior",
  "032411100@ogr.uludag.edu.tr": "junior",
  "bxtxln.0@gmail.com": "junior",
  "esmacaki15@gmail.com": "junior",
  "zzeynepozbeyy@gmail.com": "junior",
  "mmervesmerr@gmail.com": "junior",
  "emirgammming@gmail.com": "junior",
  "032440064@ogr.uludag.edu.tr": "junior",
  "ntysoftware@gmail.com": "junior",
  "dilmenulkunur@gmail.com": "junior",
  "zyn.aky04@gamil.com": "junior",
  "gulizarkaraman716@gmail.com": "junior",
  "haticekubradas2@gmail.com": "junior",
  "rumeysakaraagac05@gmail.com": "junior",
  "endesszehra@gmail.com": "junior",
  "Merve303xq@gmail.com": "junior",
  "alper_burhan90@hotmail.com": "junior",
  "esmaserin5816@gmail.com": "junior",
  "rmyskymtklk@gmail.com": "junior",
  "222586016@ogr.uludag.edu.tr": "junior",
  "iclaltimur@gmail.com": "junior",
  "ahmetenesmemisoglu4301@gmail.com": "junior",
  "m.kerem028@gmail.com": "junior",
  "hennadusunuklu0@gmail.com": "junior",
  "yagmurustuner428@gmail.com": "junior",
  "Pelinaozkan@gmail.com": "junior",
  "aylinkarpuz@icloud.com": "junior",
  "082420008@ogr.uludag.edu.tr": "junior",
  "ardae.83866@gmail.com": "junior",
  "umtkaya2006@gmail.com": "junior",
  "barandugme01@gmail.com": "junior",
  "kmhmtnl@gmail.com": "junior",
  "avcicemil1313@gmail.com": "junior",
  "mehmetbatins@gmail.com": "junior",
  "222587049@ogr.uludag.edu.tr": "junior",
  "musakundakci16@gmail.com": "junior",
  "sunaz9818@gmail.com": "junior",
  "032490041@ogr.uludag.edu.tr": "junior",
  "boylu0096@gmail.com": "junior",
  "tilkitasecrin@gmail.com": "junior",
  "tatlicaelifnaz@gmail.com": "junior",
  "aysenurdevrus@gmail.com": "junior",
  "onuryamac16@gmail.com": "junior",
  "032590026@ogr.uludag.edu.tr": "junior",
  "sefleksude@gmail.com": "junior",
  "edaustun0816@gmail.com": "junior",
  "kaansener11@gmail.com": "junior",
  "tazranyusuf@gmail.com": "junior",
  "cdikmen2004@gmail.com": "junior",
  "082212005@ogr.uludag.edu.tr": "junior",
  "malkocender@gmail.com": "junior",
  "tubaekiz13@gmail.com": "junior",
  "tuncbeyza687@gmail.com": "junior",
  "omererengoksu@gmail.com": "junior",
  "gundogduelif14@gmail.com": "junior",
  "aikeremokatar@gmail.com": "junior",
  "selim.esk16@gmail.com": "junior",
  "tugceeaakmese@gmail.com": "junior",
  "032220596@ogr.uludag.edu.tr": "junior",
  "oztabandilsad5@gmail.com": "junior",
  "by.yilmazberat@gmail.com": "junior",
  "semihclk314@gmail.com": "junior",
  "samsunlufurki5516@gmail.com": "junior",
  "352531062@ogr.uludag.edu.tr": "junior",
  "arieviyakup@gmail.com": "junior",
  "elacolakoglu682@gmail.com": "junior",
  "cikolate253@gmail.com": "junior",
  "bilgearabaci78@gmail.com": "junior",
  "032411018@ogr.uludag.edu.tr": "junior",
  "av.selmanaydogdu@gmail.com": "junior",
  "koraybahar68@gmail.com": "junior",
  "032440035@ogr.uludag.edu.tr": "junior",
  "betuldilsiz2006@gmail.com": "junior",
  
  // Junior-plus öğrenciler
  "e.boran876@gmail.com": "junior-plus",
  "222587057@ogr.uludag.edu.tr": "junior-plus",
  "kagankirilmis@gmail.com": "junior-plus",
  "enesirgin680@gmail.com": "junior-plus",
  "betulsekmen2005@gmail.com": "junior-plus",
  "ulasgunesgeyikk@gmail.com": "junior-plus",
  "emir_suha@outlook.com": "junior-plus",
  "nehirkeyfli54@gmail.com": "junior-plus",
  "calimtalha07@gmail.com": "junior-plus",
  "Balzeynep933@gmail.com": "junior-plus",
  "emirhanborekci2022@gmail.com": "junior-plus",
  "rumeysaozdogann16@gmail.com": "junior-plus",
  "222587@ogr.uludag.edu.tr": "junior-plus",
  "harmanonur01@gmail.com": "junior-plus",
  "032290038@ogr.uludag.edu.tr": "junior-plus",
  "202530022@ogr.uludag.edu.tr": "junior-plus",
  "alperpatan@hotmail.com": "junior-plus",
  "keremblgc76@gmail.com": "junior-plus",
  "melisayuceer@gmail.com": "junior-plus",
  "alacanhale34@gmail.com": "junior-plus",
  "hbortakoy@gmail.com": "junior-plus",
  "dogrand@proton.me": "junior-plus",
  "ataselimberrah@gmail.com": "junior-plus",
  "unzile.a.12345@gmail.com": "junior-plus",
  "melisgulinturgut@gmail.com": "junior-plus",
  "032340072@ogr.uludag.edu.tr": "junior-plus",
  "sudetznr10@gmail.com": "junior-plus",
  "032490091@ogr.uludag.edu.tr": "junior-plus",
  "2eyk3361@gmail.com": "junior-plus",
  "cerencam5050@gmail.com": "junior-plus",
  "ccugurlu904@gmail.com": "junior-plus",
  "omereroz123@gmail.com": "junior-plus",
  "zeynepsahinn383@gmail.com": "junior-plus",
  "simgeyeter.7@gmail.com": "junior-plus",
  "0enesbilgin0@gmail.com": "junior-plus",
  "elo.aydin2007@gmail.com": "junior-plus",
  "berra06yilmaz@gmail.com": "junior-plus",
  
  // Mid öğrenciler
  "zeyzilankrkmz3435@gmail.com": "mid",
  "alsoalfire320@gmail.com": "mid",
  "032390062@ogr.uludag.edu.tr": "mid",
  "hidayetulker4@gmail.com": "mid",
  "yusufemre7009@gmail.com": "mid",
  "begumeruysal@gmail.com": "mid",
  "ocoskun684@gmail.com": "mid",
  "veyselcanozkn@gmail.com": "mid",
  "ertugrulbatin_altin24@trabzon.edu.tr": "mid",
  "isikayse132323@gmail.com": "mid",
  "isikfatma715@gmail.com": "mid",
  "ismailenesertas26@gmail.com": "mid",
  "elf.05ozdmr@gmail.com": "mid",
  "yarendgdln2323@gmail.com": "mid",
  "m.baharerol13@gmail.com": "mid",
  "ersoyerdemir18@gmail.com": "mid",
  "mehhmettzk7@gmail.com": "mid",
  "0001kayra@gmail.com": "mid",
  "032140088@ogr.uludag.edu.tr": "mid",
  "zsoyler80@gmail.com": "mid",
  
  // Mid-plus öğrenciler
  "dev.cenkcetin@gmail.com": "mid-plus",
  "032380027@ogr.uludag.edu.tr": "mid-plus",
  "ikragurler1@gmail.com": "mid-plus",
  "borakoruyucu1@gmail.com": "mid-plus",
  "karakusefe3@gmail.com": "mid-plus", // Efe Furkan karakuş
  "sinanserhat03@gmail.com": "mid-plus",
  "omercakan5@gmail.com": "mid-plus",
  "begum.gulsunn@gmail.com": "mid-plus",
  "352531022@ogr.uludag.edu.tr": "mid-plus",
  
  // Senior öğrenciler
  "keremcilsaldi@hotmail.com": "senior",
  "keremcilsaldi@gmail.com": "senior", // Email varyasyonu
  "burakdemiroz16@chatdai.com.tr": "senior",
  
  // Email varyasyonları (küçük harf/nokta farkları)
  "elf05ozdmr@gmail.com": "mid", // elf.05ozdmr@gmail.com varyasyonu
  "pelinaozkan@gmail.com": "junior", // Pelinaozkan@gmail.com varyasyonu
};

interface ProcessUserResult {
  updated: boolean;
  notFound: boolean;
  alreadyCorrect: boolean;
  skipped: boolean;
}

function shouldSkipUser(email: string | undefined): boolean {
  return !email;
}

function isEmailInMap(email: string): boolean {
  return email in emailToClassroomMap;
}

function isNewSignup(currentClassroom: string | undefined): boolean {
  return currentClassroom === 'new-signup';
}

function isClassroomCorrect(currentClassroom: string | undefined, correctLevel: string): boolean {
  return currentClassroom === correctLevel;
}

async function updateUserClassroom(
  userDoc: admin.firestore.QueryDocumentSnapshot,
  correctClassroomLevel: string,
  displayName: string,
  email: string,
  currentClassroom: string | undefined
): Promise<boolean> {
  try {
    await userDoc.ref.update({
      classroom: correctClassroomLevel,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    const previousLevel = currentClassroom ?? 'new-signup';
    console.log(`✅ ${displayName} (${email}) → ${previousLevel} → ${correctClassroomLevel}`);
    
    // Rate limit için bekleme
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${displayName} (${email}) güncellenemedi:`, errorMessage);
    return false;
  }
}

type ProcessStatus =
  | 'needs_update'
  | 'already_correct'
  | 'not_found'
  | 'skipped'
  | 'no_action';

interface ProcessUserResult {
  status: ProcessStatus;
  correctClassroomLevel?: string;
}

function processUser(userDoc: admin.firestore.QueryDocumentSnapshot): ProcessUserResult {
  const userData = userDoc.data();
  const email = userData.email?.trim().toLowerCase();
  const displayName = userData.displayName ?? 'İsimsiz';
  const uid = userDoc.id;
  const currentClassroom = userData.classroom;

  if (shouldSkipUser(email)) {
    console.log(`⚠️  ${displayName} (${uid}) - Email bulunamadı, atlanıyor`);
    return { status: 'skipped' };
  }

  if (!isEmailInMap(email!)) {
    if (isNewSignup(currentClassroom)) {
      console.log(`❌ ${displayName} (${email}) - Email listede bulunamadı (new-signup)`);
      return { status: 'not_found' };
    }
    return { status: 'no_action' };
  }

  const correctClassroomLevel = emailToClassroomMap[email!];
  
  if (isClassroomCorrect(currentClassroom, correctClassroomLevel)) {
    return { status: 'already_correct' };
  }

  // Seviyesi yanlış veya new-signup, güncelle
  return { status: 'needs_update', correctClassroomLevel };
}

async function assignClassroomLevels(): Promise<void> {
  try {
    console.log('🔍 Tüm öğrenci kullanıcıları kontrol ediliyor...\n');
    
    // Tüm öğrenci kullanıcılarını bul
    const allStudentsQuery = await db.collection('users')
      .where('role', '==', 'student')
      .get();

    if (allStudentsQuery.empty) {
      console.log('✅ Öğrenci kullanıcısı bulunamadı.');
      return;
    }

    console.log(`📊 ${allStudentsQuery.size} adet öğrenci kullanıcı bulundu.\n`);

    let updatedCount = 0;
    let notFoundCount = 0;
    let alreadyCorrectCount = 0;
    let skippedCount = 0;

    for (const userDoc of allStudentsQuery.docs) {
      const userData = userDoc.data();
      const email = userData.email?.trim().toLowerCase();
      const displayName = userData.displayName ?? 'İsimsiz';
      const currentClassroom = userData.classroom;
      const { status, correctClassroomLevel } = processUser(userDoc);

      switch (status) {
        case 'skipped':
          skippedCount++;
          continue;
        case 'not_found':
          notFoundCount++;
          continue;
        case 'already_correct':
          alreadyCorrectCount++;
          continue;
        case 'no_action':
          continue;
        case 'needs_update':
          if (correctClassroomLevel) {
            const success = await updateUserClassroom(
              userDoc,
              correctClassroomLevel,
              displayName,
              email!,
              currentClassroom
            );
            if (success) {
              updatedCount++;
            }
          }
          break;
      }
    }

    console.log(`\n🎉 İşlem Tamamlandı!`);
    console.log(`✅ Güncellenen: ${updatedCount}`);
    console.log(`✓  Zaten doğru seviyede: ${alreadyCorrectCount}`);
    console.log(`❌ Listede bulunamayan (new-signup): ${notFoundCount}`);
    console.log(`⚠️  Email olmayan/atlanan: ${skippedCount}`);
    console.log(`📊 Toplam kontrol edilen: ${allStudentsQuery.size}`);

  } catch (error) {
    console.error('❌ Genel Hata:', error);
    process.exit(1);
  }
}

// Script'i çalıştır
assignClassroomLevels()
  .then(() => {
    console.log('\n✅ Script başarıyla tamamlandı');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script hatası:', error);
    process.exit(1);
  });

