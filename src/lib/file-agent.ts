import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

export class FileAgent {
  // Convert .ipynb content to plain text: concatenate all cell sources line by line
  async processIPYNB(ipynbContent: string | Buffer): Promise<string> {
    try {
      const content = typeof ipynbContent === 'string' ? ipynbContent : ipynbContent.toString('utf8');
      const notebook = JSON.parse(content);
      const cells = Array.isArray(notebook.cells) ? notebook.cells : [];
      const lines: string[] = [];
      
      // Helper: Normalize cell source to array format
      const normalizeCellSource = (source: unknown): string[] => {
        if (Array.isArray(source)) {
          return source;
        }
        if (typeof source === 'string') {
          return [source];
        }
        return [];
      };
      
      for (const cell of cells) {
        const src = normalizeCellSource(cell.source);
        for (const line of src) {
          lines.push(String(line).replace(/\r?\n$/, ''));
        }
        if (src.length > 0) {
          lines.push("");
        }
      }
      return lines.join("\n");
    } catch {
      return typeof ipynbContent === 'string' ? ipynbContent : ipynbContent.toString('utf8');
    }
  }

  async processCSV(csvContent: string): Promise<string> {
    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
      });

      let prescriptionText = "Hastalik ve İlaç Listesi:\n\n";
      for (const record of records) {
        prescriptionText += `Hastalik: ${record.hastalik}\n`;
        prescriptionText += `İlac: ${record.ilac}\n`;
        prescriptionText += `Doz: ${record.doz}\n`;
        prescriptionText += `Kullanim: ${record.kullanim}\n\n`;
      }

      return prescriptionText;
    } catch (error) {
      console.error('CSV işleme hatası:', error);
      throw new Error('CSV dosyası işlenirken bir hata oluştu');
    }
  }

  // Extract structured outline as X.Ödev -> X.Soru -> Cevap gövdesi
  extractAssignments(plainText: string) {
    const lines = String(plainText || "").split(/\r?\n/);
    const odevRe = /^(?:#+\s*)?(?:ödev|odev|ÖDEV|Ödev)\s*(\d+)/i;
    const soruRe = /^(?:#+\s*)?(?:soru|question)\s*(\d+)/i;

    const result: Array<{ number: number; questions: Array<{ number: number; body: string }> }> = [];
    let currentOdev: { number: number; questions: Array<{ number: number; body: string }> } | null = null;
    let currentSoru: { number: number; body: string[] } | null = null;

    const pushSoru = () => {
      if (currentOdev && currentSoru) {
        currentOdev.questions.push({
          number: currentSoru.number,
          body: currentSoru.body.join("\n").trim()
        });
      }
      currentSoru = null;
    };

    const pushOdev = () => {
      if (currentOdev) {
        pushSoru();
        result.push(currentOdev);
      }
      currentOdev = null;
    };

    for (const raw of lines) {
      const line = raw.trimEnd();
      const mO = odevRe.exec(line);
      const mS = soruRe.exec(line);

      if (mO) {
        const num = Number(mO[1]);
        if (!Number.isNaN(num)) {
          pushOdev();
          currentOdev = { number: num, questions: [] };
          currentSoru = null;
          continue;
        }
      }

      if (mS) {
        const num = Number(mS[1]);
        if (!Number.isNaN(num)) {
          pushSoru();
          currentSoru = { number: num, body: [] };
          continue;
        }
      }

      if (currentSoru) {
        currentSoru.body.push(line);
      }
    }

    pushOdev();
    return result;
  }

  // Render extracted structure to Markdown text
  renderAssignmentsMarkdown(structure: Array<{ number: number; questions: Array<{ number: number; body: string }> }>): string {
    const parts: string[] = [];
    for (const odev of structure) {
      parts.push(`## Ödev ${odev.number}`);
      for (const soru of odev.questions) {
        parts.push(`### Soru ${soru.number}`);
        if (soru.body) {
          parts.push("\n" + soru.body);
        }
      }
      parts.push("");
    }
    return parts.join("\n").trim();
  }

  // Convenience: from ipynb content → plain text → structured markdown
  async ipynbToAssignmentsMarkdown(ipynbContent: string | Buffer): Promise<string> {
    const plain = await this.processIPYNB(ipynbContent);
    const struct = this.extractAssignments(plain);
    return this.renderAssignmentsMarkdown(struct);
  }

  async fetchAndProcessCSV(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('CSV dosyası indirilemedi');
      }
      const csvContent = await response.text();
      return await this.processCSV(csvContent);
    } catch (error) {
      console.error('CSV indirme hatası:', error);
      throw new Error('CSV dosyası indirilemedi veya işlenemedi');
    }
  }

  // Helper: Find column index by search terms
  private findColumnIndex(headers: any[], searchTerms: string[]): number {
    for (const term of searchTerms) {
      const idx = headers.findIndex((h: any) => 
        h && String(h).toLowerCase().includes(term.toLowerCase())
      );
      if (idx >= 0) return idx;
    }
    return -1;
  }

  // Helper: Extract column indices from headers
  private extractColumnIndices(headers: any[]) {
    return {
      nameIdx: this.findColumnIndex(headers, ['isim', 'ad', 'name', 'öğrenci']),
      surnameIdx: this.findColumnIndex(headers, ['soyisim', 'soyad', 'surname', 'lastname']),
      dateIdx: this.findColumnIndex(headers, ['tarih', 'date']),
      timeIdx: this.findColumnIndex(headers, ['saat', 'time', 'zaman']),
      noteIdx: this.findColumnIndex(headers, ['not', 'puan', 'score', 'grade']),
      feedbackIdx: this.findColumnIndex(headers, ['geri bildirim', 'feedback', 'yorum', 'comment'])
    };
  }

  // Helper: Parse row into student record
  private parseStudentRecord(row: any[], indices: ReturnType<typeof this.extractColumnIndices>) {
    return {
      isim: indices.nameIdx >= 0 ? String(row[indices.nameIdx] ?? '').trim() : '',
      soyisim: indices.surnameIdx >= 0 ? String(row[indices.surnameIdx] ?? '').trim() : '',
      tarih: indices.dateIdx >= 0 ? String(row[indices.dateIdx] ?? '').trim() : '',
      saat: indices.timeIdx >= 0 ? String(row[indices.timeIdx] ?? '').trim() : '',
      not: indices.noteIdx >= 0 ? String(row[indices.noteIdx] ?? '').trim() : '',
      geriBildirim: indices.feedbackIdx >= 0 ? String(row[indices.feedbackIdx] ?? '').trim() : ''
    };
  }

  // Helper: Check if student record is valid (has at least one filled field)
  private isValidRecord(record: ReturnType<typeof this.parseStudentRecord>): boolean {
    return !!(record.isim || record.soyisim || record.not || record.geriBildirim);
  }

  // Helper: Format student records summary
  private formatRecordsSummary(studentRecords: Array<ReturnType<typeof this.parseStudentRecord>>): string {
    if (studentRecords.length === 0) return '';

    let summary = `\n\n=== Öğrenci Kayıtları Özeti (${studentRecords.length} kayıt) ===\n\n`;
    
    studentRecords.forEach((record, idx) => {
      summary += `Kayıt ${idx + 1}:\n`;
      if (record.isim) summary += `  İsim: ${record.isim}\n`;
      if (record.soyisim) summary += `  Soyisim: ${record.soyisim}\n`;
      if (record.tarih) summary += `  Tarih: ${record.tarih}\n`;
      if (record.saat) summary += `  Saat: ${record.saat}\n`;
      if (record.not) summary += `  Not: ${record.not}\n`;
      if (record.geriBildirim) summary += `  Geri Bildirim: ${record.geriBildirim}\n`;
      summary += '\n';
    });

    return summary;
  }

  // Helper: Process sheet data rows
  private processSheetRows(jsonData: any[][], headers: any[], indices: ReturnType<typeof this.extractColumnIndices>) {
    const studentRecords: Array<ReturnType<typeof this.parseStudentRecord>> = [];
    let rowText = '';

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const hasData = row.some((cell: any) => cell !== '');
      
      if (hasData) {
        rowText += `Satır ${i}: ${row.join(' | ')}\n`;
        const record = this.parseStudentRecord(row, indices);
        
        if (this.isValidRecord(record)) {
          studentRecords.push(record);
        }
      }
    }

    return { studentRecords, rowText };
  }

  // Helper: Process single worksheet
  private processWorksheet(worksheet: XLSX.WorkSheet, sheetName: string, index: number) {
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    let sheetText = `=== Sayfa ${index + 1}: ${sheetName} ===\n\n`;

    if (jsonData.length === 0) {
      return { sheetText: sheetText + "Bu sayfa boş.\n\n", studentRecords: [] };
    }

    const headers = jsonData[0] || [];
    sheetText += `Başlıklar: ${headers.join(' | ')}\n\n`;

    const indices = this.extractColumnIndices(headers);
    const { studentRecords, rowText } = this.processSheetRows(jsonData, headers, indices);

    sheetText += rowText;
    sheetText += this.formatRecordsSummary(studentRecords);
    sheetText += "\n";

    return { sheetText, studentRecords };
  }

  async processExcel(excelBuffer: Buffer): Promise<string> {
    try {
      const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
      let excelText = "Excel Dosyası İçeriği:\n\n";
      
      workbook.SheetNames.forEach((sheetName, index) => {
        const worksheet = workbook.Sheets[sheetName];
        const { sheetText } = this.processWorksheet(worksheet, sheetName, index);
        excelText += sheetText;
      });
      
      return excelText;
    } catch (error) {
      console.error('Excel işleme hatası:', error);
      throw new Error('Excel dosyası işlenirken bir hata oluştu: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
}

