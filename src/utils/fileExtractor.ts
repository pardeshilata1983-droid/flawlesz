import { UploadedFile } from '../types.ts';
import { apiRequest } from '../services/api.ts';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function getFileCategory(file: File): 'pdf' | 'image' | 'text' | 'code' | 'other' {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (type.includes('pdf') || name.endsWith('.pdf')) {
    return 'pdf';
  }
  if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(name)) {
    return 'image';
  }
  if (
    type.includes('json') ||
    type.includes('javascript') ||
    type.includes('typescript') ||
    /\.(json|ts|tsx|js|jsx|py|html|css|yaml|yml|sql)$/i.test(name)
  ) {
    return 'code';
  }
  if (
    type.startsWith('text/') ||
    /\.(txt|md|markdown|csv|rtf|log)$/i.test(name)
  ) {
    return 'text';
  }
  return 'other';
}

export async function processUploadedFile(file: File): Promise<UploadedFile> {
  const id = 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const category = getFileCategory(file);

  // Handle images: generate preview URL
  let previewUrl: string | undefined;
  if (category === 'image') {
    previewUrl = URL.createObjectURL(file);
  }

  // If text or code, read directly via FileReader
  if (category === 'text' || category === 'code') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = (reader.result as string) || '';
        const words = text.split(/\s+/).filter(Boolean).length;
        resolve({
          id,
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          content: text,
          previewUrl,
          wordCount: words
        });
      };
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsText(file);
    });
  }

  // For PDFs and other documents, convert to base64 and parse via server
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        console.log(`[FILE EXTRACTOR] Sending ${file.name} (${file.size} bytes) to server parser...`);

        const parsed = await apiRequest<{
          name: string;
          type: string;
          size: number;
          text: string;
          wordCount: number;
        }>('/api/parse-document', {
          method: 'POST',
          body: JSON.stringify({
            name: file.name,
            type: file.type || 'application/octet-stream',
            base64
          })
        });

        resolve({
          id,
          name: file.name,
          size: file.size,
          type: file.type,
          content: parsed.text || `[Document: ${file.name}]`,
          previewUrl,
          wordCount: parsed.wordCount || 0
        });
      } catch (err: any) {
        console.warn(`[FILE EXTRACTOR] Server parsing fallback for ${file.name}:`, err.message);
        // Fallback: simple text description
        resolve({
          id,
          name: file.name,
          size: file.size,
          type: file.type,
          content: `[Attached File: ${file.name} (${formatFileSize(file.size)})]`,
          previewUrl,
          wordCount: 10
        });
      }
    };
    reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
    reader.readAsDataURL(file);
  });
}
