import { NextRequest, NextResponse } from 'next/server';
import { ChatGroq } from '@langchain/groq';
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { FileAgent } from '@/lib/file-agent';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { apiLogger } from '@/lib/logger';
import { checkRateLimit, getClientIp, RateLimitPresets } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Initialize Firebase Admin SDK
function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  try {
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
    if (!serviceAccountKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 not set');
    }

    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountKey, 'base64').toString('utf-8')
    );

    return initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  } catch (error) {
    apiLogger.error('Failed to initialize Firebase Admin', error as Error);
    throw error;
  }
}

// Verify Firebase ID token
async function verifyToken(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    apiLogger.error('Token verification failed', error as Error);
    return null;
  }
}

// Check if user is teacher
async function isTeacher(uid: string): Promise<boolean> {
  try {
    const adminApp = getAdminApp();
    const firestore = getFirestore(adminApp);
    const userDoc = await firestore.collection('users').doc(uid).get();
    const userData = userDoc.data();
    return userData?.role === 'teacher';
  } catch (error) {
    apiLogger.error('Failed to check user role', error as Error);
    return false;
  }
}

// Lazy initialization of LangChain model (only at runtime, not build time)
// This function should only be called inside request handlers, never at module level
function getModel() {
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    return null; // Return null instead of throwing during build
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('Using Groq for chat model');
  }

  return new ChatGroq({
    apiKey: groqApiKey,
    model: process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
    temperature: 0.7,
    maxTokens: 8192,
  });
}

// Initialize File Agent
const fileAgent = new FileAgent();

// Session-based memory storage (in-memory, will be lost on restart)
const sessionMemories = new Map<string, InMemoryChatMessageHistory>();

// Helper function to get or create memory for a session
function getSessionMemory(sessionId: string): InMemoryChatMessageHistory {
  if (!sessionMemories.has(sessionId)) {
    const memory = new InMemoryChatMessageHistory();
    sessionMemories.set(sessionId, memory);
  }
  return sessionMemories.get(sessionId)!;
}

// Check if message contains a CSV URL
function containsCSVUrl(message: string): boolean {
  const urlRegex = /(https?:\/\/[^\s]+\.csv)/i;
  return urlRegex.test(message);
}

// Extract CSV URL from message
function extractCSVUrl(message: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+\.csv)/i;
  const match = urlRegex.exec(message);
  return match ? match[1] : null;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, RateLimitPresets.MODERATE);
    if (!rateLimitResult.success) {
      apiLogger.warn('Rate limit exceeded for AI Agent chat', {
        ip: clientIp,
        resetTime: new Date(rateLimitResult.resetTime).toISOString(),
      });
      return NextResponse.json(
        {
          error: 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Verify authentication
    const uid = await verifyToken(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is teacher
    const userIsTeacher = await isTeacher(uid);
    if (!userIsTeacher) {
      return NextResponse.json({ error: 'Only teachers can access AI Agent' }, { status: 403 });
    }

    const { message } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Use user ID as session ID
    const sessionId = uid;
    const memory = getSessionMemory(sessionId);

    // Check if message contains a CSV URL
    if (containsCSVUrl(message)) {
      const csvUrl = extractCSVUrl(message);
      if (csvUrl) {
        try {
          const prescriptionData = await fileAgent.fetchAndProcessCSV(csvUrl);
          // Note: generatePrescriptionAdvice is not in the original code, skipping for now
          await memory.addMessage(new HumanMessage(`Reçete analizi: ${prescriptionData}`));
          await memory.addMessage(new AIMessage('Reçete analizi tamamlandı.'));
          return NextResponse.json({ response: 'Reçete analizi tamamlandı.' });
        } catch (error) {
          apiLogger.error('Reçete işleme hatası', error as Error);
          return NextResponse.json({ error: 'Reçete işlenirken bir hata oluştu' }, { status: 500 });
        }
      }
    }

    const chatPrompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(
        `Sen Ödev Kontrolcüsüsün. TÜM YANITLARINI TÜRKÇE ve Kısa cevaplarla VER!

    Görev: Dosya içeriğine dayanarak ödevi değerlendir.

    Yapacakların:
    - Ödev kapsamını soruları kanoularını çıkar (konu ve alt başlıklar).
    - Soru sayısını ve hangilerinin cevaplandığını tespit et.

    Kurallar:
    - Sadece dosya içeriğine göre değerlendir; varsayım yapma. Belirsiz ise "Belirsiz" de.
    - TÜM YANITLARINI MUTLAKA TÜRKÇE VER! İngilizce yanıt verme!
    - Madde madde ve öz yaz. Soruya göre cevap doğru mu yanlış mı yoksa boş mu diye kontrol et.
    - En sonda: Toplam doğru soru yanlış soru boş soru sayısı ve yanlışları veya eksikleri icin kısa geri bildirim hazırla.

    Eğer kullanıcı sadece selamlama yaparsa (selam, merhaba, vb.), Türkçe olarak nazikçe karşılık ver ve dosya yüklemesini iste.
`
      ),
      new MessagesPlaceholder("history"),
      HumanMessagePromptTemplate.fromTemplate("{input}")
    ]);

    // Create chain with message history
    // Lazy initialization - only at runtime, not build time
    const model = getModel();
    if (!model) {
      return NextResponse.json({ 
        error: 'AI model initialization failed. Please check environment variables (GROQ_API_KEY or OPENROUTER_API_KEY).' 
      }, { status: 500 });
    }
    const chain = chatPrompt.pipe(model);
    
    const chainWithHistory = new RunnableWithMessageHistory({
      runnable: chain,
      getMessageHistory: async (sessionId: string) => {
        return getSessionMemory(sessionId);
      },
      inputMessagesKey: "input",
      historyMessagesKey: "history",
    });

    // Invoke chain with history (history is automatically managed)
    const response = await chainWithHistory.invoke(
      { input: message },
      { configurable: { sessionId } }
    );

    const responseText = response.content as string || JSON.stringify(response);
    return NextResponse.json(
      { response: responseText },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        },
      }
    );
  } catch (error) {
    apiLogger.error('Chat Error', error as Error);
    
    // Helper function to format error message
    const getErrorMessage = (err: unknown, isDevelopment: boolean): string => {
      if (!isDevelopment) {
        return 'Internal server error';
      }
      return err instanceof Error ? err.message : 'Unknown error';
    };
    
    return NextResponse.json({ 
      error: getErrorMessage(error, process.env.NODE_ENV === 'development')
    }, { status: 500 });
  }
}

