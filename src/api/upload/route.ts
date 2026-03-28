
import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/google-drive';

// Helper to convert a file stream to a Buffer
async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    return Buffer.concat(chunks);
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        
        // --- Metadata from the form ---
        const assignmentWeek = formData.get('assignmentWeek') as string;
        const studentName = formData.get('studentName') as string;
        const studentClassroom = formData.get('studentClassroom') as string;

        if (!file) {
            return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 400 });
        }
        
        if (!assignmentWeek || !studentName || !studentClassroom) {
             return NextResponse.json({ error: 'Eksik dosya bilgileri.' }, { status: 400 });
        }

        // --- Generate Descriptive Filename ---
        const sanitizedStudentName = studentName.replace(/\s+/g, '_').toLowerCase();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileExtension = file.name.split('.').pop() ?? 'tmp';
        const safeStudentClassroom = (studentClassroom ?? 'unknown_class').replace('-', ' ');
        const descriptiveFilename = `${safeStudentClassroom} - ${assignmentWeek}.hafta - ${sanitizedStudentName} - ${timestamp}.${fileExtension}`;
        
        // --- Upload to Google Drive ---
        const fileBuffer = await streamToBuffer(file.stream());

        const fileMetadata = await uploadFile(
            fileBuffer,
            descriptiveFilename,
            file.type
        );
        
        return NextResponse.json({ 
            message: "Dosya başarıyla yüklendi", 
            fileId: fileMetadata.id 
        }, { status: 200 });

    } catch (error: any) {
        console.error('Google Drive Upload Error:', error);
        return NextResponse.json({ error: error.message ?? 'Sunucu hatası oluştu.' }, { status: 500 });
    }
}
