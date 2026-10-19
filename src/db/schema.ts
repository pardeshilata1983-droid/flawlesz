import { pgTable, text, integer, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users Table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(),
  createdAt: text('created_at').notNull(),
  user_type: text('user_type'),
  referral_source: text('referral_source'),
  project_type: text('project_type'),
  idea_stage: text('idea_stage'),
  onboarding_completed: boolean('onboarding_completed').default(false),
  waitlist_plan: boolean('waitlist_plan').default(false),
  waitlist_plan_at: text('waitlist_plan_at'),
  notification_preferences: jsonb('notification_preferences'),
  firebase_uid: text('firebase_uid'),
  plan: text('plan').default('free'),
  pulsar_lifetime_used: integer('pulsar_lifetime_used').default(0),
  quasar_lifetime_used: integer('quasar_lifetime_used').default(0),
  orbit_monthly_used: integer('orbit_monthly_used').default(0),
  orbit_daily_used: integer('orbit_daily_used').default(0),
  last_orbit_reset: text('last_orbit_reset'),
  pulsar_monthly_used: integer('pulsar_monthly_used').default(0),
  quasar_monthly_used: integer('quasar_monthly_used').default(0),
  billing_cycle_start: text('billing_cycle_start'),
  role: text('role').default('user'),
  banned: boolean('banned').default(false),
  bannedReason: text('banned_reason'),
  bannedAt: text('banned_at'),
  enterpriseGrant: jsonb('enterprise_grant'),
  subscription_id: text('subscription_id'),
  subscription_status: text('subscription_status'),
  subscription_current_end: text('subscription_current_end'),
  subscription_cancel_at_cycle_end: boolean('subscription_cancel_at_cycle_end').default(false),
  subscription_plan: text('subscription_plan'),
  teammate_keys: jsonb('teammate_keys'),
  teammate_presets: jsonb('teammate_presets'),
  teammate_history: jsonb('teammate_history'),
  teammates_trial_used: boolean('teammates_trial_used').default(false),
  teammates_lifetime_used: integer('teammates_lifetime_used').default(0),
  teammates_daily_used: integer('teammates_daily_used').default(0),
  last_teammates_reset: text('last_teammates_reset'),
  vibe_projects: jsonb('vibe_projects'),
});

// 2. Sessions Table
export const sessions = pgTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull(),
});

// 3. Validations (History) Table
export const validations = pgTable('validations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userEmail: text('user_email').notNull(),
  idea: text('idea').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  model: text('model').default('orbit'),
  result: jsonb('result').notNull(),
  messages: jsonb('messages'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at'),
});

// 4. Gallery Items Table
export const galleryItems = pgTable('gallery_items', {
  id: text('id').primaryKey(),
  idea: text('idea').notNull(),
  similar_products: jsonb('similar_products').notNull(),
  flaws: jsonb('flaws').notNull(),
  refined_versions: jsonb('refined_versions').notNull(),
  messages: jsonb('messages'),
  createdAt: text('created_at').notNull(),
  userId: text('user_id'),
  userEmail: text('user_email'),
});

// 5. Payments Table
export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  orderId: text('order_id'),
  paymentId: text('payment_id'),
  signature: text('signature'),
  amount: integer('amount'),
  currency: text('currency'),
  status: text('status').notNull(),
  plan: text('plan'),
  billingCycle: text('billing_cycle'),
  raw: jsonb('raw'),
  createdAt: text('created_at').notNull(),
});

// 6. Processed Webhook Events Table (Idempotency)
export const processedEvents = pgTable('processed_events', {
  eventId: text('event_id').primaryKey(),
  eventType: text('event_type'),
  processedAt: text('processed_at').notNull(),
});

// 7. Audit Logs Table
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  action: text('action').notNull(),
  details: jsonb('details'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull(),
});

// 8. Analytics Events Table
export const analyticsEvents = pgTable('analytics_events', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  eventType: text('event_type').notNull(),
  eventData: jsonb('event_data'),
  createdAt: text('created_at').notNull(),
});

// 9. URL Inspections Table
export const urlInspections = pgTable('url_inspections', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  domain: text('domain').notNull(),
  conversationId: text('conversation_id'),
  createdAt: text('created_at').notNull(),
});

// 10. Push Subscriptions Table
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  endpoint: text('endpoint').notNull().unique(),
  keys: jsonb('keys').notNull(),
  createdAt: text('created_at').notNull(),
});

// 11. Contact Inquiries Table
export const contactInquiries = pgTable('contact_inquiries', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  ip: text('ip'),
  status: text('status').default('new'),
  createdAt: text('created_at').notNull(),
});

// 12. System Settings Table (for VAPID keys and persistent runtime settings)
export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 13. Teammates Waitlist Table
export const teammateWaitlist = pgTable('teammate_waitlist', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: text('created_at').notNull(),
});

// 14. API Tokens Table (Personal Access Tokens for Remote MCP)
export const apiTokens = pgTable('api_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  prefix: text('prefix').notNull(),
  tokenHash: text('token_hash').notNull(),
  createdAt: text('created_at').notNull(),
  lastUsedAt: text('last_used_at'),
  revokedAt: text('revoked_at'),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  validations: many(validations),
  payments: many(payments),
  urlInspections: many(urlInspections),
  apiTokens: many(apiTokens),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const validationsRelations = relations(validations, ({ one }) => ({
  user: one(users, {
    fields: [validations.userId],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
}));

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  user: one(users, {
    fields: [apiTokens.userId],
    references: [users.id],
  }),
}));

