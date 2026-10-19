export interface SimilarProduct {
  name: string;
  description: string;
  source_url: string;
}

export type FlawSeverity = 'high' | 'medium' | 'low';

export interface Flaw {
  title: string;
  explanation: string;
  severity: FlawSeverity;
}

export interface RefinedVersion {
  idea: string;
  reasoning: string;
}

export interface GraveyardStartup {
  name: string;
  founded_year: number | null;
  closed_year: number | null;
  reported_cause: string | null;
  lesson_for_this_idea: string;
  source_urls: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export type PlanId = 'free' | 'pro' | 'ultra' | 'enterprise';
export type ModelId = 'orbit' | 'pulsar' | 'quasar';

export interface ModelAccessStatus {
  modelId: ModelId;
  name: string;
  label: string;
  descriptor: string;
  isUnlocked: boolean;
  statusText: string;
  trialUsed: boolean;
  remainingCount?: number;
}

export interface ShareOptions {
  includeFlaws: boolean;
  includeCompetitors: boolean;
  includeRefinements: boolean;
  includeGraveyard: boolean;
  includeMessages: boolean;
  isAnonymous: boolean;
}

export interface ShareContent {
  flaws?: Flaw[];
  similar_products?: SimilarProduct[];
  refined_versions?: RefinedVersion[];
  graveyard?: GraveyardStartup[];
  messages?: ChatMessage[];
  authorName?: string;
}

export interface ShareRecord {
  id: string;
  validationId?: string;
  idea: string;
  title: string;
  options: ShareOptions;
  content: ShareContent;
  creatorId?: string;
  creatorEmail?: string;
  revoked: boolean;
  createdAt: string;
  updatedAt?: string;
  views: number;
}

export interface SharePayload {
  id?: string;
  validationId?: string;
  idea: string;
  title?: string;
  options: ShareOptions;
  content: ShareContent;
}

export type SkillType = 'idea_validation' | 'website_audit' | 'document_review' | 'comparison' | 'visual_theme_audit' | 'general_task';

export interface GeneralFinding {
  title: string;
  explanation: string;
  source_or_quote?: string;
}

export interface RiskOrQuestion {
  title: string;
  explanation: string;
  severity?: 'high' | 'medium' | 'low';
}

export interface NextStep {
  step: string;
  detail: string;
}

export interface ValidationResult {
  id: string;
  idea: string;
  skill?: SkillType;
  model?: ModelId;
  // Non-startup general skill fields:
  short_answer?: string;
  key_findings?: GeneralFinding[];
  risks_or_questions?: RiskOrQuestion[];
  next_steps?: NextStep[];
  disclaimer?: string | null;
  computed_palette?: {
    colors: Array<{ hex: string; role: string; contrastWithWhite: number; contrastWithBlack: number }>;
    wcag_notes: string;
  };
  // Startup validation specific fields:
  similar_products: SimilarProduct[];
  flaws: Flaw[];
  refined_versions: RefinedVersion[];
  graveyard?: GraveyardStartup[];
  messages?: ChatMessage[];
  createdAt: string;
  userId?: string;
  userEmail?: string;
  savedToGallery?: boolean;
}

export interface User {
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
  firebase_uid?: string;
  plan?: PlanId;
  pulsar_lifetime_used?: number;
  quasar_lifetime_used?: number;
  orbit_monthly_used?: number;
  pulsar_monthly_used?: number;
  quasar_monthly_used?: number;
  billing_cycle_start?: string;
  role?: 'user' | 'admin';
  banned?: boolean;
  bannedReason?: string;
  enterpriseGrant?: any;
  subscription_id?: string;
  subscription_status?: string;
  subscription_current_end?: string;
  subscription_cancel_at_cycle_end?: boolean;
  subscription_plan?: PlanId;
  modelAccess?: Record<ModelId, ModelAccessStatus>;
  teammates_trial_used?: boolean;
  teammates_lifetime_used?: number;
  isOwner?: boolean;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  userEmail: string;
  razorpayPaymentId: string;
  razorpaySubscriptionId: string;
  amount: number; // in paise
  currency: string;
  status: 'captured' | 'failed' | 'refunded' | 'pending';
  plan: 'pro' | 'ultra' | 'free' | 'enterprise';
  createdAt: string;
  errorDescription?: string;
}

export interface UsageMetrics {
  totalChecks: number;
  thisWeekChecks: number;
  thisMonthChecks: number;
  monthlyLimit: number;
  checksRemainingThisMonth: number;
  isOwner?: boolean;
  totalFollowUpMessages: number;
  totalFlawsIdentified: number;
  totalCompetitorsFound: number;
  plan?: PlanId;
  modelStatuses?: Record<ModelId, ModelAccessStatus>;
  modelUsage?: {
    orbit?: { monthlyUsed: number; unlimited: boolean };
    pulsar?: { lifetimeUsed: number; monthlyUsed: number; trialStatus: 'used' | 'available' };
    quasar?: { lifetimeUsed: number; monthlyUsed: number; trialStatus: 'used' | 'available' };
  };
  recentActivity: Array<{
    id: string;
    title: string;
    summary: string;
    createdAt: string;
    flawsCount: number;
    competitorsCount: number;
  }>;
}

export interface OnboardingAnswers {
  user_type: string;
  referral_source: string;
  project_type: string;
  idea_stage: string;
}

export interface HistoryItem {
  id: string;
  userId: string;
  userEmail: string;
  idea: string;
  title: string;
  summary: string;
  result: {
    skill?: SkillType;
    short_answer?: string;
    key_findings?: GeneralFinding[];
    risks_or_questions?: RiskOrQuestion[];
    next_steps?: NextStep[];
    disclaimer?: string | null;
    similar_products?: SimilarProduct[];
    flaws?: Flaw[];
    refined_versions?: RefinedVersion[];
    graveyard?: GraveyardStartup[];
  };
  messages?: ChatMessage[];
  createdAt: string;
  updatedAt?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
  previewUrl?: string;
  wordCount: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}
