export const URL_REGEX = /https?:\/\/[^\s<>"'{}|\\^`[\]]+/gi;

/**
 * Extracts clean, valid HTTP/HTTPS URLs from a given message text
 */
export function extractUrlsFromText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(URL_REGEX);
  if (!matches) return [];

  const validUrls: string[] = [];
  for (const raw of matches) {
    const cleaned = raw.replace(/[.,;:!?)\],>]+$/, '');
    try {
      const parsed = new URL(cleaned);
      if (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        parsed.hostname &&
        parsed.hostname.includes('.')
      ) {
        validUrls.push(cleaned);
      }
    } catch {
      // Ignore invalid URL structures
    }
  }

  return Array.from(new Set(validUrls));
}

/**
 * Extracts a concise display domain name from a URL (e.g. "https://www.stripe.com/pricing" -> "stripe.com")
 */
export function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return 'web page';
  }
}
