import type { UrlInspectionResult } from './urlInspector.ts';

// ─────────────────────────────────────────────────────────────
// GROQ AI CONFIGURATION & MODEL TIERS
// ─────────────────────────────────────────────────────────────
export interface GroqModelConfig {
  id: string;
  name: string;
  role: string;
  costPer1MInputTokens: number;
  costPer1MOutputTokens: number;
  reasoningEffort?: 'low' | 'medium' | 'high';
  maxCompletionTokens?: number;
}

export const GROQ_CONFIG = {
  endpoint: 'https://api.groq.com/openai/v1',
  models: {
    orbit: {
      id: 'openai/gpt-oss-20b',
      name: 'Orbit',
      role: 'Task router, search-query writing, follow-up chat, titles, summaries, and everyday tier',
      costPer1MInputTokens: 0.05,
      costPer1MOutputTokens: 0.08,
    } as GroqModelConfig,
    pulsar: {
      id: 'openai/gpt-oss-120b',
      name: 'Pulsar',
      role: 'General writing and reasoning',
      costPer1MInputTokens: 0.15,
      costPer1MOutputTokens: 0.60,
    } as GroqModelConfig,
    quasar: {
      id: 'qwen/qwen3.8-27b',
      name: 'Quasar',
      role: 'Deepest analysis and planning',
      costPer1MInputTokens: 0.30,
      costPer1MOutputTokens: 0.60,
      reasoningEffort: 'low' as const,
      maxCompletionTokens: 4096,
    } as GroqModelConfig,
    // Future vision-capable slot:
    vision: {
      id: 'meta-llama/llama-4-scout-17b-16k',
      name: 'Vision Scout',
      role: 'Multi-modal image & layout inspector',
      costPer1MInputTokens: 0.30,
      costPer1MOutputTokens: 0.60,
      enabled: false,
    },
  },
};

export type ModelTier = 'orbit' | 'pulsar' | 'quasar';

export type SkillType =
  | 'idea_validation'
  | 'website_audit'
  | 'document_review'
  | 'comparison'
  | 'visual_theme_audit'
  | 'general_task';

export interface GeneralFinding {
  title: string;
  explanation: string;
  source_or_quote?: string;
}

export interface RiskOrQuestion {
  title: string;
  explanation: string;
  severity: 'high' | 'medium' | 'low';
}

export interface NextStep {
  step: string;
  detail: string;
}

export interface GraveyardStartup {
  name: string;
  founded_year: number | null;
  closed_year: number | null;
  reported_cause: string | null;
  lesson_for_this_idea: string;
  source_urls: string[];
}

export interface ValidationOutput {
  skill: SkillType;
  short_answer?: string;
  key_findings?: GeneralFinding[];
  risks_or_questions?: RiskOrQuestion[];
  next_steps?: NextStep[];
  disclaimer?: string | null;
  computed_palette?: {
    colors: Array<{ hex: string; role: string; contrastWithWhite: number; contrastWithBlack: number }>;
    wcag_notes: string;
  };
  similar_products: Array<{
    name: string;
    description: string;
    source_url: string;
  }>;
  flaws: Array<{
    title: string;
    explanation: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  refined_versions: Array<{
    idea: string;
    reasoning: string;
  }>;
  graveyard: GraveyardStartup[];
}

// ─────────────────────────────────────────────────────────────
// USAGE & COST LOGGING
// ─────────────────────────────────────────────────────────────
export interface GroqCallLog {
  id: string;
  timestamp: string;
  userEmail?: string;
  tier: ModelTier | 'router' | 'followup' | 'teammate';
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  estimatedCostUsd: number;
  success: boolean;
  error?: string;
}

const groqCallLogs: GroqCallLog[] = [];

export function getGroqUsageLogs(): GroqCallLog[] {
  return [...groqCallLogs];
}

function calculateCost(tier: ModelTier, promptTokens: number, completionTokens: number): number {
  const modelConf = GROQ_CONFIG.models[tier] || GROQ_CONFIG.models.orbit;
  const inCost = (promptTokens / 1_000_000) * modelConf.costPer1MInputTokens;
  const outCost = (completionTokens / 1_000_000) * modelConf.costPer1MOutputTokens;
  return Number((inCost + outCost).toFixed(6));
}

function recordLog(entry: Omit<GroqCallLog, 'id' | 'timestamp'>) {
  const log: GroqCallLog = {
    id: `groq-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  groqCallLogs.unshift(log);
  if (groqCallLogs.length > 500) {
    groqCallLogs.pop();
  }
  console.log(
    `[GROQ LOG] ${log.tier.toUpperCase()} (${log.model}): ${log.totalTokens} tokens (${log.latencyMs}ms, $${log.estimatedCostUsd}) - Success: ${log.success}`
  );
}

// ─────────────────────────────────────────────────────────────
// CONCURRENCY QUEUE & RATE LIMITER
// ─────────────────────────────────────────────────────────────
class SimpleSemaphore {
  private current = 0;
  private queue: Array<() => void> = [];

  constructor(private maxConcurrent: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.maxConcurrent) {
      this.current++;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.current++;
        resolve();
      });
    });
  }

  release(): void {
    this.current--;
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }
}

// Limit concurrent Groq calls to 2 to prevent TPM/RPM bursts
const groqSemaphore = new SimpleSemaphore(2);

// Context trimming: Groq models have per-minute token limits. Cap prompts at ~6,000 tokens (~24,000 chars)
function trimContext(text: string, maxChars = 24000): string {
  if (!text || text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n... [Context trimmed for length]';
}

// Helper to sleep
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ─────────────────────────────────────────────────────────────
// LOW-LEVEL GROQ CALL WITH 429 RETRIES & QUEUE
// ─────────────────────────────────────────────────────────────
interface GroqCallParams {
  tier: ModelTier;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  userEmail?: string;
  responseFormatJson?: boolean;
}

export async function callGroqChat(params: GroqCallParams): Promise<{
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  model: string;
}> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('[GROQ ADMIN] GROQ_API_KEY Not configured in environment secrets');
    throw new Error('AI analysis is temporarily unavailable. Please try again shortly.');
  }

  const modelConf = GROQ_CONFIG.models[params.tier] || GROQ_CONFIG.models.orbit;
  const startTime = Date.now();

  await groqSemaphore.acquire();

  let attempt = 0;
  const maxRetries = 2;

  try {
    while (attempt <= maxRetries) {
      try {
        const bodyPayload: any = {
          model: modelConf.id,
          messages: params.messages.map((m) => ({
            role: m.role,
            content: trimContext(m.content),
          })),
          temperature: params.temperature ?? 0.3,
        };

        if (modelConf.maxCompletionTokens) {
          bodyPayload.max_completion_tokens = modelConf.maxCompletionTokens;
        }

        if (modelConf.reasoningEffort) {
          bodyPayload.reasoning_effort = modelConf.reasoningEffort;
        }

        if (params.responseFormatJson) {
          bodyPayload.response_format = { type: 'json_object' };
        }

        const res = await fetch(`${GROQ_CONFIG.endpoint}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyPayload),
        });

        if (res.status === 429) {
          attempt++;
          const retryAfterHeader = res.headers.get('retry-after');
          let delayMs = 2000;
          if (retryAfterHeader) {
            const parsedSec = parseFloat(retryAfterHeader);
            if (!isNaN(parsedSec)) delayMs = Math.min(10000, Math.max(1000, parsedSec * 1000));
          } else {
            delayMs = 1500 * Math.pow(2, attempt);
          }

          if (attempt <= maxRetries) {
            console.warn(`[GROQ 429] Rate limited on ${modelConf.id}. Retrying attempt ${attempt}/${maxRetries} after ${delayMs}ms...`);
            await sleep(delayMs);
            continue;
          } else {
            throw new Error('The AI is busy, try again in a minute.');
          }
        }

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const errMsg = errBody?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
          throw new Error(`Groq API Error: ${errMsg}`);
        }

        const json: any = await res.json();
        const latencyMs = Date.now() - startTime;
        let content: string = json.choices?.[0]?.message?.content || '';

        // Never expose raw reasoning text to users (strip <think> tags or reasoning blocks)
        content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        const usage = json.usage || {};
        const promptTokens = usage.prompt_tokens || 0;
        const completionTokens = usage.completion_tokens || 0;
        const totalTokens = usage.total_tokens || promptTokens + completionTokens;
        const costUsd = calculateCost(params.tier, promptTokens, completionTokens);

        recordLog({
          userEmail: params.userEmail,
          tier: params.tier,
          model: modelConf.id,
          promptTokens,
          completionTokens,
          totalTokens,
          latencyMs,
          estimatedCostUsd: costUsd,
          success: true,
        });

        return {
          content,
          promptTokens,
          completionTokens,
          totalTokens,
          latencyMs,
          model: modelConf.id,
        };
      } catch (err: any) {
        if (err.message === 'The AI is busy, try again in a minute.') {
          throw err;
        }
        if (attempt >= maxRetries) {
          const latencyMs = Date.now() - startTime;
          recordLog({
            userEmail: params.userEmail,
            tier: params.tier,
            model: modelConf.id,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            latencyMs,
            estimatedCostUsd: 0,
            success: false,
            error: err?.message || String(err),
          });
          throw err;
        }
        attempt++;
        await sleep(1000 * attempt);
      }
    }

    throw new Error('The AI is busy, try again in a minute.');
  } finally {
    groqSemaphore.release();
  }
}

// ─────────────────────────────────────────────────────────────
// SEARCH GROUNDING (TAVILY OR BRAVE VIA SEARCH_API_KEY)
// ─────────────────────────────────────────────────────────────
export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchOutcome {
  success: boolean;
  query: string;
  results: SearchResultItem[];
  providerName: string;
  note?: string;
}

export async function performWebSearch(query: string): Promise<WebSearchOutcome> {
  const searchKey = process.env.SEARCH_API_KEY;
  if (!searchKey) {
    console.warn('[SEARCH GROUNDING] SEARCH_API_KEY not configured in environment secrets');
    return {
      success: false,
      query,
      results: [],
      providerName: 'None (SEARCH_API_KEY not configured)',
      note: 'Live search grounding is temporarily unavailable. Sources were not checked against the live web.',
    };
  }

  // Detect key format: Tavily keys often start with tvly-, Brave keys are usually 32+ hex/alphanumeric
  const isTavily = searchKey.startsWith('tvly-') || searchKey.length < 40;

  try {
    if (isTavily) {
      console.log(`[SEARCH] Querying Tavily Search for: "${query}"...`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: searchKey,
          query,
          search_depth: 'basic',
          include_answer: false,
          max_results: 5,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Tavily HTTP ${res.status}: ${res.statusText}`);
      }

      const data: any = await res.json();
      const results: SearchResultItem[] = (data.results || []).map((r: any) => ({
        title: r.title || 'Search Result',
        url: r.url,
        snippet: r.content || r.snippet || '',
      }));

      return {
        success: true,
        query,
        results,
        providerName: 'Tavily Search',
      };
    } else {
      // Brave Search endpoint
      console.log(`[SEARCH] Querying Brave Search for: "${query}"...`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': searchKey,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Brave Search HTTP ${res.status}: ${res.statusText}`);
      }

      const data: any = await res.json();
      const results: SearchResultItem[] = (data.web?.results || []).map((r: any) => ({
        title: r.title || 'Search Result',
        url: r.url,
        snippet: r.description || '',
      }));

      return {
        success: true,
        query,
        results,
        providerName: 'Brave Search',
      };
    }
  } catch (err: any) {
    console.warn(`[SEARCH] Web search failed for "${query}":`, err?.message);
    return {
      success: false,
      query,
      results: [],
      providerName: 'Search API',
      note: 'Web search grounding request failed. Sources were not checked against the live web.',
    };
  }
}

// ─────────────────────────────────────────────────────────────
// VISUAL SKILLS: COMPUTED PALETTE & CONTRAST RATIOS
// ─────────────────────────────────────────────────────────────
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 1.0;
  const l1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export interface ComputedPaletteMetric {
  hex: string;
  rgb: string;
  contrastWithWhite: number;
  contrastWithBlack: number;
  wcagNormalTextWhite: 'PASS (AAA)' | 'PASS (AA)' | 'FAIL';
  wcagNormalTextBlack: 'PASS (AAA)' | 'PASS (AA)' | 'FAIL';
  inferredRole: string;
}

export function extractAndComputePalette(rawText: string): {
  colors: ComputedPaletteMetric[];
  contrastMatrix: Array<{ pair: string; ratio: number; passAA: boolean; passAAA: boolean }>;
  summary: string;
} {
  // Extract hex codes
  const hexMatches = rawText.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g) || [];
  const uniqueHex = Array.from(new Set(hexMatches.map((h) => (h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`.toUpperCase() : h.toUpperCase())))).slice(0, 8);

  // If no hex codes found, supply a clean standard palette sample based on keywords
  const colorsToAnalyze = uniqueHex.length > 0 ? uniqueHex : ['#0F172A', '#3B82F6', '#10B981', '#F59E0B', '#FFFFFF'];

  const metrics: ComputedPaletteMetric[] = colorsToAnalyze.map((hex, idx) => {
    const rgb = hexToRgb(hex) || { r: 128, g: 128, b: 128 };
    const withWhite = getContrastRatio(hex, '#FFFFFF');
    const withBlack = getContrastRatio(hex, '#000000');

    let role = 'Accent';
    if (idx === 0) role = withWhite > 4.5 ? 'Dark Background / Text' : 'Light Background';
    else if (idx === 1) role = 'Primary Accent';
    else if (idx === 2) role = 'Secondary Accent / State';
    else if (idx === 3) role = 'Warning / Highlight';
    else if (idx === 4) role = 'Surface / Container';

    return {
      hex,
      rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      contrastWithWhite: withWhite,
      contrastWithBlack: withBlack,
      wcagNormalTextWhite: withWhite >= 7 ? 'PASS (AAA)' : withWhite >= 4.5 ? 'PASS (AA)' : 'FAIL',
      wcagNormalTextBlack: withBlack >= 7 ? 'PASS (AAA)' : withBlack >= 4.5 ? 'PASS (AA)' : 'FAIL',
      inferredRole: role,
    };
  });

  // Calculate pairwise contrast ratios
  const contrastMatrix: Array<{ pair: string; ratio: number; passAA: boolean; passAAA: boolean }> = [];
  for (let i = 0; i < metrics.length; i++) {
    for (let j = i + 1; j < metrics.length; j++) {
      const c1 = metrics[i].hex;
      const c2 = metrics[j].hex;
      const ratio = getContrastRatio(c1, c2);
      contrastMatrix.push({
        pair: `${c1} on ${c2}`,
        ratio,
        passAA: ratio >= 4.5,
        passAAA: ratio >= 7.0,
      });
    }
  }

  const summary = `Extracted ${metrics.length} distinct colors. Highest contrast: ${Math.max(...metrics.map((m) => Math.max(m.contrastWithWhite, m.contrastWithBlack)))}:1. Computed WCAG 2.1 compliance metrics for normal text (4.5:1 threshold) and UI elements (3.0:1 threshold).`;

  return { colors: metrics, contrastMatrix, summary };
}

// ─────────────────────────────────────────────────────────────
// LAYER 1: TASK ROUTER (ORBIT: openai/gpt-oss-20b)
// ─────────────────────────────────────────────────────────────
export interface RouterDecision {
  skill: SkillType;
  cleanedInput: string;
  searchQueries: string[];
  isVisualAudit: boolean;
  isHealth: boolean;
  isLegalOrFinancial: boolean;
}

export async function routeTaskWithOrbit(rawInput: string, attachmentName?: string): Promise<RouterDecision> {
  const inputSnippet = rawInput.slice(0, 1500);
  const routerSystemPrompt = `You are Flawlesz AI's Layer 1 Task Router (Orbit).
Your role:
1. Identify the primary skill required from this strict list:
   - 'visual_theme_audit': When the user asks about color theme, palette, contrast, layout, UI styling, or shares CSS/hex codes/visual scheme.
   - 'idea_validation': When the user wants to stress-test or validate a startup, product idea, or business hypothesis.
   - 'website_audit': When the user asks to analyze, audit, or review a specific live website or web URL.
   - 'document_review': When the user provides a document, resume, pitch deck, or contract to review/critique.
   - 'comparison': When the user asks to compare two products, frameworks, or approaches.
   - 'general_task': Any other task, calculation, explanation, or question.
2. Clean the input into a concise statement of what is being requested.
3. Write 1 to 2 targeted web search queries if live competitor or domain facts are needed. If the task is purely internal calculation or color contrast analysis, write an empty array [].
4. Flag health, legal, or financial topics.

Output ONLY valid JSON:
{
  "skill": "visual_theme_audit" | "idea_validation" | "website_audit" | "document_review" | "comparison" | "general_task",
  "cleanedInput": "concise description of task",
  "searchQueries": ["query 1"],
  "isVisualAudit": boolean,
  "isHealth": boolean,
  "isLegalOrFinancial": boolean
}`;

  try {
    const res = await callGroqChat({
      tier: 'orbit',
      messages: [
        { role: 'system', content: routerSystemPrompt },
        { role: 'user', content: `Input:\n"${inputSnippet}"\nAttachment: "${attachmentName || 'None'}"` },
      ],
      temperature: 0.1,
      responseFormatJson: true,
    });

    const parsed = JSON.parse(res.content);
    return {
      skill: parsed.skill || 'general_task',
      cleanedInput: parsed.cleanedInput || rawInput.slice(0, 200),
      searchQueries: Array.isArray(parsed.searchQueries) ? parsed.searchQueries : [],
      isVisualAudit: Boolean(parsed.isVisualAudit || parsed.skill === 'visual_theme_audit'),
      isHealth: Boolean(parsed.isHealth),
      isLegalOrFinancial: Boolean(parsed.isLegalOrFinancial),
    };
  } catch (err) {
    console.warn('[GROQ ROUTER] Orbit routing fallback to heuristics:', err);
    const lower = rawInput.toLowerCase();
    const isVisual =
      lower.includes('color') ||
      lower.includes('theme') ||
      lower.includes('palette') ||
      lower.includes('contrast') ||
      lower.includes('hex') ||
      lower.includes('layout') ||
      lower.includes('ui');
    const isIdea = lower.includes('startup') || lower.includes('business') || lower.includes('market') || lower.includes('app idea');

    return {
      skill: isVisual ? 'visual_theme_audit' : isIdea ? 'idea_validation' : 'general_task',
      cleanedInput: rawInput.slice(0, 200),
      searchQueries: isIdea ? [`${rawInput.slice(0, 60)} competitors startups`] : [],
      isVisualAudit: isVisual,
      isHealth: false,
      isLegalOrFinancial: false,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// LAYER 3: DEEP ANALYSIS (ORBIT, PULSAR, OR QUASAR)
// ─────────────────────────────────────────────────────────────
export async function validateIdeaWithGroq(
  idea: string,
  attachmentName?: string,
  modelTier: ModelTier = 'orbit',
  userEmail?: string
): Promise<ValidationOutput> {
  console.log(`[GROQ ENGINE] Starting layered pipeline for tier '${modelTier}'...`);

  // Layer 1: Orbit Router
  const routerDecision = await routeTaskWithOrbit(idea, attachmentName);
  console.log(`[GROQ LAYER 1] Router identified skill '${routerDecision.skill}' (isVisual: ${routerDecision.isVisualAudit})`);

  // Layer 2: Search Grounding + Document / Visual Processing
  let searchContext = '';
  const searchResultsCollected: SearchResultItem[] = [];

  if (routerDecision.searchQueries.length > 0) {
    for (const q of routerDecision.searchQueries.slice(0, 2)) {
      const searchRes = await performWebSearch(q);
      if (searchRes.success && searchRes.results.length > 0) {
        searchResultsCollected.push(...searchRes.results);
      } else if (searchRes.note) {
        searchContext += `\n[Search Note: ${searchRes.note}]`;
      }
    }
  }

  if (searchResultsCollected.length > 0) {
    searchContext += `\nSEARCH RESULTS FOR THIS REQUEST (Citations must strictly use these URLs):\n`;
    for (const r of searchResultsCollected) {
      searchContext += `- ${r.title}: ${r.snippet} (URL: ${r.url})\n`;
    }
  } else if (routerDecision.skill === 'idea_validation') {
    searchContext += `\n[Live search grounding unavailable. Note clearly in response that live sources could not be checked.]\n`;
  }

  // Visual Theme Analysis if visual skill detected or colors present
  let visualAnalysisBlock = '';
  let computedPaletteData: any = undefined;

  if (routerDecision.isVisualAudit || routerDecision.skill === 'visual_theme_audit' || /#[0-9a-fA-F]{3,6}/.test(idea)) {
    const computed = extractAndComputePalette(idea);
    computedPaletteData = {
      colors: computed.colors.map((c) => ({
        hex: c.hex,
        role: c.inferredRole,
        contrastWithWhite: c.contrastWithWhite,
        contrastWithBlack: c.contrastWithBlack,
      })),
      wcag_notes: computed.summary,
    };

    visualAnalysisBlock = `
CODE-COMPUTED PALETTE & WCAG 2.1 CONTRAST RATIOS:
${computed.colors
  .map(
    (c) =>
      `• ${c.hex} (${c.rgb}) - Inferred Role: ${c.inferredRole}
   - Contrast vs White: ${c.contrastWithWhite}:1 (${c.wcagNormalTextWhite})
   - Contrast vs Black: ${c.contrastWithBlack}:1 (${c.wcagNormalTextBlack})`
  )
  .join('\n')}

PAIRWISE CONTRASTS:
${computed.contrastMatrix.slice(0, 6).map((p) => `• ${p.pair}: ${p.ratio}:1 (WCAG AA: ${p.passAA ? 'PASS' : 'FAIL'})`).join('\n')}

SUMMARY: ${computed.summary}
CRITICAL INSTRUCTION FOR VISUAL AUDIT:
Label your analysis explicitly as:
[Color & Visual Analysis based on computed palette and WCAG contrast ratios (Code-Analyzed Palette)]
Explain that Flawlesz AI uses text-based models and this critique is computed algorithmically from extracted hex codes and calculated WCAG 2.1 contrast formulas rather than seeing rendered pixels. Provide thorough, professional feedback on accessibility, contrast weaknesses, color balance, and recommended token adjustments.
`;
  }

  // Disclaimer check
  let disclaimerText: string | null = null;
  if (routerDecision.isHealth) {
    disclaimerText = 'Medical & Health Notice: For informational and strategic analysis only. Consult qualified healthcare professionals.';
  } else if (routerDecision.isLegalOrFinancial) {
    disclaimerText = 'Legal & Financial Notice: Flawlesz AI provides analytical breakdowns, not certified legal or investment advice.';
  }

  // Construct Layer 3 Prompt based on skill
  const isStartupValidation = routerDecision.skill === 'idea_validation';

  const systemPrompt = `You are Flawlesz AI's Layer 3 Analytical Engine running on tier '${modelTier}'.
You produce rigorous, objective, adversarial evaluations formatted as STRICT JSON.

SKILL TYPE: "${routerDecision.skill}"

OUTPUT FORMAT RULES:
1. Return ONLY a single, valid JSON object with NO preamble, NO markdown backticks, and NO trailing text.
2. For Startup Validation ('idea_validation'):
   - Fill 'similar_products' (name, description, source_url strictly from provided search results or empty if none).
   - Fill 'flaws' (title, explanation, severity: 'high' | 'medium' | 'low').
   - Fill 'refined_versions' (idea, reasoning).
   - Fill 'graveyard' (name, founded_year, closed_year, reported_cause, lesson_for_this_idea, source_urls).
3. For ALL OTHER SKILLS ('visual_theme_audit', 'document_review', 'website_audit', 'comparison', 'general_task'):
   - Fill 'short_answer': A comprehensive, executive-level direct overview answering the user's inquiry thoroughly.
   - Fill 'key_findings': Array of at least 3-5 concrete findings (title, explanation, source_or_quote).
   - Fill 'risks_or_questions': Array of 2-4 items highlighting vulnerabilities, contrast failures, or questions (title, explanation, severity: 'high' | 'medium' | 'low').
   - Fill 'next_steps': Array of 3-5 sequential actionable recommendations (step, detail).
   - Set 'similar_products', 'flaws', 'refined_versions', and 'graveyard' to EMPTY arrays []. Do NOT force graveyard or startup competitors into general/visual tasks!

JSON SCHEMA:
{
  "skill": "${routerDecision.skill}",
  "short_answer": "Direct complete answer / executive overview",
  "key_findings": [
    { "title": "Finding Title", "explanation": "Detailed explanation", "source_or_quote": "Exact reference or metric" }
  ],
  "risks_or_questions": [
    { "title": "Vulnerability or Flag", "explanation": "Detailed explanation", "severity": "high" | "medium" | "low" }
  ],
  "next_steps": [
    { "step": "Action step title", "detail": "Concrete guidance" }
  ],
  "disclaimer": ${disclaimerText ? `"${disclaimerText}"` : 'null'},
  "similar_products": [
    { "name": "Competitor", "description": "Summary", "source_url": "URL from search results" }
  ],
  "flaws": [
    { "title": "Flaw Title", "explanation": "Analytical explanation", "severity": "high" | "medium" | "low" }
  ],
  "refined_versions": [
    { "idea": "Pivoted angle", "reasoning": "Why this fixes the flaw" }
  ],
  "graveyard": [
    { "name": "Startup", "founded_year": 2018, "closed_year": 2021, "reported_cause": "Cause", "lesson_for_this_idea": "Lesson", "source_urls": ["URL"] }
  ]
}`;

  const userPrompt = `USER INPUT:
"${idea}"
Attachment: "${attachmentName || 'None'}"

${searchContext}
${visualAnalysisBlock}

Provide your complete adversarial analysis as strict JSON matching the schema above.`;

  // Helper to execute Layer 3 and retry once on JSON parse error
  async function executeAnalysisWithRetry(retryCount = 1): Promise<ValidationOutput> {
    const res = await callGroqChat({
      tier: modelTier,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      responseFormatJson: true,
      userEmail,
    });

    let raw = res.content.trim();
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    }

    try {
      const parsed = JSON.parse(raw);

      return {
        skill: routerDecision.skill,
        short_answer: parsed.short_answer,
        key_findings: Array.isArray(parsed.key_findings) ? parsed.key_findings : [],
        risks_or_questions: Array.isArray(parsed.risks_or_questions) ? parsed.risks_or_questions : [],
        next_steps: Array.isArray(parsed.next_steps) ? parsed.next_steps : [],
        disclaimer: parsed.disclaimer || disclaimerText,
        computed_palette: computedPaletteData,
        similar_products: Array.isArray(parsed.similar_products) ? parsed.similar_products : [],
        flaws: Array.isArray(parsed.flaws) ? parsed.flaws : [],
        refined_versions: Array.isArray(parsed.refined_versions) ? parsed.refined_versions : [],
        graveyard: Array.isArray(parsed.graveyard) ? parsed.graveyard : [],
      };
    } catch (parseErr: any) {
      if (retryCount > 0) {
        console.warn('[GROQ LAYER 3] JSON parse error, retrying once with error feedback:', parseErr.message);
        const retryRes = await callGroqChat({
          tier: modelTier,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
            { role: 'assistant', content: raw },
            {
              role: 'user',
              content: `Your previous response was not valid JSON (${parseErr.message}). Fix all formatting issues and return ONLY the valid raw JSON object.`,
            },
          ],
          temperature: 0.1,
          responseFormatJson: true,
          userEmail,
        });

        let retryRaw = retryRes.content.trim();
        if (retryRaw.startsWith('```')) {
          retryRaw = retryRaw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
        }
        const retryParsed = JSON.parse(retryRaw);
        return {
          skill: routerDecision.skill,
          short_answer: retryParsed.short_answer,
          key_findings: Array.isArray(retryParsed.key_findings) ? retryParsed.key_findings : [],
          risks_or_questions: Array.isArray(retryParsed.risks_or_questions) ? retryParsed.risks_or_questions : [],
          next_steps: Array.isArray(retryParsed.next_steps) ? retryParsed.next_steps : [],
          disclaimer: retryParsed.disclaimer || disclaimerText,
          computed_palette: computedPaletteData,
          similar_products: Array.isArray(retryParsed.similar_products) ? retryParsed.similar_products : [],
          flaws: Array.isArray(retryParsed.flaws) ? retryParsed.flaws : [],
          refined_versions: Array.isArray(retryParsed.refined_versions) ? retryParsed.refined_versions : [],
          graveyard: Array.isArray(retryParsed.graveyard) ? retryParsed.graveyard : [],
        };
      }
      throw new Error(`Failed to parse AI output into structured format: ${parseErr.message}`);
    }
  }

  return await executeAnalysisWithRetry(1);
}

// ─────────────────────────────────────────────────────────────
// LAYER 4: FOLLOW-UP CHAT (ORBIT: openai/gpt-oss-20b)
// ─────────────────────────────────────────────────────────────
export interface FollowUpChatParams {
  idea: string;
  similar_products?: any[];
  flaws?: any[];
  refined_versions?: any[];
  previousMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userQuery: string;
  urlInspections?: UrlInspectionResult[];
  userEmail?: string;
}

export async function answerFollowUpWithGroq(params: FollowUpChatParams): Promise<string> {
  const followUpSystemPrompt = `You are Flawlesz AI's Follow-up Chat Engine (powered by Orbit / openai/gpt-oss-20b).
Tone: Direct, analytical, objective, professional.
Context of original idea/task: "${params.idea}"
Guidelines:
1. Answer the user's specific follow-up question directly in plain language.
2. Ground responses in verified facts and any inspected live URLs.
3. Be concise and actionable (under 300 words). Avoid fluffy greetings or generic filler.`;

  const messagesPayload: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: followUpSystemPrompt },
  ];

  if (params.urlInspections && params.urlInspections.length > 0) {
    const urlContext = params.urlInspections
      .map((u) => `[Inspected URL: ${u.url} (${u.domain}) - Title: ${u.title || 'N/A'}]\n${u.extractedText || u.error || ''}`)
      .join('\n\n');
    messagesPayload.push({
      role: 'system',
      content: `LIVE URL INSPECTION DATA:\n${urlContext}`,
    });
  }

  if (params.previousMessages && params.previousMessages.length > 0) {
    for (const msg of params.previousMessages.slice(-6)) {
      messagesPayload.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      });
    }
  }

  messagesPayload.push({
    role: 'user',
    content: params.userQuery,
  });

  const res = await callGroqChat({
    tier: 'orbit',
    messages: messagesPayload,
    temperature: 0.3,
    userEmail: params.userEmail,
  });

  return res.content;
}

// ─────────────────────────────────────────────────────────────
// AI TEAMMATES IN MANAGED MODE (CALLS SELECTED GROQ TIER)
// ─────────────────────────────────────────────────────────────
export async function runGroqTeammate(prompt: string, tier: ModelTier = 'orbit', userEmail?: string): Promise<string> {
  const res = await callGroqChat({
    tier,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    userEmail,
  });
  return res.content;
}
