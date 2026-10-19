import * as pdfParseModule from 'pdf-parse';
const pdfParse: any = (pdfParseModule as any).default || pdfParseModule;

export interface ParsedDocument {
  name: string;
  type: string;
  size: number;
  text: string;
  pageCount?: number;
  wordCount: number;
  isScannedOrUnreadable?: boolean;
  unreadableMessage?: string;
}

export async function parseDocumentBuffer(
  fileName: string,
  fileType: string,
  fileBuffer: Buffer
): Promise<ParsedDocument> {
  const size = fileBuffer.length;
  let extractedText = '';
  let pageCount: number | undefined;

  const lowerName = fileName.toLowerCase();
  const isPdf = fileType.includes('pdf') || lowerName.endsWith('.pdf');
  const isImage = fileType.includes('image') || /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(lowerName);

  if (isPdf) {
    try {
      const data = await pdfParse(fileBuffer);
      extractedText = data.text || '';
      pageCount = data.numpages;
    } catch (err: any) {
      console.warn('[PARSER] Error parsing PDF with pdf-parse:', err.message);
      // Fallback: extract visible text from buffer
      extractedText = fileBuffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim();
    }
  } else if (isImage) {
    extractedText = '';
  } else {
    // Text, Markdown, JSON, CSV, etc.
    extractedText = fileBuffer.toString('utf-8');
  }

  // Clean up excessive whitespace
  extractedText = extractedText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  const words = extractedText.split(/\s+/).filter(Boolean);
  const isScannedOrUnreadable = (isPdf || isImage) && words.length < 5;
  let unreadableMessage: string | undefined;

  if (isScannedOrUnreadable) {
    unreadableMessage = `Notice: Document "${fileName}" appears to be a scanned PDF or raster image without an embedded text layer. Flawlesz AI models are text-only, so scanned documents cannot be read without OCR. Please provide a document with extractable text or paste the text directly.`;
    extractedText = unreadableMessage;
  }

  return {
    name: fileName,
    type: fileType,
    size,
    text: extractedText,
    pageCount,
    wordCount: words.length,
    isScannedOrUnreadable,
    unreadableMessage,
  };
}
