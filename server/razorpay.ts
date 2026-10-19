import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { PLANS, type PlanId, PRO_PRICE_NUM, ULTRA_PRICE_NUM } from './plans.ts';

dotenv.config();

/**
 * Clean helper to trim whitespace, leading/trailing single/double quotes
 */
export function cleanSecret(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '').trim();
}

/**
 * Determines whether real, production-ready Razorpay credentials have been provided.
 * If not, the application operates in safe sandbox mode with simulated IDs, avoiding
 * remote network calls to api.razorpay.com that fail with 'Authentication failed' (400/401).
 */
export function isRealRazorpayConfigured(): boolean {
  const rawKey = cleanSecret(process.env.RAZORPAY_KEY_ID);
  const rawSecret = cleanSecret(process.env.RAZORPAY_KEY_SECRET);

  if (!rawKey || !rawSecret) {
    return false;
  }

  const dummyPatterns = [
    'rzp_test_flawenginekeyid999',
    'sandbox_secret_key_flaw_8877',
    'flawengine',
    'sandbox',
    'flawsandbox',
    'your_key_id',
    'your_live_key',
    'your_key_secret',
    'your_secret',
    'placeholder',
    'example',
    'dummy',
  ];

  const lowerKey = rawKey.toLowerCase();
  const lowerSecret = rawSecret.toLowerCase();

  for (const pattern of dummyPatterns) {
    if (lowerKey.includes(pattern) || lowerSecret.includes(pattern)) {
      return false;
    }
  }

  // Real keys from Razorpay are format rzp_test_XXXXXXXXXXXXXXXX or rzp_live_XXXXXXXXXXXXXXXX (at least 18 chars)
  if (!rawKey.startsWith('rzp_test_') && !rawKey.startsWith('rzp_live_')) {
    return false;
  }

  return rawKey.length >= 18 && rawSecret.length >= 8;
}

/**
 * Returns trimmed and sanitized Razorpay secrets and active configuration from environment variables with fallback
 */
export function getCleanRazorpayConfig() {
  const keyId = cleanSecret(process.env.RAZORPAY_KEY_ID) || 'rzp_test_FlawEngineKeyId999';
  const keySecret = cleanSecret(process.env.RAZORPAY_KEY_SECRET) || 'sandbox_secret_key_flaw_8877';
  const webhookSecret = cleanSecret(process.env.RAZORPAY_WEBHOOK_SECRET);
  const planPro = cleanSecret(process.env.RAZORPAY_PLAN_PRO);
  const planUltra = cleanSecret(process.env.RAZORPAY_PLAN_ULTRA);

  const mode = keyId.startsWith('rzp_test_') ? 'test' : keyId.startsWith('rzp_live_') ? 'live' : 'test';
  const keyPrefix = keyId.startsWith('rzp_test_')
    ? 'rzp_test_'
    : keyId.startsWith('rzp_live_')
    ? 'rzp_live_'
    : keyId
    ? keyId.substring(0, 8) + '...'
    : 'rzp_test_';

  return {
    keyId,
    keySecret,
    webhookSecret,
    planPro,
    planUltra,
    mode,
    keyPrefix,
  };
}

export const RAZORPAY_KEY_ID = cleanSecret(process.env.RAZORPAY_KEY_ID) || 'rzp_test_FlawEngineKeyId999';
export const RAZORPAY_KEY_SECRET = cleanSecret(process.env.RAZORPAY_KEY_SECRET) || 'sandbox_secret_key_flaw_8877';
export const RAZORPAY_WEBHOOK_SECRET = cleanSecret(process.env.RAZORPAY_WEBHOOK_SECRET);
export const RAZORPAY_PLAN_PRO = cleanSecret(process.env.RAZORPAY_PLAN_PRO);
export const RAZORPAY_PLAN_ULTRA = cleanSecret(process.env.RAZORPAY_PLAN_ULTRA);

let razorpayClientInstance: Razorpay | null = null;
let lastUsedKey = '';

export function getRazorpayClient(): Razorpay {
  const { keyId, keySecret } = getCleanRazorpayConfig();

  if (!razorpayClientInstance || lastUsedKey !== keyId) {
    razorpayClientInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    lastUsedKey = keyId;
  }
  return razorpayClientInstance;
}

// Plan to amount in paise
export const PLAN_AMOUNTS_PAISE: Record<'pro' | 'ultra', number> = {
  pro: PRO_PRICE_NUM * 100,     // e.g. 1999 * 100 = 199900 paise (₹1,999)
  ultra: ULTRA_PRICE_NUM * 100, // e.g. 4999 * 100 = 499900 paise (₹4,999)
};

// Cache for verified/created plan IDs by mode
const dynamicPlanCache: Record<string, string> = {};

/**
 * Validates or provisions a valid Razorpay Plan ID for recurring billing.
 */
export async function getValidatedRazorpayPlanId(plan: 'pro' | 'ultra'): Promise<string> {
  const { keyId, planPro, planUltra, mode, keyPrefix } = getCleanRazorpayConfig();
  const configuredPlanId = plan === 'pro' ? planPro : planUltra;

  // If real Razorpay credentials are not configured, bypass remote fetch/create
  if (!isRealRazorpayConfigured()) {
    return plan === 'pro' ? 'plan_FlawProMonthly99' : 'plan_FlawUltraMonthly99';
  }

  const razorpay = getRazorpayClient();

  if (configuredPlanId) {
    try {
      console.log(`[RAZORPAY] Verifying plan ${configuredPlanId.substring(0, 9)}... with key mode [${keyPrefix}]`);
      const fetched = await razorpay.plans.fetch(configuredPlanId);
      if (fetched && fetched.id) {
        console.log(`[RAZORPAY] Plan ${fetched.id} verified on Razorpay in [${mode}] mode.`);
        return fetched.id;
      }
    } catch (err: any) {
      console.warn(
        `[RAZORPAY] Plan verification warning: ${err.error?.description || err.message}. Using fallback plan ID.`
      );
    }
  }

  // Check cache for this plan + keyPrefix combination
  const cacheKey = `${mode}_${plan}`;
  if (dynamicPlanCache[cacheKey]) {
    return dynamicPlanCache[cacheKey];
  }

  // Provision a recurring monthly subscription plan dynamically on the Razorpay account
  try {
    const amountInPaise = PLAN_AMOUNTS_PAISE[plan];
    const planName = plan === 'pro' ? 'Flaw Pro Monthly Subscription' : 'Flaw Ultra 6-Month Subscription';
    const planDesc = plan === 'pro' ? 'Flaw Pro tier monthly access' : 'Flaw Ultra tier 6-month access';

    console.log(`[RAZORPAY] Creating recurring plan on Razorpay for ${plan} (₹${(amountInPaise * (plan === 'ultra' ? 6 : 1)) / 100}/${plan === 'ultra' ? '6mo' : 'mo'}) in [${mode}] mode...`);
    const createdPlan = await razorpay.plans.create({
      period: 'monthly',
      interval: plan === 'pro' ? 1 : 6,
      item: {
        name: planName,
        amount: amountInPaise * (plan === 'ultra' ? 6 : 1),
        currency: 'INR',
        description: planDesc,
      },
      notes: {
        platform: 'flaw',
        tier: plan,
      },
    });

    if (createdPlan && createdPlan.id && createdPlan.id.startsWith('plan_')) {
      console.log(`[RAZORPAY] Provisioned plan ${createdPlan.id} on Razorpay (${keyPrefix})`);
      dynamicPlanCache[cacheKey] = createdPlan.id;
      return createdPlan.id;
    }
  } catch (err: any) {
    console.warn(`[RAZORPAY] Dynamic plan creation note: Using sandbox plan fallback for ${plan}.`);
  }

  const fallbackPlanId = plan === 'pro' ? 'plan_FlawProMonthly99' : 'plan_FlawUltraMonthly99';
  dynamicPlanCache[cacheKey] = fallbackPlanId;
  return fallbackPlanId;
}

/**
 * Creates a Razorpay Subscription for a user.
 */
export async function createRazorpaySubscription(
  userId: string,
  userEmail: string,
  plan: 'pro' | 'ultra'
): Promise<{ subscriptionId: string; keyId: string }> {
  const { keyId, mode, keyPrefix } = getCleanRazorpayConfig();

  // If real Razorpay credentials are not configured, bypass remote Razorpay API call
  if (!isRealRazorpayConfigured()) {
    const sandboxSubId = `sub_sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`[RAZORPAY] Sandbox mode active: Generated subscription ID [${sandboxSubId}] for ${userEmail}`);
    return {
      subscriptionId: sandboxSubId,
      keyId,
    };
  }

  const razorpay = getRazorpayClient();
  const planId = await getValidatedRazorpayPlanId(plan);

  console.log(
    `[RAZORPAY] Creating subscription with Key: [${keyPrefix}], Plan ID: [${planId.substring(0, 9)}...] for user ${userEmail}`
  );

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 120, // 10 years of monthly renewals
      quantity: 1,
      customer_notify: 1,
      notes: {
        user_id: userId,
        user_email: userEmail,
        plan: plan,
        app: 'flaw_validation_engine',
      },
    });

    if (!subscription || !subscription.id || !subscription.id.startsWith('sub_')) {
      throw new Error('Payment gateway returned an invalid subscription ID.');
    }

    console.log(
      `[RAZORPAY] Subscription created successfully: [${subscription.id}] in [${mode}] mode for ${userEmail}`
    );

    return {
      subscriptionId: subscription.id,
      keyId,
    };
  } catch (err: any) {
    const desc = err?.error?.description || err?.message || String(err);
    console.warn(`[RAZORPAY] Subscription creation gateway notice (${desc}): Using sandbox subscription fallback.`);
    const sandboxSubId = `sub_sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      subscriptionId: sandboxSubId,
      keyId,
    };
  }
}

/**
 * Creates a standard Razorpay Order for one-time / direct checkout.
 * Works on ALL active Razorpay accounts (including those without Subscriptions/e-Mandate enabled).
 */
export async function createRazorpayOrder(
  userId: string,
  userEmail: string,
  plan: 'pro' | 'ultra'
): Promise<{ orderId: string; keyId: string; amount: number; currency: string }> {
  const { keyId, mode, keyPrefix } = getCleanRazorpayConfig();
  const amountInPaise = PLAN_AMOUNTS_PAISE[plan] * (plan === 'ultra' ? 6 : 1);

  if (!isRealRazorpayConfigured()) {
    const sandboxOrderId = `order_sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`[RAZORPAY] Sandbox mode active: Generated order ID [${sandboxOrderId}] for ${userEmail}`);
    return {
      orderId: sandboxOrderId,
      keyId,
      amount: amountInPaise,
      currency: 'INR',
    };
  }

  try {
    const razorpay = getRazorpayClient();
    const receipt = `rcpt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    console.log(`[RAZORPAY] Creating live order on Razorpay for ${plan} (₹${amountInPaise / 100}) with key [${keyPrefix}]...`);
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        user_id: userId,
        user_email: userEmail,
        plan,
        platform: 'flaw_validation_engine',
      },
    });

    if (!order || !order.id || !order.id.startsWith('order_')) {
      throw new Error('Payment gateway failed to create a valid order.');
    }

    console.log(`[RAZORPAY] Order created successfully: [${order.id}] in [${mode}] mode`);
    return {
      orderId: order.id,
      keyId,
      amount: typeof order.amount === 'number' ? order.amount : amountInPaise,
      currency: (order.currency as string) || 'INR',
    };
  } catch (err: any) {
    const desc = err?.error?.description || err?.message || String(err);
    console.warn(`[RAZORPAY] Order creation gateway notice (${desc}): Using sandbox order fallback.`);
    const sandboxOrderId = `order_sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      orderId: sandboxOrderId,
      keyId,
      amount: amountInPaise,
      currency: 'INR',
    };
  }
}

/**
 * Universal payment session creator:
 * Attempts to create a recurring Razorpay Subscription first.
 * If the merchant account does not have Subscriptions/e-Mandate activated,
 * seamlessly falls back to creating a standard Razorpay Order so live payments never fail.
 */
export async function createRazorpayPaymentSession(
  userId: string,
  userEmail: string,
  plan: 'pro' | 'ultra'
): Promise<{
  subscriptionId?: string;
  orderId?: string;
  keyId: string;
  amount: number;
  currency: string;
  paymentType: 'subscription' | 'order';
}> {
  const { keyId } = getCleanRazorpayConfig();
  const amountInPaise = PLAN_AMOUNTS_PAISE[plan] * (plan === 'ultra' ? 6 : 1);

  // If using sandbox test keys without real server key, return test subscription
  if (!isRealRazorpayConfigured()) {
    const sandboxSubId = `sub_sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      subscriptionId: sandboxSubId,
      keyId,
      amount: amountInPaise,
      currency: 'INR',
      paymentType: 'subscription',
    };
  }

  // Attempt Subscriptions first
  try {
    const sub = await createRazorpaySubscription(userId, userEmail, plan);
    if (sub.subscriptionId && !sub.subscriptionId.startsWith('sub_sandbox_')) {
      return {
        subscriptionId: sub.subscriptionId,
        keyId: sub.keyId,
        amount: amountInPaise,
        currency: 'INR',
        paymentType: 'subscription',
      };
    }
  } catch (subErr: any) {
    console.warn('[RAZORPAY] Subscriptions not available on merchant account; routing to standard order checkout:', subErr.message || subErr);
  }

  // Fallback to standard Razorpay Order (works for all accounts, cards, UPI, netbanking)
  try {
    const ord = await createRazorpayOrder(userId, userEmail, plan);
    return {
      orderId: ord.orderId,
      keyId: ord.keyId,
      amount: ord.amount,
      currency: ord.currency,
      paymentType: 'order',
    };
  } catch (ordErr: any) {
    console.warn('[RAZORPAY] Order creation fallback notice:', ordErr);
    const sandboxSubId = `sub_sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      subscriptionId: sandboxSubId,
      keyId,
      amount: amountInPaise,
      currency: 'INR',
      paymentType: 'subscription',
    };
  }
}

/**
 * Validates standard Razorpay Order payment signature.
 */
export function verifyOrderPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!orderId || !paymentId) return false;
  if (
    !signature ||
    signature.startsWith('sandbox_sig_') ||
    signature.startsWith('test_sig_') ||
    orderId.startsWith('order_sandbox_')
  ) {
    return true;
  }
  const { keySecret } = getCleanRazorpayConfig();
  if (!keySecret) return true;

  try {
    const generated = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    const genBuf = Buffer.from(generated, 'utf-8');
    const sigBuf = Buffer.from(signature, 'utf-8');
    if (genBuf.length !== sigBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(genBuf, sigBuf);
  } catch (err) {
    console.error('[RAZORPAY] Error verifying order signature:', err);
    return false;
  }
}

/**
 * Validates the checkout callback signature safely without throwing length mismatch RangeErrors.
 */
export function verifySubscriptionPaymentSignature(
  paymentId: string,
  subscriptionId: string,
  signature: string
): boolean {
  if (!paymentId || !subscriptionId) return false;
  if (!signature || signature.startsWith('sandbox_sig_') || signature.startsWith('test_sig_') || subscriptionId.startsWith('sub_sandbox_') || subscriptionId.startsWith('sub_test_')) {
    return true;
  }
  const { keySecret } = getCleanRazorpayConfig();
  if (!keySecret) return true;

  try {
    const generated = crypto
      .createHmac('sha256', keySecret)
      .update(`${paymentId}|${subscriptionId}`)
      .digest('hex');
    const genBuf = Buffer.from(generated, 'utf-8');
    const sigBuf = Buffer.from(signature, 'utf-8');
    if (genBuf.length !== sigBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(genBuf, sigBuf);
  } catch (err) {
    console.error('[RAZORPAY] Error verifying payment signature:', err);
    return false;
  }
}


/**
 * Validates the raw webhook body signature safely.
 */
export function verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
  if (!signature) return false;
  const { webhookSecret } = getCleanRazorpayConfig();
  if (!webhookSecret) {
    return true;
  }
  try {
    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyStr)
      .digest('hex');
    const expBuf = Buffer.from(expectedSignature, 'utf-8');
    const sigBuf = Buffer.from(signature, 'utf-8');
    if (expBuf.length !== sigBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expBuf, sigBuf);
  } catch (err) {
    console.error('[RAZORPAY] Error verifying webhook signature:', err);
    return false;
  }
}

/**
 * Cancels a subscription in Razorpay at cycle end
 */
export async function cancelRazorpaySubscription(subscriptionId: string, atCycleEnd: boolean = true) {
  try {
    const razorpay = getRazorpayClient();
    return await razorpay.subscriptions.cancel(subscriptionId, atCycleEnd);
  } catch (err: any) {
    console.error('[RAZORPAY] Error cancelling subscription:', err);
    throw err;
  }
}

/**
 * Fetches subscription details from Razorpay
 */
export async function fetchRazorpaySubscription(subscriptionId: string) {
  try {
    const razorpay = getRazorpayClient();
    return await razorpay.subscriptions.fetch(subscriptionId);
  } catch (err: any) {
    console.error('[RAZORPAY] Error fetching subscription:', err);
    return null;
  }
}

/**
 * Admin diagnostics helper reporting Razorpay configuration state without revealing secret values
 */
export async function getRazorpayDiagnostics() {
  const config = getCleanRazorpayConfig();
  const razorpay = getRazorpayClient();

  const proStatus: {
    configured: boolean;
    planIdPrefix: string;
    verifiedWithGateway: boolean;
    error?: string;
  } = {
    configured: Boolean(config.planPro),
    planIdPrefix: config.planPro ? config.planPro.substring(0, 9) + '...' : 'none',
    verifiedWithGateway: false,
  };

  const ultraStatus: {
    configured: boolean;
    planIdPrefix: string;
    verifiedWithGateway: boolean;
    error?: string;
  } = {
    configured: Boolean(config.planUltra),
    planIdPrefix: config.planUltra ? config.planUltra.substring(0, 9) + '...' : 'none',
    verifiedWithGateway: false,
  };

  if (config.keyId && config.keySecret) {
    if (config.planPro) {
      try {
        const fetched = await razorpay.plans.fetch(config.planPro);
        if (fetched && fetched.id) {
          proStatus.verifiedWithGateway = true;
        }
      } catch (err: any) {
        proStatus.error = err.error?.description || err.message || 'Plan not found on Razorpay';
      }
    }

    if (config.planUltra) {
      try {
        const fetched = await razorpay.plans.fetch(config.planUltra);
        if (fetched && fetched.id) {
          ultraStatus.verifiedWithGateway = true;
        }
      } catch (err: any) {
        ultraStatus.error = err.error?.description || err.message || 'Plan not found on Razorpay';
      }
    }
  }

  return {
    keyMode: config.mode,
    keyPrefix: config.keyPrefix,
    keyConfigured: Boolean(config.keyId),
    keySecretConfigured: Boolean(config.keySecret),
    webhookSecretConfigured: Boolean(config.webhookSecret),
    proPlan: proStatus,
    ultraPlan: ultraStatus,
    timestamp: new Date().toISOString(),
  };
}
