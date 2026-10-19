import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  createUser,
  authenticateUser,
  getOrCreateDemoUser,
  findOrCreateGoogleUser,
  findOrCreateFirebaseUser,
  getUserByToken,
  updateUserOnboarding,
  removeSession,
  readGallery,
  writeGallery,
  type GalleryRecord,
  getUserHistory,
  createConversationRecord,
  saveUserHistory,
  updateHistoryMessages,
  updateGalleryMessages,
  deleteUserHistory,
  type HistoryRecord,
  updateUserProfile,
  changeUserPassword,
  deleteUserAccount,
  getUserUsageMetrics,
  updateBillingWaitlist,
  recordUrlInspection,
  savePushSubscription,
  removePushSubscription,
  getUserPushSubscriptions,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  getUserById,
  checkModelEntitlement,
  recordModelUsage,
  updateUserPlan,
  logActivityEvent,
  logAudit,
  getAllUsersForAdmin,
  getUserDetailForAdmin,
  setAdminUserBanStatus,
  grantAdminEnterpriseAccess,
  getAdminStats,
  getEventsList,
  getAuditLogsList,
  recordPayment,
  getUserPayments,
  getAllPayments,
  isEventProcessed,
  markEventProcessed,
  updateUserSubscription,
  getAdminRevenueStats,
  toPublicUser,
  saveTeammateKey,
  removeTeammateKey,
  getTeammateMaskedKeys,
  getDecryptedTeammateKey,
  saveTeammatePreset,
  deleteTeammatePreset,
  saveTeammateSession,
  recordTeammatesRun,
  checkTeammatesLimit,
  logTeammateUsage,
  readUsers,
  getUserVibeProjects,
  saveUserVibeProject,
  deleteUserVibeProject,
  initDatabaseState,
  recordContactInquiry,
  recordTeammateWaitlist,
  createOrUpdateShareRecord,
  getShareRecordById,
  revokeShareRecord,
  deleteShareRecord,
  createApiToken,
  listApiTokens,
  revokeApiToken,
  adminRevokeApiToken,
  getAllApiTokensForAdmin,
  verifyApiToken
} from './server/db.ts';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createFlawleszMcpServer, recordFailedAuth, isIpBlocked, checkTokenRateLimit } from './server/mcp.ts';
import {
  RAZORPAY_KEY_ID,
  createRazorpaySubscription,
  createRazorpayOrder,
  createRazorpayPaymentSession,
  verifySubscriptionPaymentSignature,
  verifyOrderPaymentSignature,
  verifyWebhookSignature,
  cancelRazorpaySubscription,
  fetchRazorpaySubscription,
  getRazorpayDiagnostics
} from './server/razorpay.ts';
import {
  validateIdeaWithGroq,
  answerFollowUpWithGroq,
  callGroqChat,
  getGroqUsageLogs,
  GROQ_CONFIG,
  type ModelTier,
} from './server/groq.ts';
import { parseDocumentBuffer } from './server/fileParser.ts';
import { PLANS, type PlanId, type ModelId } from './src/config/plans.ts';
import { extractUrlsFromText, inspectLiveUrl, getDomainFromUrl } from './server/urlInspector.ts';
import { getVapidPublicKey, sendPushNotificationToUser, type FlawNotificationType } from './server/webPushService.ts';
import { testProviderApiKey, callProviderModel } from './server/teammates.ts';
import {
  AGENT_VOICE_PROFILES,
  getElevenLabsApiKey,
  generateSpeechWithElevenLabs,
  testElevenLabsApiKey,
  getAgentSampleSpeech
} from './server/elevenlabs.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({
  limit: '25mb',
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf;
  }
}));

// Explicitly serve Service Worker with unhindered root scope and no-cache headers
app.get('/sw.js', (_req, res) => {
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(process.cwd(), 'public', 'sw.js'));
});

// Request logging middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[HTTP] ${req.method} ${req.path}`);
  }
  next();
});

// Health check endpoints
app.get(['/api/health', '/health'], (_req, res) => {
  res.json({ status: 'ok', service: 'Flawlesz AI', time: new Date().toISOString() });
});

// Helper auth middleware (strictly requires authenticated session)
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  const token = authHeader.substring(7);
  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
  if (user.banned) {
    return res.status(403).json({ error: `Your account has been banned. Reason: ${user.bannedReason || 'Violation of terms'}` });
  }
  (req as any).user = user;
  (req as any).token = token;
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(404).json({ error: 'Not Found' });
  }
  const token = authHeader.substring(7);
  const user = getUserByToken(token);
  if (!user || user.role !== 'admin' || user.banned) {
    return res.status(404).json({ error: 'Not Found' });
  }
  (req as any).user = user;
  (req as any).token = token;
  next();
}

// Optional auth middleware (falls back to guest/demo account so unauthenticated visitors can validate and explore freely)
function optionalAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = getUserByToken(token);
    if (user) {
      (req as any).user = user;
      (req as any).token = token;
      return next();
    }
  }
  // Assign demo/guest user so guests are never blocked or redirected
  const demo = getOrCreateDemoUser();
  (req as any).user = demo.user;
  (req as any).token = demo.token;
  next();
}

// ──────────────────────────────────────────────
// SPAM PROTECTION & RATE LIMITING
// ──────────────────────────────────────────────

interface RateLimitBucket {
  timestamps: number[];
}
const ipRateLimits = new Map<string, RateLimitBucket>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = ipRateLimits.get(key) || { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter(t => now - t < windowMs);
  if (bucket.timestamps.length >= maxRequests) {
    ipRateLimits.set(key, bucket);
    return false;
  }
  bucket.timestamps.push(now);
  ipRateLimits.set(key, bucket);
  return true;
}

function isBotHoneypotTriggered(body: any): boolean {
  if (!body || typeof body !== 'object') return false;
  const honeypots = ['company_website', 'fax_number', 'hp_check', 'website_url', '_hp_token'];
  for (const hp of honeypots) {
    if (body[hp] !== undefined && body[hp] !== null && String(body[hp]).trim().length > 0) {
      return true;
    }
  }
  return false;
}

// ──────────────────────────────────────────────
// REMOTE MCP SERVER & PERSONAL ACCESS TOKENS
// ──────────────────────────────────────────────

app.all('/mcp', async (req, res) => {
  // 1. Enforce HTTPS only in production (allow localhost in dev/testing)
  const proto = req.headers['x-forwarded-proto'] as string;
  const host = req.headers.host || '';
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  if (process.env.NODE_ENV === 'production' && proto && proto !== 'https' && !isLocalhost) {
    return res.status(403).send('HTTPS required');
  }

  // 2. Validate Origin header if present (CORS & Browser isolation)
  const origin = req.headers.origin as string;
  if (origin) {
    let isAllowedOrigin = false;
    try {
      const parsedOrigin = new URL(origin);
      if (
        parsedOrigin.host === host ||
        host.includes(parsedOrigin.host) ||
        parsedOrigin.hostname === 'localhost' ||
        parsedOrigin.hostname === '127.0.0.1' ||
        parsedOrigin.hostname.endsWith('.run.app')
      ) {
        isAllowedOrigin = true;
      }
    } catch {
      isAllowedOrigin = false;
    }

    if (!isAllowedOrigin) {
      console.warn(`[MCP] Rejected unauthorized browser origin: ${origin}`);
      return res.status(403).send('Forbidden: Unknown browser origin');
    }

    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, mcp-session-id');
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // 3. Rate limit failed auth attempts by IP
  const clientIp = ((req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown').trim();
  if (isIpBlocked(clientIp)) {
    return res.status(429).end();
  }

  // 4. Token verification (Authorization: Bearer <token>)
  // Reject missing, wrong, or revoked tokens and banned users with 401 and NO detail
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    recordFailedAuth(clientIp);
    return res.status(401).end();
  }

  const bearerToken = authHeader.substring(7).trim();
  const authResult = await verifyApiToken(bearerToken);
  if (!authResult.valid || !authResult.user) {
    recordFailedAuth(clientIp);
    return res.status(401).end();
  }

  // 5. Rate limit: 30 calls per minute per token
  if (!checkTokenRateLimit(authResult.tokenId!)) {
    return res.status(429).send('Too Many Requests: Token rate limit of 30 calls per minute exceeded.');
  }

  // 6. Stateless McpServer instance & Streamable HTTP transport per request
  try {
    const mcpServer = createFlawleszMcpServer(authResult.user, authResult.tokenId!, host);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode!
    });

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err: any) {
    console.error('[MCP] Transport execution error:', err);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
});

// REST Endpoints for Personal Access Token Management

// Create a new token for the user
app.post('/api/user/tokens', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { name } = req.body;
    const { token, record } = await createApiToken(user.id, name || 'Personal Token');
    return res.json({
      token,
      tokenRecord: {
        id: record.id,
        name: record.name,
        prefix: record.prefix,
        createdAt: record.createdAt,
        lastUsedAt: record.lastUsedAt,
        revokedAt: record.revokedAt,
      }
    });
  } catch (err: any) {
    console.error('[TOKENS] Create token error:', err);
    return res.status(400).json({ error: err.message || 'Failed to create token.' });
  }
});

// List tokens for authenticated user
app.get('/api/user/tokens', requireAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const tokens = listApiTokens(user.id).map(t => ({
      id: t.id,
      name: t.name,
      prefix: t.prefix,
      createdAt: t.createdAt,
      lastUsedAt: t.lastUsedAt,
      revokedAt: t.revokedAt,
    }));
    return res.json({ tokens });
  } catch (err: any) {
    console.error('[TOKENS] List tokens error:', err);
    return res.status(500).json({ error: 'Failed to list tokens.' });
  }
});

// Revoke a token
app.delete('/api/user/tokens/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const tokenId = req.params.id;
    const success = await revokeApiToken(user.id, tokenId);
    if (!success) {
      return res.status(404).json({ error: 'Token not found or already revoked.' });
    }
    return res.json({ success: true, message: 'Token successfully revoked.' });
  } catch (err: any) {
    console.error('[TOKENS] Revoke token error:', err);
    return res.status(500).json({ error: 'Failed to revoke token.' });
  }
});

// Admin: List all tokens across all users
app.get('/api/admin/tokens', requireAdmin, (_req, res) => {
  try {
    const tokens = getAllApiTokensForAdmin().map(t => ({
      id: t.id,
      userId: t.userId,
      userEmail: t.userEmail,
      name: t.name,
      prefix: t.prefix,
      createdAt: t.createdAt,
      lastUsedAt: t.lastUsedAt,
      revokedAt: t.revokedAt,
    }));
    return res.json({ tokens });
  } catch (err: any) {
    console.error('[ADMIN TOKENS] Error listing tokens:', err);
    return res.status(500).json({ error: 'Failed to retrieve admin tokens.' });
  }
});

// Admin: Revoke any user token
app.delete('/api/admin/tokens/:id', requireAdmin, async (req, res) => {
  try {
    const tokenId = req.params.id;
    const success = await adminRevokeApiToken(tokenId);
    if (!success) {
      return res.status(404).json({ error: 'Token not found.' });
    }
    return res.json({ success: true, message: 'Token revoked by administrator.' });
  } catch (err: any) {
    console.error('[ADMIN TOKENS] Error revoking token:', err);
    return res.status(500).json({ error: 'Failed to revoke token.' });
  }
});

// ──────────────────────────────────────────────
// CONTACT & SUPPORT INQUIRIES API
// ──────────────────────────────────────────────

app.post('/api/contact', async (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  
  // 1. Server-side Rate Limiting (5 requests per 15 minutes per IP)
  const isAllowed = checkRateLimit(`contact:${clientIp}`, 5, 15 * 60 * 1000);
  if (!isAllowed) {
    return res.status(429).json({
      error: 'Too many submissions. Please wait 15 minutes before submitting another inquiry.'
    });
  }

  // 2. Hidden Honeypot Check (automated bot trap)
  if (isBotHoneypotTriggered(req.body)) {
    console.warn(`[SPAM BLOCKED] Honeypot triggered on contact form from IP ${clientIp}`);
    // Return fake success to deceive spambots without processing
    return res.status(200).json({ success: true, message: 'Your message has been received.' });
  }

  const { name, email, category, message } = req.body;

  // 3. Strict Server-Side Validation
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    return res.status(400).json({ error: 'Please enter your name (2–100 characters).' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const allowedCategories = ['billing', 'technical', 'tiers', 'privacy', 'general'];
  const sanitizedCategory = allowedCategories.includes(category) ? category : 'general';

  if (!message || typeof message !== 'string' || message.trim().length < 10) {
    return res.status(400).json({ error: 'Message must be at least 10 characters long.' });
  }
  if (message.trim().length > 5000) {
    return res.status(400).json({ error: 'Message must not exceed 5,000 characters.' });
  }

  try {
    const newInquiry = {
      id: `inquiry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      category: sanitizedCategory,
      message: message.trim(),
      clientIp,
      createdAt: new Date().toISOString()
    };

    await recordContactInquiry(newInquiry);

    console.log(`[CONTACT] Logged inquiry in PostgreSQL from ${newInquiry.email} (${newInquiry.category})`);
    return res.status(200).json({
      success: true,
      message: 'Thank you for reaching out! Your inquiry has been confirmed and logged.'
    });
  } catch (err: any) {
    console.error('[CONTACT] Failed to store inquiry:', err);
    return res.status(500).json({ error: 'Failed to process inquiry. Please try again later.' });
  }
});

// ──────────────────────────────────────────────
// AUTH API
// ──────────────────────────────────────────────

app.post('/api/auth/signup', (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    
    // Server-side rate limiting on registration (10 requests per 15 minutes)
    if (!checkRateLimit(`auth:${clientIp}`, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'Too many registration requests. Please wait a few minutes.' });
    }

    // Honeypot check
    if (isBotHoneypotTriggered(req.body)) {
      console.warn(`[SPAM BLOCKED] Honeypot triggered on signup form from IP ${clientIp}`);
      return res.status(400).json({ error: 'Spam detected.' });
    }

    const { email, password } = req.body;
    console.log('[AUTH] Signup attempt for email:', email);

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const { user, token } = createUser(email, password);
    logActivityEvent(user.id, user.email, 'signup');
    console.log('[AUTH] User successfully registered:', user.email);
    return res.status(201).json({ user, token });
  } catch (err: any) {
    console.error('[AUTH] Signup error:', err.message);
    const statusCode = err.message.includes('already exists') ? 409 : 400;
    return res.status(statusCode).json({ error: err.message || 'Signup failed.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[AUTH] Login attempt for email:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { user, token } = authenticateUser(email, password);
    logActivityEvent(user.id, user.email, 'login');
    console.log('[AUTH] User successfully logged in:', user.email);
    return res.status(200).json({ user, token });
  } catch (err: any) {
    console.warn('[AUTH] Login unsuccessful:', err.message);
    return res.status(401).json({ error: err.message || 'Invalid email or password.' });
  }
});

app.post('/api/auth/demo', (_req, res) => {
  try {
    console.log('[AUTH] Demo login requested');
    const { user, token } = getOrCreateDemoUser();
    console.log('[AUTH] Demo session issued for:', user.email);
    return res.status(200).json({ user, token });
  } catch (err: any) {
    console.error('[AUTH] Demo login error:', err);
    return res.status(500).json({ error: 'Failed to create demo session.' });
  }
});

app.post('/api/auth/google', (req, res) => {
  try {
    let email = req.body.email;
    let name = req.body.name;
    let googleId = req.body.googleId || req.body.sub;
    const credential = req.body.credential;

    // Decode Google Identity Services (GIS) ID Token if provided
    if (credential && typeof credential === 'string') {
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
          const payload = JSON.parse(payloadJson);
          if (payload.email) {
            email = payload.email;
            name = name || payload.name || payload.given_name;
            googleId = googleId || payload.sub;
          }
        }
      } catch (decodeErr) {
        console.warn('[AUTH] Error decoding Google JWT credential:', decodeErr);
      }
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid Google account email is required.' });
    }

    console.log('[AUTH] Google OAuth sign-in/up request for email:', email);
    const { user, token, isNewUser } = findOrCreateGoogleUser(email, name, googleId);
    console.log(`[AUTH] Google authentication successful (${isNewUser ? 'New account created' : 'Existing account linked'}):`, user.email);

    return res.status(200).json({ user, token, isNewUser });
  } catch (err: any) {
    console.error('[AUTH] Google OAuth error:', err);
    return res.status(500).json({ error: err.message || 'Google authentication failed.' });
  }
});

// Firebase Authentication Endpoint
app.post('/api/auth/firebase', (req, res) => {
  try {
    let { email, name, firebaseUid, idToken } = req.body;

    // Decode ID token if provided
    if (idToken && typeof idToken === 'string' && idToken.includes('.')) {
      try {
        const parts = idToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          email = email || payload.email;
          name = name || payload.name;
          firebaseUid = firebaseUid || payload.sub || payload.user_id;
        }
      } catch (err) {
        console.warn('[AUTH] Error parsing Firebase ID token payload:', err);
      }
    }

    if (!email || !firebaseUid) {
      return res.status(400).json({ error: 'Valid email and Firebase UID are required.' });
    }

    console.log('[AUTH] Firebase auth sign-in for email:', email, 'uid:', firebaseUid);
    const { user, token, isNewUser } = findOrCreateFirebaseUser(email, firebaseUid, name);
    return res.status(200).json({ user, token, isNewUser });
  } catch (err: any) {
    console.error('[AUTH] Firebase auth route error:', err);
    return res.status(500).json({ error: err.message || 'Firebase authentication failed.' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ user: null });
  }
  const token = authHeader.substring(7);
  const user = getUserByToken(token);
  if (!user) {
    return res.json({ user: null, sessionExpired: true });
  }
  return res.json({ user });
});

app.post('/api/auth/onboarding', requireAuth, (req, res) => {
  try {
    const authUser = (req as any).user;
    const { user_type, referral_source, project_type, idea_stage } = req.body;
    console.log('[AUTH] Saving onboarding responses for user:', authUser.email, {
      user_type,
      referral_source,
      project_type,
      idea_stage
    });

    const updatedUser = updateUserOnboarding(authUser.id, {
      user_type,
      referral_source,
      project_type,
      idea_stage
    });

    console.log('[AUTH] Onboarding saved successfully for:', updatedUser.email);
    return res.json({ user: updatedUser });
  } catch (err: any) {
    console.error('[AUTH] Onboarding save error:', err);
    return res.status(500).json({ error: err.message || 'Failed to save onboarding responses.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    removeSession(token);
  }
  return res.json({ ok: true });
});

// ──────────────────────────────────────────────
// ACCOUNT & PROFILE MANAGEMENT API
// ──────────────────────────────────────────────

app.patch('/api/user/profile', requireAuth, (req, res) => {
  try {
    const authUser = (req as any).user;
    const { name, user_type, referral_source, project_type, idea_stage } = req.body;
    console.log('[USER] Updating profile for:', authUser.email);

    const updatedUser = updateUserProfile(authUser.id, {
      name,
      user_type,
      referral_source,
      project_type,
      idea_stage
    });

    return res.json({ user: updatedUser });
  } catch (err: any) {
    console.error('[USER] Profile update error:', err);
    return res.status(400).json({ error: err.message || 'Failed to update profile.' });
  }
});

app.post('/api/user/password', requireAuth, (req, res) => {
  try {
    const authUser = (req as any).user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required.' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    changeUserPassword(authUser.id, currentPassword, newPassword);
    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    console.error('[USER] Password change error:', err.message);
    return res.status(400).json({ error: err.message || 'Failed to update password.' });
  }
});

app.delete('/api/user/account', requireAuth, (req, res) => {
  try {
    const authUser = (req as any).user;
    const { confirmText } = req.body;

    if (confirmText !== 'DELETE') {
      return res.status(400).json({ error: 'Confirmation failed. Please type DELETE exactly to confirm.' });
    }

    deleteUserAccount(authUser.id);
    return res.json({ success: true, message: 'Your account and all associated data have been permanently deleted.' });
  } catch (err: any) {
    console.error('[USER] Account deletion error:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete account.' });
  }
});

// ──────────────────────────────────────────────
// USAGE METRICS API
// ──────────────────────────────────────────────

app.get('/api/user/usage', requireAuth, (req, res) => {
  try {
    const authUser = (req as any).user;
    const usage = getUserUsageMetrics(authUser.id);
    const recentGroqCalls = getGroqUsageLogs().filter(
      (l) => !l.userEmail || l.userEmail.toLowerCase() === authUser.email?.toLowerCase()
    ).slice(0, 20);
    return res.json({ usage, recentGroqCalls });
  } catch (err: any) {
    console.error('[USER] Usage fetch error:', err);
    return res.status(500).json({ error: 'Failed to calculate usage metrics.' });
  }
});

// ──────────────────────────────────────────────
// BILLING WAITLIST API
// ──────────────────────────────────────────────

app.post('/api/billing/waitlist', requireAuth, (req, res) => {
  try {
    const authUser = (req as any).user;
    const { waitlisted } = req.body;
    const result = updateBillingWaitlist(authUser.id, Boolean(waitlisted));
    return res.json(result);
  } catch (err: any) {
    console.error('[BILLING] Waitlist error:', err);
    return res.status(500).json({ error: 'Failed to update waitlist preference.' });
  }
});

// ──────────────────────────────────────────────
// BILLING PLANS CONFIG & USER PLAN API
// ──────────────────────────────────────────────

app.get('/api/billing/plans', (_req, res) => {
  return res.json({ plans: PLANS });
});

// Update user plan (e.g. self-serve upgrade/downgrade, or admin flag for enterprise)
app.post('/api/user/plan', optionalAuth, (req, res) => {
  try {
    const authUser = (req as any).user;
    const { plan } = req.body;

    if (!plan || !['free', 'pro', 'ultra', 'enterprise'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Allowed: free, pro, ultra, enterprise.' });
    }

    const updatedUser = updateUserPlan(authUser.id, plan as PlanId);
    console.log(`[PLAN] Successfully set plan '${plan}' for user ${authUser.email}`);
    return res.json({ user: updatedUser, plan: updatedUser.plan, modelAccess: updatedUser.modelAccess });
  } catch (err: any) {
    console.error('[PLAN] Error updating user plan:', err);
    return res.status(500).json({ error: err.message || 'Failed to update user plan.' });
  }
});

// Razorpay Webhook Handler
// Updates user plan automatically on upgrade, downgrade, cancellation, or failed payment
app.post('/api/billing/webhook', (req, res) => {
  try {
    const event = req.body?.event;
    const payload = req.body?.payload;
    console.log(`[RAZORPAY WEBHOOK] Received event: ${event}`);

    // Extract user email or user_id from payment / subscription metadata / notes
    const payment = payload?.payment?.entity;
    const subscription = payload?.subscription?.entity;
    const notes = payment?.notes || subscription?.notes || {};
    const email = notes.user_email || payment?.email || subscription?.customer_notify_email;
    const targetUserId = notes.user_id;

    if (email || targetUserId) {
      const users = getUserById(targetUserId || '') ? [getUserById(targetUserId || '')!] : [];
      const user = users[0];

      if (user) {
        if (event === 'subscription.activated' || event === 'subscription.authenticated' || event === 'payment.captured' || event === 'order.paid') {
          const targetPlan: PlanId = (notes.plan === 'ultra' ? 'ultra' : 'pro');
          updateUserPlan(user.id, targetPlan);
          console.log(`[RAZORPAY WEBHOOK] Upgraded user ${user.email} to ${targetPlan}`);
        } else if (event === 'subscription.cancelled' || event === 'subscription.halted' || event === 'subscription.paused') {
          updateUserPlan(user.id, 'free');
          console.log(`[RAZORPAY WEBHOOK] Downgraded user ${user.email} to free tier due to subscription status`);
        } else if (event === 'payment.failed') {
          console.warn(`[RAZORPAY WEBHOOK] Payment failed for user ${user.email}. Retaining grace status or notifying user.`);
        }
      }
    }

    return res.json({ status: 'ok', received: true });
  } catch (err: any) {
    console.error('[RAZORPAY WEBHOOK] Webhook processing error:', err);
    return res.status(500).json({ error: 'Webhook handler error' });
  }
});

// ──────────────────────────────────────────────
// FILE UPLOAD / DOCUMENT PARSING API
// ──────────────────────────────────────────────

app.post('/api/parse-document', optionalAuth, async (req, res) => {
  try {
    const { name, type, base64 } = req.body;
    if (!base64 || typeof base64 !== 'string') {
      return res.status(400).json({ error: 'File content base64 is required.' });
    }

    const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const parsed = await parseDocumentBuffer(name || 'document', type || 'application/octet-stream', buffer);

    return res.json(parsed);
  } catch (err: any) {
    console.error('[PARSER] Error parsing document:', err);
    return res.status(500).json({ error: err.message || 'Failed to extract text from document.' });
  }
});

// ──────────────────────────────────────────────
// IDEA VALIDATION API
// ──────────────────────────────────────────────

app.post('/api/validate-idea', optionalAuth, async (req, res) => {
  const user = (req as any).user;
  const { idea, attachmentText, attachmentName, model } = req.body;

  let combinedIdea = (idea || '').trim();
  if (attachmentText && attachmentText.trim()) {
    const docLabel = attachmentName ? `[Attached Document: ${attachmentName}]` : '[Attached Document Context]';
    if (combinedIdea) {
      combinedIdea = `${combinedIdea}\n\n${docLabel}\n${attachmentText.trim()}`;
    } else {
      combinedIdea = `${docLabel}\n${attachmentText.trim()}`;
    }
  }

  // Model extraction & normalization
  const requestedModel: ModelId = (model === 'pulsar' || model === 'quasar') ? model : 'orbit';

  console.log(`[VALIDATE] User ${user.email} submitted idea with model '${requestedModel}' (length: ${combinedIdea ? combinedIdea.length : 0})`);

  if (!combinedIdea || combinedIdea.trim().length < 10) {
    return res.status(400).json({
      error: 'Please describe your idea or upload a pitch deck/notes with at least 10 characters so the model has enough substance to evaluate.'
    });
  }

  // Server-side check for user and model entitlement (cannot be bypassed by client)
  const freshUser = getUserById(user.id);
  if (freshUser) {
    const isOwner = Boolean(
      freshUser.email && freshUser.email.trim().toLowerCase() === 'pardeshilata1983@gmail.com'
    ) || freshUser.role === 'admin' || Boolean((freshUser as any).isOwner);

    // Monthly check quota enforcement: 25 for Free, 50 for Pro, 100 for Ultra.
    // Strictly bypassed for the owner (owner never sees quota messages).
    if (!isOwner) {
      const userUsage = getUserUsageMetrics(user.id);
      if (userUsage.checksRemainingThisMonth <= 0) {
        const planName = freshUser.plan === 'pro' ? 'Pro' : freshUser.plan === 'ultra' ? 'Ultra' : 'Free';
        const limit = userUsage.monthlyLimit;
        const upgradeMsg = freshUser.plan === 'free'
          ? 'Upgrade to Pro (50 checks/month) or Ultra (100 checks/month) to run additional validations, or wait for next month\'s reset.'
          : freshUser.plan === 'pro'
          ? 'Upgrade to Ultra (100 checks/month) to run additional validations, or wait for your next billing cycle.'
          : 'Please wait for your monthly quota reset or contact support for dedicated capacity.';

        console.warn(`[VALIDATE] Blocked ${freshUser.email}: monthly limit reached (${userUsage.thisMonthChecks}/${limit} on ${planName})`);
        return res.status(429).json({
          error: `Monthly quota reached: You have used all ${limit} checks available on the ${planName} plan this month. ${upgradeMsg}`,
          code: 'MONTHLY_QUOTA_REACHED',
          monthlyLimit: limit,
          usedThisMonth: userUsage.thisMonthChecks,
          plan: freshUser.plan || 'free',
        });
      }
    }

    const entitlement = checkModelEntitlement(freshUser, requestedModel);
    if (!entitlement.allowed) {
      console.warn(`[VALIDATE] Blocked model '${requestedModel}' for ${user.email}: ${entitlement.reason}`);
      return res.status(entitlement.statusCode || 403).json({
        error: entitlement.reason,
        code: entitlement.code || 'MODEL_LOCKED',
        model: requestedModel,
      });
    }
  }

  try {
    const tier: ModelTier = requestedModel === 'quasar' ? 'quasar' : requestedModel === 'pulsar' ? 'pulsar' : 'orbit';
    const validation = await validateIdeaWithGroq(combinedIdea.trim(), attachmentName, tier, user.email);
    const displayIdea = idea?.trim() || (attachmentName ? `Analysis of ${attachmentName}` : combinedIdea.slice(0, 120));
    const safeSimilar = Array.isArray(validation?.similar_products) ? validation.similar_products : [];
    const safeFlaws = Array.isArray(validation?.flaws) ? validation.flaws : [];
    const safeRefinements = Array.isArray(validation?.refined_versions) ? validation.refined_versions : [];
    const safeGraveyard = Array.isArray(validation?.graveyard) ? validation.graveyard : [];

    // Increment and record model usage on the server immediately
    const updatedUser = recordModelUsage(user.id, requestedModel);

    const validationId = 'conv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    const result = {
      id: validationId,
      idea: displayIdea,
      skill: validation.skill || 'general_task',
      model: requestedModel,
      short_answer: validation.short_answer,
      key_findings: validation.key_findings || [],
      risks_or_questions: validation.risks_or_questions || [],
      next_steps: validation.next_steps || [],
      disclaimer: validation.disclaimer || null,
      similar_products: safeSimilar,
      flaws: safeFlaws,
      refined_versions: safeRefinements,
      graveyard: safeGraveyard,
      messages: [],
      createdAt: new Date().toISOString(),
      userId: user.id,
      userEmail: user.email,
      modelAccess: updatedUser.modelAccess,
      user: updatedUser,
    };

    // Automatically persist to user's conversation history in the database (pure INSERT, private by default: raw files discarded)
    try {
      const savedHist = createConversationRecord({
        id: validationId,
        userId: user.id,
        userEmail: user.email,
        idea: result.idea,
        result: {
          skill: result.skill,
          short_answer: result.short_answer,
          key_findings: result.key_findings,
          risks_or_questions: result.risks_or_questions,
          next_steps: result.next_steps,
          disclaimer: result.disclaimer,
          similar_products: result.similar_products,
          flaws: result.flaws,
          refined_versions: result.refined_versions,
          graveyard: result.graveyard,
        },
        messages: []
      });
      result.id = savedHist.id;
    } catch (saveErr) {
      console.error('[VALIDATE] Error auto-saving user history:', saveErr);
    }

    console.log(`[VALIDATE] Successfully analyzed with skill '${result.skill}' using ${requestedModel}.`);

    // Trigger Web Push Notification if user has enabled notifications
    sendPushNotificationToUser(user.id, {
      title: 'Analysis Completed',
      body: `Your Flawlesz AI teardown for "${displayIdea.slice(0, 42)}" is ready. Tap to view competitors and vulnerabilities.`,
      type: 'analysis_completed',
      url: `/flaw/submit?id=${result.id}`
    }).catch(pushErr => console.warn('[PUSH] Optional notification notice:', pushErr));

    return res.json(result);
  } catch (err: any) {
    console.error('[VALIDATE] Error validating idea:', err);

    // Notify user of failed analysis attempt
    sendPushNotificationToUser(user.id, {
      title: 'Idea Analysis Notice',
      body: `We encountered an issue validating "${(idea || 'submitted concept').slice(0, 42)}". Tap to review.`,
      type: 'analysis_failed',
      url: '/flaw/submit'
    }).catch(() => {});
    let message = err?.message || 'Failed to complete flaw analysis. Please try again in a few moments.';
    try {
      if (typeof message === 'string' && (message.startsWith('{') || message.includes('"error"'))) {
        const parsed = JSON.parse(message);
        if (parsed.error?.message) {
          message = parsed.error.message;
        }
      }
    } catch {
      // ignore
    }

    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('quota') || message.includes('429')) {
      message = 'Service capacity reached (429 Resource Exhausted). Please verify your account quota or try again in a few moments.';
    }

    return res.status(500).json({
      error: message
    });
  }
});

// ──────────────────────────────────────────────
// CONVERSATION HISTORY API (Authenticated / Guest Demo)
// ──────────────────────────────────────────────

app.get('/api/history', optionalAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const history = getUserHistory(user.id);
    return res.json({ history });
  } catch (err: any) {
    console.error('[HISTORY] Error fetching user history:', err);
    return res.status(500).json({ error: 'Failed to load conversation history.' });
  }
});

app.post('/api/history', optionalAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const { idea, result } = req.body;

    if (!idea || !result) {
      return res.status(400).json({ error: 'Idea and result payload are required.' });
    }

    const saved = createConversationRecord({
      userId: user.id,
      userEmail: user.email,
      idea,
      result
    });

    return res.status(201).json({ item: saved });
  } catch (err: any) {
    console.error('[HISTORY] Error saving history item:', err);
    return res.status(500).json({ error: 'Failed to save conversation item.' });
  }
});

app.delete('/api/history/:id', optionalAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const historyId = req.params.id;
    const deleted = deleteUserHistory(user.id, historyId);
    return res.json({ success: deleted });
  } catch (err: any) {
    console.error('[HISTORY] Error deleting history item:', err);
    return res.status(500).json({ error: 'Failed to delete history item.' });
  }
});

// ──────────────────────────────────────────────
// FOLLOW-UP INTERACTIVE CHAT API (Authenticated / Guest Demo)
// ──────────────────────────────────────────────

app.post('/api/chat/follow-up', optionalAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      historyId,
      idea,
      similar_products,
      flaws,
      refined_versions,
      messages,
      newMessage,
    } = req.body;

    if (!newMessage || typeof newMessage !== 'string' || !newMessage.trim()) {
      return res.status(400).json({ error: 'Follow-up message cannot be empty.' });
    }

    if (!idea) {
      return res.status(400).json({ error: 'Original idea context is required.' });
    }

    const trimmedQuery = newMessage.trim();
    console.log(`[FOLLOW-UP] User ${user.email} asked: "${trimmedQuery.slice(0, 60)}..."`);

    // Automatic URL Detection and Inspection within follow-up messages
    const detectedUrls = extractUrlsFromText(trimmedQuery);
    let urlInspections: any[] = [];

    if (detectedUrls.length > 0) {
      console.log(`[FOLLOW-UP] Detected ${detectedUrls.length} URL(s) in follow-up message:`, detectedUrls);

      // Usage limit check: in-chat URL inspections count towards the monthly check quota (bypassed for owner)
      const isOwner = Boolean(
        user.email && user.email.trim().toLowerCase() === 'pardeshilata1983@gmail.com'
      ) || user.role === 'admin' || Boolean((user as any).isOwner);

      if (!isOwner) {
        const metrics = getUserUsageMetrics(user.id);
        if (metrics.checksRemainingThisMonth <= 0) {
          return res.status(429).json({
            error: `Monthly quota reached (${metrics.monthlyLimit}/${metrics.monthlyLimit} checks used this month). Live URL inspections count toward your monthly quota to prevent unmetered usage. Please upgrade or wait for next month's reset to inspect live pages.`
          });
        }
      }

      // Fetch and inspect up to 2 detected URLs in parallel
      const targetUrls = detectedUrls.slice(0, 2);
      urlInspections = await Promise.all(targetUrls.map((url) => inspectLiveUrl(url)));

      // Record each URL inspection in the user's quota metrics
      for (const insp of urlInspections) {
        recordUrlInspection({
          userId: user.id,
          url: insp.url,
          domain: insp.domain,
          conversationId: historyId,
        });
      }
    }

    const isPlanToBuild = req.body.mode === 'plan_to_build' || Boolean(req.body.isPlanToBuild);

    let aiResponse = '';
    let planToBuildSession: any = null;

    if (isPlanToBuild) {
      console.log(`[PLAN TO BUILD] User ${user.email} initiated Plan to Build task: "${trimmedQuery.slice(0, 60)}..."`);
      
      const activeTeam = Array.isArray(user.teammates) && user.teammates.length > 0
        ? user.teammates.slice(0, 5)
        : [
            { name: 'Atlas', role: 'Researcher', provider: 'perplexity' },
            { name: 'Elena', role: 'Writer', provider: 'openai' },
            { name: 'Nova', role: 'Analyst', provider: 'groq' },
            { name: 'Cypher', role: 'Coder', provider: 'xai' },
            { name: 'Iris', role: 'Reviewer', provider: 'openai' }
          ];

      const coordinatorPrompt = `You are Flawlesz AI's Office Coordinator.
The user's task in Task Mode is: "${trimmedQuery}".
Context / Subject: "${idea}"

TASK CONTRACT RULES:
1. Split this task into concrete deliverables and assign each to a teammate by role:
   - Researcher: facts with verified sources or quotes.
   - Writer: the clear draft or summary.
   - Analyst: comparisons, numbers, and a table.
   - Planner: steps with order and timing.
   - Reviewer: a list (max 5) of concrete fixes to the output, with no opinions about other teammates.
2. Roles say WHAT they produce, not how they talk.
3. Plain-language rules: Short sentences, everyday words, about a grade 8 reading level. No jargon unless the user used it. If a technical term is needed, explain it simply.
4. Teammates cooperate and deliver. No debate, no commentary on each other, no role-play.

The assigned team consists of: ${JSON.stringify(activeTeam.map((m: any) => ({ name: m.name, role: m.role })))}.

Return ONLY valid JSON with no markdown formatting:
{
  "subtasks": {
    "RoleName": "Exact prompt specifying deliverable, length, and format for this teammate"
  },
  "synthesis_instructions": "Instructions for summarizing results into an actionable roadmap in plain language."
}`;

      let subtasksMap: Record<string, string> = {};
      try {
        const coordRes = await callGroqChat({
          tier: 'orbit',
          messages: [{ role: 'user', content: coordinatorPrompt }],
          temperature: 0.2,
          responseFormatJson: true,
          userEmail: user?.email,
        });
        let text = coordRes.content?.trim() || '{}';
        if (text.startsWith('```')) {
          text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
        }
        const parsed = JSON.parse(text);
        subtasksMap = parsed.subtasks || {};
      } catch (parseErr) {
        for (const m of activeTeam) {
          subtasksMap[m.role] = `Deliver concrete results for this task: "${trimmedQuery}" for your role (${m.role}) in plain grade 8 language.`;
        }
      }

      const outputs: Record<string, { text?: string; error?: string }> = {};

      await Promise.all(
        activeTeam.map(async (member: any) => {
          const subtaskPrompt = `You are ${member.name}, assigned the role of ${member.role} in Flawlesz AI Task Mode.

TASK CONTRACT RULES:
1. COOPERATE AND DELIVER: Work cooperatively to deliver your assigned deliverable.
2. NO DEBATE, NO COMMENTARY: No debate, no commentary on other teammates, no role-play. No greetings or self-descriptions.
3. PLAIN LANGUAGE RULES: Short sentences, everyday words, about a grade 8 reading level. No jargon unless the user used it. If a technical term is needed, explain it simply.
4. ROLE DELIVERABLE SPECIFICATION:
   ${member.role === 'Researcher' ? 'Produce facts with sources.' :
     member.role === 'Writer' ? 'Produce the draft.' :
     member.role === 'Analyst' ? 'Produce comparisons, numbers, and a table.' :
     member.role === 'Planner' ? 'Produce steps with order and time.' :
     member.role === 'Reviewer' ? 'Produce a list (maximum 5) of concrete fixes to the output, with no opinions about other teammates.' :
     'Produce concrete deliverables for your role.'}

ASSIGNED SUBTASK:
"${subtasksMap[member.role] || `Deliver concrete work product for: "${trimmedQuery}"`}"

OUTPUT FORMAT:
You MUST respond strictly with valid JSON with no markdown formatting:
{
  "deliverable": "Your concrete work product in plain language (grade 8 reading level).",
  "assumptions": ["Assumption 1", "Assumption 2"] (max 3 short lines),
  "sources": ["source 1", "source 2"],
  "open_questions": ["Question 1"] (max 2)
}`;

          try {
            let apiKey = '';
            if (member.useManaged && (user.plan === 'pro' || user.plan === 'ultra' || user.plan === 'enterprise')) {
              if (member.provider === 'openai') apiKey = process.env.OPENAI_API_KEY || '';
              else if (member.provider === 'groq' || !member.provider || member.provider === 'flawlesz') apiKey = process.env.GROQ_API_KEY || '';
              else if (member.provider === 'perplexity') apiKey = process.env.PERPLEXITY_API_KEY || '';
              else if (member.provider === 'xai') apiKey = process.env.XAI_API_KEY || '';
              else if (member.provider === 'openrouter') apiKey = process.env.OPENROUTER_API_KEY || '';
            } else {
              apiKey = getDecryptedTeammateKey(user.id, member.provider);
            }

            if (!apiKey) {
              if (member.provider === 'groq' && process.env.GROQ_API_KEY) apiKey = process.env.GROQ_API_KEY;
              else if (member.provider === 'openai' && process.env.OPENAI_API_KEY) apiKey = process.env.OPENAI_API_KEY;
              else if (member.provider === 'perplexity' && process.env.PERPLEXITY_API_KEY) apiKey = process.env.PERPLEXITY_API_KEY;
              else if (member.provider === 'xai' && process.env.XAI_API_KEY) apiKey = process.env.XAI_API_KEY;
              else if (member.provider === 'openrouter' && process.env.OPENROUTER_API_KEY) apiKey = process.env.OPENROUTER_API_KEY;
              else if (process.env.GROQ_API_KEY) apiKey = process.env.GROQ_API_KEY;
            }

            if (!apiKey) {
              throw new Error(`Not available yet — API key not configured for ${member.provider}. Please configure a BYOK key in settings.`);
            }

            const resultText = await callProviderModel(member.provider || 'groq', apiKey, subtaskPrompt, 'orbit');
            outputs[member.role] = { text: resultText };
          } catch (err: any) {
            outputs[member.role] = { error: err?.message || String(err) };
          }
        })
      );

      let synthesis = '';
      try {
        const synthPrompt = `You are Flawlesz AI's Office Coordinator.
Subject: "${idea}"
User Task: "${trimmedQuery}"
Team Outputs:
${JSON.stringify(outputs, null, 2)}

TASK MODE SYNTHESIS RULES:
1. Synthesize all teammate deliverables into a clear, unified, actionable roadmap in plain language.
2. PLAIN-LANGUAGE RULES: Short sentences, everyday words, about a grade 8 reading level. No jargon unless the user used it. If a technical term is needed, explain it simply.
3. CONFLICT HANDLING: If teammate outputs conflict, flag it in one line ("Open question: A says X, B says Y"), and pick a sensible default. Teammates never argue.
4. Highlight concrete deliverables, key findings, and next steps clearly.`;

        const synthRes = await callGroqChat({
          tier: 'orbit',
          messages: [{ role: 'user', content: synthPrompt }],
          temperature: 0.3,
          userEmail: user?.email,
        });
        synthesis = synthRes.content?.trim() || '';
      } catch {
        synthesis = 'Plan execution synthesized from teammate deliverables in plain language.';
      }

      // Record session in teammates history for persistence across the app
      planToBuildSession = {
        id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        task: trimmedQuery,
        mode: 'general',
        team: activeTeam,
        outputs,
        synthesis,
        createdAt: new Date().toISOString()
      };
      saveTeammateSession(user.id, planToBuildSession);
      recordTeammatesRun(user.id);

      aiResponse = `### 🛠️ AI Teammates: Plan to Build Execution
**Task:** ${trimmedQuery}

${synthesis}

---
#### 👥 Specialist Employee Deliverables (${activeTeam.length} Assigned)
${activeTeam.map((m: any) => {
  const out = outputs[m.role];
  const content = out?.text || out?.error || 'Completed assessment.';
  return `##### **${m.name || m.role}** (${m.role} • ${String(m.provider).toUpperCase()})
${content}`;
}).join('\n\n')}`;
    } else {
      aiResponse = await answerFollowUpWithGroq({
        idea,
        similar_products: Array.isArray(similar_products) ? similar_products : [],
        flaws: Array.isArray(flaws) ? flaws : [],
        refined_versions: Array.isArray(refined_versions) ? refined_versions : [],
        previousMessages: Array.isArray(messages) ? messages : [],
        userQuery: trimmedQuery,
        urlInspections: urlInspections.length > 0 ? urlInspections : undefined,
        userEmail: user?.email,
      });
    }

    const userMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6) + '-u',
      role: 'user' as const,
      content: trimmedQuery,
      createdAt: new Date().toISOString(),
    };

    const assistantMessage = {
      id: 'msg-' + (Date.now() + 1) + '-' + Math.random().toString(36).substring(2, 6) + '-a',
      role: 'assistant' as const,
      content: aiResponse,
      createdAt: new Date().toISOString(),
    };

    const updatedMessages = [...(Array.isArray(messages) ? messages : []), userMessage, assistantMessage];

    // Persist to user's conversation history entry as ONE entry
    if (historyId) {
      try {
        updateHistoryMessages(user.id, historyId, updatedMessages);
      } catch (saveErr) {
        console.error('[FOLLOW-UP] Error updating history messages:', saveErr);
      }
    }

    // Also update in gallery if already published
    try {
      updateGalleryMessages(historyId || idea, updatedMessages);
    } catch (gErr) {
      // non-blocking
    }

    return res.json({
      userMessage,
      assistantMessage,
      messages: updatedMessages,
      planToBuildSession
    });
  } catch (err: any) {
    console.error('[FOLLOW-UP] Error handling follow-up chat:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to generate follow-up response. Please try again.',
    });
  }
});

// ──────────────────────────────────────────────
// TEXT-TO-SPEECH (TTS) API (Bold Male Voice)
// ──────────────────────────────────────────────

app.post('/api/tts', optionalAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text content is required for speech synthesis.' });
    }

    return res.json({
      success: true,
      audioBase64: null,
      source: 'browser',
      message: 'Voice readout is handled directly by browser Web Speech synthesis for low latency.',
    });
  } catch (err: any) {
    console.error('[TTS] Error in /api/tts endpoint:', err);
    return res.status(500).json({
      error: err?.message || 'TTS speech synthesis failed.',
    });
  }
});


// ──────────────────────────────────────────────
// ELEVENLABS AI AGENT VOICES API
// ──────────────────────────────────────────────

app.get('/api/elevenlabs/voices', optionalAuth, (req, res) => {
  try {
    const user = (req as any).user;
    let userKey = '';
    if (user?.id) {
      userKey = getDecryptedTeammateKey(user.id, 'elevenlabs');
    }
    const serverKey = getElevenLabsApiKey();
    const isConfigured = Boolean(userKey || serverKey);

    return res.json({
      configured: isConfigured,
      hasUserKey: Boolean(userKey),
      hasServerKey: Boolean(serverKey),
      voices: AGENT_VOICE_PROFILES,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve agent voice profiles' });
  }
});

app.post('/api/elevenlabs/tts', optionalAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { text, agentName, agentRole, voiceId } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text content is required for speech synthesis.' });
    }

    let apiKey = '';
    if (user?.id) {
      apiKey = getDecryptedTeammateKey(user.id, 'elevenlabs');
    }
    if (!apiKey) {
      apiKey = getElevenLabsApiKey();
    }

    if (!apiKey) {
      return res.status(400).json({
        error: 'ElevenLabs API key is not configured. Add your key in Teammates Setup or server .env.'
      });
    }

    const audioResult = await generateSpeechWithElevenLabs(text.trim(), {
      agentName,
      agentRole,
      voiceId,
      apiKey,
    });

    return res.json(audioResult);
  } catch (err: any) {
    console.error('[ELEVENLABS] TTS error:', err.message || err);
    return res.status(500).json({
      error: err.message || 'Failed to generate speech with ElevenLabs.'
    });
  }
});

app.post('/api/elevenlabs/test', optionalAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    let apiKey = req.body.apiKey;
    if (!apiKey && user?.id) {
      apiKey = getDecryptedTeammateKey(user.id, 'elevenlabs');
    }
    if (!apiKey) {
      apiKey = getElevenLabsApiKey();
    }

    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'No ElevenLabs API key provided to test.' });
    }

    const testRes = await testElevenLabsApiKey(apiKey);
    return res.json(testRes);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'ElevenLabs test failed' });
  }
});

app.get('/api/elevenlabs/sample/:agent', optionalAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { agent } = req.params;
    let apiKey = '';
    if (user?.id) {
      apiKey = getDecryptedTeammateKey(user.id, 'elevenlabs');
    }
    if (!apiKey) {
      apiKey = getElevenLabsApiKey();
    }

    // Capitalize agent name (e.g. atlas -> Atlas)
    const normalizedAgent = (agent.charAt(0).toUpperCase() + agent.slice(1).toLowerCase());
    const profile = AGENT_VOICE_PROFILES[normalizedAgent] || AGENT_VOICE_PROFILES['Coordinator'];

    if (!apiKey) {
      // Return voice metadata and sample text so client can play fallback browser voice
      return res.json({
        configured: false,
        audioBase64: null,
        agentName: profile.name,
        role: profile.role,
        voiceName: profile.voiceName,
        sampleText: profile.previewSampleText,
        accent: profile.accent,
        gender: profile.gender
      });
    }

    const sample = await getAgentSampleSpeech(normalizedAgent, apiKey);
    return res.json({
      configured: true,
      audioBase64: sample.audioBase64,
      mimeType: sample.mimeType,
      agentName: sample.agentName,
      role: profile.role,
      voiceName: sample.voiceName,
      sampleText: sample.sampleText,
      accent: profile.accent,
      gender: profile.gender
    });
  } catch (err: any) {
    console.error(`[ELEVENLABS] Sample error for ${req.params.agent}:`, err);
    const normalizedAgent = (req.params.agent.charAt(0).toUpperCase() + req.params.agent.slice(1).toLowerCase());
    const profile = AGENT_VOICE_PROFILES[normalizedAgent] || AGENT_VOICE_PROFILES['Coordinator'];
    return res.json({
      configured: false,
      audioBase64: null,
      error: err?.message || 'Could not generate neural sample',
      agentName: profile.name,
      role: profile.role,
      voiceName: profile.voiceName,
      sampleText: profile.previewSampleText,
      accent: profile.accent,
      gender: profile.gender
    });
  }
});

// ──────────────────────────────────────────────
// GALLERY API (Public read & community write)
// ──────────────────────────────────────────────

app.get('/api/gallery', (req, res) => {
  try {
    const gallery = readGallery();
    // Return sorted newest first
    const sorted = [...gallery].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return res.json({ items: sorted });
  } catch (err: any) {
    console.error('[GALLERY] Error reading gallery:', err);
    return res.status(500).json({ error: 'Failed to load gallery items.' });
  }
});

app.post('/api/gallery', optionalAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const { idea, similar_products, flaws, refined_versions, id } = req.body;

    if (!idea || !Array.isArray(flaws) || !Array.isArray(similar_products)) {
      return res.status(400).json({ error: 'Invalid analysis payload to save.' });
    }

    const gallery = readGallery();
    const existing = gallery.find(item => item.id === id || item.idea.trim() === idea.trim());

    if (existing) {
      return res.json({ item: existing, message: 'Already in gallery.' });
    }

    const record: GalleryRecord = {
      id: id || ('val-' + Date.now()),
      idea: idea.trim(),
      similar_products,
      flaws,
      refined_versions: refined_versions || [],
      createdAt: new Date().toISOString(),
      userId: user.id,
      userEmail: user.email
    };

    gallery.unshift(record);
    writeGallery(gallery);
    console.log(`[GALLERY] User ${user.email} published idea to gallery: "${idea.slice(0, 40)}..."`);

    return res.status(201).json({ item: record });
  } catch (err: any) {
    console.error('[GALLERY] Error saving to gallery:', err);
    return res.status(500).json({ error: 'Failed to publish to gallery.' });
  }
});

// ──────────────────────────────────────────────
// OFFICIAL IDEA SHARING API
// ──────────────────────────────────────────────

app.post('/api/shares', optionalAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const { idea, title, validationId, id, options, content } = req.body;

    if (!idea || typeof idea !== 'string' || !idea.trim()) {
      return res.status(400).json({ error: 'An idea or project description is required to generate a share link.' });
    }

    const payload = {
      id: typeof id === 'string' && id.startsWith('sh_') ? id : undefined,
      validationId: typeof validationId === 'string' ? validationId : undefined,
      idea: idea.trim(),
      title: typeof title === 'string' ? title.trim() : undefined,
      options: options || {
        includeFlaws: true,
        includeCompetitors: true,
        includeRefinements: true,
        includeGraveyard: true,
        includeMessages: false,
        isAnonymous: false,
      },
      content: content || {},
    };

    const record = createOrUpdateShareRecord(payload, user ? { id: user.id, email: user.email } : undefined);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
    const baseUrl = `${protocol}://${host}`;
    const publicUrl = `${baseUrl}/share/${record.id}`;

    console.log(`[SHARE] Created official shareable report: ${record.id} for "${record.title}"`);

    return res.status(201).json({
      success: true,
      share: record,
      shareUrl: publicUrl,
      sharePath: `/share/${record.id}`,
    });
  } catch (err: any) {
    console.error('[SHARE] Error creating share link:', err);
    return res.status(500).json({ error: 'Failed to generate official share link.' });
  }
});

app.get('/api/shares/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Share ID is required.' });
    }

    const record = getShareRecordById(id, true);
    if (!record) {
      return res.status(404).json({ error: 'Share report not found or expired.' });
    }

    if (record.revoked) {
      return res.json({
        success: true,
        revoked: true,
        share: {
          id: record.id,
          title: record.title,
          revoked: true,
          revokedAt: record.updatedAt || record.createdAt,
        },
      });
    }

    return res.json({
      success: true,
      revoked: false,
      share: record,
    });
  } catch (err: any) {
    console.error(`[SHARE] Error retrieving share ${req.params.id}:`, err);
    return res.status(500).json({ error: 'Failed to load shared report.' });
  }
});

app.post('/api/shares/:id/revoke', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const result = revokeShareRecord(id, user?.id);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    console.log(`[SHARE] Revoked share link ${id}`);
    return res.json({ success: true, message: result.message });
  } catch (err: any) {
    console.error(`[SHARE] Error revoking share link ${req.params.id}:`, err);
    return res.status(500).json({ error: 'Failed to revoke share link.' });
  }
});

app.delete('/api/shares/:id', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const result = deleteShareRecord(id, user?.id);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    console.log(`[SHARE] Deleted share link ${id}`);
    return res.json({ success: true, message: result.message });
  } catch (err: any) {
    console.error(`[SHARE] Error deleting share link ${req.params.id}:`, err);
    return res.status(500).json({ error: 'Failed to delete share link.' });
  }
});

// ──────────────────────────────────────────────
// URL SHORTCUT FOR PUBLIC GALLERY
// ──────────────────────────────────────────────
const PUBLIC_GALLERY_URL = 'https://v0-hackers-dev.vercel.app/gallery';

app.get(['/gallery', '/flaw/gallery', '/shortcut/gallery'], (req, res) => {
  console.log(`[URL SHORTCUT] Redirecting ${req.path} to ${PUBLIC_GALLERY_URL}`);
  return res.redirect(PUBLIC_GALLERY_URL);
});

// ──────────────────────────────────────────────
// WEB PUSH NOTIFICATIONS API
// ──────────────────────────────────────────────

// 1. Get VAPID public key
app.get('/api/notifications/vapid-public-key', (_req, res) => {
  try {
    const key = getVapidPublicKey();
    return res.json({ publicKey: key });
  } catch (err: any) {
    console.error('[NOTIFICATIONS] Error retrieving VAPID public key:', err);
    return res.status(500).json({ error: 'Failed to retrieve VAPID public key' });
  }
});

// 2. Get notification status & preferences
app.get('/api/notifications/status', requireAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const subscriptions = getUserPushSubscriptions(user.id);
    const preferences = getUserNotificationPreferences(user.id);

    return res.json({
      hasSubscription: subscriptions.length > 0,
      deviceCount: subscriptions.length,
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        endpoint: s.endpoint.slice(0, 45) + '...',
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
        userAgent: s.userAgent
      })),
      preferences
    });
  } catch (err: any) {
    console.error('[NOTIFICATIONS] Status error:', err);
    return res.status(500).json({ error: 'Failed to retrieve notification status' });
  }
});

// 3. Register a push subscription
app.post('/api/notifications/subscribe', requireAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const { subscription } = req.body;
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Valid push subscription object with endpoint and keys is required.' });
    }

    if (!subscription.keys.p256dh || !subscription.keys.auth) {
      return res.status(400).json({ error: 'Subscription keys (p256dh and auth) are required.' });
    }

    // Validate endpoint is a valid URL
    try {
      new URL(subscription.endpoint);
    } catch {
      return res.status(400).json({ error: 'Invalid push endpoint URL.' });
    }

    const saved = savePushSubscription(user.id, subscription, userAgent);
    console.log(`[NOTIFICATIONS] Subscribed user ${user.email} (${saved.id})`);

    return res.status(201).json({
      success: true,
      message: 'Push notifications enabled successfully.',
      subscriptionId: saved.id
    });
  } catch (err: any) {
    console.error('[NOTIFICATIONS] Subscribe error:', err);
    return res.status(500).json({ error: err.message || 'Failed to register push subscription' });
  }
});

// 4. Remove a push subscription
app.post('/api/notifications/unsubscribe', requireAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const { endpoint } = req.body;

    if (!endpoint || typeof endpoint !== 'string') {
      return res.status(400).json({ error: 'Subscription endpoint is required to unsubscribe.' });
    }

    const removed = removePushSubscription(user.id, endpoint);
    console.log(`[NOTIFICATIONS] Unsubscribed endpoint for user ${user.email}: ${removed}`);

    return res.json({
      success: true,
      removed,
      message: 'Push subscription removed successfully.'
    });
  } catch (err: any) {
    console.error('[NOTIFICATIONS] Unsubscribe error:', err);
    return res.status(500).json({ error: 'Failed to remove push subscription' });
  }
});

// 5. Update notification preferences
app.post('/api/notifications/preferences', requireAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'Preferences object is required.' });
    }

    const updated = updateUserNotificationPreferences(user.id, preferences);
    return res.json({
      success: true,
      preferences: updated
    });
  } catch (err: any) {
    console.error('[NOTIFICATIONS] Preferences error:', err);
    return res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// 6. Send a test notification
app.post('/api/notifications/test', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { type, title, body, url } = req.body;

    const notifType: FlawNotificationType = type || 'analysis_completed';
    const notifTitle = title || 'Flawlesz AI Agent Test Notification';
    const notifBody =
      body || 'Web push notifications are fully configured and operational on this device!';
    const notifUrl = url || '/flaw/submit';

    const result = await sendPushNotificationToUser(
      user.id,
      {
        title: notifTitle,
        body: notifBody,
        type: notifType,
        url: notifUrl,
        requireInteraction: false
      },
      true // bypass preferences for explicit test notification
    );

    return res.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    console.error('[NOTIFICATIONS] Test notification error:', err);
    return res.status(500).json({ error: err.message || 'Failed to send test notification' });
  }
});

// ──────────────────────────────────────────────
// ADMIN API (SECURE + SERVER-SIDE VERIFIED)
// ──────────────────────────────────────────────

app.get('/api/admin/system-check', requireAdmin, (_req, res) => {
  const groqConfigured = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());
  const searchConfigured = Boolean(process.env.SEARCH_API_KEY && process.env.SEARCH_API_KEY.trim());

  return res.status(200).json({
    engine: 'Groq Cloud Inference',
    endpoint: GROQ_CONFIG.endpoint,
    models: GROQ_CONFIG.models,
    groqApiKey: groqConfigured ? 'Configured' : 'Not configured',
    searchApiKey: searchConfigured ? 'Configured' : 'Not configured',
    searchProvider: process.env.SEARCH_API_KEY?.startsWith('tvly-') ? 'Tavily Search' : 'Brave Search',
    status: groqConfigured && searchConfigured ? 'Operational' : 'Degraded',
  });
});

app.get('/api/admin/groq/logs', requireAdmin, (_req, res) => {
  return res.status(200).json({
    logs: getGroqUsageLogs(),
  });
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  try {
    const range = (req.query.range as string) || '30d';
    const stats = getAdminStats(range);
    return res.status(200).json(stats);
  } catch (err: any) {
    console.error('[ADMIN] Error fetching admin stats:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch admin stats' });
  }
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const users = getAllUsersForAdmin();
    return res.status(200).json({ users });
  } catch (err: any) {
    console.error('[ADMIN] Error fetching admin users:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch users' });
  }
});

app.get('/api/admin/users/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const users = getAllUsersForAdmin();
    const user = users.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const history = getUserHistory(id);
    return res.status(200).json({ user, history });
  } catch (err: any) {
    console.error('[ADMIN] Error fetching user detail:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch user detail' });
  }
});

app.post('/api/admin/users/:id/ban', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { banned, reason } = req.body;
    const adminUser = (req as any).user;
    const updated = setAdminUserBanStatus(adminUser, id, Boolean(banned), reason);
    return res.status(200).json({ success: true, user: updated });
  } catch (err: any) {
    console.error('[ADMIN] Error setting ban status:', err);
    return res.status(400).json({ error: err.message || 'Failed to update ban status' });
  }
});

app.post('/api/admin/users/:id/grant', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { unlimited, pulsarLimit, quasarLimit, expiresAt } = req.body;
    const adminUser = (req as any).user;
    const updated = grantAdminEnterpriseAccess(adminUser, id, { unlimited, pulsarLimit, quasarLimit, expiresAt });
    return res.status(200).json({ success: true, user: updated });
  } catch (err: any) {
    console.error('[ADMIN] Error granting enterprise access:', err);
    return res.status(400).json({ error: err.message || 'Failed to grant enterprise access' });
  }
});

app.get('/api/admin/events', requireAdmin, (req, res) => {
  try {
    const events = getEventsList();
    return res.status(200).json({ events });
  } catch (err: any) {
    console.error('[ADMIN] Error fetching events:', err);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.get('/api/admin/audit-logs', requireAdmin, (req, res) => {
  try {
    const logs = getAuditLogsList();
    return res.status(200).json({ logs });
  } catch (err: any) {
    console.error('[ADMIN] Error fetching audit logs:', err);
    return res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

app.get('/api/admin/export/users', requireAdmin, (_req, res) => {
  try {
    const users = getAllUsersForAdmin();
    const csvRows = ['ID,Email,Name,Plan,Role,Banned,CreatedAt,TotalChecks'];
    users.forEach(u => {
      csvRows.push(`"${u.id}","${u.email}","${u.name || ''}","${u.plan}","${u.role}","${u.banned}","${u.createdAt}",${u.totalChecks}`);
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="flaw_users_export.csv"');
    return res.status(200).send(csvRows.join('\n'));
  } catch (err: any) {
    return res.status(500).json({ error: 'Export failed' });
  }
});

app.get('/api/admin/export/events', requireAdmin, (_req, res) => {
  try {
    const events = getEventsList();
    const csvRows = ['ID,Timestamp,UserEmail,Type'];
    events.forEach((e: any) => {
      csvRows.push(`"${e.id}","${e.timestamp}","${e.userEmail}","${e.type}"`);
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="flaw_events_export.csv"');
    return res.status(200).send(csvRows.join('\n'));
  } catch (err: any) {
    return res.status(500).json({ error: 'Export failed' });
  }
});

app.get('/api/admin/export/payments', requireAdmin, (_req, res) => {
  try {
    const payments = getAllPayments();
    const csvRows = ['ID,UserId,UserEmail,RazorpayPaymentId,RazorpaySubscriptionId,AmountINR,Currency,Status,Plan,CreatedAt,Error'];
    payments.forEach((p: any) => {
      csvRows.push(
        `"${p.id}","${p.userId}","${p.userEmail}","${p.razorpayPaymentId}","${p.razorpaySubscriptionId}",${p.amount / 100},"${p.currency}","${p.status}","${p.plan}","${p.createdAt}","${(p.errorDescription || '').replace(/"/g, '""')}"`
      );
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="flaw_payments_export.csv"');
    return res.status(200).send(csvRows.join('\n'));
  } catch (err: any) {
    return res.status(500).json({ error: 'Export failed' });
  }
});

// ──────────────────────────────────────────────
// RAZORPAY BILLING & SUBSCRIPTIONS API
// ──────────────────────────────────────────────

app.post('/api/billing/create-subscription', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { plan } = req.body;

    if (plan !== 'pro' && plan !== 'ultra') {
      return res.status(400).json({ error: 'Invalid subscription plan. Choose Pro or Ultra.' });
    }

    const session = await createRazorpayPaymentSession(user.id, user.email, plan);

    if (session.subscriptionId) {
      updateUserSubscription(user.id, {
        subscription_id: session.subscriptionId,
        subscription_status: 'created',
        subscription_plan: plan,
      });
    }

    logAudit(user.id, user.email, 'CREATE_PAYMENT_SESSION', user.id, user.email, {
      plan,
      subscriptionId: session.subscriptionId,
      orderId: session.orderId,
      paymentType: session.paymentType,
    });
    logActivityEvent(user.id, user.email, 'upgrade', {
      plan,
      subscriptionId: session.subscriptionId,
      orderId: session.orderId,
      status: 'created',
      paymentType: session.paymentType,
    });

    const isSandbox = Boolean(
      session.subscriptionId?.startsWith('sub_sandbox_') ||
      session.orderId?.startsWith('order_sandbox_')
    );

    return res.status(200).json({
      subscription_id: session.subscriptionId,
      order_id: session.orderId,
      amount: session.amount,
      currency: session.currency || 'INR',
      key_id: session.keyId,
      plan,
      payment_type: session.paymentType,
      is_sandbox: isSandbox,
    });
  } catch (err: any) {
    console.error('[BILLING] Error creating subscription/order:', err);
    const description = err?.error?.description || err?.message || 'Failed to initialize subscription checkout.';
    logActivityEvent((req as any).user?.id || 'anonymous', (req as any).user?.email || 'unknown', 'error', {
      action: 'create-subscription',
      message: description,
    });
    return res.status(500).json({ error: description });
  }
});

app.post('/api/billing/verify', requireAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_order_id,
      razorpay_signature,
      plan,
    } = req.body;

    if (!razorpay_payment_id || (!razorpay_subscription_id && !razorpay_order_id) || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment signature verification parameters.' });
    }

    let isValid = false;
    if (razorpay_order_id) {
      isValid = verifyOrderPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    } else if (razorpay_subscription_id) {
      isValid = verifySubscriptionPaymentSignature(
        razorpay_payment_id,
        razorpay_subscription_id,
        razorpay_signature
      );
    }

    if (!isValid) {
      console.warn('[BILLING] Signature verification failed for user:', user.email);
      return res.status(400).json({ error: 'Invalid payment signature. Payment verification failed.' });
    }

    // Determine target plan
    const targetPlan: PlanId = (plan === 'ultra' || user.subscription_plan === 'ultra') ? 'ultra' : 'pro';
    const amountPaise = targetPlan === 'ultra' ? 499900 * 6 : 199900;
    const activeRefId = razorpay_subscription_id || razorpay_order_id || `pay_${Date.now()}`;

    // Immediately activate subscription & update user plan and quotas
    const updatedUserRecord = updateUserSubscription(user.id, {
      subscription_status: 'active',
      subscription_id: activeRefId,
      subscription_plan: targetPlan,
      plan: targetPlan,
      billing_cycle_start: new Date().toISOString(),
    });

    const userWithPlan = updateUserPlan(user.id, targetPlan);

    // Record captured transaction in payment ledger
    recordPayment({
      userId: user.id,
      userEmail: user.email,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySubscriptionId: razorpay_subscription_id,
      orderId: razorpay_order_id,
      amount: amountPaise,
      currency: 'INR',
      status: 'captured',
      plan: targetPlan,
    });

    logAudit(user.id, user.email, 'PAYMENT_CAPTURED_AND_ACTIVATED', user.id, user.email, {
      paymentId: razorpay_payment_id,
      subscriptionId: razorpay_subscription_id,
      orderId: razorpay_order_id,
      plan: targetPlan,
      amount: amountPaise,
    });

    logActivityEvent(user.id, user.email, 'upgrade', {
      plan: targetPlan,
      subscriptionId: razorpay_subscription_id,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      status: 'active',
    });

    console.log(`[BILLING] User ${user.email} plan activated: ${targetPlan.toUpperCase()} (Payment: ${razorpay_payment_id})`);

    return res.status(200).json({
      success: true,
      message: `Payment confirmed! Welcome to Flawlesz AI ${targetPlan === 'ultra' ? 'Ultra' : 'Pro'}.`,
      user: userWithPlan || (updatedUserRecord ? toPublicUser(updatedUserRecord) : user),
      plan: targetPlan,
    });
  } catch (err: any) {
    console.error('[BILLING] Verification error:', err);
    return res.status(500).json({ error: err.message || 'Payment verification failed.' });
  }
});

app.get('/api/billing/status', requireAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const payments = getUserPayments(user.id);
    return res.status(200).json({
      user: toPublicUser(user),
      payments,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch billing status' });
  }
});

app.get('/api/billing/history', requireAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const payments = getUserPayments(user.id);
    return res.status(200).json({ payments });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

app.post('/api/billing/cancel-subscription', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user.subscription_id) {
      return res.status(400).json({ error: 'No active subscription found to cancel.' });
    }

    await cancelRazorpaySubscription(user.subscription_id, true);

    updateUserSubscription(user.id, {
      subscription_cancel_at_cycle_end: true,
      subscription_status: 'cancelled',
    });

    logAudit(user.id, user.email, 'CANCEL_SUBSCRIPTION', user.id, user.email, {
      subscriptionId: user.subscription_id,
    });
    logActivityEvent(user.id, user.email, 'cancellation', {
      subscriptionId: user.subscription_id,
    });

    return res.status(200).json({
      success: true,
      message: 'Subscription will cancel at the end of the current billing cycle.',
    });
  } catch (err: any) {
    console.error('[BILLING] Error cancelling subscription:', err);
    return res.status(500).json({ error: err.message || 'Failed to cancel subscription.' });
  }
});

// ──────────────────────────────────────────────
// RAZORPAY WEBHOOK (THE SOURCE OF TRUTH)
// ──────────────────────────────────────────────

app.post('/api/razorpay/webhook', (req, res) => {
  const signature = (req.headers['x-razorpay-signature'] as string) || '';
  const eventId = (req.headers['x-razorpay-event-id'] as string) || req.body?.id || `evt_${Date.now()}`;
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);

  // Validate webhook signature
  const isValid = verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    console.warn('[WEBHOOK] Invalid Razorpay webhook signature. Rejecting with 400.');
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  // Idempotency check: ignore repeat deliveries of the same event ID
  if (isEventProcessed(eventId)) {
    console.log(`[WEBHOOK] Event ${eventId} already processed. Acknowledging with 200.`);
    return res.status(200).json({ status: 'already_processed' });
  }
  markEventProcessed(eventId);

  try {
    const event = req.body?.event;
    const payload = req.body?.payload;
    const subscription = payload?.subscription?.entity;
    const payment = payload?.payment?.entity;

    // Resolve user by notes.user_id or by stored subscription_id or user email
    const userIdFromNotes = subscription?.notes?.user_id || payment?.notes?.user_id;
    const userEmailFromNotes = subscription?.notes?.user_email || payment?.notes?.user_email;
    const subscriptionId = subscription?.id || payment?.subscription_id;
    const targetPlan: PlanId = (subscription?.notes?.plan || payment?.notes?.plan || 'pro') as PlanId;

    console.log(`[WEBHOOK] Processing event ${event} for subscription ${subscriptionId || 'N/A'}`);

    const targetUser = updateUserSubscription(userIdFromNotes || subscriptionId || userEmailFromNotes || '', {});

    switch (event) {
      case 'subscription.authenticated': {
        if (targetUser) {
          updateUserSubscription(targetUser.id, {
            subscription_status: 'authenticated',
            subscription_id: subscriptionId || targetUser.subscription_id,
          });
          logAudit('system', 'razorpay-webhook', 'SUBSCRIPTION_AUTHENTICATED', targetUser.id, targetUser.email, { eventId, subscriptionId });
          logActivityEvent(targetUser.id, targetUser.email, 'login', { webhookEvent: event });
        }
        break;
      }

      case 'subscription.activated': {
        if (targetUser) {
          updateUserSubscription(targetUser.id, {
            plan: targetPlan,
            subscription_status: 'active',
            subscription_id: subscriptionId || targetUser.subscription_id,
            subscription_plan: targetPlan,
            subscription_cancel_at_cycle_end: false,
            billing_cycle_start: new Date().toISOString(),
          });
          logAudit('system', 'razorpay-webhook', 'SUBSCRIPTION_ACTIVATED', targetUser.id, targetUser.email, { eventId, plan: targetPlan });
          logActivityEvent(targetUser.id, targetUser.email, 'upgrade', { plan: targetPlan, status: 'active' });
        }
        break;
      }

      case 'subscription.charged': {
        if (targetUser) {
          const amountPaise = payment?.amount || (targetPlan === 'pro' ? 199900 : 499900);
          const paymentId = payment?.id || `pay_${Date.now()}`;
          const currentEndIso = subscription?.current_end
            ? new Date(subscription.current_end * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

          // Record captured payment in payments.json
          recordPayment({
            userId: targetUser.id,
            userEmail: targetUser.email,
            razorpayPaymentId: paymentId,
            razorpaySubscriptionId: subscriptionId || targetUser.subscription_id || '',
            amount: amountPaise,
            currency: payment?.currency || 'INR',
            status: 'captured',
            plan: targetPlan,
          });

          // Extend access period and reset monthly Pulsar/Quasar/Orbit counters
          updateUserSubscription(targetUser.id, {
            plan: targetPlan,
            subscription_status: 'active',
            subscription_plan: targetPlan,
            subscription_current_end: currentEndIso,
            orbit_monthly_used: 0,
            pulsar_monthly_used: 0,
            quasar_monthly_used: 0,
            billing_cycle_start: new Date().toISOString(),
          });

          logAudit('system', 'razorpay-webhook', 'SUBSCRIPTION_CHARGED', targetUser.id, targetUser.email, {
            amount: amountPaise,
            paymentId,
            plan: targetPlan,
          });
          logActivityEvent(targetUser.id, targetUser.email, 'upgrade', {
            event: 'charged',
            amount: amountPaise,
            plan: targetPlan,
          });
        }
        break;
      }

      case 'subscription.pending':
      case 'payment.failed': {
        if (targetUser) {
          if (payment) {
            recordPayment({
              userId: targetUser.id,
              userEmail: targetUser.email,
              razorpayPaymentId: payment.id || `fail_${Date.now()}`,
              razorpaySubscriptionId: subscriptionId || targetUser.subscription_id || '',
              amount: payment.amount || 0,
              currency: payment.currency || 'INR',
              status: 'failed',
              plan: targetPlan,
              errorDescription: payment.error_description || 'Card payment declined or failed.',
            });
          }

          updateUserSubscription(targetUser.id, {
            subscription_status: 'past_due',
          });

          logAudit('system', 'razorpay-webhook', 'PAYMENT_FAILED_OR_PENDING', targetUser.id, targetUser.email, {
            error: payment?.error_description,
          });
          logActivityEvent(targetUser.id, targetUser.email, 'error', {
            event,
            reason: payment?.error_description || 'Payment failed',
          });
        }
        break;
      }

      case 'subscription.halted': {
        if (targetUser) {
          updateUserSubscription(targetUser.id, {
            plan: 'free',
            subscription_status: 'halted',
          });
          logAudit('system', 'razorpay-webhook', 'SUBSCRIPTION_HALTED_DOWNGRADED', targetUser.id, targetUser.email, { subscriptionId });
          logActivityEvent(targetUser.id, targetUser.email, 'cancellation', { status: 'halted_downgraded' });
        }
        break;
      }

      case 'subscription.cancelled':
      case 'subscription.completed': {
        if (targetUser) {
          const isExpired = subscription?.current_end && subscription.current_end * 1000 < Date.now();
          updateUserSubscription(targetUser.id, {
            subscription_status: 'cancelled',
            subscription_cancel_at_cycle_end: true,
            plan: isExpired ? 'free' : targetUser.plan,
          });
          logAudit('system', 'razorpay-webhook', 'SUBSCRIPTION_CANCELLED', targetUser.id, targetUser.email, { subscriptionId });
          logActivityEvent(targetUser.id, targetUser.email, 'cancellation', { subscriptionId });
        }
        break;
      }

      case 'subscription.paused':
      case 'subscription.resumed': {
        if (targetUser) {
          updateUserSubscription(targetUser.id, {
            subscription_status: event === 'subscription.paused' ? 'paused' : 'active',
          });
          logAudit('system', 'razorpay-webhook', event.toUpperCase().replace('.', '_'), targetUser.id, targetUser.email, { subscriptionId });
        }
        break;
      }

      default:
        console.log(`[WEBHOOK] Unhandled Razorpay event: ${event}`);
    }

    return res.status(200).json({ success: true, event });
  } catch (err: any) {
    console.error('[WEBHOOK] Error processing webhook event:', err);
    return res.status(200).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────
// ADMIN: REVENUE & EARNINGS DASHBOARD API
// ──────────────────────────────────────────────

app.get('/api/admin/revenue', requireAdmin, (req, res) => {
  try {
    const range = (req.query.range as string) || '30d';
    const stats = getAdminRevenueStats(range);
    return res.status(200).json(stats);
  } catch (err: any) {
    console.error('[ADMIN] Error fetching revenue stats:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch revenue analytics' });
  }
});

app.get('/api/admin/razorpay/diagnostics', requireAdmin, async (_req, res) => {
  try {
    const diagnostics = await getRazorpayDiagnostics();
    return res.status(200).json(diagnostics);
  } catch (err: any) {
    console.error('[ADMIN] Error fetching Razorpay diagnostics:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch diagnostics' });
  }
});

app.get('/api/admin/export/payments', requireAdmin, (_req, res) => {
  try {
    const payments = getAllPayments();
    const csvRows = ['ID,UserEmail,Plan,Amount_Rupees,Currency,Status,CreatedAt,PaymentID,SubscriptionID'];
    payments.forEach(p => {
      csvRows.push(`"${p.id}","${p.userEmail}","${p.plan}",${p.amount / 100},"${p.currency}","${p.status}","${p.createdAt}","${p.razorpayPaymentId}","${p.razorpaySubscriptionId}"`);
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="flaw_payments_export.csv"');
    return res.status(200).send(csvRows.join('\n'));
  } catch (err: any) {
    return res.status(500).json({ error: 'Export failed' });
  }
});

app.post('/api/admin/reconcile', requireAdmin, async (_req, res) => {
  try {
    const users = getAllUsersForAdmin();
    const activeSubUsers = users.filter(u => u.subscription_id);
    const results = [];

    for (const u of activeSubUsers) {
      if (u.subscription_id) {
        const subData = await fetchRazorpaySubscription(u.subscription_id);
        if (subData) {
          results.push({ email: u.email, localPlan: u.plan, razorpayStatus: subData.status });
          if (subData.status === 'active' && u.plan === 'free') {
            updateUserSubscription(u.id, { plan: (subData.notes?.plan || 'pro') as PlanId, subscription_status: 'active' });
          } else if (subData.status === 'halted' || subData.status === 'cancelled') {
            if (subData.current_end && subData.current_end * 1000 < Date.now()) {
              updateUserSubscription(u.id, { plan: 'free', subscription_status: subData.status });
            }
          }
        }
      }
    }

    return res.status(200).json({ success: true, reconciledCount: results.length, details: results });
  } catch (err: any) {
    console.error('[ADMIN] Reconciliation error:', err);
    return res.status(500).json({ error: err.message || 'Reconciliation failed' });
  }
});

// --- AI TEAMMATES API ---
app.post('/api/teammates/waitlist', optionalAuth, async (req, res) => {
  try {
    const { email } = req.body;
    const userEmail = email || (req as any).user?.email;
    if (!userEmail) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    const result = await recordTeammateWaitlist(userEmail);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save waitlist entry.' });
  }
});

app.get('/api/teammates/status', requireAuth, (req, res) => {
  const user = (req as any).user;
  const fullUser = readUsers().find(u => u.id === user.id) || user;
  const isOwner = user.email.trim().toLowerCase() === 'pardeshilata1983@gmail.com' || user.role === 'admin';
  const plan = isOwner ? 'enterprise' : (user.plan || 'free');
  const limitCheck = checkTeammatesLimit(user.id);
  const trialUsed = isOwner ? false : Boolean(user.teammates_trial_used || (user.teammates_lifetime_used || 0) >= 1);
  res.json({
    keys: getTeammateMaskedKeys(user.id),
    presets: fullUser.teammate_presets || [],
    history: fullUser.teammate_history || [],
    plan,
    limitReached: isOwner ? false : !limitCheck.allowed,
    limitMessage: isOwner ? '' : (limitCheck.reason || ''),
    nextPlan: limitCheck.nextPlan || (plan === 'free' ? 'Pro' : 'Ultra'),
    isDaily: limitCheck.isDaily || false,
    dailyUsed: isOwner ? 0 : (limitCheck.dailyUsed || 0),
    dailyLimit: isOwner ? 999999 : (limitCheck.dailyLimit || 1),
    teammates_trial_used: trialUsed,
    teammates_lifetime_used: isOwner ? 0 : (user.teammates_lifetime_used || 0),
    managedProviders: {
      groq: Boolean(process.env.GROQ_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
      perplexity: Boolean(process.env.PERPLEXITY_API_KEY),
      xai: Boolean(process.env.XAI_API_KEY),
      openrouter: Boolean(process.env.OPENROUTER_API_KEY),
      elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY)
    }
  });
});

app.post('/api/teammates/test-key', requireAuth, async (req, res) => {
  const { provider, apiKey } = req.body;
  if (!provider || !apiKey) {
    return res.status(400).json({ success: false, error: 'Provider and API key are required.' });
  }
  const result = await testProviderApiKey(provider, apiKey.trim());
  res.json(result);
});

app.post('/api/teammates/keys', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { provider, apiKey } = req.body;
  if (!provider) {
    return res.status(400).json({ error: 'Provider is required.' });
  }
  if (!apiKey || apiKey.trim() === '') {
    removeTeammateKey(user.id, provider);
  } else {
    saveTeammateKey(user.id, provider, apiKey.trim());
  }
  res.json({ success: true, keys: getTeammateMaskedKeys(user.id) });
});

app.post('/api/teammates/presets', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { action, preset, presetId } = req.body;
  if (action === 'delete') {
    deleteTeammatePreset(user.id, presetId);
  } else if (preset) {
    saveTeammatePreset(user.id, preset);
  }
  res.json({ success: true, presets: user.teammate_presets || [] });
});

app.post('/api/teammates/run', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const limitCheck = checkTeammatesLimit(user.id);
  if (!limitCheck.allowed) {
    return res.status(403).json({
      error: limitCheck.reason,
      limitReached: true,
      nextPlan: limitCheck.nextPlan || 'Pro',
      isDaily: limitCheck.isDaily || false
    });
  }

  const { mode, task, team } = req.body;
  const plan = user.plan || 'free';
  if (!task || !Array.isArray(team) || team.length === 0) {
    return res.status(400).json({ error: 'Task and team members are required.' });
  }

  if (team.length > 5) {
    return res.status(400).json({ error: 'Maximum 5 teammates allowed per team (limit 5/5).' });
  }

  try {
    const coordinatorPrompt = `You are Flawlesz AI's Office Coordinator.
The user's task in Task Mode is: "${task}".
The team consists of these roles and providers: ${JSON.stringify(team.map((t: any) => ({ name: t.name, role: t.role })))}.

TASK CONTRACT RULES:
1. Two separate modes exist: Task mode (default in Chat) and Meeting mode.
   In Task mode: Teammates cooperate and deliver. No debate, no commentary on each other, no role-play.
2. Split this task into concrete deliverables and assign each to a teammate by role.
3. Roles say WHAT they produce, not how they talk:
   - Researcher: facts with sources.
   - Writer: the draft.
   - Analyst: comparisons, numbers, a table.
   - Planner: steps with order and time.
   - Reviewer: a list (max 5) of concrete fixes to the output, with no opinions about other teammates.
   (For custom roles, assign a specific concrete deliverable).
4. Name the exact output for each teammate: what to produce, length, and format.
5. Plain-language rules: Short sentences, everyday words, about a grade 8 reading level. No jargon unless the user used it. If a technical term is needed, explain it simply.

Return ONLY valid JSON with no markdown formatting:
{
  "subtasks": {
    "RoleName": "Exact prompt naming deliverable, length, and format for this teammate"
  },
  "synthesis_instructions": "Instructions for summarizing results into an actionable deliverable in plain language."
}`;

    let subtasksMap: Record<string, string> = {};
    try {
      const coordResponse = await callGroqChat({
        tier: 'orbit',
        messages: [{ role: 'user', content: coordinatorPrompt }],
        temperature: 0.2,
        responseFormatJson: true,
        userEmail: user?.email,
      });
      let text = coordResponse.content?.trim() || '{}';
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
      }
      const parsed = JSON.parse(text);
      subtasksMap = parsed.subtasks || {};
    } catch {
      for (const m of team) {
        subtasksMap[m.role] = `Deliver concrete work product for: "${task}" for role ${m.role} in plain language (grade 8 level).`;
      }
    }

    const outputs: Record<string, { text?: string; error?: string }> = {};

    await Promise.all(
      team.map(async (member: { name?: string; role: string; provider: string; useManaged?: boolean; tier?: ModelTier }) => {
        const subtaskPrompt = `You are ${member.name || member.role}, assigned the role of ${member.role} in Flawlesz AI Task Mode.

TASK CONTRACT RULES:
1. COOPERATE AND DELIVER: Work cooperatively to deliver your assigned deliverable.
2. NO DEBATE, NO COMMENTARY: No debate, no commentary on other teammates, no role-play. No greetings or self-descriptions.
3. PLAIN LANGUAGE RULES: Short sentences, everyday words, about a grade 8 reading level. No jargon unless the user used it. If a technical term is needed, explain it in one short sentence.
4. WORD LIMIT: Cap your deliverable at 250 words maximum.
5. ROLE DELIVERABLE SPECIFICATION:
   ${member.role === 'Researcher' ? 'Produce facts with sources.' :
     member.role === 'Writer' ? 'Produce the draft.' :
     member.role === 'Analyst' ? 'Produce comparisons, numbers, and a table.' :
     member.role === 'Planner' ? 'Produce steps with order and time.' :
     member.role === 'Reviewer' ? 'Produce a list (maximum 5) of concrete fixes to the output, with no opinions about other teammates.' :
     'Produce concrete deliverables for your role.'}

ASSIGNED SUBTASK:
"${subtasksMap[member.role] || `Execute this task: "${task}" for role ${member.role}.`}"

OUTPUT FORMAT:
You MUST respond strictly with valid JSON with no markdown formatting:
{
  "deliverable": "Your concrete work product in plain language (grade 8 reading level, under 250 words).",
  "assumptions": ["Assumption 1", "Assumption 2"] (max 3 short lines),
  "sources": ["source 1", "source 2"],
  "open_questions": ["Question 1"] (max 2)
}`;
        try {
          let apiKey = '';
          const memberProvider = member.provider || 'groq';
          const memberTier = (member.tier as ModelTier) || 'orbit';

          if (member.useManaged && (plan === 'pro' || plan === 'ultra' || plan === 'enterprise')) {
            if (memberProvider === 'openai') apiKey = process.env.OPENAI_API_KEY || '';
            else if (memberProvider === 'groq' || memberProvider === 'flawlesz') apiKey = process.env.GROQ_API_KEY || '';
            else if (memberProvider === 'perplexity') apiKey = process.env.PERPLEXITY_API_KEY || '';
            else if (memberProvider === 'xai') apiKey = process.env.XAI_API_KEY || '';
            else if (memberProvider === 'openrouter') apiKey = process.env.OPENROUTER_API_KEY || '';
          } else {
            apiKey = getDecryptedTeammateKey(user.id, memberProvider);
          }

          if (!apiKey) {
            if (memberProvider === 'groq' && process.env.GROQ_API_KEY) {
              apiKey = process.env.GROQ_API_KEY;
            } else if (memberProvider === 'openai' && process.env.OPENAI_API_KEY) {
              apiKey = process.env.OPENAI_API_KEY;
            } else if (memberProvider === 'perplexity' && process.env.PERPLEXITY_API_KEY) {
              apiKey = process.env.PERPLEXITY_API_KEY;
            } else if (memberProvider === 'xai' && process.env.XAI_API_KEY) {
              apiKey = process.env.XAI_API_KEY;
            } else if (memberProvider === 'openrouter' && process.env.OPENROUTER_API_KEY) {
              apiKey = process.env.OPENROUTER_API_KEY;
            } else if (process.env.GROQ_API_KEY) {
              apiKey = process.env.GROQ_API_KEY;
            }
          }

          if (!apiKey) {
            throw new Error(`Not available yet — API key not configured for ${memberProvider}. Please configure a BYOK key in settings.`);
          }

          const resultText = await callProviderModel(memberProvider, apiKey, subtaskPrompt, memberTier);
          outputs[member.role] = { text: resultText };
        } catch (err: any) {
          outputs[member.role] = { error: err?.message || String(err) };
        }
      })
    );

    let synthesis = '';
    try {
      const synthesisPrompt = `You are Flawlesz AI's Office Coordinator.
User Task: "${task}"

Teammate Deliverables:
${JSON.stringify(outputs, null, 2)}

TASK MODE SYNTHESIS RULES:
1. SUMMARY STRUCTURE: Direct answers first, then open questions if any. Never repeat what each teammate said.
2. PLAIN-LANGUAGE RULES: Short sentences, everyday words, about a grade 8 reading level. No jargon unless the user used it. If a technical term is needed, explain it in one short sentence.
3. CONFLICT HANDLING: If teammate outputs conflict, flag it in one line ("Open question: A says X, B says Y"), and pick a sensible default or ask the user. Teammates never argue.
4. Keep the summary actionable, concrete, and focused on delivering the completed user task.`;

      const synthResponse = await callGroqChat({
        tier: 'orbit',
        messages: [{ role: 'user', content: synthesisPrompt }],
        temperature: 0.3,
        userEmail: user?.email,
      });
      synthesis = synthResponse.content?.trim() || 'Synthesis completed.';
    } catch (synthErr: any) {
      synthesis = `Synthesis generated from teammate outputs in plain language.\n\n${Object.entries(outputs).map(([role, out]) => `### ${role}\n${out.text || out.error}`).join('\n\n')}`;
    }

    const sessionRecord = {
      id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      task,
      mode,
      team,
      outputs,
      synthesis,
      createdAt: new Date().toISOString()
    };

    saveTeammateSession(user.id, sessionRecord);
    recordTeammatesRun(user.id);

    res.json({
      success: true,
      session: sessionRecord
    });
  } catch (err: any) {
    console.error('[TEAMMATES] Orchestration error:', err);
    res.status(500).json({ error: err?.message || 'Failed to orchestrate AI teammates.' });
  }
});

// ──────────────────────────────────────────────
// AI TEAMMATES MEETING MODE ENDPOINTS
// ──────────────────────────────────────────────

function sanitizeMeetingTextForSpeech(raw: string): string {
  if (!raw) return '';
  let clean = raw
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[*_#~>[\]()"]/g, '')
    .replace(/^\s*[-•*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  const words = clean.split(/\s+/);
  if (words.length > 60) {
    clean = words.slice(0, 60).join(' ') + '.';
  }
  return clean;
}

const ROLE_PERSPECTIVES: Record<string, string> = {
  Researcher: 'Facts, evidence, user needs, and verified sources. Focus on real data.',
  Writer: 'Clear messaging, plain words, and simple explanations that anyone can understand.',
  Analyst: 'Numbers, costs, realistic trade-offs, and simple tables.',
  Planner: 'Concrete steps, order of operations, and realistic timelines.',
  Reviewer: 'Practical fixes, blind spots, and key risks to resolve.',
  Coordinator: 'Balanced summary, decisive decisions, and clear next steps.'
};

app.post('/api/teammates/meeting/start', requireAuth, (req, res) => {
  const user = (req as any).user;
  const limitCheck = checkTeammatesLimit(user.id);
  if (!limitCheck.allowed) {
    return res.status(403).json({
      error: limitCheck.reason,
      limitReached: true,
      nextPlan: limitCheck.nextPlan || 'Pro',
      isDaily: limitCheck.isDaily || false
    });
  }

  const { topic, team } = req.body;
  if (!topic || !Array.isArray(team) || team.length < 2 || team.length > 5) {
    return res.status(400).json({ error: 'A meeting topic and 2 to 5 teammates are required.' });
  }

  // Count as one AI Teammates run toward user's plan/daily limits
  recordTeammatesRun(user.id);

  const meetingId = `meet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  res.json({
    success: true,
    meetingId
  });
});

app.post('/api/teammates/meeting/turn', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { meetingId, topic, round, turnIndex, speaker, team, transcript } = req.body;

  if (!topic || !speaker || !speaker.role) {
    return res.status(400).json({ error: 'Missing required meeting turn parameters.' });
  }

  const startTime = Date.now();
  const plan = user.plan || 'free';
  const role = speaker.role || 'Specialist';
  const name = speaker.name || role;
  const provider = speaker.provider || 'groq';

  try {
    let prompt = '';
    const otherMembers = Array.isArray(team)
      ? team.filter((m: any) => m.name !== name)
      : [];

    // Trim transcript to last 4 turns to conserve tokens and respect rate limits
    const trimmedTranscript = Array.isArray(transcript) ? transcript.slice(-4) : [];

    if (role === 'Coordinator') {
      prompt = `You are the Flawlesz AI Office Meeting Coordinator providing the closing summary for a live discussion.
Topic: "${topic}"
Discussion transcript:
${trimmedTranscript.map((t: any) => `${t.speakerName} (${t.speakerRole}): ${t.text}`).join('\n')}

Provide a direct, spoken closing summary to the user and team:
1. Clear verdict on whether to proceed
2. The top questions or concerns raised by teammates
3. Next concrete action.

STRICT SPEECH & PLAIN-LANGUAGE RULES:
- Maximum 50 words total.
- Short sentences, everyday words, about a grade 8 reading level.
- No jargon unless the user used it. If a technical term is needed, explain it simply.
- No markdown, headers, bullet points, numbers, asterisks, emojis, or symbols.
- Speak directly, plainly, and decisively.`;
    } else if (round === 1) {
      const perspective = ROLE_PERSPECTIVES[role] || 'Practical analysis and clear recommendations.';
      prompt = `You are ${name}, the ${role} in an executive team meeting.
The user presents this topic: "${topic}".
Colleagues at the table: ${otherMembers.map((m: any) => `${m.name} (${m.role})`).join(', ')}.
Your focus is: ${perspective}

Give your distinct opening perspective on this topic from the lens of your role as ${role}.
STRICT SPEECH & PLAIN-LANGUAGE RULES:
- Maximum 50 words.
- Short sentences, everyday words, about a grade 8 reading level.
- No jargon unless the user used it. If a technical term is needed, explain it simply.
- Natural, conversational spoken English.
- No markdown, bullet points, asterisks, emojis, quotes, or symbols.
- Keep it constructive, plain, and direct.`;
    } else {
      prompt = `You are ${name}, the ${role} in an executive team meeting.
Topic: "${topic}".
Recent conversation in the room:
${trimmedTranscript.map((t: any) => `${t.speakerName} (${t.speakerRole}): ${t.text}`).join('\n')}

Respond directly to what your colleagues or the user just said.
Share your role's perspective as ${role} to help the team reach a good decision.
STRICT SPEECH & PLAIN-LANGUAGE RULES:
- Maximum 50 words.
- Short sentences, everyday words, about a grade 8 reading level.
- No jargon unless the user used it.
- Natural, conversational spoken English.
- No markdown, bullet points, asterisks, emojis, quotes, or symbols.
- Discussion is short, plain, and constructive.`;
    }

    let apiKey = '';
    if (speaker.useManaged && (plan === 'pro' || plan === 'ultra' || plan === 'enterprise')) {
      if (provider === 'openai') apiKey = process.env.OPENAI_API_KEY || '';
      else if (provider === 'groq' || provider === 'flawlesz') apiKey = process.env.GROQ_API_KEY || '';
      else if (provider === 'perplexity') apiKey = process.env.PERPLEXITY_API_KEY || '';
      else if (provider === 'xai') apiKey = process.env.XAI_API_KEY || '';
      else if (provider === 'openrouter') apiKey = process.env.OPENROUTER_API_KEY || '';
    } else {
      apiKey = getDecryptedTeammateKey(user.id, provider);
    }

    if (!apiKey) {
      if (provider === 'groq' && process.env.GROQ_API_KEY) apiKey = process.env.GROQ_API_KEY;
      else if (provider === 'openai' && process.env.OPENAI_API_KEY) apiKey = process.env.OPENAI_API_KEY;
      else if (provider === 'perplexity' && process.env.PERPLEXITY_API_KEY) apiKey = process.env.PERPLEXITY_API_KEY;
      else if (provider === 'xai' && process.env.XAI_API_KEY) apiKey = process.env.XAI_API_KEY;
      else if (provider === 'openrouter' && process.env.OPENROUTER_API_KEY) apiKey = process.env.OPENROUTER_API_KEY;
      else if (process.env.GROQ_API_KEY) apiKey = process.env.GROQ_API_KEY;
    }

    if (!apiKey) {
      throw new Error(`API key not configured for ${provider}. Please configure a BYOK key in settings.`);
    }

    const rawResult = await callProviderModel(provider, apiKey, prompt);
    const spokenText = sanitizeMeetingTextForSpeech(rawResult);
    const durationMs = Date.now() - startTime;
    const estTokens = Math.ceil(prompt.length / 4 + spokenText.length / 4);

    // Generate ElevenLabs voice audio for this agent if key is configured
    let audioBase64: string | undefined = undefined;
    const elevenKey = (user.id ? getDecryptedTeammateKey(user.id, 'elevenlabs') : '') || getElevenLabsApiKey();
    if (elevenKey && spokenText.trim().length > 0) {
      try {
        const audio = await generateSpeechWithElevenLabs(spokenText, {
          agentName: name,
          agentRole: role,
          apiKey: elevenKey,
        });
        audioBase64 = audio.audioBase64;
      } catch (voiceErr: any) {
        console.warn(`[MEETING TURN VOICE] ElevenLabs audio synthesis note for ${name}:`, voiceErr.message);
      }
    }

    // Log successful turn to usage log
    logTeammateUsage(user.id, {
      meetingId,
      teammate: name,
      role,
      provider,
      tokens: estTokens,
      durationMs,
      success: true
    });

    res.json({
      success: true,
      text: spokenText,
      audioBase64,
      speakerName: name,
      speakerRole: role,
      tokens: estTokens,
      durationMs
    });
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const errMsg = err?.message || String(err);
    console.error(`[MEETING TURN ERROR] ${name} (${role}):`, errMsg);

    // Log failure honestly to usage log
    logTeammateUsage(user.id, {
      meetingId,
      teammate: name,
      role,
      provider,
      durationMs,
      success: false,
      error: errMsg
    });

    // Return honest failure to frontend without hallucinating a reply
    res.status(200).json({
      success: false,
      error: errMsg,
      speakerName: name,
      speakerRole: role
    });
  }
});

app.post('/api/teammates/meeting/save', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { meetingId, topic, team, transcript, summary } = req.body;

  if (!topic || !Array.isArray(transcript)) {
    return res.status(400).json({ error: 'Topic and transcript are required.' });
  }

  const sessionRecord = {
    id: meetingId || `meeting-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: 'meeting',
    task: `[Meeting] ${topic}`,
    topic,
    team: team || [],
    transcript,
    summary: summary || '',
    createdAt: new Date().toISOString()
  };

  saveTeammateSession(user.id, sessionRecord);

  res.json({
    success: true,
    session: sessionRecord
  });
});

// ──────────────────────────────────────────────
// VITE / STATIC SERVING
// ──────────────────────────────────────────────

async function startServer() {
  try {
    const distExists = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));
    const isProduction =
      (process.env.NODE_ENV === 'production' ||
       Boolean(process.env.K_SERVICE) ||
       Boolean(process.env.GAE_SERVICE) ||
       process.env.npm_lifecycle_event === 'start') && distExists;

    if (!isProduction) {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[SERVER] Flawlesz AI app running on http://0.0.0.0:${PORT}`);
      console.log(`  ➜  Local:   http://localhost:${PORT}/`);
      console.log(`  ➜  Network: http://0.0.0.0:${PORT}/`);
    });

    server.on('error', (err: any) => {
      console.error(`[SERVER] Server error on port ${PORT}:`, err);
    });

    // Initialize database in background so dev server accepts connections immediately
    initDatabaseState().catch((err) => {
      console.error('[DB] Failed to initialize database state:', err);
    });
  } catch (err) {
    console.error('[SERVER] Fatal error during startServer:', err);
  }
}

startServer();
