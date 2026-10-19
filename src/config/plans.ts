// ─────────────────────────────────────────────────────────────
// PLAN ENTITLEMENTS & PRICING CONFIGURATION
// ─────────────────────────────────────────────────────────────
// Edit limits, prices, and model entitlements in this single file.

// MARKED PLACEHOLDERS:
export const FREE_MONTHLY_CHECKS = 25;
export const PRO_MONTHLY_CHECKS = 50;
export const ULTRA_MONTHLY_CHECKS = 100;

// MARKED PLACEHOLDERS:
export const PRO_PULSAR_MONTHLY_LIMIT = 50;   // [PRO_PULSAR_MONTHLY_LIMIT]
export const PRO_QUASAR_MONTHLY_LIMIT = 15;   // [PRO_QUASAR_MONTHLY_LIMIT]
export const PRO_PRICE = '₹1,999';            // [PRO_PRICE]
export const PRO_PRICE_NUM = 1999;

export const ULTRA_PULSAR_MONTHLY_LIMIT = 100; // [ULTRA_PULSAR_MONTHLY_LIMIT]
export const ULTRA_QUASAR_MONTHLY_LIMIT = 50;  // [ULTRA_QUASAR_MONTHLY_LIMIT]
export const ULTRA_PRICE = '₹4,999';           // [ULTRA_PRICE]
export const ULTRA_PRICE_NUM = 4999;

export type PlanId = 'free' | 'pro' | 'ultra' | 'enterprise';
export type ModelId = 'orbit' | 'pulsar' | 'quasar';

export const FREE_ORBIT_DAILY_LIMIT = 25;
export const PAID_ORBIT_DAILY_LIMIT = 50;

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: string;
  priceNumeric?: number;
  frequency: string;
  badge?: string;
  description: string;
  highlight?: boolean;
  monthlyChecks: number | 'unlimited';
  orbit: { daily: number } | 'unlimited';
  pulsar: { lifetime: number } | { monthly: number } | 'custom';
  quasar: { lifetime: number } | { monthly: number } | 'custom';
  features: string[];
  contactPhone?: string;
  contactTel?: string;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: '₹0',
    priceNumeric: 0,
    frequency: 'forever',
    description: 'Adversarial hypothesis testing for individual builders and early thinkers.',
    monthlyChecks: FREE_MONTHLY_CHECKS,
    orbit: { daily: FREE_ORBIT_DAILY_LIMIT },
    pulsar: { lifetime: 1 },
    quasar: { lifetime: 1 },
    features: [
      `25 validation checks / month`,
      'Pulsar & Quasar: 1 lifetime trial check each',
      'Vibe Code: Basic browser sandbox preview',
      'AI Teammates: Preview Atlas architecture audits',
      'Live competitor web research & citations',
      'Synthetic audio teardown voice profiles',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: PRO_PRICE, // [PRO_PRICE]
    priceNumeric: PRO_PRICE_NUM,
    frequency: 'per month',
    badge: 'Popular',
    highlight: true,
    description: 'Deep competitive matrices, Vibe Code IDE, and active AI Teammates.',
    monthlyChecks: PRO_MONTHLY_CHECKS,
    orbit: { daily: PAID_ORBIT_DAILY_LIMIT },
    pulsar: { monthly: PRO_PULSAR_MONTHLY_LIMIT }, // [PRO_PULSAR_MONTHLY_LIMIT]
    quasar: { monthly: PRO_QUASAR_MONTHLY_LIMIT }, // [PRO_QUASAR_MONTHLY_LIMIT]
    features: [
      `50 validation checks / month`,
      `Pulsar & Quasar advanced models included`,
      'Full Vibe Code IDE & interactive live sandbox',
      'AI Teammates: Atlas (Architect) & Elena (Frontend)',
      'Resizable AI code refinement side panel',
      'Real ZIP project code export & hot reload',
      'Priority compute processing queue',
    ],
  },
  ultra: {
    id: 'ultra',
    name: 'Ultra',
    price: ULTRA_PRICE, // [ULTRA_PRICE]
    priceNumeric: ULTRA_PRICE_NUM,
    frequency: '6-months',
    badge: 'Maximum Power',
    description: 'Maximum compute, 5-agent AI Teammate Office, and unlimited Vibe Code sessions.',
    monthlyChecks: ULTRA_MONTHLY_CHECKS,
    orbit: { daily: PAID_ORBIT_DAILY_LIMIT },
    pulsar: { monthly: ULTRA_PULSAR_MONTHLY_LIMIT }, // [ULTRA_PULSAR_MONTHLY_LIMIT]
    quasar: { monthly: ULTRA_QUASAR_MONTHLY_LIMIT }, // [ULTRA_QUASAR_MONTHLY_LIMIT]
    features: [
      `100 validation checks / month`,
      'Full 5-Specialist AI Teammate Office (Atlas, Elena, Nova, Cypher, Iris)',
      'Unlimited Vibe Code sessions & multi-file coding',
      'Live browser runtime sandbox & terminal logs',
      'Maximum-depth multi-angle red-team simulations',
      'Continuous market surveillance & full pitch audits',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    frequency: 'tailored annual / monthly',
    badge: 'Dedicated',
    description: 'Custom limits, dedicated AI team fine-tuning, and SLA guarantees.',
    contactPhone: '7702764081',
    contactTel: 'tel:+917702764081',
    monthlyChecks: 'unlimited',
    orbit: 'unlimited',
    pulsar: 'custom',
    quasar: 'custom',
    features: [
      'Unlimited validation checks (Dedicated capacity)',
      'Dedicated enterprise Vibe Code infrastructure',
      'Custom fine-tuned AI Teammate agents',
      'Private deployment, custom rubrics & SLA',
      'Dedicated phone & Slack support (7702764081)',
      'Team workspace collaboration & admin controls',
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// MODEL CONFIGURATION (MODELS vs PLANS)
// ─────────────────────────────────────────────────────────────
// Orbit, Pulsar, and Quasar are AI MODELS selectable in the model picker.
// They are NOT billing plans. Label format: "Orbit: Everyday", etc.
// No plan/billing language and NO emojis in the model picker.

export interface ModelOption {
  id: ModelId;
  name: string;
  label: string; // "Orbit: Everyday", "Pulsar: Advanced", "Quasar: Maximum"
  descriptor: string;
  description: string;
}

export const MODELS: ModelOption[] = [
  {
    id: 'orbit',
    name: 'Orbit',
    label: 'Orbit: Everyday',
    descriptor: 'Everyday',
    description: 'Standard adversarial hypothesis testing for daily validation',
  },
  {
    id: 'pulsar',
    name: 'Pulsar',
    label: 'Pulsar: Advanced',
    descriptor: 'Advanced',
    description: 'Deep competitor matrix & multi-angle vulnerability analysis',
  },
  {
    id: 'quasar',
    name: 'Quasar',
    label: 'Quasar: Maximum',
    descriptor: 'Maximum',
    description: 'Maximum-depth adversarial simulation & stress testing',
  },
];

// Helper to determine model access and remaining text for a user
export interface ModelStatus {
  modelId: ModelId;
  name: string;
  label: string;
  descriptor: string;
  isUnlocked: boolean;
  statusText: string;
  trialUsed: boolean;
  remainingCount?: number;
}

export function computeUserModelStatuses(userData?: {
  plan?: PlanId;
  pulsar_lifetime_used?: number;
  quasar_lifetime_used?: number;
  orbit_monthly_used?: number;
  pulsar_monthly_used?: number;
  quasar_monthly_used?: number;
  email?: string;
  role?: string;
  isOwner?: boolean;
}): Record<ModelId, ModelStatus> {
  const isOwner = Boolean(
    userData?.isOwner ||
    (userData?.email && userData.email.trim().toLowerCase() === 'pardeshilata1983@gmail.com') ||
    userData?.role === 'admin'
  );
  const plan: PlanId = isOwner ? 'enterprise' : (userData?.plan || 'free');
  const pulsarLifetimeUsed = isOwner ? 0 : (userData?.pulsar_lifetime_used || 0);
  const quasarLifetimeUsed = isOwner ? 0 : (userData?.quasar_lifetime_used || 0);
  const pulsarMonthlyUsed = isOwner ? 0 : (userData?.pulsar_monthly_used || 0);
  const quasarMonthlyUsed = isOwner ? 0 : (userData?.quasar_monthly_used || 0);

  // 1. Orbit: always unlocked
  const orbitStatus: ModelStatus = {
    modelId: 'orbit',
    name: 'Orbit',
    label: 'Orbit: Everyday',
    descriptor: 'Everyday',
    isUnlocked: true,
    statusText: isOwner ? 'Unlimited (Owner)' : 'Active (Included in plan)',
    trialUsed: false,
  };

  // 2. Pulsar
  let pulsarUnlocked = true;
  let pulsarStatusText = '1 free use left';
  let pulsarTrialUsed = false;
  let pulsarRemaining: number | undefined = undefined;

  if (isOwner) {
    pulsarUnlocked = true;
    pulsarStatusText = 'Pulsar: Unlimited (Owner)';
    pulsarTrialUsed = false;
    pulsarRemaining = undefined;
  } else if (plan === 'free') {
    pulsarTrialUsed = pulsarLifetimeUsed >= 1;
    pulsarUnlocked = pulsarLifetimeUsed < 1;
    pulsarRemaining = Math.max(0, 1 - pulsarLifetimeUsed);
    pulsarStatusText = pulsarUnlocked ? 'Pulsar: 1 free use left' : 'Pulsar: Locked';
  } else if (plan === 'pro') {
    pulsarRemaining = Math.max(0, PRO_PULSAR_MONTHLY_LIMIT - pulsarMonthlyUsed);
    pulsarUnlocked = pulsarRemaining > 0;
    pulsarStatusText = pulsarUnlocked ? `Pulsar: ${pulsarRemaining} left this month` : 'Pulsar: Locked';
  } else if (plan === 'ultra') {
    pulsarRemaining = Math.max(0, ULTRA_PULSAR_MONTHLY_LIMIT - pulsarMonthlyUsed);
    pulsarUnlocked = pulsarRemaining > 0;
    pulsarStatusText = pulsarUnlocked ? `Pulsar: ${pulsarRemaining} left this month` : 'Pulsar: Locked';
  } else if (plan === 'enterprise') {
    pulsarUnlocked = true;
    pulsarStatusText = 'Pulsar: Enterprise';
  }

  const pulsarStatus: ModelStatus = {
    modelId: 'pulsar',
    name: 'Pulsar',
    label: 'Pulsar: Advanced',
    descriptor: 'Advanced',
    isUnlocked: pulsarUnlocked,
    statusText: pulsarStatusText,
    trialUsed: pulsarTrialUsed,
    remainingCount: pulsarRemaining,
  };

  // 3. Quasar
  let quasarUnlocked = true;
  let quasarStatusText = '1 free use left';
  let quasarTrialUsed = false;
  let quasarRemaining: number | undefined = undefined;

  if (isOwner) {
    quasarUnlocked = true;
    quasarStatusText = 'Quasar: Unlimited (Owner)';
    quasarTrialUsed = false;
    quasarRemaining = undefined;
  } else if (plan === 'free') {
    quasarTrialUsed = quasarLifetimeUsed >= 1;
    quasarUnlocked = quasarLifetimeUsed < 1;
    quasarRemaining = Math.max(0, 1 - quasarLifetimeUsed);
    quasarStatusText = quasarUnlocked ? 'Quasar: 1 free use left' : 'Quasar: Locked';
  } else if (plan === 'pro') {
    quasarRemaining = Math.max(0, PRO_QUASAR_MONTHLY_LIMIT - quasarMonthlyUsed);
    quasarUnlocked = quasarRemaining > 0;
    quasarStatusText = quasarUnlocked ? `Quasar: ${quasarRemaining} left this month` : 'Quasar: Locked';
  } else if (plan === 'ultra') {
    quasarRemaining = Math.max(0, ULTRA_QUASAR_MONTHLY_LIMIT - quasarMonthlyUsed);
    quasarUnlocked = quasarRemaining > 0;
    quasarStatusText = quasarUnlocked ? `Quasar: ${quasarRemaining} left this month` : 'Quasar: Locked';
  } else if (plan === 'enterprise') {
    quasarUnlocked = true;
    quasarStatusText = 'Quasar: Enterprise';
  }

  const quasarStatus: ModelStatus = {
    modelId: 'quasar',
    name: 'Quasar',
    label: 'Quasar: Maximum',
    descriptor: 'Maximum',
    isUnlocked: quasarUnlocked,
    statusText: quasarStatusText,
    trialUsed: quasarTrialUsed,
    remainingCount: quasarRemaining,
  };

  return {
    orbit: orbitStatus,
    pulsar: pulsarStatus,
    quasar: quasarStatus,
  };
}
