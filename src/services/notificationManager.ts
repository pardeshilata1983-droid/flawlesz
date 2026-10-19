/**
 * Simplified Flaw Notification Manager
 * - Native browser popup on first "Find Flaws" click only when permission === 'default'.
 * - AI response ready notification when tab is hidden.
 * - Occasional promotional notifications (max 1 per 7 days after 3+ days inactivity).
 * - Zero in-app notification UI, buttons, banners, or toggles.
 */

export interface PromotionalMessage {
  id: string;
  title: string;
  body: string;
}

export const PROMOTIONAL_MESSAGES: PromotionalMessage[] = [
  {
    id: 'promo-features',
    title: 'New: Live Competitor URL Inspections',
    body: 'Flawlesz AI can now inspect live competitor landing pages and websites in real-time.'
  },
  {
    id: 'promo-pro',
    title: 'Unlock Flawlesz AI Pro Plan',
    body: 'Get unlimited daily checks and deep AI models with Pro.'
  },
  {
    id: 'promo-reports',
    title: 'Export Investor-Ready Dossiers',
    body: 'Download comprehensive flaw analysis reports directly to PDF and markdown.'
  }
];

const STORAGE_KEYS = {
  LAST_PROMO_SHOWN_AT: 'flaw_last_promo_timestamp',
  LAST_ACTIVITY_AT: 'flaw_last_activity_timestamp',
  PROMO_INDEX: 'flaw_promo_index'
};

/**
 * Checks if browser supports notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Request notification permission exactly once when the user clicks "Find Flaws" for the first time.
 * Called only if Notification.permission === 'default'. Fails silently if unsupported or denied.
 */
export async function requestPermissionOnFirstSubmit(): Promise<void> {
  try {
    if (!isNotificationSupported()) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  } catch {
    // Fail silently
  }
}

/**
 * Record user activity timestamp to track inactivity for promotional re-engagement
 */
export function recordActivity(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY_AT, String(Date.now()));
  } catch {}
}

/**
 * Displays a functional Web Notification when an AI response completes while the tab is hidden.
 * Uses service worker showNotification() if available, with Notification constructor fallback.
 * Uses "tag" to prevent stacking.
 */
export function triggerAiCompletionNotification(options: {
  type: 'idea_validation' | 'follow_up';
  ideaTitle?: string;
  flawCount?: number;
  competitorCount?: number;
  previewText?: string;
  onClick?: () => void;
}): void {
  try {
    if (!isNotificationSupported()) return;
    if (Notification.permission !== 'granted') return;

    // Never notify if the tab is visible and focused
    if (typeof document !== 'undefined' && document.visibilityState === 'visible' && document.hasFocus()) {
      return;
    }

    let title = 'Flawlesz AI finished analyzing your idea';
    let body = 'Your idea teardown is ready. Tap to view competitors and critical flaws.';

    if (options.type === 'idea_validation') {
      const flaws = options.flawCount ?? 0;
      const comps = options.competitorCount ?? 0;
      const flawText = flaws === 1 ? '1 flaw found' : `${flaws} flaws found`;
      const compText = comps === 1 ? '1 competitor' : `${comps} competitors`;
      if (flaws > 0 || comps > 0) {
        body = `${flawText} • ${compText} detected — tap to see full breakdown.`;
      }
    } else if (options.type === 'follow_up' && options.previewText) {
      title = 'Flawlesz AI answered your follow-up';
      const clean = options.previewText.replace(/[*_#`]/g, '').trim();
      body = clean.length > 80 ? `${clean.slice(0, 80)}...` : clean;
    }

    const tag = 'flaw-ai-completion';

    // Try service worker showNotification first
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg && reg.showNotification) {
          reg.showNotification(title, {
            body,
            icon: '/brand-logo.svg',
            badge: '/brand-logo.svg',
            tag
          }).catch(() => {
            fallbackShowNotification(title, body, tag, options.onClick);
          });
          return;
        }
        fallbackShowNotification(title, body, tag, options.onClick);
      }).catch(() => {
        fallbackShowNotification(title, body, tag, options.onClick);
      });
    } else {
      fallbackShowNotification(title, body, tag, options.onClick);
    }
  } catch (err) {
    console.warn('[NOTIFICATIONS] Error triggering completion notification:', err);
  }
}

function fallbackShowNotification(title: string, body: string, tag: string, onClick?: () => void) {
  try {
    const notification = new Notification(title, {
      body,
      icon: '/brand-logo.svg',
      badge: '/brand-logo.svg',
      tag
    });

    notification.onclick = (e) => {
      e.preventDefault();
      try {
        window.focus();
      } catch {}
      if (onClick) onClick();
      notification.close();
    };
  } catch {}
}

/**
 * Checks and triggers promotional notifications on app load:
 * - Permission must be "granted".
 * - User inactive for 3+ days.
 * - No promo shown in the last 7 days.
 * - Never shows promos to users currently active in the app.
 */
export function checkAndTriggerPromo(): void {
  try {
    if (!isNotificationSupported()) return;
    if (Notification.permission !== 'granted') return;

    // Never show promos to users who are currently active in the app
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      return;
    }

    const now = Date.now();
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    // Check last promo timestamp (max 1 per 7 days)
    const lastPromoStr = localStorage.getItem(STORAGE_KEYS.LAST_PROMO_SHOWN_AT);
    if (lastPromoStr) {
      const lastPromo = parseInt(lastPromoStr, 10);
      if (!isNaN(lastPromo) && now - lastPromo < SEVEN_DAYS_MS) {
        return;
      }
    }

    // Check inactivity (inactive for 3+ days)
    const lastActivityStr = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY_AT);
    if (lastActivityStr) {
      const lastActivity = parseInt(lastActivityStr, 10);
      if (!isNaN(lastActivity) && now - lastActivity < THREE_DAYS_MS) {
        return; // active within 3 days
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY_AT, String(now));
      return;
    }

    // Pick promotion
    const idx = parseInt(localStorage.getItem(STORAGE_KEYS.PROMO_INDEX) || '0', 10);
    const promo = PROMOTIONAL_MESSAGES[idx % PROMOTIONAL_MESSAGES.length];
    const tag = 'flaw-promo';

    const notification = new Notification(promo.title, {
      body: promo.body,
      icon: '/brand-logo.svg',
      badge: '/brand-logo.svg',
      tag
    });

    notification.onclick = (e) => {
      e.preventDefault();
      try {
        window.focus();
      } catch {}
      notification.close();
    };

    localStorage.setItem(STORAGE_KEYS.LAST_PROMO_SHOWN_AT, String(now));
    localStorage.setItem(STORAGE_KEYS.PROMO_INDEX, String(idx + 1));
  } catch (err) {
    console.warn('[NOTIFICATIONS] Promo notification error:', err);
  }
}
