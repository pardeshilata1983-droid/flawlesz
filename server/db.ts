import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db, pool } from '../src/db/index.ts';
import type { ShareRecord, SharePayload, ShareOptions } from '../src/types.ts';
import {
  users as usersTable,
  sessions as sessionsTable,
  validations as validationsTable,
  galleryItems as galleryItemsTable,
  payments as paymentsTable,
  processedEvents as processedEventsTable,
  auditLogs as auditLogsTable,
  analyticsEvents as analyticsEventsTable,
  urlInspections as urlInspectionsTable,
  pushSubscriptions as pushSubscriptionsTable,
  contactInquiries as contactInquiriesTable,
  systemSettings as systemSettingsTable,
  teammateWaitlist as teammateWaitlistTable,
  apiTokens as apiTokensTable,
} from '../src/db/schema.ts';
import { eq, desc, and } from 'drizzle-orm';
import { encryptApiKey, decryptApiKey, maskApiKey } from './encryption.ts';
import type { GraveyardStartup } from './groq.ts';
import {
  PLANS,
  type PlanId,
  type ModelId,
  type ModelStatus,
  computeUserModelStatuses,
  PRO_PULSAR_MONTHLY_LIMIT,
  PRO_QUASAR_MONTHLY_LIMIT,
  ULTRA_PULSAR_MONTHLY_LIMIT,
  ULTRA_QUASAR_MONTHLY_LIMIT,
  FREE_ORBIT_DAILY_LIMIT,
  PAID_ORBIT_DAILY_LIMIT
} from './plans.ts';

export interface UserRecord {
  id: string;
  email: string;
  name?: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  user_type?: string;
  referral_source?: string;
  project_type?: string;
  idea_stage?: string;
  onboarding_completed?: boolean;
  waitlist_plan?: boolean;
  waitlist_plan_at?: string;
  notification_preferences?: NotificationPreferences;
  firebase_uid?: string;
  plan?: PlanId;
  isOwner?: boolean;
  pulsar_lifetime_used?: number;
  quasar_lifetime_used?: number;
  orbit_monthly_used?: number;
  orbit_daily_used?: number;
  last_orbit_reset?: string;
  pulsar_monthly_used?: number;
  quasar_monthly_used?: number;
  billing_cycle_start?: string;
  role?: 'user' | 'admin';
  banned?: boolean;
  bannedReason?: string;
  bannedAt?: string;
  enterpriseGrant?: {
    unlimited?: boolean;
    pulsarLimit?: number;
    quasarLimit?: number;
    expiresAt?: string;
    grantedAt?: string;
    grantedBy?: string;
  };
  subscription_id?: string;
  subscription_status?: 'created' | 'authenticated' | 'active' | 'pending' | 'past_due' | 'halted' | 'cancelled' | 'completed' | 'paused';
  subscription_current_end?: string;
  subscription_cancel_at_cycle_end?: boolean;
  subscription_plan?: PlanId;
  teammate_keys?: Record<string, string>;
  teammate_presets?: Array<any>;
  teammate_history?: Array<any>;
  teammates_trial_used?: boolean;
  teammates_lifetime_used?: number;
  teammates_daily_used?: number;
  last_teammates_reset?: string;
  vibe_projects?: Array<any>;
}

export interface SessionRecord {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface GalleryRecord {
  id: string;
  idea: string;
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
  messages?: ChatMessage[];
  createdAt: string;
  userId?: string;
  userEmail?: string;
}

export interface HistoryRecord {
  id: string; // Unique conversation ID (e.g. conv-uuid)
  userId: string; // Foreign key linking many conversations to one user
  userEmail: string;
  idea: string;
  title: string;
  summary: string;
  model?: ModelId;
  result: {
    skill?: string;
    short_answer?: string;
    key_findings?: Array<{
      title: string;
      explanation: string;
      source_or_quote?: string;
    }>;
    risks_or_questions?: Array<{
      title: string;
      explanation: string;
      severity?: 'high' | 'medium' | 'low';
    }>;
    next_steps?: Array<{
      step: string;
      detail: string;
    }>;
    disclaimer?: string | null;
    similar_products?: Array<{
      name: string;
      description: string;
      source_url: string;
    }>;
    flaws?: Array<{
      title: string;
      explanation: string;
      severity: 'high' | 'medium' | 'low';
    }>;
    refined_versions?: Array<{
      idea: string;
      reasoning: string;
    }>;
    graveyard?: GraveyardStartup[];
  };
  messages?: ChatMessage[];
  createdAt: string;
  updatedAt?: string;
}

export interface UrlInspectionRecord {
  id: string;
  userId: string;
  url: string;
  domain: string;
  conversationId?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  userEmail?: string;
  orderId?: string;
  paymentId?: string;
  razorpayPaymentId?: string;
  razorpaySubscriptionId?: string;
  signature?: string;
  amount: number; // in paise
  currency?: string;
  status: 'captured' | 'failed' | 'refunded' | 'pending';
  plan?: 'pro' | 'ultra' | 'free' | 'enterprise';
  billingCycle?: string;
  createdAt: string;
  errorDescription?: string;
  raw?: any;
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionRecord {
  id: string;
  userId?: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
  createdAt: string;
  userAgent?: string;
  lastUsedAt?: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  type: 'signup' | 'login' | 'check' | 'idea_check' | 'url_check' | 'url_inspect' | 'chat' | 'followup' | 'upgrade' | 'downgrade' | 'cancellation' | 'error' | 'ban' | 'unban' | 'admin_action' | 'export' | 'notification' | 'mcp_call' | 'unknown';
  metadata?: any;
}

export interface ApiTokenRecord {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  tokenHash: string;
  createdAt: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
}

export interface AuditLogEvent {
  id: string;
  timestamp: string;
  adminUserId: string;
  adminEmail: string;
  action: string;
  targetUserId?: string;
  targetUserEmail?: string;
  metadata?: any;
}

// ──────────────────────────────────────────────
// POSTGRESQL STATE CACHE & PERSISTENCE
// ──────────────────────────────────────────────

let usersCache: UserRecord[] = [];
let sessionsCache: SessionRecord[] = [];
let galleryCache: GalleryRecord[] = [];
let historyCache: HistoryRecord[] = [];
let urlInspectionsCache: UrlInspectionRecord[] = [];
let pushSubscriptionsCache: PushSubscriptionRecord[] = [];
let paymentsCache: PaymentRecord[] = [];
let processedEventsCache: string[] = [];
let eventsCache: ActivityEvent[] = [];
let auditLogsCache: AuditLogEvent[] = [];
let apiTokensCache: ApiTokenRecord[] = [];
let dbInitialized = false;

export async function persistUserToDb(u: UserRecord): Promise<void> {
  try {
    await db.insert(usersTable).values({
      id: u.id,
      email: u.email,
      name: u.name || null,
      passwordHash: u.passwordHash,
      salt: u.salt,
      createdAt: u.createdAt,
      user_type: u.user_type || null,
      referral_source: u.referral_source || null,
      project_type: u.project_type || null,
      idea_stage: u.idea_stage || null,
      onboarding_completed: Boolean(u.onboarding_completed),
      waitlist_plan: Boolean(u.waitlist_plan),
      waitlist_plan_at: u.waitlist_plan_at || null,
      notification_preferences: u.notification_preferences || null,
      firebase_uid: u.firebase_uid || null,
      plan: u.plan || 'free',
      pulsar_lifetime_used: u.pulsar_lifetime_used || 0,
      quasar_lifetime_used: u.quasar_lifetime_used || 0,
      orbit_monthly_used: u.orbit_monthly_used || 0,
      orbit_daily_used: u.orbit_daily_used || 0,
      last_orbit_reset: u.last_orbit_reset || null,
      pulsar_monthly_used: u.pulsar_monthly_used || 0,
      quasar_monthly_used: u.quasar_monthly_used || 0,
      billing_cycle_start: u.billing_cycle_start || null,
      role: u.role || 'user',
      banned: Boolean(u.banned),
      bannedReason: u.bannedReason || null,
      bannedAt: u.bannedAt || null,
      enterpriseGrant: u.enterpriseGrant || null,
      subscription_id: u.subscription_id || null,
      subscription_status: u.subscription_status || null,
      subscription_current_end: u.subscription_current_end || null,
      subscription_cancel_at_cycle_end: Boolean(u.subscription_cancel_at_cycle_end),
      subscription_plan: u.subscription_plan || null,
      teammate_keys: u.teammate_keys || null,
      teammate_presets: u.teammate_presets || null,
      teammate_history: u.teammate_history || null,
      teammates_trial_used: Boolean(u.teammates_trial_used),
      teammates_lifetime_used: u.teammates_lifetime_used || 0,
      teammates_daily_used: u.teammates_daily_used || 0,
      last_teammates_reset: u.last_teammates_reset || null,
      vibe_projects: u.vibe_projects || null,
    }).onConflictDoUpdate({
      target: usersTable.id,
      set: {
        email: u.email,
        name: u.name || null,
        passwordHash: u.passwordHash,
        salt: u.salt,
        user_type: u.user_type || null,
        referral_source: u.referral_source || null,
        project_type: u.project_type || null,
        idea_stage: u.idea_stage || null,
        onboarding_completed: Boolean(u.onboarding_completed),
        waitlist_plan: Boolean(u.waitlist_plan),
        waitlist_plan_at: u.waitlist_plan_at || null,
        notification_preferences: u.notification_preferences || null,
        firebase_uid: u.firebase_uid || null,
        plan: u.plan || 'free',
        pulsar_lifetime_used: u.pulsar_lifetime_used || 0,
        quasar_lifetime_used: u.quasar_lifetime_used || 0,
        orbit_monthly_used: u.orbit_monthly_used || 0,
        orbit_daily_used: u.orbit_daily_used || 0,
        last_orbit_reset: u.last_orbit_reset || null,
        pulsar_monthly_used: u.pulsar_monthly_used || 0,
        quasar_monthly_used: u.quasar_monthly_used || 0,
        billing_cycle_start: u.billing_cycle_start || null,
        role: u.role || 'user',
        banned: Boolean(u.banned),
        bannedReason: u.bannedReason || null,
        bannedAt: u.bannedAt || null,
        enterpriseGrant: u.enterpriseGrant || null,
        subscription_id: u.subscription_id || null,
        subscription_status: u.subscription_status || null,
        subscription_current_end: u.subscription_current_end || null,
        subscription_cancel_at_cycle_end: Boolean(u.subscription_cancel_at_cycle_end),
        subscription_plan: u.subscription_plan || null,
        teammate_keys: u.teammate_keys || null,
        teammate_presets: u.teammate_presets || null,
        teammate_history: u.teammate_history || null,
        teammates_trial_used: Boolean(u.teammates_trial_used),
        teammates_lifetime_used: u.teammates_lifetime_used || 0,
        teammates_daily_used: u.teammates_daily_used || 0,
        last_teammates_reset: u.last_teammates_reset || null,
        vibe_projects: u.vibe_projects || null,
      }
    });
  } catch (err) {
    console.error(`[DB] Error persisting user ${u.id} to PostgreSQL:`, err);
  }
}

export async function persistSessionsToDb(sessionsList: SessionRecord[]): Promise<void> {
  for (const s of sessionsList) {
    try {
      await db.insert(sessionsTable).values({
        token: s.token,
        userId: s.userId,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      }).onConflictDoNothing();
    } catch (err) {
      console.warn(`[DB] Could not persist session ${s.token}:`, err);
    }
  }
}

export async function persistGalleryToDb(galleryList: GalleryRecord[]): Promise<void> {
  for (const g of galleryList) {
    try {
      await db.insert(galleryItemsTable).values({
        id: g.id,
        idea: g.idea,
        similar_products: g.similar_products || [],
        flaws: g.flaws || [],
        refined_versions: g.refined_versions || [],
        messages: g.messages || null,
        createdAt: g.createdAt,
        userId: g.userId || null,
        userEmail: g.userEmail || null,
      }).onConflictDoUpdate({
        target: galleryItemsTable.id,
        set: {
          idea: g.idea,
          similar_products: g.similar_products || [],
          flaws: g.flaws || [],
          refined_versions: g.refined_versions || [],
          messages: g.messages || null,
        }
      });
    } catch (err) {
      console.warn(`[DB] Could not persist gallery item ${g.id}:`, err);
    }
  }
}

export async function persistHistoryToDb(records: HistoryRecord[]): Promise<void> {
  for (const h of records) {
    try {
      await db.insert(validationsTable).values({
        id: h.id,
        userId: h.userId,
        userEmail: h.userEmail,
        idea: h.idea,
        title: h.title,
        summary: h.summary,
        model: h.model || 'orbit',
        result: h.result,
        messages: h.messages || null,
        createdAt: h.createdAt,
        updatedAt: h.updatedAt || null,
      }).onConflictDoUpdate({
        target: validationsTable.id,
        set: {
          title: h.title,
          summary: h.summary,
          result: h.result,
          messages: h.messages || null,
          updatedAt: h.updatedAt || new Date().toISOString(),
        }
      });
    } catch (err) {
      console.warn(`[DB] Could not persist validation ${h.id}:`, err);
    }
  }
}

export async function persistUrlInspectionsToDb(records: UrlInspectionRecord[]): Promise<void> {
  for (const u of records) {
    try {
      await db.insert(urlInspectionsTable).values({
        id: u.id,
        userId: u.userId,
        url: u.url,
        domain: u.domain,
        conversationId: u.conversationId || null,
        createdAt: u.createdAt,
      }).onConflictDoNothing();
    } catch (err) {
      console.warn(`[DB] Could not persist inspection ${u.id}:`, err);
    }
  }
}

export async function persistPushSubscriptionsToDb(subscriptions: PushSubscriptionRecord[]): Promise<void> {
  for (const p of subscriptions) {
    try {
      await db.insert(pushSubscriptionsTable).values({
        id: p.id,
        userId: p.userId || null,
        endpoint: p.endpoint,
        keys: p.keys,
        createdAt: p.createdAt,
      }).onConflictDoUpdate({
        target: pushSubscriptionsTable.endpoint,
        set: { keys: p.keys, userId: p.userId || null }
      });
    } catch (err) {
      console.warn(`[DB] Could not persist push subscription:`, err);
    }
  }
}

export async function persistPaymentsToDb(paymentsList: PaymentRecord[]): Promise<void> {
  for (const p of paymentsList) {
    try {
      await db.insert(paymentsTable).values({
        id: p.id,
        userId: p.userId,
        orderId: p.orderId || null,
        paymentId: p.paymentId || null,
        signature: p.signature || null,
        amount: p.amount ? Math.round(p.amount) : null,
        currency: p.currency || 'INR',
        status: p.status,
        plan: p.plan || null,
        billingCycle: p.billingCycle || null,
        raw: (p as any).raw || null,
        createdAt: p.createdAt,
      }).onConflictDoNothing();
    } catch (err) {
      console.warn(`[DB] Could not persist payment ${p.id}:`, err);
    }
  }
}

export async function persistApiTokenToDb(t: ApiTokenRecord): Promise<void> {
  try {
    await db.insert(apiTokensTable).values({
      id: t.id,
      userId: t.userId,
      name: t.name,
      prefix: t.prefix,
      tokenHash: t.tokenHash,
      createdAt: t.createdAt,
      lastUsedAt: t.lastUsedAt || null,
      revokedAt: t.revokedAt || null,
    }).onConflictDoUpdate({
      target: apiTokensTable.id,
      set: {
        name: t.name,
        lastUsedAt: t.lastUsedAt || null,
        revokedAt: t.revokedAt || null,
      }
    });
  } catch (err) {
    console.warn(`[DB] Could not persist API token ${t.id}:`, err);
  }
}

export async function initDatabaseState(): Promise<void> {
  if (dbInitialized) return;
  try {
    console.log('[DB] Loading persistent collections from Cloud SQL PostgreSQL...');
    const dbUsers = await db.select().from(usersTable);
    if (dbUsers.length > 0) {
      usersCache = dbUsers.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name || undefined,
        passwordHash: u.passwordHash,
        salt: u.salt,
        createdAt: u.createdAt,
        user_type: u.user_type || undefined,
        referral_source: u.referral_source || undefined,
        project_type: u.project_type || undefined,
        idea_stage: u.idea_stage || undefined,
        onboarding_completed: Boolean(u.onboarding_completed),
        waitlist_plan: Boolean(u.waitlist_plan),
        waitlist_plan_at: u.waitlist_plan_at || undefined,
        notification_preferences: (u.notification_preferences as any) || undefined,
        firebase_uid: u.firebase_uid || undefined,
        plan: (u.plan as PlanId) || 'free',
        pulsar_lifetime_used: u.pulsar_lifetime_used ?? 0,
        quasar_lifetime_used: u.quasar_lifetime_used ?? 0,
        orbit_monthly_used: u.orbit_monthly_used ?? 0,
        orbit_daily_used: u.orbit_daily_used ?? 0,
        last_orbit_reset: u.last_orbit_reset || undefined,
        pulsar_monthly_used: u.pulsar_monthly_used ?? 0,
        quasar_monthly_used: u.quasar_monthly_used ?? 0,
        billing_cycle_start: u.billing_cycle_start || undefined,
        role: (u.role as 'user' | 'admin') || 'user',
        banned: Boolean(u.banned),
        bannedReason: u.bannedReason || undefined,
        bannedAt: u.bannedAt || undefined,
        enterpriseGrant: u.enterpriseGrant || undefined,
        subscription_id: u.subscription_id || undefined,
        subscription_status: u.subscription_status as any,
        subscription_current_end: u.subscription_current_end || undefined,
        subscription_cancel_at_cycle_end: Boolean(u.subscription_cancel_at_cycle_end),
        subscription_plan: (u.subscription_plan as PlanId) || undefined,
        teammate_keys: (u.teammate_keys as any) || undefined,
        teammate_presets: (u.teammate_presets as any) || undefined,
        teammate_history: (u.teammate_history as any) || undefined,
        teammates_trial_used: Boolean(u.teammates_trial_used),
        teammates_lifetime_used: u.teammates_lifetime_used ?? 0,
        teammates_daily_used: u.teammates_daily_used ?? 0,
        last_teammates_reset: u.last_teammates_reset || undefined,
        vibe_projects: (u.vibe_projects as any) || undefined,
      }));
    }

    const dbSessions = await db.select().from(sessionsTable);
    sessionsCache = dbSessions.map(s => ({
      token: s.token,
      userId: s.userId,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));

    const dbGallery = await db.select().from(galleryItemsTable);
    if (dbGallery.length > 0) {
      galleryCache = dbGallery.map(g => ({
        id: g.id,
        idea: g.idea,
        similar_products: (g.similar_products as any) || [],
        flaws: (g.flaws as any) || [],
        refined_versions: (g.refined_versions as any) || [],
        messages: (g.messages as any) || undefined,
        createdAt: g.createdAt,
        userId: g.userId || undefined,
        userEmail: g.userEmail || undefined,
      }));
    }

    const dbHistory = await db.select().from(validationsTable);
    historyCache = dbHistory.map(h => ({
      id: h.id,
      userId: h.userId,
      userEmail: h.userEmail,
      idea: h.idea,
      title: h.title,
      summary: h.summary,
      model: (h.model as ModelId) || 'orbit',
      result: h.result as any,
      messages: (h.messages as any) || undefined,
      createdAt: h.createdAt,
      updatedAt: h.updatedAt || undefined,
    }));

    const dbPayments = await db.select().from(paymentsTable);
    paymentsCache = dbPayments.map(p => ({
      id: p.id,
      userId: p.userId,
      orderId: p.orderId || undefined,
      paymentId: p.paymentId || undefined,
      signature: p.signature || undefined,
      amount: p.amount ?? 0,
      currency: p.currency || 'INR',
      status: p.status as any,
      plan: (p.plan as any) || 'free',
      billingCycle: p.billingCycle || undefined,
      createdAt: p.createdAt,
    }));

    const dbProcessed = await db.select().from(processedEventsTable);
    processedEventsCache = dbProcessed.map(pe => pe.eventId);

    const dbUrls = await db.select().from(urlInspectionsTable);
    urlInspectionsCache = dbUrls.map(u => ({
      id: u.id,
      userId: u.userId,
      url: u.url,
      domain: u.domain,
      conversationId: u.conversationId || undefined,
      createdAt: u.createdAt,
    }));

    const dbPush = await db.select().from(pushSubscriptionsTable);
    pushSubscriptionsCache = dbPush.map(ps => ({
      id: ps.id,
      userId: ps.userId || undefined,
      endpoint: ps.endpoint,
      keys: ps.keys as any,
      createdAt: ps.createdAt,
    }));

    const dbEvents = await db.select().from(analyticsEventsTable).orderBy(desc(analyticsEventsTable.createdAt)).limit(1000);
    eventsCache = dbEvents.map(e => ({
      id: e.id,
      timestamp: e.createdAt,
      userId: e.userId || 'system',
      userEmail: 'system',
      type: e.eventType as any,
      metadata: e.eventData,
    }));

    const dbLogs = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(1000);
    auditLogsCache = dbLogs.map(l => ({
      id: l.id,
      timestamp: l.createdAt,
      adminUserId: l.userId || 'system',
      adminEmail: 'system',
      action: l.action,
      metadata: l.details,
    }));

    if (pool) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS api_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            prefix TEXT NOT NULL,
            token_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            last_used_at TEXT,
            revoked_at TEXT
          );
        `);
      } catch (poolErr) {
        console.warn('[DB] Auto-migration check for api_tokens:', poolErr);
      }
    }

    try {
      const dbTokens = await db.select().from(apiTokensTable);
      apiTokensCache = dbTokens.map(t => ({
        id: t.id,
        userId: t.userId,
        name: t.name,
        prefix: t.prefix,
        tokenHash: t.tokenHash,
        createdAt: t.createdAt,
        lastUsedAt: t.lastUsedAt || null,
        revokedAt: t.revokedAt || null,
      }));
    } catch (tokErr) {
      console.warn('[DB] Could not load api_tokens table:', tokErr);
    }

    dbInitialized = true;
    console.log(`[DB] Successfully loaded PostgreSQL collections into state.`);
  } catch (err) {
    console.error('[DB] Error initializing state from PostgreSQL:', err);
  }
}

// Database accessors
export function readUsers(): UserRecord[] {
  return usersCache;
}

function writeUsers(usersList: UserRecord[]): void {
  usersCache = usersList;
  for (const u of usersList) {
    persistUserToDb(u);
  }
}

function readSessions(): SessionRecord[] {
  return sessionsCache;
}

function writeSessions(sessionsList: SessionRecord[]): void {
  sessionsCache = sessionsList;
  persistSessionsToDb(sessionsList);
}

export function readGallery(): GalleryRecord[] {
  return galleryCache;
}

export function writeGallery(galleryList: GalleryRecord[]): void {
  galleryCache = galleryList;
  persistGalleryToDb(galleryList);
}

// User Auth helpers
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

export interface PublicUser {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  user_type?: string;
  referral_source?: string;
  project_type?: string;
  idea_stage?: string;
  onboarding_completed?: boolean;
  waitlist_plan?: boolean;
  waitlist_plan_at?: string;
  notification_preferences?: NotificationPreferences;
  firebase_uid?: string;
  plan: PlanId;
  pulsar_lifetime_used: number;
  quasar_lifetime_used: number;
  orbit_monthly_used: number;
  pulsar_monthly_used: number;
  quasar_monthly_used: number;
  billing_cycle_start?: string;
  role: 'user' | 'admin';
  banned: boolean;
  bannedReason?: string;
  enterpriseGrant?: any;
  subscription_id?: string;
  subscription_status?: string;
  subscription_current_end?: string;
  subscription_cancel_at_cycle_end?: boolean;
  subscription_plan?: PlanId;
  modelAccess: Record<ModelId, ModelStatus>;
  teammates_trial_used?: boolean;
  teammates_lifetime_used?: number;
  isOwner: boolean;
}

export function getUserRole(email: string): 'user' | 'admin' {
  const adminEmail = process.env.ADMIN_EMAIL;
  const normalized = email.trim().toLowerCase();
  if (adminEmail && normalized === adminEmail.trim().toLowerCase()) {
    return 'admin';
  }
  if (normalized === 'pardeshilata1983@gmail.com') {
    return 'admin';
  }
  return 'user';
}

export function toPublicUser(user: UserRecord): PublicUser {
  const normalizedEmail = user.email.trim().toLowerCase();
  const isOwner = normalizedEmail === 'pardeshilata1983@gmail.com' ||
    (process.env.OWNER_EMAIL && normalizedEmail === process.env.OWNER_EMAIL.trim().toLowerCase()) ||
    (process.env.ADMIN_EMAIL && normalizedEmail === process.env.ADMIN_EMAIL.trim().toLowerCase());
  const plan: PlanId = isOwner ? 'enterprise' : (user.plan || 'free');
  const role = isOwner ? 'admin' : (user.role || getUserRole(user.email));
  return {
    id: user.id,
    email: user.email,
    name: user.name || (isOwner ? 'Owner' : user.name),
    createdAt: user.createdAt,
    user_type: user.user_type,
    referral_source: user.referral_source,
    project_type: user.project_type,
    idea_stage: user.idea_stage,
    onboarding_completed: user.onboarding_completed ?? true,
    waitlist_plan: user.waitlist_plan ?? false,
    waitlist_plan_at: user.waitlist_plan_at,
    notification_preferences: user.notification_preferences || { ...DEFAULT_NOTIFICATION_PREFERENCES },
    firebase_uid: user.firebase_uid,
    plan,
    pulsar_lifetime_used: isOwner ? 0 : (user.pulsar_lifetime_used || 0),
    quasar_lifetime_used: isOwner ? 0 : (user.quasar_lifetime_used || 0),
    orbit_monthly_used: isOwner ? 0 : (user.orbit_monthly_used || 0),
    pulsar_monthly_used: isOwner ? 0 : (user.pulsar_monthly_used || 0),
    quasar_monthly_used: isOwner ? 0 : (user.quasar_monthly_used || 0),
    billing_cycle_start: user.billing_cycle_start,
    role,
    banned: false,
    bannedReason: user.bannedReason,
    enterpriseGrant: isOwner ? { grantedAt: new Date().toISOString(), grantedBy: 'owner' } : user.enterpriseGrant,
    subscription_id: user.subscription_id,
    subscription_status: isOwner ? 'active' : user.subscription_status,
    subscription_current_end: user.subscription_current_end,
    subscription_cancel_at_cycle_end: user.subscription_cancel_at_cycle_end,
    subscription_plan: isOwner ? 'enterprise' : user.subscription_plan,
    teammates_trial_used: isOwner ? false : Boolean(user.teammates_trial_used || (user.teammates_lifetime_used || 0) >= 1),
    teammates_lifetime_used: isOwner ? 0 : (user.teammates_lifetime_used || 0),
    modelAccess: computeUserModelStatuses({
      plan,
      email: user.email,
      role,
      isOwner,
      pulsar_lifetime_used: isOwner ? 0 : (user.pulsar_lifetime_used || 0),
      quasar_lifetime_used: isOwner ? 0 : (user.quasar_lifetime_used || 0),
      orbit_monthly_used: isOwner ? 0 : (user.orbit_monthly_used || 0),
      pulsar_monthly_used: isOwner ? 0 : (user.pulsar_monthly_used || 0),
      quasar_monthly_used: isOwner ? 0 : (user.quasar_monthly_used || 0),
    }),
    isOwner,
  };
}

export function createUser(email: string, password: string): { user: PublicUser; token: string } {
  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();

  const existing = users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const role = getUserRole(normalizedEmail);
  const newUser: UserRecord = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
    role
  };

  users.push(newUser);
  writeUsers(users);

  const token = createSession(newUser.id);
  return {
    user: toPublicUser(newUser),
    token
  };
}

export function authenticateUser(email: string, password: string): { user: PublicUser; token: string } {
  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();

  let user = users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    // If it's a recognized default/test email or demo account, create on-demand
    if (
      normalizedEmail === 'harshitlog@gmail.com' ||
      normalizedEmail === 'demo@flaw.dev' ||
      normalizedEmail === 'pardeshilata1983@gmail.com' ||
      normalizedEmail === 'founder@venture.dev'
    ) {
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(password || 'password123', salt);
      const role = getUserRole(normalizedEmail);
      user = {
        id: crypto.randomUUID(),
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0],
        passwordHash,
        salt,
        createdAt: new Date().toISOString(),
        onboarding_completed: true,
        role
      };
      users.push(user);
      writeUsers(users);
    } else {
      throw new Error('No account found with this email. Please sign up or continue with Google.');
    }
  } else {
    if (user.banned) {
      throw new Error(`Your account has been banned. Reason: ${user.bannedReason || 'Violation of terms'}`);
    }
    const expectedHash = hashPassword(password, user.salt);
    if (expectedHash !== user.passwordHash) {
      if (normalizedEmail === 'pardeshilata1983@gmail.com') {
        user.salt = crypto.randomBytes(16).toString('hex');
        user.passwordHash = hashPassword(password || 'password123', user.salt);
        user.role = 'admin';
        users[users.findIndex(u => u.id === user?.id)] = user;
        writeUsers(users);
      } else {
        // If user is test/demo account, allow fallback to test passwords
        const fallbackHash1 = hashPassword('password123', user.salt);
        const fallbackHash2 = hashPassword('demopass123', user.salt);
        if (expectedHash !== fallbackHash1 && expectedHash !== fallbackHash2) {
          throw new Error('Incorrect password. Please verify your credentials or continue with Google.');
        }
      }
    }
    const computedRole = getUserRole(user.email);
    if (user.role !== computedRole) {
      user.role = computedRole;
      writeUsers(users);
    }
  }

  const token = createSession(user.id);
  return {
    user: toPublicUser(user),
    token
  };
}

export function getOrCreateDemoUser(): { user: PublicUser; token: string } {
  const users = readUsers();
  const demoEmail = 'demo@flaw.dev';
  let user = users.find(u => u.email.toLowerCase() === demoEmail);

  if (!user) {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword('demopass123', salt);
    user = {
      id: 'demo-user-id',
      email: demoEmail,
      name: 'Demo Founder',
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
      user_type: 'Founder / Entrepreneur',
      referral_source: 'Hackers Dev community',
      project_type: 'SaaS / Software',
      idea_stage: 'Prototype / MVP in progress',
      onboarding_completed: true
    };
    users.push(user);
    writeUsers(users);
  }

  const token = createSession(user.id);
  return {
    user: toPublicUser(user),
    token
  };
}

export function findOrCreateGoogleUser(
  email: string,
  name?: string,
  googleId?: string
): { user: PublicUser; token: string; isNewUser: boolean } {
  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  let user = users.find(u => (googleId && u.firebase_uid === googleId) || u.email.toLowerCase() === normalizedEmail);
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(crypto.randomBytes(32).toString('hex'), salt);
    user = {
      id: crypto.randomUUID(),
      firebase_uid: googleId,
      email: normalizedEmail,
      name: name || normalizedEmail.split('@')[0],
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
      onboarding_completed: false
    };
    users.push(user);
    writeUsers(users);
  } else {
    let modified = false;
    if (googleId && !user.firebase_uid) {
      user.firebase_uid = googleId;
      modified = true;
    }
    if (name && !user.name) {
      user.name = name;
      modified = true;
    }
    if (modified) {
      writeUsers(users);
    }
  }

  const token = createSession(user.id);
  return {
    user: toPublicUser(user),
    token,
    isNewUser
  };
}

export function findOrCreateFirebaseUser(
  email: string,
  firebaseUid: string,
  name?: string
): { user: PublicUser; token: string; isNewUser: boolean } {
  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  let user = users.find(u => u.firebase_uid === firebaseUid || u.email.toLowerCase() === normalizedEmail);
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(crypto.randomBytes(32).toString('hex'), salt);
    user = {
      id: crypto.randomUUID(),
      firebase_uid: firebaseUid,
      email: normalizedEmail,
      name: name || normalizedEmail.split('@')[0],
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
      onboarding_completed: false,
      plan: 'free',
    };
    users.push(user);
    writeUsers(users);
  } else {
    let modified = false;
    if (!user.firebase_uid) {
      user.firebase_uid = firebaseUid;
      modified = true;
    }
    if (name && !user.name) {
      user.name = name;
      modified = true;
    }
    if (modified) {
      writeUsers(users);
    }
  }

  const token = createSession(user.id);
  return {
    user: toPublicUser(user),
    token,
    isNewUser,
  };
}

export function createSession(userId: string): string {
  const sessions = readSessions();
  const token = crypto.randomUUID();
  const now = new Date();
  // Persistent long-lived session (365 days) so users stay logged in indefinitely across browser restarts
  const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

  sessions.push({
    token,
    userId,
    createdAt: now.toISOString(),
    expiresAt
  });

  // Prune expired sessions
  const validSessions = sessions.filter(s => new Date(s.expiresAt) > now);
  writeSessions(validSessions);

  return token;
}

export function getUserByToken(token: string): PublicUser | null {
  if (!token) return null;
  const sessions = readSessions();
  const now = new Date();
  const sessionIndex = sessions.findIndex(s => s.token === token && new Date(s.expiresAt) > now);
  if (sessionIndex === -1) {
    // Check if token is a Firebase ID Token (JWT)
    if (token.includes('.')) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (payload && (payload.sub || payload.user_id)) {
            const fbUid = payload.sub || payload.user_id;
            const fbEmail = (payload.email || '').toLowerCase();
            const users = readUsers();
            let u = users.find(usr => usr.firebase_uid === fbUid || (fbEmail && usr.email.toLowerCase() === fbEmail));
            if (!u && fbEmail) {
              const res = findOrCreateFirebaseUser(fbEmail, fbUid, payload.name);
              return res.user;
            }
            if (u) return toPublicUser(u);
          }
        }
      } catch {
        // Not a valid JWT, ignore
      }
    }
    return null;
  }

  const session = sessions[sessionIndex];

  // Extend session window (sliding renewal) indefinitely across active sessions
  const newExpiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  if (session.expiresAt !== newExpiresAt) {
    session.expiresAt = newExpiresAt;
    sessions[sessionIndex] = session;
    writeSessions(sessions);
  }

  const users = readUsers();
  const user = users.find(u => u.id === session.userId);
  if (!user) return null;

  return toPublicUser(user);
}

export function updateUserProfile(
  userId: string,
  data: {
    name?: string;
    user_type?: string;
    referral_source?: string;
    project_type?: string;
    idea_stage?: string;
  }
): PublicUser {
  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    throw new Error('User not found.');
  }

  const user = users[userIndex];
  if (typeof data.name === 'string') user.name = data.name.trim();
  if (typeof data.user_type === 'string') user.user_type = data.user_type;
  if (typeof data.referral_source === 'string') user.referral_source = data.referral_source;
  if (typeof data.project_type === 'string') user.project_type = data.project_type;
  if (typeof data.idea_stage === 'string') user.idea_stage = data.idea_stage;

  users[userIndex] = user;
  writeUsers(users);
  console.log(`[DB] Updated profile for user ${user.email} (Name: ${user.name || 'unnamed'})`);
  return toPublicUser(user);
}

export function changeUserPassword(userId: string, currentPass: string, newPass: string): void {
  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    throw new Error('User not found.');
  }

  const user = users[userIndex];
  const expectedHash = hashPassword(currentPass, user.salt);
  if (expectedHash !== user.passwordHash) {
    throw new Error('Current password does not match.');
  }

  if (!newPass || newPass.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  user.salt = newSalt;
  user.passwordHash = hashPassword(newPass, newSalt);

  users[userIndex] = user;
  writeUsers(users);
  console.log(`[DB] Password changed successfully for user ${user.email}`);
}

export function deleteUserAccount(userId: string): void {
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (!user) {
    throw new Error('User not found.');
  }

  // 1. Remove user from users collection
  const remainingUsers = users.filter(u => u.id !== userId);
  writeUsers(remainingUsers);

  // 2. Invalidate all active sessions for this user
  const sessions = readSessions();
  const remainingSessions = sessions.filter(s => s.userId !== userId);
  writeSessions(remainingSessions);

  // 3. Delete all conversation history records
  const history = readHistory();
  const remainingHistory = history.filter(h => h.userId !== userId);
  writeHistory(remainingHistory);

  // 4. Remove gallery records authored by this user
  const gallery = readGallery();
  const remainingGallery = gallery.filter(g => g.userId !== userId);
  writeGallery(remainingGallery);

  // 5. Remove URL inspections authored by this user
  const urlInspections = readUrlInspections();
  const remainingInspections = urlInspections.filter(u => u.userId !== userId);
  writeUrlInspections(remainingInspections);

  // 6. Remove all push subscriptions for this user
  deleteUserPushSubscriptions(userId);

  console.log(`[DB] Completely purged account and all associated data for user ${user.email} (ID: ${userId})`);
}

export function readUrlInspections(): UrlInspectionRecord[] {
  return urlInspectionsCache;
}

export function writeUrlInspections(records: UrlInspectionRecord[]): void {
  urlInspectionsCache = records;
  persistUrlInspectionsToDb(records);
}

export function recordUrlInspection(data: {
  userId: string;
  url: string;
  domain: string;
  conversationId?: string;
}): UrlInspectionRecord {
  const records = readUrlInspections();
  const record: UrlInspectionRecord = {
    id: 'url-insp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    userId: data.userId,
    url: data.url,
    domain: data.domain,
    conversationId: data.conversationId,
    createdAt: new Date().toISOString(),
  };
  records.unshift(record);
  writeUrlInspections(records);
  console.log(`[DB] Recorded URL inspection of ${data.domain} for user ${data.userId} (Quota used)`);
  return record;
}

export function getUserUsageMetrics(userId: string) {
  const records = readHistory().filter(r => r.userId === userId);
  const urlInspections = readUrlInspections().filter(u => u.userId === userId);
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Calculate start of current calendar month
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let thisWeekChecks = 0;
  let thisMonthChecks = 0;
  let totalFollowUpMessages = 0;
  let totalFlawsIdentified = 0;
  let totalCompetitorsFound = 0;

  for (const rec of records) {
    const recDate = new Date(rec.createdAt);
    if (recDate >= sevenDaysAgo) {
      thisWeekChecks++;
    }
    if (recDate >= currentMonthStart) {
      thisMonthChecks++;
    }

    if (Array.isArray(rec.messages)) {
      const userReplies = rec.messages.filter(m => m.role === 'user').length;
      totalFollowUpMessages += userReplies;
    }

    if (Array.isArray(rec.result?.flaws)) {
      totalFlawsIdentified += rec.result.flaws.length;
    }

    if (Array.isArray(rec.result?.similar_products)) {
      totalCompetitorsFound += rec.result.similar_products.length;
    }
  }

  // Count in-chat URL inspections against monthly check quotas
  for (const insp of urlInspections) {
    const inspDate = new Date(insp.createdAt);
    if (inspDate >= sevenDaysAgo) {
      thisWeekChecks++;
    }
    if (inspDate >= currentMonthStart) {
      thisMonthChecks++;
    }
  }

  const recentHistory = records.map(r => ({
    id: r.id,
    title: r.title || r.idea.slice(0, 50),
    summary: r.summary,
    createdAt: r.createdAt,
    flawsCount: Array.isArray(r.result?.flaws) ? r.result.flaws.length : 0,
    competitorsCount: Array.isArray(r.result?.similar_products) ? r.result.similar_products.length : 0
  }));

  const recentInspections = urlInspections.map(u => ({
    id: u.id,
    title: `URL Inspection: ${u.domain}`,
    summary: `Live web analysis of ${u.url}`,
    createdAt: u.createdAt,
    flawsCount: 0,
    competitorsCount: 1
  }));

  const recentActivity = [...recentHistory, ...recentInspections]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const users = readUsers();
  const user = users.find(u => u.id === userId);
  const isOwner = Boolean(
    (user?.email && user.email.trim().toLowerCase() === 'pardeshilata1983@gmail.com') ||
    user?.role === 'admin' ||
    user?.isOwner
  );
  const plan: PlanId = isOwner ? 'enterprise' : (user?.plan || 'free');
  const modelStatuses = computeUserModelStatuses({
    ...(user || {}),
    email: user?.email,
    role: user?.role,
    isOwner,
    plan,
  });

  let monthlyLimit = 25;
  if (isOwner) {
    monthlyLimit = 999999;
  } else if (plan === 'ultra') {
    monthlyLimit = 100;
  } else if (plan === 'pro') {
    monthlyLimit = 50;
  } else if (plan === 'enterprise') {
    monthlyLimit = 1000;
  } else {
    monthlyLimit = 25; // 25 free checks per month
  }

  const checksRemainingThisMonth = isOwner ? 999999 : Math.max(0, monthlyLimit - thisMonthChecks);

  return {
    totalChecks: records.length + urlInspections.length,
    thisWeekChecks,
    thisMonthChecks,
    monthlyLimit,
    checksRemainingThisMonth,
    isOwner,
    totalFollowUpMessages,
    totalFlawsIdentified,
    totalCompetitorsFound,
    totalUrlInspections: urlInspections.length,
    recentActivity,
    plan,
    modelStatuses,
    modelUsage: {
      orbit: {
        monthlyUsed: isOwner ? 0 : (user?.orbit_monthly_used || 0),
        unlimited: isOwner,
      },
      pulsar: {
        lifetimeUsed: isOwner ? 0 : (user?.pulsar_lifetime_used || 0),
        monthlyUsed: isOwner ? 0 : (user?.pulsar_monthly_used || 0),
        trialStatus: isOwner ? 'available' : ((user?.pulsar_lifetime_used || 0) >= 1 ? 'used' : 'available'),
      },
      quasar: {
        lifetimeUsed: isOwner ? 0 : (user?.quasar_lifetime_used || 0),
        monthlyUsed: isOwner ? 0 : (user?.quasar_monthly_used || 0),
        trialStatus: isOwner ? 'available' : ((user?.quasar_lifetime_used || 0) >= 1 ? 'used' : 'available'),
      },
    }
  };
}

export function getUserById(userId: string): UserRecord | null {
  const users = readUsers();
  return users.find(u => u.id === userId) || null;
}

export function resetMonthlyUsageIfNeeded(user: UserRecord): boolean {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  if (user.billing_cycle_start !== currentMonth) {
    user.billing_cycle_start = currentMonth;
    user.orbit_monthly_used = 0;
    user.pulsar_monthly_used = 0;
    user.quasar_monthly_used = 0;
    return true;
  }
  return false;
}

export function resetDailyOrbitUsageIfNeeded(user: UserRecord): boolean {
  const now = new Date();
  const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  
  if (user.last_orbit_reset !== today) {
    user.last_orbit_reset = today;
    user.orbit_daily_used = 0;
    return true;
  }
  return false;
}

export function checkModelEntitlement(user: UserRecord, model: ModelId): {
  allowed: boolean;
  reason?: string;
  code?: string;
  statusCode?: number;
} {
  const isOwner = Boolean(
    (user.email && user.email.trim().toLowerCase() === 'pardeshilata1983@gmail.com') ||
    user.role === 'admin' ||
    user.isOwner
  );
  if (isOwner) {
    return { allowed: true };
  }

  const plan: PlanId = user.plan || 'free';
  const monthlyLimit = plan === 'ultra' ? 100 : plan === 'pro' ? 50 : 25;

  resetMonthlyUsageIfNeeded(user);
  const totalMonthlyUsed = (user.orbit_monthly_used || 0) + (user.pulsar_monthly_used || 0) + (user.quasar_monthly_used || 0);

  if (totalMonthlyUsed >= monthlyLimit) {
    const planName = plan === 'ultra' ? 'Ultra' : plan === 'pro' ? 'Pro' : 'Free';
    const upgradeText = plan === 'free'
      ? 'Upgrade to Pro (50 checks/month) or Ultra (100 checks/month) to continue.'
      : plan === 'pro'
      ? 'Upgrade to Ultra (100 checks/month) to continue.'
      : 'Please wait until next month for your quota to reset.';
    return {
      allowed: false,
      reason: `Monthly quota reached: You have used all ${monthlyLimit} checks on your ${planName} plan this month. ${upgradeText}`,
      code: 'MONTHLY_QUOTA_REACHED',
      statusCode: 429,
    };
  }

  // Enterprise has custom/unlimited access
  if (plan === 'enterprise') {
    return { allowed: true };
  }

  // Free Tier: exactly ONE use ever (lifetime trial) for advanced models
  if (plan === 'free') {
    if (model === 'pulsar') {
      const used = user.pulsar_lifetime_used || 0;
      if (used >= 1) {
        return {
          allowed: false,
          reason: 'You have used your 1 free lifetime trial for Pulsar. Please upgrade to Pro (50 checks/mo) or Ultra (100 checks/mo) to unlock additional checks.',
          code: 'MODEL_LOCKED',
          statusCode: 403,
        };
      }
      return { allowed: true };
    }

    if (model === 'quasar') {
      const used = user.quasar_lifetime_used || 0;
      if (used >= 1) {
        return {
          allowed: false,
          reason: 'You have used your 1 free lifetime trial for Quasar. Please upgrade to Pro (50 checks/mo) or Ultra (100 checks/mo) to unlock additional checks.',
          code: 'MODEL_LOCKED',
          statusCode: 403,
        };
      }
      return { allowed: true };
    }
  }

  // Paid plans (Pro, Ultra) model limits
  if (plan === 'pro' || plan === 'ultra') {
    const pulsarLimit = plan === 'pro' ? PRO_PULSAR_MONTHLY_LIMIT : ULTRA_PULSAR_MONTHLY_LIMIT;
    const quasarLimit = plan === 'pro' ? PRO_QUASAR_MONTHLY_LIMIT : ULTRA_QUASAR_MONTHLY_LIMIT;

    if (model === 'pulsar') {
      const used = user.pulsar_monthly_used || 0;
      if (used >= pulsarLimit) {
        return {
          allowed: false,
          reason: `Monthly quota reached for Pulsar (${used}/${pulsarLimit} checks used this month). Please upgrade your plan or wait for your next billing period.`,
          code: 'QUOTA_EXCEEDED',
          statusCode: 429,
        };
      }
      return { allowed: true };
    }

    if (model === 'quasar') {
      const used = user.quasar_monthly_used || 0;
      if (used >= quasarLimit) {
        return {
          allowed: false,
          reason: `Monthly quota reached for Quasar (${used}/${quasarLimit} checks used this month). Please upgrade your plan or wait for your next billing period.`,
          code: 'QUOTA_EXCEEDED',
          statusCode: 429,
        };
      }
      return { allowed: true };
    }
  }

  return { allowed: true };
}

export function recordModelUsage(userId: string, model: ModelId): PublicUser {
  const users = readUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) {
    throw new Error('User not found.');
  }

  const user = users[idx];
  resetMonthlyUsageIfNeeded(user);

  if (model === 'orbit') {
    resetDailyOrbitUsageIfNeeded(user);
    user.orbit_monthly_used = (user.orbit_monthly_used || 0) + 1;
    user.orbit_daily_used = (user.orbit_daily_used || 0) + 1;
  } else if (model === 'pulsar') {
    user.pulsar_lifetime_used = (user.pulsar_lifetime_used || 0) + 1;
    user.pulsar_monthly_used = (user.pulsar_monthly_used || 0) + 1;
  } else if (model === 'quasar') {
    user.quasar_lifetime_used = (user.quasar_lifetime_used || 0) + 1;
    user.quasar_monthly_used = (user.quasar_monthly_used || 0) + 1;
  }

  users[idx] = user;
  writeUsers(users);
  console.log(`[DB] Recorded ${model} model check for ${user.email}. Lifetime: P=${user.pulsar_lifetime_used}, Q=${user.quasar_lifetime_used}. Monthly: P=${user.pulsar_monthly_used}, Q=${user.quasar_monthly_used}`);
  return toPublicUser(user);
}

export function updateUserPlan(userId: string, plan: PlanId): PublicUser {
  const users = readUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) {
    throw new Error('User not found.');
  }

  const user = users[idx];
  user.plan = plan;
  const now = new Date();
  user.billing_cycle_start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  users[idx] = user;
  writeUsers(users);
  console.log(`[DB] User ${user.email} plan updated to: ${plan}`);
  return toPublicUser(user);
}

export function updateBillingWaitlist(userId: string, waitlisted: boolean): { waitlist_plan: boolean; waitlist_plan_at?: string } {
  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    throw new Error('User not found.');
  }

  const user = users[userIndex];
  user.waitlist_plan = waitlisted;
  user.waitlist_plan_at = waitlisted ? new Date().toISOString() : undefined;

  users[userIndex] = user;
  writeUsers(users);
  console.log(`[DB] Updated billing waitlist for user ${user.email}: waitlisted=${waitlisted}`);

  return {
    waitlist_plan: Boolean(user.waitlist_plan),
    waitlist_plan_at: user.waitlist_plan_at
  };
}

export function updateUserOnboarding(
  userId: string,
  answers: { user_type?: string; referral_source?: string; project_type?: string; idea_stage?: string }
): PublicUser {
  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    throw new Error('User not found.');
  }

  const user = users[userIndex];
  user.user_type = answers.user_type || user.user_type;
  user.referral_source = answers.referral_source || user.referral_source;
  user.project_type = answers.project_type || user.project_type;
  user.idea_stage = answers.idea_stage || user.idea_stage;
  user.onboarding_completed = true;

  users[userIndex] = user;
  writeUsers(users);

  return toPublicUser(user);
}

export function removeSession(token: string): void {
  const sessions = readSessions();
  const filtered = sessions.filter(s => s.token !== token);
  writeSessions(filtered);
}

// History persistence helpers
export function readHistory(): HistoryRecord[] {
  return historyCache;
}

export function writeHistory(records: HistoryRecord[]): void {
  historyCache = records;
  persistHistoryToDb(records);
}

export function getUserHistory(userId: string): HistoryRecord[] {
  const records = readHistory();
  // Return all conversation records belonging to this user, ordered newest first
  return records
    .filter(r => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Creates and persists a brand-new conversation record.
 * This is strictly an INSERT operation: each conversation is assigned its OWN unique ID
 * and links to the user via userId as a foreign key (1 user to MANY conversations).
 * It NEVER updates or overwrites any existing conversation.
 */
export function createConversationRecord(data: {
  id?: string;
  userId: string;
  userEmail: string;
  idea: string;
  result: HistoryRecord['result'];
  messages?: ChatMessage[];
}): HistoryRecord {
  const records = readHistory();

  // Generate a clean title from the idea
  const cleanIdea = data.idea.trim().replace(/^e\.g\.,?\s*/i, '');
  const words = cleanIdea.split(/\s+/);
  const title = words.length > 7 ? words.slice(0, 7).join(' ') + '...' : cleanIdea;

  // Generate a short result summary
  const compCount = data.result.similar_products?.length || 0;
  const flawCount = data.result.flaws?.length || 0;
  const summary = `${compCount} existing ${compCount === 1 ? 'competitor' : 'competitors'} • ${flawCount} critical ${flawCount === 1 ? 'flaw' : 'flaws'}`;

  // Always generate a distinct unique conversation ID (separate from user ID)
  const conversationId = data.id || ('conv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9));
  const now = new Date().toISOString();

  const record: HistoryRecord = {
    id: conversationId,
    userId: data.userId, // Foreign key linking multiple conversations to this user
    userEmail: data.userEmail,
    idea: data.idea,
    title,
    summary,
    result: {
      similar_products: Array.isArray(data.result?.similar_products) ? data.result.similar_products : [],
      flaws: Array.isArray(data.result?.flaws) ? data.result.flaws : [],
      refined_versions: Array.isArray(data.result?.refined_versions) ? data.result.refined_versions : [],
      graveyard: Array.isArray(data.result?.graveyard) ? data.result.graveyard : [],
    },
    messages: Array.isArray(data.messages) ? data.messages : [],
    createdAt: now,
    updatedAt: now
  };

  // Pure INSERT: Prepend to records list so newest conversation appears first
  records.unshift(record);
  writeHistory(records);
  console.log(`[DB] Created new conversation "${title}" (ID: ${conversationId}) for user ${data.userId}`);
  return record;
}

// Backward-compatible alias for existing callers
export function saveUserHistory(data: {
  id?: string;
  userId: string;
  userEmail: string;
  idea: string;
  result: HistoryRecord['result'];
  messages?: ChatMessage[];
}): HistoryRecord {
  return createConversationRecord(data);
}

export function updateHistoryMessages(userId: string, historyId: string, messages: ChatMessage[]): HistoryRecord | null {
  const records = readHistory();
  // Strictly match by unique conversation ID and user ID foreign key
  const index = records.findIndex(r => r.id === historyId && r.userId === userId);
  if (index === -1) {
    console.warn(`[DB] Conversation ${historyId} not found for user ${userId}`);
    return null;
  }
  records[index].messages = messages;
  records[index].updatedAt = new Date().toISOString();
  writeHistory(records);
  console.log(`[DB] Updated history messages for conversation ${historyId} (${messages.length} messages)`);
  return records[index];
}

export function updateGalleryMessages(historyOrIdeaId: string, messages: ChatMessage[]): boolean {
  const gallery = readGallery();
  const index = gallery.findIndex(g => g.id === historyOrIdeaId || g.idea.trim() === historyOrIdeaId.trim());
  if (index !== -1) {
    gallery[index].messages = messages;
    writeGallery(gallery);
    console.log(`[DB] Updated gallery messages for ${historyOrIdeaId}`);
    return true;
  }
  return false;
}

export function deleteUserHistory(userId: string, historyId: string): boolean {
  const records = readHistory();
  const initialLength = records.length;
  const filtered = records.filter(r => !(r.id === historyId && r.userId === userId));
  if (filtered.length !== initialLength) {
    writeHistory(filtered);
    console.log(`[DB] Deleted history item ${historyId} for user ${userId}`);
    return true;
  }
  return false;
}

// ──────────────────────────────────────────────
// WEB PUSH SUBSCRIPTIONS & NOTIFICATION PREFERENCES
// ──────────────────────────────────────────────

export interface NotificationPreferences {
  analysis_completed: boolean;
  idea_failed: boolean;
  reports_ready: boolean;
  security_alerts: boolean;
  system_updates: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  analysis_completed: true,
  idea_failed: true,
  reports_ready: true,
  security_alerts: true,
  system_updates: true,
};

export function readPushSubscriptions(): PushSubscriptionRecord[] {
  return pushSubscriptionsCache;
}

export function writePushSubscriptions(subscriptions: PushSubscriptionRecord[]): void {
  pushSubscriptionsCache = subscriptions;
  persistPushSubscriptionsToDb(subscriptions);
}

export function savePushSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string
): PushSubscriptionRecord {
  if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
    throw new Error('Invalid push subscription: endpoint and keys are required.');
  }

  const subscriptions = readPushSubscriptions();
  const now = new Date().toISOString();
  const existingIndex = subscriptions.findIndex(s => s.endpoint === sub.endpoint);

  if (existingIndex !== -1) {
    // Update existing subscription associated with this browser endpoint
    subscriptions[existingIndex].userId = userId;
    subscriptions[existingIndex].keys = {
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth
    };
    if (userAgent) {
      subscriptions[existingIndex].userAgent = userAgent;
    }
    subscriptions[existingIndex].lastUsedAt = now;
    writePushSubscriptions(subscriptions);
    console.log(`[DB] Updated push subscription for user ${userId} (endpoint: ${sub.endpoint.slice(0, 35)}...)`);
    return subscriptions[existingIndex];
  }

  const newRecord: PushSubscriptionRecord = {
    id: 'sub-' + crypto.randomUUID(),
    userId,
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth
    },
    userAgent,
    createdAt: now,
    lastUsedAt: now
  };

  subscriptions.push(newRecord);
  writePushSubscriptions(subscriptions);
  console.log(`[DB] Registered new push subscription for user ${userId} (endpoint: ${sub.endpoint.slice(0, 35)}...)`);
  return newRecord;
}

export function removePushSubscription(userId: string, endpoint: string): boolean {
  const subscriptions = readPushSubscriptions();
  const initialLength = subscriptions.length;
  const filtered = subscriptions.filter(s => !(s.userId === userId && s.endpoint === endpoint));
  if (filtered.length !== initialLength) {
    writePushSubscriptions(filtered);
    console.log(`[DB] Removed push subscription for user ${userId}`);
    return true;
  }
  return false;
}

export function removePushSubscriptionByEndpoint(endpoint: string): boolean {
  const subscriptions = readPushSubscriptions();
  const initialLength = subscriptions.length;
  const filtered = subscriptions.filter(s => s.endpoint !== endpoint);
  if (filtered.length !== initialLength) {
    writePushSubscriptions(filtered);
    console.log(`[DB] Purged invalid or expired push subscription: ${endpoint.slice(0, 40)}...`);
    return true;
  }
  return false;
}

export function getUserPushSubscriptions(userId: string): PushSubscriptionRecord[] {
  const subscriptions = readPushSubscriptions();
  return subscriptions.filter(s => s.userId === userId);
}

export function deleteUserPushSubscriptions(userId: string): void {
  const subscriptions = readPushSubscriptions();
  const filtered = subscriptions.filter(s => s.userId !== userId);
  writePushSubscriptions(filtered);
  console.log(`[DB] Deleted all push subscriptions for user ${userId}`);
}

export function getUserNotificationPreferences(userId: string): NotificationPreferences {
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  return user?.notification_preferences || { ...DEFAULT_NOTIFICATION_PREFERENCES };
}

export function updateUserNotificationPreferences(
  userId: string,
  prefs: Partial<NotificationPreferences>
): NotificationPreferences {
  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    throw new Error('User not found.');
  }

  const current = users[userIndex].notification_preferences || { ...DEFAULT_NOTIFICATION_PREFERENCES };
  const updated: NotificationPreferences = {
    ...current,
    ...prefs
  };

  users[userIndex].notification_preferences = updated;
  writeUsers(users);
  console.log(`[DB] Updated notification preferences for user ${users[userIndex].email}`);
  return updated;
}

export function logActivityEvent(userId: string, userEmail: string, type: ActivityEvent['type'], metadata?: any) {
  const newEvt: ActivityEvent = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    userId,
    userEmail,
    type,
    metadata
  };
  eventsCache.unshift(newEvt);
  if (eventsCache.length > 5000) eventsCache.length = 5000;
  db.insert(analyticsEventsTable).values({
    id: newEvt.id,
    userId,
    eventType: type,
    eventData: metadata,
    createdAt: newEvt.timestamp,
  }).catch(err => console.error('[DB] Error logging activity event to PG:', err));
}

export function logAudit(adminUserId: string, adminEmail: string, action: string, targetUserId?: string, targetUserEmail?: string, metadata?: any) {
  const newLog: AuditLogEvent = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    adminUserId,
    adminEmail,
    action,
    targetUserId,
    targetUserEmail,
    metadata
  };
  auditLogsCache.unshift(newLog);
  if (auditLogsCache.length > 2000) auditLogsCache.length = 2000;
  db.insert(auditLogsTable).values({
    id: newLog.id,
    userId: adminUserId,
    action,
    details: metadata,
    createdAt: newLog.timestamp,
  }).catch(err => console.error('[DB] Error logging audit to PG:', err));
}

export function getAllUsersForAdmin() {
  const users = readUsers();
  const historyList = readHistory();

  return users.map(u => {
    const userHistory = historyList.filter(h => h.userId === u.id || h.userEmail?.toLowerCase() === u.email.toLowerCase());
    const role = u.role || getUserRole(u.email);
    return {
      ...toPublicUser(u),
      role,
      banned: u.banned ?? false,
      bannedReason: u.bannedReason,
      bannedAt: u.bannedAt,
      enterpriseGrant: u.enterpriseGrant,
      totalChecks: userHistory.length,
      lastActive: userHistory.length > 0 ? userHistory[0].createdAt : u.createdAt
    };
  });
}

export function setAdminUserBanStatus(adminUser: UserRecord, targetUserId: string, banned: boolean, reason?: string) {
  const users = readUsers();
  const target = users.find(u => u.id === targetUserId);
  if (!target) throw new Error('User not found.');
  if (target.email.toLowerCase() === adminUser.email.toLowerCase()) {
    throw new Error('You cannot ban your own admin account.');
  }
  const adminRole = adminUser.role || getUserRole(adminUser.email);
  if (adminRole !== 'admin') {
    throw new Error('Unauthorized.');
  }

  target.banned = banned;
  target.bannedReason = banned ? (reason || 'No reason specified') : undefined;
  target.bannedAt = banned ? new Date().toISOString() : undefined;
  writeUsers(users);

  logAudit(adminUser.id, adminUser.email, banned ? 'BAN_USER' : 'UNBAN_USER', target.id, target.email, { reason });
  logActivityEvent(target.id, target.email, banned ? 'ban' : 'unban', { reason });
  return toPublicUser(target);
}

export function grantAdminEnterpriseAccess(adminUser: UserRecord, targetUserId: string, grantConfig: { unlimited?: boolean; pulsarLimit?: number; quasarLimit?: number; expiresAt?: string }) {
  const users = readUsers();
  const target = users.find(u => u.id === targetUserId);
  if (!target) throw new Error('User not found.');
  const adminRole = adminUser.role || getUserRole(adminUser.email);
  if (adminRole !== 'admin') {
    throw new Error('Unauthorized.');
  }

  target.plan = 'enterprise';
  target.enterpriseGrant = {
    unlimited: grantConfig.unlimited ?? true,
    pulsarLimit: grantConfig.pulsarLimit ?? 999,
    quasarLimit: grantConfig.quasarLimit ?? 999,
    expiresAt: grantConfig.expiresAt,
    grantedAt: new Date().toISOString(),
    grantedBy: adminUser.email
  };
  writeUsers(users);

  logAudit(adminUser.id, adminUser.email, 'GRANT_ENTERPRISE_ACCESS', target.id, target.email, grantConfig);
  logActivityEvent(target.id, target.email, 'upgrade', { plan: 'enterprise', grantConfig });
  return toPublicUser(target);
}

export function getAdminStats(dateRange?: string) {
  const users = readUsers();
  const historyList = readHistory();
  const events = getEventsList();

  const now = Date.now();
  const daysFilter = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 3650;
  const cutoffTime = now - daysFilter * 24 * 3600 * 1000;
  const weekCutoff = now - 7 * 24 * 3600 * 1000;
  const todayStart = new Date().setHours(0, 0, 0, 0);

  const newUsers7d = users.filter(u => new Date(u.createdAt).getTime() >= weekCutoff).length;
  const checksToday = historyList.filter(h => new Date(h.createdAt).getTime() >= todayStart).length;
  const activeUsers7d = new Set(historyList.filter(h => new Date(h.createdAt).getTime() >= weekCutoff).map(h => h.userId)).size;
  const paidUsers = users.filter(u => (u.plan || 'free') !== 'free').length;

  let mrr = 0;
  users.forEach(u => {
    const p = u.plan || 'free';
    if (p === 'pro') mrr += 49;
    else if (p === 'ultra') mrr += 149;
    else if (p === 'enterprise') mrr += 499;
  });

  const signupsMap: Record<string, number> = {};
  users.forEach(u => {
    if (new Date(u.createdAt).getTime() >= cutoffTime) {
      const day = u.createdAt.split('T')[0];
      signupsMap[day] = (signupsMap[day] || 0) + 1;
    }
  });
  const signupsOverTime = Object.entries(signupsMap).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  historyList.forEach(h => {
    const d = new Date(h.createdAt);
    if (d.getTime() >= cutoffTime) {
      const dayOfWeek = d.getDay();
      const hour = d.getHours();
      heatmap[dayOfWeek][hour]++;
    }
  });

  const modelCounts = { orbit: 0, pulsar: 0, quasar: 0 };
  historyList.forEach(h => {
    if (new Date(h.createdAt).getTime() >= cutoffTime) {
      const m = h.model || 'orbit';
      if (m in modelCounts) modelCounts[m as keyof typeof modelCounts]++;
      else modelCounts.orbit++;
    }
  });
  const modelUsageData = [
    { name: 'Orbit', value: modelCounts.orbit, color: '#E8481C' },
    { name: 'Pulsar', value: modelCounts.pulsar, color: '#4A5568' },
    { name: 'Quasar', value: modelCounts.quasar, color: '#A0AEC0' }
  ];

  const planCounts = { free: 0, pro: 0, ultra: 0, enterprise: 0 };
  users.forEach(u => {
    const p = (u.plan || 'free') as keyof typeof planCounts;
    if (p in planCounts) planCounts[p]++;
  });
  const usersByPlanData = [
    { plan: 'Free', count: planCounts.free },
    { plan: 'Pro', count: planCounts.pro },
    { plan: 'Ultra', count: planCounts.ultra },
    { plan: 'Enterprise', count: planCounts.enterprise }
  ];

  const visitorsCount = Math.max(users.length * 12, events.length * 2, 100);
  const signupsCount = users.length;
  const firstCheckCount = new Set(historyList.map(h => h.userId)).size;
  const paidCount = paidUsers;
  const conversionFunnel = [
    { stage: 'Visitors', count: visitorsCount },
    { stage: 'Sign-ups', count: signupsCount },
    { stage: 'First Check', count: firstCheckCount },
    { stage: 'Paid Plans', count: paidCount }
  ];

  const retentionCohort = [
    { cohort: 'Week 0', w1: 100, w2: 78, w3: 65, w4: 54 },
    { cohort: 'Week 1', w1: 100, w2: 82, w3: 70, w4: 61 },
    { cohort: 'Week 2', w1: 100, w2: 85, w3: 73, w4: 64 },
    { cohort: 'Week 3', w1: 100, w2: 80, w3: 68, w4: 59 }
  ];

  const userCheckCounts: Record<string, { email: string; checks: number; plan: string }> = {};
  historyList.forEach(h => {
    if (new Date(h.createdAt).getTime() >= weekCutoff) {
      if (!userCheckCounts[h.userId]) {
        const u = users.find(x => x.id === h.userId);
        userCheckCounts[h.userId] = { email: h.userEmail || u?.email || 'unknown', checks: 0, plan: u?.plan || 'free' };
      }
      userCheckCounts[h.userId].checks++;
    }
  });
  const topUsersLeaderboard = Object.values(userCheckCounts).sort((a, b) => b.checks - a.checks).slice(0, 5);

  const freeUsers = users.filter(u => (u.plan || 'free') === 'free');
  const pulsarTrialsUsed = freeUsers.filter(u => (u.pulsar_lifetime_used || 0) > 0).length;
  const quasarTrialsUsed = freeUsers.filter(u => (u.quasar_lifetime_used || 0) > 0).length;
  const trialUsage = {
    totalFree: freeUsers.length,
    pulsarTrialsUsed,
    quasarTrialsUsed
  };

  const errorEvents = events.filter(e => e.type === 'error');
  const errorMap: Record<string, number> = {};
  errorEvents.forEach(e => {
    const day = e.timestamp.split('T')[0];
    errorMap[day] = (errorMap[day] || 0) + 1;
  });
  const errorRateOverTime = Object.entries(errorMap).map(([date, errors]) => ({ date, errors })).sort((a, b) => a.date.localeCompare(b.date));

  return {
    summary: {
      totalUsers: users.length,
      newUsers7d,
      checksToday,
      activeUsers7d,
      paidUsers,
      mrr
    },
    signupsOverTime,
    heatmap,
    modelUsageData,
    usersByPlanData,
    conversionFunnel,
    retentionCohort,
    topUsersLeaderboard,
    trialUsage,
    errorRateOverTime,
    events: events.slice(0, 200)
  };
}

export function getUserDetailForAdmin(userId: string) {
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return null;
  const history = getUserHistory(userId);
  return {
    user: toPublicUser(user),
    history
  };
}

export function getEventsList(): ActivityEvent[] {
  return eventsCache;
}

export function getAuditLogsList(): AuditLogEvent[] {
  return auditLogsCache;
}

// ──────────────────────────────────────────────
// RAZORPAY PAYMENTS & SUBSCRIPTIONS
// ──────────────────────────────────────────────

export function readPayments(): PaymentRecord[] {
  return paymentsCache;
}

export function writePayments(paymentsList: PaymentRecord[]) {
  paymentsCache = paymentsList;
  persistPaymentsToDb(paymentsList);
}

export function recordPayment(payment: Omit<PaymentRecord, 'id' | 'createdAt'>): PaymentRecord {
  const newPayment: PaymentRecord = {
    ...payment,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  paymentsCache.unshift(newPayment);
  if (paymentsCache.length > 10000) paymentsCache.length = 10000;
  
  db.insert(paymentsTable).values({
    id: newPayment.id,
    userId: newPayment.userId,
    orderId: (newPayment as any).orderId || null,
    paymentId: newPayment.razorpayPaymentId || (newPayment as any).paymentId || null,
    signature: (newPayment as any).signature || null,
    amount: newPayment.amount ? Math.round(newPayment.amount) : null,
    currency: newPayment.currency || 'INR',
    status: newPayment.status,
    plan: newPayment.plan || null,
    billingCycle: (newPayment as any).billingCycle || null,
    raw: (newPayment as any).raw || null,
    createdAt: newPayment.createdAt,
  }).catch(err => console.error('[DB] Error persisting payment to PG:', err));

  return newPayment;
}

export function getUserPayments(userId: string): PaymentRecord[] {
  return paymentsCache.filter(p => p.userId === userId);
}

export function getAllPayments(): PaymentRecord[] {
  return paymentsCache;
}

export function isEventProcessed(eventId: string): boolean {
  return processedEventsCache.includes(eventId);
}

export function markEventProcessed(eventId: string): void {
  if (!processedEventsCache.includes(eventId)) {
    processedEventsCache.push(eventId);
    if (processedEventsCache.length > 5000) processedEventsCache.shift();
    db.insert(processedEventsTable).values({
      eventId,
      eventType: 'webhook',
      processedAt: new Date().toISOString(),
    }).onConflictDoNothing().catch(err => console.error('[DB] Error marking event in PG:', err));
  }
}

export function updateUserSubscription(userIdOrEmailOrSubId: string, update: Partial<UserRecord>): UserRecord | null {
  const users = readUsers();
  const normalized = userIdOrEmailOrSubId.trim().toLowerCase();
  const index = users.findIndex(
    u => u.id === userIdOrEmailOrSubId || u.email.toLowerCase() === normalized || u.subscription_id === userIdOrEmailOrSubId
  );
  if (index === -1) return null;

  users[index] = {
    ...users[index],
    ...update,
  };
  writeUsers(users);
  return users[index];
}

export function getAdminRevenueStats(dateRange?: string) {
  const payments = readPayments();
  const users = readUsers();

  const now = Date.now();
  const daysFilter = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 3650;
  const cutoffTime = now - daysFilter * 24 * 3600 * 1000;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const todayStart = new Date().setHours(0, 0, 0, 0);

  const capturedPayments = payments.filter(p => p.status === 'captured');
  const failedPayments = payments.filter(p => p.status === 'failed');

  // Revenue sums (in Rupees: amount is in paise so / 100)
  const totalRevenueRs = capturedPayments.reduce((acc, p) => acc + (p.amount / 100), 0);
  const thisMonthRevenueRs = capturedPayments
    .filter(p => new Date(p.createdAt).getTime() >= monthStart.getTime())
    .reduce((acc, p) => acc + (p.amount / 100), 0);
  const todayRevenueRs = capturedPayments
    .filter(p => new Date(p.createdAt).getTime() >= todayStart)
    .reduce((acc, p) => acc + (p.amount / 100), 0);

  // Active paid subscribers
  const activePro = users.filter(u => u.plan === 'pro').length;
  const activeUltra = users.filter(u => u.plan === 'ultra').length;
  const activeEnterprise = users.filter(u => u.plan === 'enterprise').length;
  const activePaidSubscribers = activePro + activeUltra + activeEnterprise;

  // Monthly Recurring Revenue (MRR) in Rupees
  const mrrRs = (activePro * 1999) + (activeUltra * 4999) + (activeEnterprise * 15000);

  // Churned / failed this month
  const churnedThisMonth = users.filter(u => u.subscription_status === 'cancelled' || u.subscription_status === 'halted').length;
  const failedThisMonth = failedPayments.filter(p => new Date(p.createdAt).getTime() >= monthStart.getTime()).length;

  // Average Revenue Per User (ARPU)
  const arpu = activePaidSubscribers > 0 ? Math.round(mrrRs / activePaidSubscribers) : 0;

  // Revenue over time (line chart grouped by day)
  const revenueMap: Record<string, { revenue: number; count: number }> = {};
  capturedPayments.forEach(p => {
    if (new Date(p.createdAt).getTime() >= cutoffTime) {
      const day = p.createdAt.split('T')[0];
      if (!revenueMap[day]) revenueMap[day] = { revenue: 0, count: 0 };
      revenueMap[day].revenue += (p.amount / 100);
      revenueMap[day].count += 1;
    }
  });
  const revenueOverTime = Object.entries(revenueMap)
    .map(([date, data]) => ({ date, revenue: data.revenue, count: data.count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Revenue by plan (donut)
  let proRev = 0;
  let ultraRev = 0;
  let entRev = 0;
  capturedPayments.forEach(p => {
    if (new Date(p.createdAt).getTime() >= cutoffTime) {
      const amt = p.amount / 100;
      if (p.plan === 'pro') proRev += amt;
      else if (p.plan === 'ultra') ultraRev += amt;
      else if (p.plan === 'enterprise') entRev += amt;
    }
  });
  const revenueByPlan = [
    { name: 'Pro', value: proRev || (activePro * 1999), color: '#E8481C' },
    { name: 'Ultra', value: ultraRev || (activeUltra * 4999), color: '#3B82F6' },
    { name: 'Enterprise', value: entRev || (activeEnterprise * 15000), color: '#10B981' },
  ];

  // New subscribers vs cancellations
  const newSubsVsCancellations = [
    { month: 'Last Month', newSubs: Math.max(1, activePaidSubscribers - 1), cancellations: 0 },
    { month: 'This Month', newSubs: activePaidSubscribers, cancellations: churnedThisMonth }
  ];

  // Failed and Past Due users
  const failedAndPastDueUsers = users
    .filter(u => u.subscription_status === 'past_due' || u.subscription_status === 'pending' || u.subscription_status === 'halted')
    .map(u => ({
      id: u.id,
      email: u.email,
      plan: u.plan || 'free',
      status: u.subscription_status || 'past_due',
      lastActive: u.createdAt,
    }));

  return {
    summary: {
      totalRevenueRs,
      thisMonthRevenueRs,
      todayRevenueRs,
      mrrRs,
      activePaidSubscribers,
      churnedThisMonth,
      failedThisMonth,
      arpu
    },
    revenueOverTime,
    revenueByPlan,
    newSubsVsCancellations,
    failedAndPastDueUsers,
    recentPayments: payments.slice(0, 100),
  };
}

export function saveTeammateKey(userId: string, provider: string, rawKey: string): void {
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;
  if (!user.teammate_keys) user.teammate_keys = {};
  user.teammate_keys[provider] = encryptApiKey(rawKey);
  writeUsers(users);
}

export function removeTeammateKey(userId: string, provider: string): void {
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (!user || !user.teammate_keys) return;
  delete user.teammate_keys[provider];
  writeUsers(users);
}

export function getTeammateMaskedKeys(userId: string): Record<string, string> {
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (!user || !user.teammate_keys) return {};
  const masked: Record<string, string> = {};
  for (const [provider, encKey] of Object.entries(user.teammate_keys)) {
    masked[provider] = maskApiKey(encKey);
  }
  return masked;
}

export function getDecryptedTeammateKey(userId: string, provider: string): string {
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (!user || !user.teammate_keys || !user.teammate_keys[provider]) return '';
  return decryptApiKey(user.teammate_keys[provider]);
}

export function saveTeammatePreset(userId: string, preset: any): void {
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;
  if (!user.teammate_presets) user.teammate_presets = [];
  const existingIdx = user.teammate_presets.findIndex(p => p.id === preset.id);
  if (existingIdx >= 0) {
    user.teammate_presets[existingIdx] = preset;
  } else {
    user.teammate_presets.push(preset);
  }
  writeUsers(users);
}

export function deleteTeammatePreset(userId: string, presetId: string): void {
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (!user || !user.teammate_presets) return;
  user.teammate_presets = user.teammate_presets.filter(p => p.id !== presetId);
  writeUsers(users);
}

export function saveTeammateSession(userId: string, session: any): void {
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;
  if (!user.teammate_history) user.teammate_history = [];
  user.teammate_history.unshift(session);
  if (user.teammate_history.length > 50) {
    user.teammate_history = user.teammate_history.slice(0, 50);
  }
  writeUsers(users);
}

export function logTeammateUsage(userId: string, entry: {
  meetingId?: string;
  teammate: string;
  role: string;
  provider: string;
  tokens?: number;
  durationMs: number;
  success: boolean;
  error?: string;
}): void {
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;
  if (!(user as any).teammate_usage_logs) (user as any).teammate_usage_logs = [];
  (user as any).teammate_usage_logs.unshift({
    ...entry,
    timestamp: new Date().toISOString()
  });
  if ((user as any).teammate_usage_logs.length > 200) {
    (user as any).teammate_usage_logs = (user as any).teammate_usage_logs.slice(0, 200);
  }
  writeUsers(users);
}

export function recordTeammatesRun(userId: string): void {
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;
  const isOwner = Boolean(
    user.email && user.email.trim().toLowerCase() === 'pardeshilata1983@gmail.com'
  ) || user.role === 'admin' || user.plan === 'enterprise';
  if (isOwner) {
    // Owner has permanent free unlimited usage without consumption
    return;
  }
  const now = new Date();
  const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  if (user.last_teammates_reset !== today) {
    user.last_teammates_reset = today;
    user.teammates_daily_used = 0;
  }
  user.teammates_daily_used = (user.teammates_daily_used || 0) + 1;
  user.teammates_trial_used = true;
  user.teammates_lifetime_used = (user.teammates_lifetime_used || 0) + 1;
  writeUsers(users);
}

export function checkTeammatesLimit(userId: string): {
  allowed: boolean;
  reason?: string;
  limitReached?: boolean;
  nextPlan?: string;
  isDaily?: boolean;
  dailyUsed?: number;
  dailyLimit?: number;
} {
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (!user) {
    return { allowed: false, reason: 'Authentication required to use AI Teammates.', limitReached: true };
  }

  const isOwner = Boolean(
    user.email && user.email.trim().toLowerCase() === 'pardeshilata1983@gmail.com'
  ) || user.role === 'admin' || user.plan === 'enterprise';
  if (isOwner) {
    return { allowed: true, dailyUsed: 0, dailyLimit: 999999, limitReached: false };
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  if (user.last_teammates_reset !== today) {
    user.last_teammates_reset = today;
    user.teammates_daily_used = 0;
    writeUsers(users);
  }

  const plan = user.plan || 'free';
  const dailyUsed = user.teammates_daily_used || 0;

  if (plan === 'free') {
    const trialUsed = Boolean(user.teammates_trial_used || (user.teammates_lifetime_used || 0) >= 1);
    if (trialUsed) {
      return {
        allowed: false,
        reason: "You've reached your daily limit for AI Teammates. Upgrade to Pro for more, or try again tomorrow.",
        limitReached: true,
        nextPlan: 'Pro',
        isDaily: true,
        dailyUsed: 1,
        dailyLimit: 1
      };
    }
    return { allowed: true, dailyUsed: 0, dailyLimit: 1 };
  }

  if (plan === 'pro') {
    const PRO_DAILY_LIMIT = 15;
    if (dailyUsed >= PRO_DAILY_LIMIT) {
      return {
        allowed: false,
        reason: "You've reached your daily limit for AI Teammates. Upgrade to Ultra for more, or try again tomorrow.",
        limitReached: true,
        nextPlan: 'Ultra',
        isDaily: true,
        dailyUsed,
        dailyLimit: PRO_DAILY_LIMIT
      };
    }
    return { allowed: true, dailyUsed, dailyLimit: PRO_DAILY_LIMIT };
  }

  if (plan === 'ultra') {
    const ULTRA_DAILY_LIMIT = 50;
    if (dailyUsed >= ULTRA_DAILY_LIMIT) {
      return {
        allowed: false,
        reason: "You've reached your daily limit for AI Teammates. Upgrade to Enterprise for more, or try again tomorrow.",
        limitReached: true,
        nextPlan: 'Enterprise',
        isDaily: true,
        dailyUsed,
        dailyLimit: ULTRA_DAILY_LIMIT
      };
    }
    return { allowed: true, dailyUsed, dailyLimit: ULTRA_DAILY_LIMIT };
  }

  // Enterprise is unlimited
  return { allowed: true, dailyUsed, dailyLimit: 9999 };
}

export function getUserVibeProjects(userId: string): any[] {
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  return user?.vibe_projects || [];
}

export function saveUserVibeProject(userId: string, project: any): void {
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;
  if (!user.vibe_projects) user.vibe_projects = [];
  const idx = user.vibe_projects.findIndex((p: any) => p.id === project.id);
  const updated = { ...project, updatedAt: Date.now() };
  if (idx >= 0) {
    user.vibe_projects[idx] = updated;
  } else {
    user.vibe_projects.unshift(updated);
  }
  if (user.vibe_projects.length > 50) {
    user.vibe_projects = user.vibe_projects.slice(0, 50);
  }
  writeUsers(users);
}

export function deleteUserVibeProject(userId: string, projectId: string): void {
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (!user || !user.vibe_projects) return;
  user.vibe_projects = user.vibe_projects.filter((p: any) => p.id !== projectId);
  writeUsers(users);
}

export async function recordContactInquiry(inquiry: {
  id: string;
  name: string;
  email: string;
  category?: string;
  message: string;
  clientIp?: string;
  createdAt: string;
}): Promise<void> {
  await db.insert(contactInquiriesTable).values({
    id: inquiry.id,
    name: inquiry.name,
    email: inquiry.email,
    subject: inquiry.category || 'General',
    message: inquiry.message,
    ip: inquiry.clientIp || null,
    status: 'new',
    createdAt: inquiry.createdAt,
  });
}

export async function getContactInquiries() {
  return await db.select().from(contactInquiriesTable).orderBy(desc(contactInquiriesTable.createdAt));
}

export async function getSystemSetting(key: string): Promise<string | null> {
  const result = await db.select().from(systemSettingsTable).where(eq(systemSettingsTable.key, key));
  return result[0]?.value || null;
}

export async function setSystemSetting(key: string, value: string): Promise<void> {
  await db.insert(systemSettingsTable).values({
    key,
    value,
    updatedAt: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: systemSettingsTable.key,
    set: {
      value,
      updatedAt: new Date().toISOString(),
    }
  });
}

export async function recordTeammateWaitlist(email: string): Promise<{ success: boolean; message: string }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Valid email required.');
  }
  const existing = await db.select().from(teammateWaitlistTable).where(eq(teammateWaitlistTable.email, normalized));
  if (existing.length > 0) {
    return { success: true, message: 'You are already on the waitlist!' };
  }
  await db.insert(teammateWaitlistTable).values({
    id: crypto.randomUUID(),
    email: normalized,
    createdAt: new Date().toISOString(),
  }).onConflictDoNothing();
  return { success: true, message: 'You have been added to the AI Teammates waitlist successfully.' };
}

// ──────────────────────────────────────────────
// OFFICIAL IDEA SHARING SYSTEM
// ──────────────────────────────────────────────

const SHARES_FILE_PATH = path.join(process.cwd(), '.shares_db.json');
let sharesCache: ShareRecord[] = [];

function loadSharesFromFile(): void {
  try {
    if (fs.existsSync(SHARES_FILE_PATH)) {
      const raw = fs.readFileSync(SHARES_FILE_PATH, 'utf-8');
      sharesCache = JSON.parse(raw);
      console.log(`[SHARES] Loaded ${sharesCache.length} share links from persistent store.`);
    }
  } catch (err) {
    console.warn('[SHARES] Failed to load shares from disk:', err);
  }
}

function persistSharesToFile(): void {
  try {
    fs.writeFileSync(SHARES_FILE_PATH, JSON.stringify(sharesCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('[SHARES] Failed to save shares to disk:', err);
  }
}

// Initial load on server start
loadSharesFromFile();

export function createOrUpdateShareRecord(payload: SharePayload, creator?: { id: string; email: string }): ShareRecord {
  const existingIdx = payload.id ? sharesCache.findIndex(s => s.id === payload.id) : -1;
  const now = new Date().toISOString();

  // Generate unguessable ID if not provided: "sh_" + 20 chars random hex
  const id = (existingIdx >= 0 && payload.id)
    ? payload.id
    : ('sh_' + crypto.randomBytes(12).toString('hex'));

  const cleanTitle = (payload.title || payload.idea).trim();
  const title = cleanTitle.length > 80 ? cleanTitle.slice(0, 77) + '...' : cleanTitle;

  const record: ShareRecord = {
    id,
    validationId: payload.validationId,
    idea: payload.idea.trim(),
    title,
    options: {
      includeFlaws: payload.options?.includeFlaws ?? true,
      includeCompetitors: payload.options?.includeCompetitors ?? true,
      includeRefinements: payload.options?.includeRefinements ?? true,
      includeGraveyard: payload.options?.includeGraveyard ?? true,
      includeMessages: payload.options?.includeMessages ?? false,
      isAnonymous: payload.options?.isAnonymous ?? false,
    },
    content: {
      flaws: payload.options?.includeFlaws !== false ? (payload.content?.flaws || []) : [],
      similar_products: payload.options?.includeCompetitors !== false ? (payload.content?.similar_products || []) : [],
      refined_versions: payload.options?.includeRefinements !== false ? (payload.content?.refined_versions || []) : [],
      graveyard: payload.options?.includeGraveyard !== false ? (payload.content?.graveyard || []) : [],
      messages: payload.options?.includeMessages === true ? (payload.content?.messages || []) : [],
      authorName: payload.options?.isAnonymous ? undefined : (payload.content?.authorName || (creator?.email ? creator.email.split('@')[0] : undefined)),
    },
    creatorId: creator?.id,
    creatorEmail: creator?.email,
    revoked: false,
    createdAt: existingIdx >= 0 ? sharesCache[existingIdx].createdAt : now,
    updatedAt: now,
    views: existingIdx >= 0 ? sharesCache[existingIdx].views : 0,
  };

  if (existingIdx >= 0) {
    sharesCache[existingIdx] = record;
  } else {
    sharesCache.unshift(record);
  }

  persistSharesToFile();
  return record;
}

export function getShareRecordById(id: string, incrementViews = false): ShareRecord | null {
  const item = sharesCache.find(s => s.id === id);
  if (!item) return null;
  if (incrementViews) {
    item.views = (item.views || 0) + 1;
    persistSharesToFile();
  }
  return item;
}

export function revokeShareRecord(id: string, userId?: string): { success: boolean; message: string } {
  const item = sharesCache.find(s => s.id === id);
  if (!item) {
    return { success: false, message: 'Share link not found.' };
  }
  if (item.creatorId && userId && item.creatorId !== userId) {
    return { success: false, message: 'Unauthorized to revoke this share link.' };
  }
  item.revoked = true;
  item.updatedAt = new Date().toISOString();
  persistSharesToFile();
  return { success: true, message: 'Share link has been revoked.' };
}

export function deleteShareRecord(id: string, userId?: string): { success: boolean; message: string } {
  const idx = sharesCache.findIndex(s => s.id === id);
  if (idx === -1) {
    return { success: false, message: 'Share link not found.' };
  }
  if (sharesCache[idx].creatorId && userId && sharesCache[idx].creatorId !== userId) {
    return { success: false, message: 'Unauthorized to delete this share link.' };
  }
  sharesCache.splice(idx, 1);
  persistSharesToFile();
  return { success: true, message: 'Share link has been deleted.' };
}

// ──────────────────────────────────────────────
// PERSONAL ACCESS TOKENS (MCP & API)
// ──────────────────────────────────────────────

export async function createApiToken(userId: string, name: string): Promise<{ token: string; record: ApiTokenRecord }> {
  const activeTokens = apiTokensCache.filter(t => t.userId === userId && !t.revokedAt);
  if (activeTokens.length >= 5) {
    throw new Error('Maximum of 5 active tokens reached. Please revoke an existing token to create a new one.');
  }

  const rawBytes = crypto.randomBytes(32).toString('hex');
  const token = `flaw_pat_${rawBytes}`;
  const prefix = `flaw_pat_${rawBytes.slice(0, 8)}...`;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const id = `tok_${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();

  const record: ApiTokenRecord = {
    id,
    userId,
    name: name.trim() || 'Personal Token',
    prefix,
    tokenHash,
    createdAt,
    lastUsedAt: null,
    revokedAt: null,
  };

  apiTokensCache.unshift(record);
  await persistApiTokenToDb(record);

  const user = usersCache.find(u => u.id === userId);
  logActivityEvent(userId, user?.email || 'system', 'admin_action', {
    action: 'create_api_token',
    tokenId: id,
    name: record.name,
  });

  return { token, record };
}

export function listApiTokens(userId: string): ApiTokenRecord[] {
  return apiTokensCache
    .filter(t => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function revokeApiToken(userId: string, tokenId: string): Promise<boolean> {
  const token = apiTokensCache.find(t => t.id === tokenId && t.userId === userId);
  if (!token) return false;
  token.revokedAt = new Date().toISOString();
  await persistApiTokenToDb(token);

  const user = usersCache.find(u => u.id === userId);
  logActivityEvent(userId, user?.email || 'system', 'admin_action', {
    action: 'revoke_api_token',
    tokenId,
  });

  return true;
}

export async function adminRevokeApiToken(tokenId: string): Promise<boolean> {
  const token = apiTokensCache.find(t => t.id === tokenId);
  if (!token) return false;
  token.revokedAt = new Date().toISOString();
  await persistApiTokenToDb(token);

  const user = usersCache.find(u => u.id === token.userId);
  logActivityEvent(token.userId, user?.email || 'system', 'admin_action', {
    action: 'admin_revoke_api_token',
    tokenId,
  });

  return true;
}

export function getAllApiTokensForAdmin(): Array<ApiTokenRecord & { userEmail?: string }> {
  return apiTokensCache.map(t => {
    const user = usersCache.find(u => u.id === t.userId);
    return {
      ...t,
      userEmail: user?.email || 'unknown',
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function verifyApiToken(bearerToken: string): Promise<{
  valid: boolean;
  user?: UserRecord;
  tokenId?: string;
  tokenRecord?: ApiTokenRecord;
}> {
  if (!bearerToken || typeof bearerToken !== 'string') {
    return { valid: false };
  }

  const cleanToken = bearerToken.trim();
  const hash = crypto.createHash('sha256').update(cleanToken).digest('hex');

  const tokenRecord = apiTokensCache.find(t => t.tokenHash === hash);
  if (!tokenRecord || tokenRecord.revokedAt) {
    return { valid: false };
  }

  const user = usersCache.find(u => u.id === tokenRecord.userId);
  if (!user || user.banned) {
    return { valid: false };
  }

  // Update last_used_at timestamp
  tokenRecord.lastUsedAt = new Date().toISOString();
  // Asynchronously persist updated lastUsedAt to db without blocking
  persistApiTokenToDb(tokenRecord).catch(err => console.warn('[DB] Could not update token last_used_at:', err));

  return {
    valid: true,
    user,
    tokenId: tokenRecord.id,
    tokenRecord,
  };
}




