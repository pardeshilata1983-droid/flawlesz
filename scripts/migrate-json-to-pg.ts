// scripts/migrate-json-to-pg.ts
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../src/db/index.ts';
import {
  users,
  sessions,
  validations,
  galleryItems,
  payments,
  processedEvents,
  auditLogs,
  analyticsEvents,
  urlInspections,
  pushSubscriptions,
  contactInquiries,
  systemSettings,
} from '../src/db/schema.ts';

const DATA_DIR = path.join(process.cwd(), 'data');

function readJsonFile<T>(filename: string): T[] {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn(`Could not read ${filename}:`, err);
    return [];
  }
}

async function migrate() {
  console.log('--- Starting Migration from JSON to PostgreSQL ---');

  // 1. Users
  const userRecords = readJsonFile<any>('users.json');
  console.log(`Found ${userRecords.length} users to migrate.`);
  for (const u of userRecords) {
    try {
      await db.insert(users).values({
        id: u.id,
        email: u.email,
        name: u.name || null,
        passwordHash: u.passwordHash,
        salt: u.salt,
        createdAt: u.createdAt || new Date().toISOString(),
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
      }).onConflictDoNothing();
    } catch (err: any) {
      console.error(`Failed to migrate user ${u.id}:`, err.message);
    }
  }

  // 2. Sessions
  const sessionRecords = readJsonFile<any>('sessions.json');
  console.log(`Found ${sessionRecords.length} sessions to migrate.`);
  for (const s of sessionRecords) {
    try {
      await db.insert(sessions).values({
        token: s.token,
        userId: s.userId,
        createdAt: s.createdAt || new Date().toISOString(),
        expiresAt: s.expiresAt,
      }).onConflictDoNothing();
    } catch (err: any) {
      console.warn(`Skipping session ${s.token} (likely orphaned user):`, err.message);
    }
  }

  // 3. History (Validations)
  const historyRecords = readJsonFile<any>('history.json');
  console.log(`Found ${historyRecords.length} validations to migrate.`);
  for (const h of historyRecords) {
    try {
      await db.insert(validations).values({
        id: h.id,
        userId: h.userId,
        userEmail: h.userEmail || '',
        idea: h.idea,
        title: h.title,
        summary: h.summary || '',
        model: h.model || 'orbit',
        result: h.result,
        messages: h.messages || null,
        createdAt: h.createdAt || new Date().toISOString(),
        updatedAt: h.updatedAt || null,
      }).onConflictDoNothing();
    } catch (err: any) {
      console.warn(`Skipping validation ${h.id}:`, err.message);
    }
  }

  // 4. Gallery Items
  const galleryRecords = readJsonFile<any>('gallery.json');
  console.log(`Found ${galleryRecords.length} gallery items to migrate.`);
  for (const g of galleryRecords) {
    try {
      await db.insert(galleryItems).values({
        id: g.id,
        idea: g.idea,
        similar_products: g.similar_products || [],
        flaws: g.flaws || [],
        refined_versions: g.refined_versions || [],
        messages: g.messages || null,
        createdAt: g.createdAt || new Date().toISOString(),
        userId: g.userId || null,
        userEmail: g.userEmail || null,
      }).onConflictDoNothing();
    } catch (err: any) {
      console.warn(`Skipping gallery item ${g.id}:`, err.message);
    }
  }

  // 5. Payments
  const paymentRecords = readJsonFile<any>('payments.json');
  console.log(`Found ${paymentRecords.length} payments to migrate.`);
  for (const p of paymentRecords) {
    try {
      await db.insert(payments).values({
        id: p.id,
        userId: p.userId,
        orderId: p.orderId || null,
        paymentId: p.paymentId || null,
        signature: p.signature || null,
        amount: p.amount ? Math.round(p.amount) : null,
        currency: p.currency || 'INR',
        status: p.status || 'created',
        plan: p.plan || null,
        billingCycle: p.billingCycle || null,
        raw: p.raw || null,
        createdAt: p.createdAt || new Date().toISOString(),
      }).onConflictDoNothing();
    } catch (err: any) {
      console.warn(`Skipping payment ${p.id}:`, err.message);
    }
  }

  // 6. Processed Events (Webhook idempotency)
  const processedEventRecords = readJsonFile<any>('processed_events.json');
  console.log(`Found ${processedEventRecords.length} processed webhook events.`);
  for (const pe of processedEventRecords) {
    try {
      await db.insert(processedEvents).values({
        eventId: pe.eventId,
        eventType: pe.eventType || null,
        processedAt: pe.processedAt || new Date().toISOString(),
      }).onConflictDoNothing();
    } catch (err: any) {
      console.warn(`Skipping event ${pe.eventId}:`, err.message);
    }
  }

  // 7. Audit Logs
  const auditRecords = readJsonFile<any>('audit_logs.json');
  console.log(`Found ${auditRecords.length} audit logs.`);
  for (const a of auditRecords) {
    try {
      await db.insert(auditLogs).values({
        id: a.id || `audit-${Date.now()}-${Math.random()}`,
        userId: a.userId || null,
        action: a.action,
        details: a.details || null,
        ip: a.ip || null,
        userAgent: a.userAgent || null,
        createdAt: a.createdAt || new Date().toISOString(),
      }).onConflictDoNothing();
    } catch (err: any) {
      console.warn(`Skipping audit log ${a.id}:`, err.message);
    }
  }

  // 8. Analytics Events
  const eventRecords = readJsonFile<any>('events.json');
  console.log(`Found ${eventRecords.length} analytics events.`);
  for (const e of eventRecords) {
    try {
      await db.insert(analyticsEvents).values({
        id: e.id || `evt-${Date.now()}-${Math.random()}`,
        userId: e.userId || null,
        eventType: e.eventType || e.type || 'unknown',
        eventData: e.eventData || e.data || null,
        createdAt: e.createdAt || e.timestamp || new Date().toISOString(),
      }).onConflictDoNothing();
    } catch (err: any) {
      console.warn(`Skipping event ${e.id}:`, err.message);
    }
  }

  // 9. URL Inspections
  const urlRecords = readJsonFile<any>('url_inspections.json');
  console.log(`Found ${urlRecords.length} url inspections.`);
  for (const u of urlRecords) {
    try {
      await db.insert(urlInspections).values({
        id: u.id,
        userId: u.userId,
        url: u.url,
        domain: u.domain,
        conversationId: u.conversationId || null,
        createdAt: u.createdAt || new Date().toISOString(),
      }).onConflictDoNothing();
    } catch (err: any) {
      console.warn(`Skipping url inspection ${u.id}:`, err.message);
    }
  }

  // 10. Push Subscriptions
  const pushRecords = readJsonFile<any>('push_subscriptions.json');
  console.log(`Found ${pushRecords.length} push subscriptions.`);
  for (const ps of pushRecords) {
    try {
      await db.insert(pushSubscriptions).values({
        id: ps.id || `push-${Date.now()}`,
        userId: ps.userId || null,
        endpoint: ps.endpoint,
        keys: ps.keys,
        createdAt: ps.createdAt || new Date().toISOString(),
      }).onConflictDoNothing();
    } catch (err: any) {
      console.warn(`Skipping push sub:`, err.message);
    }
  }

  // 11. Contact Inquiries
  const contactRecords = readJsonFile<any>('contact_inquiries.json');
  console.log(`Found ${contactRecords.length} contact inquiries.`);
  for (const c of contactRecords) {
    try {
      await db.insert(contactInquiries).values({
        id: c.id || `inq-${Date.now()}-${Math.random()}`,
        name: c.name || 'Anonymous',
        email: c.email || '',
        subject: c.subject || 'Inquiry',
        message: c.message || '',
        ip: c.ip || null,
        status: c.status || 'new',
        createdAt: c.createdAt || new Date().toISOString(),
      }).onConflictDoNothing();
    } catch (err: any) {
      console.warn(`Skipping contact inquiry:`, err.message);
    }
  }

  // 12. VAPID Keys if present
  const vapidFilePath = path.join(DATA_DIR, 'vapid_keys.json');
  if (fs.existsSync(vapidFilePath)) {
    try {
      const raw = fs.readFileSync(vapidFilePath, 'utf-8');
      await db.insert(systemSettings).values({
        key: 'vapid_keys',
        value: raw,
        updatedAt: new Date().toISOString(),
      }).onConflictDoNothing();
      console.log('Migrated VAPID keys to system_settings table.');
    } catch (err: any) {
      console.warn('Skipping vapid_keys migration:', err.message);
    }
  }

  console.log('--- Migration Finished Successfully ---');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
