import webpush from 'web-push';
import {
  getUserPushSubscriptions,
  removePushSubscriptionByEndpoint,
  getUserNotificationPreferences,
  getSystemSetting,
  setSystemSetting,
  type PushSubscriptionRecord,
  type NotificationPreferences
} from './db.ts';

export type FlawNotificationType =
  | 'analysis_completed'
  | 'analysis_failed'
  | 'report_ready'
  | 'project_update'
  | 'security_alert'
  | 'system_update';

export interface FlawPushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  type: FlawNotificationType;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, any>;
}

let vapidPublicKey = '';
let vapidPrivateKey = '';
let vapidSubject = '';

/**
 * Initializes VAPID keys from environment variables or persistent database settings.
 * Generates fresh keys automatically if none exist, ensuring zero-config out-of-the-box readiness.
 */
export async function initVapid() {
  if (vapidPublicKey && vapidPrivateKey) {
    return;
  }

  vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@flawagent.app';

  // 1. Try reading from environment variables
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    vapidPublicKey = process.env.VAPID_PUBLIC_KEY.trim();
    vapidPrivateKey = process.env.VAPID_PRIVATE_KEY.trim();
    console.log('[WEBPUSH] Using VAPID keys from environment variables');
  } else {
    // 2. Try loading from database system_settings table
    try {
      const savedKeysRaw = await getSystemSetting('vapid_keys');
      if (savedKeysRaw) {
        const parsed = JSON.parse(savedKeysRaw);
        if (parsed.publicKey && parsed.privateKey) {
          vapidPublicKey = parsed.publicKey;
          vapidPrivateKey = parsed.privateKey;
          console.log('[WEBPUSH] Loaded persistent VAPID keys from PostgreSQL system_settings');
        }
      }
    } catch (err) {
      console.warn('[WEBPUSH] Error loading vapid keys from DB:', err);
    }

    // 3. If still not set, generate fresh VAPID keys and persist
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.log('[WEBPUSH] Generating fresh VAPID keys for Web Push...');
      const keys = webpush.generateVAPIDKeys();
      vapidPublicKey = keys.publicKey;
      vapidPrivateKey = keys.privateKey;

      try {
        await setSystemSetting(
          'vapid_keys',
          JSON.stringify({
            publicKey: vapidPublicKey,
            privateKey: vapidPrivateKey,
            generatedAt: new Date().toISOString()
          })
        );
        console.log('[WEBPUSH] VAPID keys persisted to PostgreSQL system_settings');
      } catch (writeErr) {
        console.error('[WEBPUSH] Failed to persist vapid_keys to DB:', writeErr);
      }
    }
  }

  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    console.log('[WEBPUSH] VAPID configuration successfully initialized.');
  } catch (err) {
    console.error('[WEBPUSH] Error configuring web-push VAPID details:', err);
  }
}

// Initialize on module load
initVapid().catch(err => console.error('[WEBPUSH] Init error:', err));

export function getVapidPublicKey(): string {
  if (!vapidPublicKey) {
    initVapid();
  }
  return vapidPublicKey;
}

/**
 * Checks whether user has enabled the specific notification type in their preferences.
 */
function isNotificationTypeAllowed(
  type: FlawNotificationType,
  prefs: NotificationPreferences
): boolean {
  switch (type) {
    case 'analysis_completed':
      return prefs.analysis_completed ?? true;
    case 'analysis_failed':
      return prefs.idea_failed ?? true;
    case 'report_ready':
      return prefs.reports_ready ?? true;
    case 'project_update':
      return prefs.reports_ready ?? true;
    case 'security_alert':
      return prefs.security_alerts ?? true;
    case 'system_update':
      return prefs.system_updates ?? true;
    default:
      return true;
  }
}

/**
 * Sends a Web Push Notification to all active push subscriptions for a given user.
 * Automatically cleans up expired/unsubscribed subscriptions (HTTP 410 Gone / 404 Not Found).
 */
export async function sendPushNotificationToUser(
  userId: string,
  payload: FlawPushNotificationPayload,
  bypassPreferences = false
): Promise<{ sent: number; failed: number; cleaned: number; message: string }> {
  initVapid();

  // 1. Check user preferences unless bypassed (e.g. For manual test notifications)
  if (!bypassPreferences) {
    const preferences = getUserNotificationPreferences(userId);
    if (!isNotificationTypeAllowed(payload.type, preferences)) {
      console.log(
        `[WEBPUSH] User ${userId} has muted notification type "${payload.type}". Skipping push.`
      );
      return {
        sent: 0,
        failed: 0,
        cleaned: 0,
        message: `Notification type "${payload.type}" is disabled in user preferences.`
      };
    }
  }

  // 2. Get all subscriptions for this user
  const subscriptions = getUserPushSubscriptions(userId);
  if (subscriptions.length === 0) {
    console.log(`[WEBPUSH] User ${userId} has no registered push subscriptions.`);
    return {
      sent: 0,
      failed: 0,
      cleaned: 0,
      message: 'No active push subscriptions registered for this user.'
    };
  }

  // Format standard notification payload
  const notificationData = {
    title: payload.title || 'Flawlesz AI Notification',
    body: payload.body || 'You have an update from Flawlesz AI.',
    icon: payload.icon || '/brand-logo.svg',
    badge: payload.badge || '/brand-logo.svg',
    url: payload.url || '/flaw/submit',
    type: payload.type,
    tag: payload.tag || `flaw-${payload.type}-${Date.now()}`,
    requireInteraction: payload.requireInteraction ?? false,
    data: {
      url: payload.url || '/flaw/submit',
      type: payload.type,
      timestamp: Date.now(),
      ...(payload.data || {})
    },
    actions: [
      { action: 'open', title: 'Open Flawlesz AI' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  const payloadString = JSON.stringify(notificationData);

  let sent = 0;
  let failed = 0;
  let cleaned = 0;

  for (const sub of subscriptions) {
    try {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth
        }
      };

      await webpush.sendNotification(pushSubscription, payloadString, {
        TTL: 60 * 60 * 24 // 24 hours in seconds
      });
      sent++;
      console.log(`[WEBPUSH] Push delivered to ${sub.endpoint.slice(0, 35)}...`);
    } catch (err: any) {
      failed++;
      console.error(
        `[WEBPUSH] Push send failed for endpoint ${sub.endpoint.slice(0, 35)}...:`,
        err.statusCode || err.message
      );

      // Status 404 or 410 means the subscription is expired or unsubscribed on the browser/OS side
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.log(`[WEBPUSH] Cleaning up defunct subscription: ${sub.endpoint.slice(0, 35)}...`);
        removePushSubscriptionByEndpoint(sub.endpoint);
        cleaned++;
      }
    }
  }

  return {
    sent,
    failed,
    cleaned,
    message: `Delivered to ${sent} active device(s)${failed > 0 ? `, ${failed} failed` : ''}${cleaned > 0 ? `, ${cleaned} expired removed` : ''}.`
  };
}
