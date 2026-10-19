import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Navbar } from '../components/Navbar.tsx';
import { updateProfile, changePassword, deleteAccount, fetchUserTokens, createUserToken, revokeUserToken, type UserApiToken } from '../services/api.ts';
import {
  User as UserIcon,
  KeyRound,
  Trash2,
  LogOut,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Mail,
  Loader2,
  ShieldCheck,
  Building2,
  CreditCard,
  ArrowUpRight,
  Printer,
  Copy,
  Check,
  Plus,
  Terminal,
  Code2,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  X
} from 'lucide-react';
import { PaymentReceiptModal } from '../components/PaymentReceiptModal.tsx';
import {
  PLANS,
  PlanId,
  PRO_PULSAR_MONTHLY_LIMIT,
  PRO_QUASAR_MONTHLY_LIMIT,
  ULTRA_PULSAR_MONTHLY_LIMIT,
  ULTRA_QUASAR_MONTHLY_LIMIT
} from '../config/plans.ts';

interface AccountPageProps {
  onNavigate: (path: string) => void;
}

const USER_TYPES = [
  'Founder / Entrepreneur',
  'Indie Hacker / Builder',
  'Product Manager',
  'Investor / VC',
  'Student / Researcher',
  'Curious Explorer'
];

const REFERRAL_SOURCES = [
  'Hackers Dev community',
  'Twitter / X',
  'LinkedIn',
  'Search Engine',
  'Friend / Colleague',
  'Other'
];

const PROJECT_TYPES = [
  'SaaS / Software',
  'Marketplace / Platform',
  'Mobile App',
  'Hardware / Physical',
  'E-commerce / D2C',
  'AI / DeepTech',
  'Service Business'
];

const IDEA_STAGES = [
  'Just a shower thought',
  'Rough notes & research',
  'Validating & talking to users',
  'Prototype / MVP in progress',
  'Already launched & iterating'
];

export const AccountPage: React.FC<AccountPageProps> = ({ onNavigate }) => {
  const { user, loading: authLoading, logout, updateUser } = useAuth();

  // Profile Form State
  const [name, setName] = useState('');
  const [userType, setUserType] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [projectType, setProjectType] = useState('');
  const [ideaStage, setIdeaStage] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState<boolean>(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Delete Modal / Confirmation State
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Personal Access Tokens State (Remote MCP)
  const [tokens, setTokens] = useState<UserApiToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [tokenCreating, setTokenCreating] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenSuccess, setTokenSuccess] = useState<string | null>(null);
  const [createdTokenModal, setCreatedTokenModal] = useState<{ token: string; name: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [snippetTab, setSnippetTab] = useState<'claude' | 'cursor' | 'vscode' | 'generic'>('claude');

  const loadTokens = async () => {
    try {
      setTokensLoading(true);
      const list = await fetchUserTokens();
      setTokens(list);
    } catch (err: any) {
      console.warn('[ACCOUNT] Failed to load tokens:', err);
    } finally {
      setTokensLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadTokens();
    }
  }, [user]);

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;
    setTokenError(null);
    setTokenSuccess(null);
    setTokenCreating(true);

    try {
      const res = await createUserToken(newTokenName.trim());
      setCreatedTokenModal({ token: res.token, name: res.tokenRecord.name });
      setNewTokenName('');
      setTokenSuccess(`Token "${res.tokenRecord.name}" created.`);
      await loadTokens();
    } catch (err: any) {
      setTokenError(err.message || 'Failed to generate token.');
    } finally {
      setTokenCreating(false);
    }
  };

  const handleRevokeToken = async (tokenId: string, tokenName: string) => {
    if (!window.confirm(`Revoke token "${tokenName}"? External AI tools using this token will immediately lose access.`)) {
      return;
    }
    try {
      await revokeUserToken(tokenId);
      await loadTokens();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke token.');
    }
  };

  // Initialize values from user profile
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUserType(user.user_type || USER_TYPES[0]);
      setReferralSource(user.referral_source || REFERRAL_SOURCES[0]);
      setProjectType(user.project_type || PROJECT_TYPES[0]);
      setIdeaStage(user.idea_stage || IDEA_STAGES[0]);
    }
  }, [user]);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      onNavigate('/flaw/login?redirect=/flaw/account');
    }
  }, [authLoading, user, onNavigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#F5F4F0] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-mono text-[#5A5A5A]">
          <Loader2 className="w-4 h-4 animate-spin text-[#E8481C]" />
          <span>Loading account settings...</span>
        </div>
      </div>
    );
  }

  // Format creation date
  const createdDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Recently';

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const res = await updateProfile({
        name,
        user_type: userType,
        referral_source: referralSource,
        project_type: projectType,
        idea_stage: ideaStage
      });
      updateUser(res.user);
      setProfileSuccess('Profile and preferences updated successfully.');
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to save changes.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      setPasswordSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      setPasswordSaving(false);
      return;
    }

    try {
      const res = await changePassword(currentPassword, newPassword);
      setPasswordSuccess(res.message || 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm account removal.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteAccount('DELETE');
      await logout();
      onNavigate('/flaw');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account.');
      setIsDeleting(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    onNavigate('/flaw');
  };

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#111111] flex flex-col selection:bg-[#E8481C]/20 selection:text-[#E8481C]">
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Navigation breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <button
            id="back-to-validator-btn"
            onClick={() => onNavigate('/flaw/submit')}
            className="inline-flex items-center gap-2 text-xs font-mono text-[#5A5A5A] hover:text-[#111111] transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Idea Validator</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              id="account-header-usage-link"
              onClick={() => onNavigate('/flaw/usage')}
              className="text-xs font-mono text-[#5A5A5A] hover:text-[#111111] underline transition-colors cursor-pointer"
            >
              Usage Metrics
            </button>
            <span className="text-[#E0DEDA]">•</span>
            <button
              id="account-header-billing-link"
              onClick={() => onNavigate('/flaw/billing')}
              className="text-xs font-mono text-[#5A5A5A] hover:text-[#111111] underline transition-colors cursor-pointer"
            >
              Billing & Plans
            </button>
          </div>
        </div>

        {/* Header Title */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111]">
                Account Settings
              </h1>
              <p className="text-sm text-[#5A5A5A] mt-1">
                Manage your credentials, onboarding parameters, and platform profile.
              </p>
            </div>
            <button
              id="account-sign-out-top-btn"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-[#5A5A5A] hover:text-[#111111] bg-white hover:bg-[#F5F4F0] border border-[#E0DEDA] rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {/* SECTION 1: PROFILE & ONBOARDING DATA */}
          <section className="bg-white border border-[#E0DEDA] rounded-xl p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2.5 pb-5 border-b border-[#E0DEDA] mb-6">
              <UserIcon className="w-5 h-5 text-[#E8481C]" />
              <h2 className="text-base font-bold text-[#111111]">Profile & Onboarding Details</h2>
            </div>

            {profileSuccess && (
              <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Email & Joined Date (Readonly Account Info) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-[#F5F4F0]/60 border border-[#E0DEDA]">
                <div>
                  <label className="block text-[11px] font-mono text-[#5A5A5A] uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <div className="flex items-center gap-2 text-sm font-mono text-[#111111] font-medium">
                    <Mail className="w-3.5 h-3.5 text-[#5A5A5A]" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <span className="text-[10px] text-[#7A7A7A] mt-0.5 block">Primary sign-in handle</span>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#5A5A5A] uppercase tracking-wider mb-1">
                    Account Created
                  </label>
                  <div className="flex items-center gap-2 text-sm font-mono text-[#111111] font-medium">
                    <Calendar className="w-3.5 h-3.5 text-[#5A5A5A]" />
                    <span>{createdDate}</span>
                  </div>
                  <span className="text-[10px] text-[#7A7A7A] mt-0.5 block">Active membership</span>
                </div>
              </div>

              {/* Editable Name Field */}
              <div>
                <label
                  htmlFor="account-name-input"
                  className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-2"
                >
                  Full Name / Alias
                </label>
                <input
                  id="account-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Chen"
                  className="w-full px-3.5 py-2.5 bg-[#FFFFFF] border border-[#E0DEDA] rounded-lg text-sm text-[#111111] placeholder:text-[#999999] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all"
                />
                <p className="text-[11px] text-[#5A5A5A] mt-1.5">
                  Used for personalized teardown reports and exported validation PDFs.
                </p>
              </div>

              {/* Editable Onboarding Answers */}
              <div className="pt-2 border-t border-[#E0DEDA]">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-[#5A5A5A]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                    Onboarding Questionnaire Answers
                  </h3>
                </div>
                <p className="text-xs text-[#5A5A5A] mb-5">
                  These responses calibrate the critical lens and market perspectives applied to your ideas.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* User Type */}
                  <div>
                    <label
                      htmlFor="account-user-type-select"
                      className="block text-xs font-medium text-[#111111] mb-1.5"
                    >
                      Your Primary Role / Identity
                    </label>
                    <select
                      id="account-user-type-select"
                      value={userType}
                      onChange={(e) => setUserType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E0DEDA] rounded-lg text-sm text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                    >
                      {USER_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Referral Source */}
                  <div>
                    <label
                      htmlFor="account-referral-source-select"
                      className="block text-xs font-medium text-[#111111] mb-1.5"
                    >
                      How did you discover Flawlesz AI?
                    </label>
                    <select
                      id="account-referral-source-select"
                      value={referralSource}
                      onChange={(e) => setReferralSource(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E0DEDA] rounded-lg text-sm text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                    >
                      {REFERRAL_SOURCES.map((src) => (
                        <option key={src} value={src}>
                          {src}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Project Type */}
                  <div>
                    <label
                      htmlFor="account-project-type-select"
                      className="block text-xs font-medium text-[#111111] mb-1.5"
                    >
                      Project Category Usually Built
                    </label>
                    <select
                      id="account-project-type-select"
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E0DEDA] rounded-lg text-sm text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                    >
                      {PROJECT_TYPES.map((proj) => (
                        <option key={proj} value={proj}>
                          {proj}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Idea Stage */}
                  <div>
                    <label
                      htmlFor="account-idea-stage-select"
                      className="block text-xs font-medium text-[#111111] mb-1.5"
                    >
                      Current Idea Maturity Stage
                    </label>
                    <select
                      id="account-idea-stage-select"
                      value={ideaStage}
                      onChange={(e) => setIdeaStage(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E0DEDA] rounded-lg text-sm text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                    >
                      {IDEA_STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 flex justify-end">
                <button
                  id="account-save-profile-btn"
                  type="submit"
                  disabled={profileSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#E8481C] hover:bg-[#D03D14] text-white text-xs font-mono font-bold tracking-wide transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {profileSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </section>

          {/* SECTION 2: SUBSCRIPTION & PLAN ENTITLEMENTS */}
          {(() => {
            const isCurrentUserOwner = Boolean(
              user?.isOwner ||
              (user?.email && user.email.trim().toLowerCase() === 'pardeshilata1983@gmail.com') ||
              user?.role === 'admin'
            );
            const userPlan: PlanId = isCurrentUserOwner ? 'enterprise' : (user.plan || 'free');
            const planConfig = PLANS[userPlan];

            return (
              <section className="bg-white border border-[#E0DEDA] rounded-xl p-6 sm:p-8 shadow-xs">
                <div className="flex items-center justify-between pb-5 border-b border-[#E0DEDA] mb-6">
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-5 h-5 text-[#E8481C]" />
                    <h2 className="text-base font-bold text-[#111111]">Billing Plan & Model Access</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReceiptModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E0DEDA] hover:bg-stone-100 text-[#111111] text-xs font-mono font-semibold transition-colors cursor-pointer"
                      title="Print official subscription bill"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#E8481C]" />
                      <span className="hidden sm:inline">Print Bill</span>
                    </button>
                    <button
                      onClick={() => onNavigate('/flaw/billing')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E8481C] hover:bg-[#D03D14] text-white text-xs font-mono font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      <span>Manage / Upgrade</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="p-4 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA]">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#5A5A5A] mb-1">
                      Current Subscription Tier
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-mono font-bold text-[#111111] uppercase tracking-wider">
                        {planConfig.name}
                      </span>
                      <span className="text-xs font-mono text-[#5A5A5A]">
                        ({planConfig.price} / {planConfig.frequency})
                      </span>
                    </div>
                    <p className="text-xs text-[#5A5A5A] mt-2 leading-relaxed">
                      {planConfig.description}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA] space-y-2">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#111111] font-bold mb-1">
                      Plan Check Entitlements
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span>Monthly Checks Quota:</span>
                      <span className="font-bold text-[#E8481C]">
                        {isCurrentUserOwner
                          ? 'Unlimited (Owner)'
                          : userPlan === 'free'
                          ? '25 checks / month'
                          : userPlan === 'pro'
                          ? '50 checks / month'
                          : userPlan === 'ultra'
                          ? '100 checks / month'
                          : 'Custom limits'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span>Orbit (Everyday):</span>
                      <span className="text-emerald-700 font-semibold">
                        {isCurrentUserOwner ? 'Unlimited (Owner)' : 'Included in Plan Quota'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span>Pulsar (Advanced):</span>
                      <span className="font-semibold text-[#111111]">
                        {isCurrentUserOwner && 'Unlimited (Owner)'}
                        {!isCurrentUserOwner && userPlan === 'free' && `${user.pulsar_lifetime_used ? '0 free checks left (Locked)' : '1 lifetime trial check'}`}
                        {!isCurrentUserOwner && userPlan === 'pro' && `${PRO_PULSAR_MONTHLY_LIMIT} checks / month`}
                        {!isCurrentUserOwner && userPlan === 'ultra' && `${ULTRA_PULSAR_MONTHLY_LIMIT} checks / month`}
                        {!isCurrentUserOwner && userPlan === 'enterprise' && 'Custom limits'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span>Quasar (Maximum):</span>
                      <span className="font-semibold text-[#111111]">
                        {isCurrentUserOwner && 'Unlimited (Owner)'}
                        {!isCurrentUserOwner && userPlan === 'free' && `${user.quasar_lifetime_used ? '0 free checks left (Locked)' : '1 lifetime trial check'}`}
                        {!isCurrentUserOwner && userPlan === 'pro' && `${PRO_QUASAR_MONTHLY_LIMIT} checks / month`}
                        {!isCurrentUserOwner && userPlan === 'ultra' && `${ULTRA_QUASAR_MONTHLY_LIMIT} checks / month`}
                        {!isCurrentUserOwner && userPlan === 'enterprise' && 'Custom limits'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-[#E0DEDA]/60">
                      <span>Vibe Code Sandbox:</span>
                      <span className="font-semibold text-[#E8481C]">
                        {userPlan === 'free' ? 'Basic Preview' : 'Full IDE + Hot Reload'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span>AI Teammates:</span>
                      <span className="font-semibold text-[#111111]">
                        {userPlan === 'free' && 'Atlas (Preview)'}
                        {userPlan === 'pro' && 'Atlas & Elena'}
                        {userPlan === 'ultra' && 'Full 5-Agent Office'}
                        {userPlan === 'enterprise' && 'Custom Fine-Tuned Office'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-[#7A7A7A] pt-4 border-t border-[#E0DEDA]">
                  <span>Payments processed securely via Razorpay</span>
                  <button
                    onClick={() => onNavigate('/flaw/usage')}
                    className="text-[#E8481C] hover:underline"
                  >
                    View detailed usage telemetry →
                  </button>
                </div>
              </section>
            );
          })()}

          {/* SECTION 3: CONNECT YOUR AI (REMOTE MCP SERVER) */}
          <section className="bg-white border border-[#E0DEDA] rounded-xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E0DEDA] mb-6">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-[#E8481C]" />
                <div>
                  <h2 className="text-base font-bold text-[#111111]">Connect your AI (Remote MCP)</h2>
                  <p className="text-xs text-[#5A5A5A] mt-0.5">
                    Connect Claude Code, Cursor, VS Code, and any MCP client to Flawlesz tools via personal tokens.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('/flaw/connect')}
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-[#E8481C] hover:underline"
                >
                  <span>Docs & Setup Guide</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[#F5F4F0] text-[#5A5A5A] border border-[#E0DEDA]">
                  {tokens.filter(t => !t.revokedAt).length}/5 Active
                </span>
              </div>
            </div>

            {/* Creation Form */}
            <form onSubmit={handleCreateToken} className="mb-6">
              <label className="block text-[11px] font-mono text-[#5A5A5A] uppercase tracking-wider mb-2">
                Generate New Personal Access Token
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="e.g. Claude Code Mac, Cursor IDE, Workstation"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  maxLength={50}
                  disabled={tokenCreating || tokens.filter(t => !t.revokedAt).length >= 5}
                  className="flex-1 px-3.5 py-2 text-sm bg-white border border-[#E0DEDA] rounded-lg focus:outline-none focus:border-[#111111] font-mono disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={tokenCreating || !newTokenName.trim() || tokens.filter(t => !t.revokedAt).length >= 5}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-mono font-medium text-white bg-[#111111] hover:bg-[#222222] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  {tokenCreating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Token</span>
                    </>
                  )}
                </button>
              </div>
              {tokens.filter(t => !t.revokedAt).length >= 5 && (
                <p className="text-[11px] font-mono text-amber-700 mt-2">
                  Maximum of 5 active tokens reached. Please revoke an unused token to generate a new one.
                </p>
              )}
            </form>

            {tokenSuccess && (
              <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{tokenSuccess}</span>
              </div>
            )}

            {tokenError && (
              <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{tokenError}</span>
              </div>
            )}

            {/* ONE-TIME TOKEN REVEAL MODAL / BANNER */}
            {createdTokenModal && (
              <div className="mb-8 p-5 sm:p-6 rounded-xl bg-[#111111] text-[#E9ECEA] border-2 border-[#E8481C] shadow-lg">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#333333] mb-4">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold tracking-wide uppercase font-mono">
                        New Token Generated: {createdTokenModal.name}
                      </h3>
                      <p className="text-xs text-[#A0A0A0] font-sans mt-0.5">
                        Copy this token now. It will <strong className="text-white">never</strong> be displayed again.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreatedTokenModal(null)}
                    className="text-[#888] hover:text-white p-1"
                    title="Dismiss after copying"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Token Box with Copy */}
                <div className="flex items-center gap-2 bg-[#1A1A1A] border border-[#333333] rounded-lg p-2.5 mb-5 font-mono text-xs">
                  <span className="flex-1 truncate text-[#00E599] select-all font-semibold">
                    {createdTokenModal.token}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdTokenModal.token);
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2500);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#E8481C] hover:bg-[#d63f15] text-white text-xs font-bold transition-all shrink-0 cursor-pointer"
                  >
                    {copiedToken ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Token</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Setup Snippets */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Code2 className="w-3.5 h-3.5 text-[#E8481C]" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#A0A0A0]">
                      Setup in your AI Tool:
                    </span>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center gap-1 border-b border-[#333333] mb-3 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setSnippetTab('claude')}
                      className={`px-3 py-1.5 border-b-2 font-medium transition-colors ${
                        snippetTab === 'claude'
                          ? 'border-[#E8481C] text-white'
                          : 'border-transparent text-[#888] hover:text-white'
                      }`}
                    >
                      Claude Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setSnippetTab('cursor')}
                      className={`px-3 py-1.5 border-b-2 font-medium transition-colors ${
                        snippetTab === 'cursor'
                          ? 'border-[#E8481C] text-white'
                          : 'border-transparent text-[#888] hover:text-white'
                      }`}
                    >
                      Cursor
                    </button>
                    <button
                      type="button"
                      onClick={() => setSnippetTab('vscode')}
                      className={`px-3 py-1.5 border-b-2 font-medium transition-colors ${
                        snippetTab === 'vscode'
                          ? 'border-[#E8481C] text-white'
                          : 'border-transparent text-[#888] hover:text-white'
                      }`}
                    >
                      VS Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setSnippetTab('generic')}
                      className={`px-3 py-1.5 border-b-2 font-medium transition-colors ${
                        snippetTab === 'generic'
                          ? 'border-[#E8481C] text-white'
                          : 'border-transparent text-[#888] hover:text-white'
                      }`}
                    >
                      Generic (HTTP)
                    </button>
                  </div>

                  {/* Snippet Content */}
                  <div className="bg-[#18181A] rounded-lg p-3 border border-[#2A2A2E] text-xs font-mono text-[#DDD] overflow-x-auto relative group">
                    {snippetTab === 'claude' && (
                      <pre className="whitespace-pre-wrap select-all">
                        claude mcp add --transport http flawlesz {window.location.origin}/mcp -H "Authorization: Bearer {createdTokenModal.token}"
                      </pre>
                    )}
                    {snippetTab === 'cursor' && (
                      <pre className="whitespace-pre-wrap select-all">
{`// Add to cursor settings or ~/.cursor/mcp.json:
{
  "mcpServers": {
    "flawlesz": {
      "url": "${window.location.origin}/mcp",
      "headers": {
        "Authorization": "Bearer ${createdTokenModal.token}"
      }
    }
  }
}`}
                      </pre>
                    )}
                    {snippetTab === 'vscode' && (
                      <pre className="whitespace-pre-wrap select-all">
{`// Add to .vscode/mcp.json:
{
  "servers": {
    "flawlesz": {
      "type": "http",
      "url": "${window.location.origin}/mcp",
      "headers": {
        "Authorization": "Bearer ${createdTokenModal.token}"
      }
    }
  }
}`}
                      </pre>
                    )}
                    {snippetTab === 'generic' && (
                      <pre className="whitespace-pre-wrap select-all">
{`Remote MCP URL: ${window.location.origin}/mcp
Transport: Streamable HTTP (stateless)
Required Header: Authorization: Bearer ${createdTokenModal.token}`}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tokens Table */}
            <div className="border border-[#E0DEDA] rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-[#F5F4F0] border-b border-[#E0DEDA] flex items-center justify-between text-xs font-mono font-bold text-[#5A5A5A] uppercase tracking-wider">
                <span>Active & Revoked Tokens</span>
                <span>{tokens.length} Total</span>
              </div>

              {tokensLoading ? (
                <div className="p-8 text-center text-xs font-mono text-[#7A7A7A] flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#E8481C]" />
                  <span>Loading API tokens...</span>
                </div>
              ) : tokens.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-[#7A7A7A]">
                  No personal access tokens generated yet. Create one above to connect your AI tools.
                </div>
              ) : (
                <div className="divide-y divide-[#E0DEDA]">
                  {tokens.map((tok) => {
                    const isRevoked = Boolean(tok.revokedAt);
                    return (
                      <div key={tok.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#111111]">{tok.name}</span>
                            {isRevoked ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                                Revoked
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[#5A5A5A] text-[11px] flex flex-wrap gap-x-4 gap-y-1">
                            <span>Key: <code className="bg-[#F5F4F0] px-1 py-0.5 rounded text-[#111111]">{tok.prefix}</code></span>
                            <span>Created: {new Date(tok.createdAt).toLocaleDateString()}</span>
                            <span>Last used: {tok.lastUsedAt ? new Date(tok.lastUsedAt).toLocaleDateString() : 'Never'}</span>
                          </div>
                        </div>

                        {!isRevoked && (
                          <button
                            type="button"
                            onClick={() => handleRevokeToken(tok.id, tok.name)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Revoke</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* SECTION 4: PASSWORD CHANGE */}
          <section className="bg-white border border-[#E0DEDA] rounded-xl p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2.5 pb-5 border-b border-[#E0DEDA] mb-6">
              <KeyRound className="w-5 h-5 text-[#E8481C]" />
              <h2 className="text-base font-bold text-[#111111]">Security & Password</h2>
            </div>

            {passwordSuccess && (
              <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
              <div>
                <label
                  htmlFor="account-current-password-input"
                  className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-1.5"
                >
                  Current Password
                </label>
                <input
                  id="account-current-password-input"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2.5 bg-[#FFFFFF] border border-[#E0DEDA] rounded-lg text-sm text-[#111111] placeholder:text-[#999999] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="account-new-password-input"
                    className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-1.5"
                  >
                    New Password
                  </label>
                  <input
                    id="account-new-password-input"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Min 6 characters"
                    className="w-full px-3.5 py-2.5 bg-[#FFFFFF] border border-[#E0DEDA] rounded-lg text-sm text-[#111111] placeholder:text-[#999999] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all font-mono"
                  />
                </div>

                <div>
                  <label
                    htmlFor="account-confirm-password-input"
                    className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="account-confirm-password-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2.5 bg-[#FFFFFF] border border-[#E0DEDA] rounded-lg text-sm text-[#111111] placeholder:text-[#999999] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-start">
                <button
                  id="account-update-password-btn"
                  type="submit"
                  disabled={passwordSaving || !currentPassword || !newPassword}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#111111] hover:bg-[#222222] text-white text-xs font-mono font-bold tracking-wide transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {passwordSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{passwordSaving ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </section>

          {/* SECTION 3: DANGER ZONE - DELETE ACCOUNT */}
          <section className="bg-white border border-rose-200 rounded-xl p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2.5 pb-5 border-b border-rose-100 mb-6">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <h2 className="text-base font-bold text-rose-950">Danger Zone</h2>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#111111]">Permanently Delete Account</h3>
                <p className="text-xs text-[#5A5A5A] mt-1 leading-relaxed">
                  Permanently wipe your account record, active authentication tokens, all saved idea validations, and follow-up conversation transcripts. This action cannot be undone.
                </p>
              </div>

              {deleteError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="p-4 rounded-lg bg-rose-50/60 border border-rose-200 max-w-md space-y-3">
                <label
                  htmlFor="account-delete-confirm-input"
                  className="block text-xs font-mono text-rose-900 font-medium"
                >
                  Type <span className="font-bold underline text-rose-950">DELETE</span> to confirm:
                </label>
                <input
                  id="account-delete-confirm-input"
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-sm font-mono text-rose-950 focus:outline-none focus:border-rose-600"
                />
                <button
                  id="account-confirm-delete-btn"
                  onClick={handleDeleteAccount}
                  disabled={deleteInput !== 'DELETE' || isDeleting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-bold transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isDeleting ? 'Deleting Everything...' : 'Permanently Delete My Account'}</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Animated Bill Modal */}
        <PaymentReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          planId={user?.plan || 'pro'}
          paymentDetails={{
            paymentId: user?.subscription_id ? `pay_${user.subscription_id.slice(-8)}` : 'pay_flw_active_l1',
            subscriptionId: user?.subscription_id || 'sub_flaw_pro_monthly',
          }}
          customerName={user?.name || user?.email?.split('@')[0] || 'Valued Founder'}
          customerEmail={user?.email || 'founder@flawlesz.ai'}
          onNavigate={onNavigate}
        />
      </main>
    </div>
  );
};
