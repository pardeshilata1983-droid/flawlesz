/**
 * URL Inspection Engine for Flaw Follow-up Chat
 * Detects, validates, fetches, and extracts readable text from live web pages
 * to ground conversational answers with real-world data.
 */

export const URL_REGEX = /https?:\/\/[^\s<>"'{}|\\^`[\]]+/gi;

export interface UrlInspectionResult {
  url: string;
  domain: string;
  success: boolean;
  title?: string;
  description?: string;
  extractedText?: string;
  httpStatus?: number;
  error?: string;
}

/**
 * Extracts and cleans valid HTTP/HTTPS URLs from raw text
 */
export function extractUrlsFromText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(URL_REGEX);
  if (!matches) return [];

  const validUrls: string[] = [];
  for (const raw of matches) {
    // Remove trailing punctuation often attached in conversational text (.,;:!?)]})
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
      // Ignore invalid URL
    }
  }

  // Deduplicate URLs while preserving order
  return Array.from(new Set(validUrls));
}

/**
 * Extracts clean domain name for display (e.g. "stripe.com")
 */
export function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return 'web page';
  }
}

/**
 * Checks for localhost, private subnets, and metadata endpoints (SSRF guard)
 */
function isSafeUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local')
    ) {
      return false;
    }

    // Block RFC 1918 and cloud metadata endpoints
    if (
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Decodes standard HTML entities into plain text
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&copy;/g, '©')
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return '';
      }
    })
    .replace(/&#x([a-fA-F0-9]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return '';
      }
    });
}

/**
 * Strips HTML tags, styles, scripts, and returns readable markdown-like text
 */
function extractReadableContent(html: string): { title?: string; description?: string; bodyText: string } {
  // 1. Extract title
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : undefined;

  // 2. Extract description (meta description or og:description)
  let description: string | undefined;
  const descMatch = /<meta[^>]+(?:name|property)=["'](?:description|og:description|twitter:description)["'][^>]+content=["']([^"']*)["']/i.exec(html);
  if (descMatch && descMatch[1]) {
    description = decodeHtmlEntities(descMatch[1]).trim();
  } else {
    // Reverse attribute order check: content before name/property
    const descMatchRev = /<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["'](?:description|og:description|twitter:description)["']/i.exec(html);
    if (descMatchRev && descMatchRev[1]) {
      description = decodeHtmlEntities(descMatchRev[1]).trim();
    }
  }

  // 3. Strip noisy elements
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  // 4. Convert structural block elements into clean line breaks
  cleaned = cleaned
    .replace(/<\/(h[1-6]|p|div|section|article|header|footer|li)>/gi, '\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<hr\s*[\/]?>/gi, '\n---\n');

  // 5. Strip all remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // 6. Decode entities and normalize whitespace
  const decoded = decodeHtmlEntities(cleaned);
  const lines = decoded
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0);

  // Group into paragraphs, capping total length to 5,000 characters
  let accumulated = '';
  for (const line of lines) {
    if (accumulated.length + line.length > 5000) {
      accumulated += '\n' + line.slice(0, Math.max(0, 5000 - accumulated.length)) + '... [page content truncated]';
      break;
    }
    accumulated += (accumulated ? '\n' : '') + line;
  }

  return {
    title,
    description,
    bodyText: accumulated,
  };
}

/**
 * Fetches and inspects a live webpage with timeout and resilient error handling
 */
export async function inspectLiveUrl(rawUrl: string): Promise<UrlInspectionResult> {
  const domain = getDomainFromUrl(rawUrl);

  if (!isSafeUrl(rawUrl)) {
    console.warn(`[URL INSPECTOR] Blocked unsafe or internal URL attempt: ${rawUrl}`);
    return {
      url: rawUrl,
      domain,
      success: false,
      error: 'Access to local or restricted private network addresses is forbidden.',
    };
  }

  console.log(`[URL INSPECTOR] Fetching live page: ${rawUrl} (Domain: ${domain})...`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7500); // 7.5s max

    const response = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (compatible; FlawValidatorBot/1.0; +https://flaw.dev)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    // SSRF post-redirect guard: verify destination URL is not private or local
    if (response.url) {
      if (!isSafeUrl(response.url)) {
        console.warn(`[URL INSPECTOR] Blocked redirect to unsafe or internal destination: ${response.url}`);
        return {
          url: rawUrl,
          domain,
          success: false,
          error: 'Access blocked: Redirected to a restricted private or local network address.',
        };
      }
      try {
        const parsedFinal = new URL(response.url);
        if (parsedFinal.port && parsedFinal.port !== '80' && parsedFinal.port !== '443') {
          return {
            url: rawUrl,
            domain,
            success: false,
            error: 'Access blocked: Redirected to a non-standard port (only ports 80 and 443 permitted).',
          };
        }
      } catch {
        // ignore parse error
      }
    }

    if (!response.ok) {
      console.warn(`[URL INSPECTOR] HTTP error fetching ${rawUrl}: Status ${response.status} ${response.statusText}`);
      return {
        url: rawUrl,
        domain,
        success: false,
        httpStatus: response.status,
        error: `Remote server responded with HTTP ${response.status} (${response.statusText || 'Error'}). The page may be behind a login or blocked by anti-bot firewalls.`,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text') && !contentType.includes('html') && !contentType.includes('json') && !contentType.includes('xml')) {
      return {
        url: rawUrl,
        domain,
        success: false,
        httpStatus: response.status,
        error: `Unsupported content type (${contentType}). Flawlesz AI can only inspect text and HTML web pages.`,
      };
    }

    const html = await response.text();
    let { title, description, bodyText } = extractReadableContent(html);

    // Detect client-side-only SPA shells with empty body text
    const isSpaShell =
      bodyText.trim().length < 80 &&
      (html.includes('id="root"') ||
        html.includes('id="app"') ||
        html.includes('__next') ||
        html.includes('<div id='));

    if (isSpaShell) {
      bodyText = `Notice: The target website (${domain}) appears to be a client-side rendered Single Page Application (SPA). The raw HTML response contained an empty client container without pre-rendered server text. Dynamic JavaScript execution in a browser is required to view this page.`;
    }

    console.log(`[URL INSPECTOR] Successfully fetched and parsed ${domain}. Title: "${title || 'N/A'}" (${bodyText.length} chars text). SPA shell: ${isSpaShell}`);

    return {
      url: rawUrl,
      domain,
      success: true,
      httpStatus: response.status,
      title,
      description,
      extractedText: bodyText,
    };
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError' || err?.message?.toLowerCase().includes('aborted');
    const errorMsg = isTimeout
      ? 'Connection timed out after 7.5 seconds while attempting to load the page.'
      : err?.message || 'Network connection failed.';

    console.warn(`[URL INSPECTOR] Failed to fetch ${rawUrl}: ${errorMsg}`);

    return {
      url: rawUrl,
      domain,
      success: false,
      error: errorMsg,
    };
  }
}
