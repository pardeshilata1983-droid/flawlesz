import { ValidationResult, User, SimilarProduct, Flaw, RefinedVersion, HistoryItem, ChatMessage, UsageMetrics, PlanId, ModelId, ShareRecord, SharePayload } from '../types.ts';

const TOKEN_KEY = 'flaw_auth_token';
const USER_KEY = 'flaw_auth_user';

export type AuthChangeListener = (user: User | null, token: string | null) => void;
const authChangeListeners = new Set<AuthChangeListener>();

export function onAuthStateChange(listener: AuthChangeListener): () => void {
  authChangeListeners.add(listener);
  return () => {
    authChangeListeners.delete(listener);
  };
}

export function notifyAuthStateChange(user: User | null, token: string | null): void {
  authChangeListeners.forEach((listener) => {
    try {
      listener(user, token);
    } catch (e) {
      console.error('[AUTH EVENT] Listener invocation error:', e);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('auth:state-change', {
        detail: { user, token }
      })
    );
  }
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (err) {
    console.error('[STORAGE] Error setting stored token:', err);
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch (err) {
    console.error('[STORAGE] Error setting stored user:', err);
  }
}

export function setStoredSession(token: string | null, user: User | null): void {
  setStoredToken(token);
  setStoredUser(user);
  notifyAuthStateChange(user, token);
}

export function clearStoredSession(): void {
  setStoredToken(null);
  setStoredUser(null);
  notifyAuthStateChange(null, null);
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log(`[API CLIENT] Sending ${options.method || 'GET'} to ${url}`);
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}`;
    try {
      const data = await response.json();
      if (data.error) errorMessage = data.error;
    } catch {
      // fallback
    }

    if (response.status === 401) {
      console.warn(`[API CLIENT] Session unauthorized or expired (401) on ${url}: ${errorMessage}. Clearing stored credentials.`);
      clearStoredSession();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired', { detail: { url, errorMessage } }));
      }
    } else {
      console.error(`[API CLIENT] Request failed: ${response.status} - ${errorMessage}`);
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log(`[API CLIENT] Response received for ${url}:`, data);
  return data as T;
}

// Authentication API calls
export async function signup(email: string, password: string): Promise<{ user: User; token: string }> {
  console.log('[AUTH CLIENT] Calling signup API...');
  const res = await apiRequest<{ user: User; token: string }>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setStoredSession(res.token, res.user);
  return res;
}

export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  console.log('[AUTH CLIENT] Calling login API...');
  const res = await apiRequest<{ user: User; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setStoredSession(res.token, res.user);
  return res;
}

export async function loginDemo(): Promise<{ user: User; token: string }> {
  console.log('[AUTH CLIENT] Calling demo login API...');
  const res = await apiRequest<{ user: User; token: string }>('/api/auth/demo', {
    method: 'POST',
  });
  setStoredSession(res.token, res.user);
  return res;
}

export async function loginWithGoogle(payload: {
  email?: string;
  name?: string;
  credential?: string;
  googleId?: string;
}): Promise<{ user: User; token: string; isNewUser: boolean }> {
  console.log('[AUTH CLIENT] Calling Google auth API...', payload.email || 'with credential');
  const res = await apiRequest<{ user: User; token: string; isNewUser: boolean }>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setStoredSession(res.token, res.user);
  return res;
}

export async function loginWithFirebase(payload: {
  email: string;
  firebaseUid: string;
  name?: string;
  idToken?: string;
}): Promise<{ user: User; token: string; isNewUser: boolean }> {
  console.log('[AUTH CLIENT] Calling Firebase auth backend API...', payload.email);
  const res = await apiRequest<{ user: User; token: string; isNewUser: boolean }>('/api/auth/firebase', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setStoredSession(res.token, res.user);
  return res;
}

export async function submitOnboarding(answers: {
  user_type: string;
  referral_source: string;
  project_type: string;
  idea_stage: string;
}): Promise<{ user: User }> {
  console.log('[AUTH CLIENT] Submitting onboarding answers:', answers);
  const res = await apiRequest<{ user: User }>('/api/auth/onboarding', {
    method: 'POST',
    body: JSON.stringify(answers),
  });
  const currentToken = getStoredToken();
  setStoredSession(currentToken, res.user);
  return res;
}

export async function fetchCurrentUser(): Promise<User | null> {
  const token = getStoredToken();
  if (!token) {
    clearStoredSession();
    return null;
  }

  try {
    const res = await apiRequest<{ user: User | null; sessionExpired?: boolean }>('/api/auth/me');
    if (!res.user) {
      console.log('[AUTH CLIENT] Session invalid or expired on server, clearing stored credentials.');
      clearStoredSession();
      return null;
    }
    // Update persisted profile in localStorage with latest fresh data
    setStoredUser(res.user);
    notifyAuthStateChange(res.user, token);
    return res.user;
  } catch (err: any) {
    const errorText = String(err?.message || '').toLowerCase();
    if (errorText.includes('401') || errorText.includes('expired') || errorText.includes('unauthorized')) {
      console.warn('[AUTH CLIENT] Server session expired (401), clearing persistent storage.');
      clearStoredSession();
      return null;
    }
    // Transient network failure or offline state: do NOT wipe session! Preserve cached user from localStorage
    console.warn('[AUTH CLIENT] Non-fatal network error fetching user profile; maintaining cached session:', err);
    return getStoredUser();
  }
}

export async function logout(): Promise<void> {
  console.log('[AUTH CLIENT] Logging out...');
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    // Ignore network error on logout
  }
  clearStoredSession();
}

// Idea Validation API calls
export async function validateIdea(
  idea: string,
  attachmentText?: string,
  attachmentName?: string,
  model?: ModelId
): Promise<ValidationResult> {
  console.log('[API CLIENT] Initiating "Find the Flaws" validation call for idea:', idea.slice(0, 60), 'with model:', model || 'orbit');
  
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/validate-idea', {
    method: 'POST',
    headers,
    body: JSON.stringify({ idea, attachmentText, attachmentName, model }),
  });

  // STEP 1: Log raw AI response to console right when received, BEFORE any parsing/rendering
  const rawText = await response.text();
  console.log('[API CLIENT] Raw AI response received from server BEFORE parsing:');
  console.log(rawText);

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}`;
    try {
      const errObj = JSON.parse(rawText);
      if (errObj.error) errorMessage = errObj.error;
    } catch {
      if (rawText && rawText.length < 200) {
        errorMessage = rawText;
      }
    }

    if (response.status === 401) {
      console.warn(`[API CLIENT] Validation request unauthorized or expired (401): ${errorMessage}. Clearing stored credentials.`);
      setStoredToken(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired', { detail: { url: '/api/validate-idea', errorMessage } }));
      }
    } else {
      console.error(`[API CLIENT] Validation request failed: ${response.status} - ${errorMessage}`);
    }

    throw new Error(errorMessage);
  }

  // STEP 2: Safe JSON extraction & parsing (stripping code fences, extracting JSON bounds)
  let parsedJson: any;
  try {
    let cleanText = rawText.trim();
    
    // Strip markdown code fences if present (e.g. ```json ... ``` or ``` ...)
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    }
    
    // Extract substring between first '{' and last '}'
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    parsedJson = JSON.parse(cleanText);
  } catch (parseErr) {
    console.error('[API CLIENT] JSON parse error on raw AI response:', parseErr);
    console.error('[API CLIENT] Raw unparsed response was:', rawText);
    throw new Error('Something went wrong reading the response, please try again');
  }

  // STEP 3: Check for missing/undefined fields and apply safe fallbacks everywhere
  const safeSimilarProducts: SimilarProduct[] = Array.isArray(parsedJson?.similar_products)
    ? parsedJson.similar_products.map((prod: any) => ({
        name: typeof prod?.name === 'string' && prod.name.trim() ? prod.name.trim() : 'Unnamed Competitor',
        description: typeof prod?.description === 'string' && prod.description.trim() ? prod.description.trim() : 'Existing market solution.',
        source_url: typeof prod?.source_url === 'string' && prod.source_url.trim() ? prod.source_url.trim() : 'https://www.google.com',
      }))
    : [];

  const safeFlaws: Flaw[] = Array.isArray(parsedJson?.flaws)
    ? parsedJson.flaws.map((flaw: any) => {
        const rawSev = typeof flaw?.severity === 'string' ? flaw.severity.toLowerCase().trim() : 'medium';
        const severity: 'high' | 'medium' | 'low' = (rawSev === 'high' || rawSev === 'low' || rawSev === 'medium')
          ? rawSev
          : 'medium';
        return {
          title: typeof flaw?.title === 'string' && flaw.title.trim() ? flaw.title.trim() : 'Identified Risk Factor',
          explanation: typeof flaw?.explanation === 'string' && flaw.explanation.trim() ? flaw.explanation.trim() : 'Detailed structural flaw identified during analysis.',
          severity,
        };
      })
    : [];

  const safeRefinedVersions: RefinedVersion[] = Array.isArray(parsedJson?.refined_versions)
    ? parsedJson.refined_versions.map((ver: any) => ({
        idea: typeof ver?.idea === 'string' && ver.idea.trim() ? ver.idea.trim() : 'Refined implementation strategy.',
        reasoning: typeof ver?.reasoning === 'string' && ver.reasoning.trim() ? ver.reasoning.trim() : 'Mitigates identified competitive and operational roadblocks.',
      }))
    : [];

  const normalizedResult: ValidationResult = {
    id: typeof parsedJson?.id === 'string' ? parsedJson.id : 'val-' + Date.now(),
    idea: typeof parsedJson?.idea === 'string' && parsedJson.idea ? parsedJson.idea : idea,
    similar_products: safeSimilarProducts,
    flaws: safeFlaws,
    refined_versions: safeRefinedVersions,
    createdAt: typeof parsedJson?.createdAt === 'string' ? parsedJson.createdAt : new Date().toISOString(),
    userId: parsedJson?.userId,
    userEmail: parsedJson?.userEmail,
    savedToGallery: Boolean(parsedJson?.savedToGallery),
  };

  console.log('[API CLIENT] Successfully parsed and normalized validation result:', normalizedResult);
  return normalizedResult;
}

// Gallery API calls
export async function fetchGallery(): Promise<ValidationResult[]> {
  console.log('[API CLIENT] Fetching public gallery...');
  const res = await apiRequest<{ items: ValidationResult[] }>('/api/gallery');
  return res.items;
}

export async function saveToGallery(result: ValidationResult): Promise<ValidationResult> {
  console.log('[API CLIENT] Saving analysis result to gallery:', result.id);
  const res = await apiRequest<{ item: ValidationResult }>('/api/gallery', {
    method: 'POST',
    body: JSON.stringify(result),
  });
  return res.item;
}

// History API calls
export async function fetchUserHistory(): Promise<HistoryItem[]> {
  console.log('[API CLIENT] Fetching user conversation history...');
  const res = await apiRequest<{ history: HistoryItem[] }>('/api/history');
  return res.history || [];
}

export async function deleteHistoryItem(id: string): Promise<boolean> {
  console.log('[API CLIENT] Deleting history item:', id);
  const res = await apiRequest<{ success: boolean }>(`/api/history/${id}`, {
    method: 'DELETE',
  });
  return res.success;
}

// ──────────────────────────────────────────────
// Official Idea Sharing API Client
// ──────────────────────────────────────────────

export async function createPublicShare(payload: SharePayload): Promise<{
  success: boolean;
  share: ShareRecord;
  shareUrl: string;
  sharePath: string;
}> {
  console.log('[API CLIENT] Generating official public share link for:', payload.title || payload.idea.slice(0, 30));
  return await apiRequest<{
    success: boolean;
    share: ShareRecord;
    shareUrl: string;
    sharePath: string;
  }>('/api/shares', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchPublicShare(id: string): Promise<{
  success: boolean;
  revoked: boolean;
  share: ShareRecord;
}> {
  console.log('[API CLIENT] Fetching public share record:', id);
  return await apiRequest<{
    success: boolean;
    revoked: boolean;
    share: ShareRecord;
  }>(`/api/shares/${id}`);
}

export async function revokePublicShare(id: string): Promise<boolean> {
  console.log('[API CLIENT] Revoking public share record:', id);
  const res = await apiRequest<{ success: boolean; message: string }>(`/api/shares/${id}/revoke`, {
    method: 'POST',
  });
  return res.success;
}

export async function deletePublicShare(id: string): Promise<boolean> {
  console.log('[API CLIENT] Deleting public share record:', id);
  const res = await apiRequest<{ success: boolean; message: string }>(`/api/shares/${id}`, {
    method: 'DELETE',
  });
  return res.success;
}

export async function sendFollowUpChat(payload: {
  historyId?: string;
  idea: string;
  similar_products: SimilarProduct[];
  flaws: Flaw[];
  refined_versions: RefinedVersion[];
  messages: ChatMessage[];
  newMessage: string;
  mode?: string;
  isPlanToBuild?: boolean;
}): Promise<{
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  messages: ChatMessage[];
  planToBuildSession?: any;
}> {
  console.log('[API CLIENT] Submitting follow-up message to /api/chat/follow-up...');
  const res = await apiRequest<{
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
    messages: ChatMessage[];
  }>('/api/chat/follow-up', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res;
}

export async function fetchSpeechAudio(
  text: string,
  voice: 'Fenrir' | 'Charon' | 'Puck' | 'Zephyr' = 'Fenrir'
): Promise<{ audioBase64: string; mimeType: string; voice: string }> {
  console.log('[API CLIENT] Requesting TTS audio with voice:', voice);
  return await apiRequest<{ audioBase64: string; mimeType: string; voice: string }>('/api/tts', {
    method: 'POST',
    body: JSON.stringify({ text, voice }),
  });
}

// ──────────────────────────────────────────────
// ACCOUNT, PROFILE & BILLING API
// ──────────────────────────────────────────────

export async function updateProfile(data: {
  name?: string;
  user_type?: string;
  referral_source?: string;
  project_type?: string;
  idea_stage?: string;
}): Promise<{ user: User }> {
  console.log('[API CLIENT] Updating user profile:', data);
  const res = await apiRequest<{ user: User }>('/api/user/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  const currentToken = getStoredToken();
  setStoredSession(currentToken, res.user);
  return res;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  console.log('[API CLIENT] Changing user password...');
  return await apiRequest<{ success: boolean; message: string }>('/api/user/password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function deleteAccount(confirmText: string): Promise<{ success: boolean; message: string }> {
  console.log('[API CLIENT] Deleting user account...');
  const res = await apiRequest<{ success: boolean; message: string }>('/api/user/account', {
    method: 'DELETE',
    body: JSON.stringify({ confirmText }),
  });
  clearStoredSession();
  return res;
}

export async function fetchUsageMetrics(): Promise<UsageMetrics> {
  console.log('[API CLIENT] Fetching user usage metrics...');
  const res = await apiRequest<{ usage: UsageMetrics }>('/api/user/usage');
  return res.usage;
}

export async function setBillingWaitlist(waitlisted: boolean): Promise<{ waitlist_plan: boolean; waitlist_plan_at?: string }> {
  console.log('[API CLIENT] Updating billing waitlist preference:', waitlisted);
  return await apiRequest<{ waitlist_plan: boolean; waitlist_plan_at?: string }>('/api/billing/waitlist', {
    method: 'POST',
    body: JSON.stringify({ waitlisted }),
  });
}

export async function updateUserPlan(plan: PlanId): Promise<{ user: User; plan: PlanId; modelAccess: Record<ModelId, any> }> {
  console.log('[API CLIENT] Updating user plan to:', plan);
  const res = await apiRequest<{ user: User; plan: PlanId; modelAccess: Record<ModelId, any> }>('/api/user/plan', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
  const currentToken = getStoredToken();
  setStoredSession(currentToken, res.user);
  return res;
}

export async function fetchBillingPlans(): Promise<{ plans: Record<string, any> }> {
  return await apiRequest<{ plans: Record<string, any> }>('/api/billing/plans');
}

export async function createBillingSubscription(plan: 'pro' | 'ultra'): Promise<{
  subscription_id?: string;
  order_id?: string;
  key_id: string;
  plan: string;
  amount?: number;
  currency?: string;
  payment_type?: 'subscription' | 'order';
  is_sandbox?: boolean;
}> {
  console.log('[API CLIENT] Initializing Razorpay payment session for:', plan);
  return await apiRequest<{
    subscription_id?: string;
    order_id?: string;
    key_id: string;
    plan: string;
    amount?: number;
    currency?: string;
    payment_type?: 'subscription' | 'order';
    is_sandbox?: boolean;
  }>('/api/billing/create-subscription', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
}

export async function verifyBillingPayment(
  paymentId: string,
  subscriptionId: string,
  signature: string,
  orderId?: string
): Promise<{ success: boolean; message: string; user?: any; plan?: string }> {
  console.log('[API CLIENT] Verifying payment callback signature...');
  return await apiRequest<{ success: boolean; message: string; user?: any; plan?: string }>('/api/billing/verify', {
    method: 'POST',
    body: JSON.stringify({
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subscriptionId || undefined,
      razorpay_order_id: orderId || undefined,
      razorpay_signature: signature,
    }),
  });
}

export async function fetchBillingStatus(): Promise<{ user: User; payments: any[] }> {
  return await apiRequest<{ user: User; payments: any[] }>('/api/billing/status');
}

export async function fetchBillingHistory(): Promise<{ payments: any[] }> {
  return await apiRequest<{ payments: any[] }>('/api/billing/history');
}

export async function cancelSubscription(): Promise<{ success: boolean; message: string }> {
  console.log('[API CLIENT] Requesting subscription cancellation...');
  return await apiRequest<{ success: boolean; message: string }>('/api/billing/cancel-subscription', {
    method: 'POST',
  });
}

export async function fetchAdminRevenue(range: string = '30d'): Promise<any> {
  return await apiRequest<any>(`/api/admin/revenue?range=${range}`);
}

export async function triggerReconciliation(): Promise<any> {
  return await apiRequest<any>('/api/admin/reconcile', {
    method: 'POST',
  });
}

// ──────────────────────────────────────────────
// ELEVENLABS AI AGENT VOICES & SOUND API
// ──────────────────────────────────────────────

export interface AgentVoiceProfileInfo {
  name: string;
  role: string;
  voiceId: string;
  voiceName: string;
  gender: 'male' | 'female';
  accent: string;
  description: string;
  previewSampleText: string;
}

export async function fetchElevenLabsVoices(): Promise<{
  configured: boolean;
  hasUserKey: boolean;
  hasServerKey: boolean;
  voices: Record<string, AgentVoiceProfileInfo>;
}> {
  return await apiRequest<{
    configured: boolean;
    hasUserKey: boolean;
    hasServerKey: boolean;
    voices: Record<string, AgentVoiceProfileInfo>;
  }>('/api/elevenlabs/voices');
}

export async function fetchAgentVoiceSample(agentName: string): Promise<{
  configured: boolean;
  audioBase64: string | null;
  agentName: string;
  role: string;
  voiceName: string;
  sampleText: string;
  accent: string;
  gender: string;
  error?: string;
}> {
  return await apiRequest<{
    configured: boolean;
    audioBase64: string | null;
    agentName: string;
    role: string;
    voiceName: string;
    sampleText: string;
    accent: string;
    gender: string;
    error?: string;
  }>(`/api/elevenlabs/sample/${encodeURIComponent(agentName)}`);
}

export async function generateElevenLabsSpeech(payload: {
  text: string;
  agentName?: string;
  agentRole?: string;
  voiceId?: string;
}): Promise<{
  audioBase64: string;
  mimeType: string;
  voiceId: string;
  agentName: string;
  source: 'elevenlabs';
}> {
  return await apiRequest<{
    audioBase64: string;
    mimeType: string;
    voiceId: string;
    agentName: string;
    source: 'elevenlabs';
  }>('/api/elevenlabs/tts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function testElevenLabsKey(apiKey?: string): Promise<{
  success: boolean;
  userInfo?: {
    subscriptionTier: string;
    characterCount: number;
    characterLimit: number;
  };
  error?: string;
}> {
  return await apiRequest<{
    success: boolean;
    userInfo?: {
      subscriptionTier: string;
      characterCount: number;
      characterLimit: number;
    };
    error?: string;
  }>('/api/elevenlabs/test', {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
  });
}

// ──────────────────────────────────────────────
// PERSONAL ACCESS TOKENS (MCP & EXTERNAL TOOLS)
// ──────────────────────────────────────────────

export interface UserApiToken {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
}

export interface AdminApiToken extends UserApiToken {
  userId: string;
  userEmail?: string;
}

export async function fetchUserTokens(): Promise<UserApiToken[]> {
  const res = await apiRequest<{ tokens: UserApiToken[] }>('/api/user/tokens');
  return res.tokens || [];
}

export async function createUserToken(name: string): Promise<{ token: string; tokenRecord: UserApiToken }> {
  return await apiRequest<{ token: string; tokenRecord: UserApiToken }>('/api/user/tokens', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function revokeUserToken(id: string): Promise<{ success: boolean; message?: string }> {
  return await apiRequest<{ success: boolean; message?: string }>(`/api/user/tokens/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchAdminTokens(): Promise<AdminApiToken[]> {
  const res = await apiRequest<{ tokens: AdminApiToken[] }>('/api/admin/tokens');
  return res.tokens || [];
}

export async function adminRevokeToken(id: string): Promise<{ success: boolean; message?: string }> {
  return await apiRequest<{ success: boolean; message?: string }>(`/api/admin/tokens/${id}`, {
    method: 'DELETE',
  });
}




