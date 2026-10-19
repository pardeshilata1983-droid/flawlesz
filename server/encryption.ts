import crypto from 'node:crypto';

const SECRET_KEY = crypto.scryptSync(process.env.SESSION_SECRET || 'flaw-secure-teammate-key-salt-2026', 'salt', 32);
const ALGORITHM = 'aes-256-cbc';

export function encryptApiKey(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decryptApiKey(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return encryptedText; // fallback if unencrypted
    const iv = Buffer.from(parts[0], 'hex');
    const ciphertext = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[ENCRYPTION] Decryption failed:', err);
    return '';
  }
}

export function maskApiKey(encryptedText: string): string {
  const decrypted = decryptApiKey(encryptedText);
  if (!decrypted || decrypted.length < 8) return '••••••••';
  const start = decrypted.slice(0, 4);
  const end = decrypted.slice(-4);
  return `${start}••••${end}`;
}
