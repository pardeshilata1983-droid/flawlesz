import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Navbar } from '../components/Navbar.tsx';
import { fetchUsageMetrics } from '../services/api.ts';
import { UsageMetrics } from '../types.ts';
import {
  Activity,
  Calendar,
  Layers,
  MessageSquare,
  AlertTriangle,
  Globe,
  ArrowLeft,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle2,
  CreditCard,
  Lock,
  Zap
} from 'lucide-react';
import {
  PRO_PULSAR_MONTHLY_LIMIT,
  PRO_QUASAR_MONTHLY_LIMIT,
  ULTRA_PULSAR_MONTHLY_LIMIT,
  ULTRA_QUASAR_MONTHLY_LIMIT,
  PlanId
} from '../config/plans.ts';

interface UsagePageProps {
  onNavigate: (path: string) => void;
}

export const UsagePage: React.FC<UsagePageProps> = ({ onNavigate }) => {
  const { user, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      onNavigate('/flaw/login?redirect=/flaw/usage');
    }
  }, [authLoading, user, onNavigate]);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await fetchUsageMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch usage metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  if (authLoading || (!metrics && loading)) {
    return (
      <div className="min-h-screen bg-[#F5F4F0] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-mono text-[#5A5A5A]">
          <Loader2 className="w-4 h-4 animate-spin text-[#E8481C]" />
          <span>Computing usage telemetry...</span>
        </div>
      </div>
    );
  }

  // Identify owner
  const isOwner = Boolean(
    metrics?.isOwner ||
    (user?.email && user.email.trim().toLowerCase() === 'pardeshilata1983@gmail.com') ||
    user?.role === 'admin'
  );

  const currentPlan = (metrics?.plan || user?.plan || 'free') as PlanId;
  const planName = isOwner
    ? 'Owner'
    : currentPlan === 'ultra'
    ? 'Ultra'
    : currentPlan === 'pro'
    ? 'Pro'
    : currentPlan === 'enterprise'
    ? 'Enterprise'
    : 'Free';

  // Calculate usage limit: 25 for Free, 50 for Pro, 100 for Ultra, Unlimited for Owner
  const monthlyLimit = isOwner
    ? 999999
    : (metrics?.monthlyLimit || (currentPlan === 'ultra' ? 100 : currentPlan === 'pro' ? 50 : 25));
  const usedThisMonth = metrics?.thisMonthChecks || 0;
  const percentageUsed = isOwner ? 0 : Math.min(100, Math.round((usedThisMonth / monthlyLimit) * 100));
  const remainingChecks = isOwner ? 'Unlimited' : Math.max(0, monthlyLimit - usedThisMonth);
  const isExceeded = !isOwner && usedThisMonth >= monthlyLimit;

  // Calculate days remaining until next month
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const msInDay = 24 * 60 * 60 * 1000;
  const daysUntilReset = Math.ceil((nextMonth.getTime() - now.getTime()) / msInDay);

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#111111] flex flex-col selection:bg-[#E8481C]/20 selection:text-[#E8481C]">
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <button
            id="usage-back-to-validator-btn"
            onClick={() => onNavigate('/flaw/submit')}
            className="inline-flex items-center gap-2 text-xs font-mono text-[#5A5A5A] hover:text-[#111111] transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Idea Validator</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              id="usage-header-account-link"
              onClick={() => onNavigate('/flaw/account')}
              className="text-xs font-mono text-[#5A5A5A] hover:text-[#111111] underline transition-colors cursor-pointer"
            >
              Account Settings
            </button>
            <span className="text-[#E0DEDA]">•</span>
            <button
              id="usage-header-billing-link"
              onClick={() => onNavigate('/flaw/billing')}
              className="text-xs font-mono text-[#5A5A5A] hover:text-[#111111] underline transition-colors cursor-pointer"
            >
              Billing & Plans
            </button>
          </div>
        </div>

        {/* Header Title & Actions */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111]">
              Usage & Consumption
            </h1>
            <p className="text-sm text-[#5A5A5A] mt-1">
              Real-time telemetry on monthly checks (25 Free, 50 Pro, 100 Ultra).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="usage-refresh-btn"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#5A5A5A] hover:text-[#111111] bg-white border border-[#E0DEDA] rounded-lg transition-colors cursor-pointer"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              id="usage-run-check-btn"
              onClick={() => onNavigate('/flaw/submit')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#E8481C] hover:bg-[#D03D14] text-white text-xs font-mono font-bold tracking-wide transition-colors cursor-pointer shadow-xs"
            >
              <span>Run New Check</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono">
            {error}
          </div>
        )}

        {/* USAGE LIMIT REACHED MESSAGE - DISPLAYED ONLY FOR REGULAR USERS, NEVER FOR OWNER */}
        {isExceeded && (
          <div
            id="usage-limit-exceeded-notice"
            className="mb-8 p-5 rounded-xl bg-amber-500/10 border-2 border-[#E8481C]/40 text-[#111111] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-[#E8481C]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-[#E8481C]" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111111] tracking-tight">
                  Monthly Quota Reached ({usedThisMonth}/{monthlyLimit} Checks Used)
                </h3>
                <p className="text-xs text-[#5A5A5A] mt-1 leading-relaxed">
                  You have consumed all {monthlyLimit} validation checks provided on your {planName} plan for this month. 
                  {currentPlan === 'free'
                    ? ' Upgrade to Pro for 50 checks/month or Ultra for 100 checks/month to continue testing hypotheses.'
                    : currentPlan === 'pro'
                    ? ' Upgrade to Ultra for 100 checks/month to continue validating ideas without interruption.'
                    : ' Please wait for your next billing cycle reset or contact support for dedicated capacity.'}
                </p>
              </div>
            </div>

            {currentPlan !== 'ultra' && currentPlan !== 'enterprise' && (
              <button
                onClick={() => onNavigate('/flaw/billing')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E8481C] hover:bg-[#D03D14] text-white rounded-lg text-xs font-mono font-bold shrink-0 transition-colors shadow-xs"
              >
                <span>Upgrade Plan</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* PRIMARY QUOTA / LIMIT PROGRESS CARD */}
        <section className="bg-white border border-[#E0DEDA] rounded-xl p-6 sm:p-8 mb-8 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${isOwner ? 'bg-emerald-500' : isExceeded ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                <span className="text-xs font-mono uppercase tracking-wider text-[#5A5A5A]">
                  Monthly Check Quota
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                  isOwner
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                    : 'bg-[#F5F4F0] text-[#111111] border-[#E0DEDA]'
                }`}>
                  {isOwner ? 'Owner (Unlimited)' : `${planName} Tier (${monthlyLimit} checks / mo)`}
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#111111]">
                {isOwner
                  ? `${usedThisMonth} checks used this month (Unlimited for Owner)`
                  : `${usedThisMonth} of ${monthlyLimit} checks used this month`}
              </h2>
            </div>

            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-[#111111]">
                {remainingChecks}
              </span>
              <span className="text-xs font-mono text-[#5A5A5A] block">
                {isOwner ? 'permanent unmetered checks' : 'checks remaining'}
              </span>
            </div>
          </div>

          {/* Progress Bar (Hidden for Owner) */}
          {!isOwner && (
            <div className="w-full bg-[#F5F4F0] h-3 rounded-full overflow-hidden border border-[#E0DEDA] p-0.5 mb-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentageUsed >= 100
                    ? 'bg-rose-500'
                    : percentageUsed >= 75
                    ? 'bg-amber-500'
                    : 'bg-[#E8481C]'
                }`}
                style={{ width: `${percentageUsed}%` }}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between text-xs font-mono text-[#5A5A5A] pt-1">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#7A7A7A]" />
              <span>Resets in {daysUntilReset} days ({nextMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</span>
            </div>
            <span>
              {isOwner
                ? 'Owner: Free and unlimited usage across all tiers'
                : `${percentageUsed}% of monthly check volume consumed`}
            </span>
          </div>
        </section>

        {/* PER-MODEL USAGE & LIFETIME TRIAL STATUS */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#5A5A5A]">
                Per-Model Quotas & Lifetime Trial Status
              </h2>
              <p className="text-[11px] text-[#7A7A7A] mt-0.5">
                Current usage counters and advanced model availability under your {metrics?.plan || user?.plan || 'free'} plan.
              </p>
            </div>
            <button
              onClick={() => onNavigate('/flaw/billing')}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[#E8481C] hover:underline cursor-pointer"
            >
              <span>Manage / Upgrade Plan</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Model 1: Orbit */}
            {(() => {
              const orbitUsed = user?.orbit_monthly_used ?? metrics?.modelUsage?.orbit?.monthlyUsed ?? 0;
              return (
                <div className="bg-white border border-[#E0DEDA] rounded-xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">
                        Orbit: Everyday
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {isOwner ? 'Unlimited (Owner)' : 'Included in Plan Quota'}
                      </span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-[#111111] mt-2">
                      {orbitUsed}
                    </div>
                    <p className="text-[11px] font-mono text-[#7A7A7A] mt-1">
                      validations used this period
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#E0DEDA] text-[11px] text-[#5A5A5A] flex items-center justify-between">
                    <span>{isOwner ? 'Unmetered access' : `${monthlyLimit} checks / month quota`}</span>
                    <span className="font-mono text-emerald-700 font-semibold">Active</span>
                  </div>
                </div>
              );
            })()}

            {/* Model 2: Pulsar */}
            {(() => {
              const currentPlan: PlanId = metrics?.plan || user?.plan || 'free';
              const pulsarLifetime = user?.pulsar_lifetime_used ?? metrics?.modelUsage?.pulsar?.lifetimeUsed ?? 0;
              const pulsarMonthly = user?.pulsar_monthly_used ?? metrics?.modelUsage?.pulsar?.monthlyUsed ?? 0;

              let isUnlocked = true;
              let statusLabel = '';
              let usageDisplay = '';

              if (isOwner) {
                isUnlocked = true;
                statusLabel = 'Unlimited (Owner)';
                usageDisplay = `${pulsarMonthly} monthly checks used (Unlimited)`;
              } else if (currentPlan === 'free') {
                isUnlocked = pulsarLifetime < 1;
                statusLabel = isUnlocked ? '1 free use left' : 'Locked';
                usageDisplay = `${pulsarLifetime} of 1 lifetime trial check used`;
              } else if (currentPlan === 'pro') {
                const remaining = Math.max(0, PRO_PULSAR_MONTHLY_LIMIT - pulsarMonthly);
                isUnlocked = remaining > 0;
                statusLabel = `${remaining} left this month`;
                usageDisplay = `${pulsarMonthly} of ${PRO_PULSAR_MONTHLY_LIMIT} monthly checks used`;
              } else if (currentPlan === 'ultra') {
                const remaining = Math.max(0, ULTRA_PULSAR_MONTHLY_LIMIT - pulsarMonthly);
                isUnlocked = remaining > 0;
                statusLabel = `${remaining} left this month`;
                usageDisplay = `${pulsarMonthly} of ${ULTRA_PULSAR_MONTHLY_LIMIT} monthly checks used`;
              } else {
                isUnlocked = true;
                statusLabel = 'Enterprise';
                usageDisplay = 'Custom allocation active';
              }

              return (
                <div className={`bg-white border rounded-xl p-5 shadow-xs flex flex-col justify-between ${
                  !isUnlocked ? 'border-stone-300 bg-stone-50/50' : 'border-[#E0DEDA]'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">
                        Pulsar: Advanced
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                        !isUnlocked
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-[#E8481C]/10 text-[#E8481C] border border-[#E8481C]/25'
                      }`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-[#111111] mt-2">
                      {currentPlan === 'free' ? `${pulsarLifetime} / 1` : `${pulsarMonthly}`}
                    </div>
                    <p className="text-[11px] font-mono text-[#7A7A7A] mt-1">
                      {usageDisplay}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#E0DEDA] text-[11px] flex items-center justify-between">
                    {currentPlan === 'free' && !isUnlocked ? (
                      <button
                        onClick={() => onNavigate('/flaw/billing')}
                        className="text-[#E8481C] font-mono hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Upgrade to unlock</span>
                      </button>
                    ) : (
                      <span className="text-[#5A5A5A]">Deep competitive matrix</span>
                    )}
                    <span className={`font-mono font-semibold ${isUnlocked ? 'text-emerald-700' : 'text-stone-500'}`}>
                      {isUnlocked ? 'Unlocked' : 'Locked'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Model 3: Quasar */}
            {(() => {
              const currentPlan: PlanId = metrics?.plan || user?.plan || 'free';
              const quasarLifetime = user?.quasar_lifetime_used ?? metrics?.modelUsage?.quasar?.lifetimeUsed ?? 0;
              const quasarMonthly = user?.quasar_monthly_used ?? metrics?.modelUsage?.quasar?.monthlyUsed ?? 0;

              let isUnlocked = true;
              let statusLabel = '';
              let usageDisplay = '';

              if (isOwner) {
                isUnlocked = true;
                statusLabel = 'Unlimited (Owner)';
                usageDisplay = `${quasarMonthly} monthly checks used (Unlimited)`;
              } else if (currentPlan === 'free') {
                isUnlocked = quasarLifetime < 1;
                statusLabel = isUnlocked ? '1 free use left' : 'Locked';
                usageDisplay = `${quasarLifetime} of 1 lifetime trial check used`;
              } else if (currentPlan === 'pro') {
                const remaining = Math.max(0, PRO_QUASAR_MONTHLY_LIMIT - quasarMonthly);
                isUnlocked = remaining > 0;
                statusLabel = `${remaining} left this month`;
                usageDisplay = `${quasarMonthly} of ${PRO_QUASAR_MONTHLY_LIMIT} monthly checks used`;
              } else if (currentPlan === 'ultra') {
                const remaining = Math.max(0, ULTRA_QUASAR_MONTHLY_LIMIT - quasarMonthly);
                isUnlocked = remaining > 0;
                statusLabel = `${remaining} left this month`;
                usageDisplay = `${quasarMonthly} of ${ULTRA_QUASAR_MONTHLY_LIMIT} monthly checks used`;
              } else {
                isUnlocked = true;
                statusLabel = 'Enterprise';
                usageDisplay = 'Custom allocation active';
              }

              return (
                <div className={`bg-white border rounded-xl p-5 shadow-xs flex flex-col justify-between ${
                  !isUnlocked ? 'border-stone-300 bg-stone-50/50' : 'border-[#E0DEDA]'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">
                        Quasar: Maximum
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                        !isUnlocked
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-[#E8481C]/10 text-[#E8481C] border border-[#E8481C]/25'
                      }`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-[#111111] mt-2">
                      {currentPlan === 'free' ? `${quasarLifetime} / 1` : `${quasarMonthly}`}
                    </div>
                    <p className="text-[11px] font-mono text-[#7A7A7A] mt-1">
                      {usageDisplay}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#E0DEDA] text-[11px] flex items-center justify-between">
                    {currentPlan === 'free' && !isUnlocked ? (
                      <button
                        onClick={() => onNavigate('/flaw/billing')}
                        className="text-[#E8481C] font-mono hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Upgrade to unlock</span>
                      </button>
                    ) : (
                      <span className="text-[#5A5A5A]">Maximum adversarial depth</span>
                    )}
                    <span className={`font-mono font-semibold ${isUnlocked ? 'text-emerald-700' : 'text-stone-500'}`}>
                      {isUnlocked ? 'Unlocked' : 'Locked'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        {/* FLAT BORDERED STAT CARDS (MONOSPACE NUMBERS) */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#5A5A5A]">
              Account Telemetry Breakdown
            </h2>
            <span className="text-[11px] font-mono text-[#7A7A7A]">Filtered to your user ID</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Stat 1: Total Checks */}
            <div className="bg-white border border-[#E0DEDA] rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-[#5A5A5A] mb-3">
                <span className="text-xs font-medium">All-Time Checks</span>
                <Layers className="w-4 h-4 text-[#7A7A7A]" />
              </div>
              <div className="text-3xl font-mono font-bold text-[#111111]">
                {metrics?.totalChecks ?? 0}
              </div>
              <p className="text-[11px] font-mono text-[#7A7A7A] mt-1.5">
                Total validation runs recorded
              </p>
            </div>

            {/* Stat 2: Checks This Week */}
            <div className="bg-white border border-[#E0DEDA] rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-[#5A5A5A] mb-3">
                <span className="text-xs font-medium">Last 7 Days</span>
                <Calendar className="w-4 h-4 text-[#7A7A7A]" />
              </div>
              <div className="text-3xl font-mono font-bold text-[#111111]">
                {metrics?.thisWeekChecks ?? 0}
              </div>
              <p className="text-[11px] font-mono text-[#7A7A7A] mt-1.5">
                Checks conducted this week
              </p>
            </div>

            {/* Stat 3: Checks This Month */}
            <div className="bg-white border border-[#E0DEDA] rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-[#5A5A5A] mb-3">
                <span className="text-xs font-medium">Current Month</span>
                <Activity className="w-4 h-4 text-[#7A7A7A]" />
              </div>
              <div className="text-3xl font-mono font-bold text-[#111111]">
                {metrics?.thisMonthChecks ?? 0}
              </div>
              <p className="text-[11px] font-mono text-[#7A7A7A] mt-1.5">
                Monthly active usage counter
              </p>
            </div>

            {/* Stat 4: Follow-up Chat Questions */}
            <div className="bg-white border border-[#E0DEDA] rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-[#5A5A5A] mb-3">
                <span className="text-xs font-medium">Follow-Up Queries</span>
                <MessageSquare className="w-4 h-4 text-[#7A7A7A]" />
              </div>
              <div className="text-3xl font-mono font-bold text-[#111111]">
                {metrics?.totalFollowUpMessages ?? 0}
              </div>
              <p className="text-[11px] font-mono text-[#7A7A7A] mt-1.5">
                Follow-up questions asked
              </p>
            </div>

            {/* Stat 5: Flaws Extracted */}
            <div className="bg-white border border-[#E0DEDA] rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-[#5A5A5A] mb-3">
                <span className="text-xs font-medium">Flaws Identified</span>
                <AlertTriangle className="w-4 h-4 text-[#E8481C]" />
              </div>
              <div className="text-3xl font-mono font-bold text-[#111111]">
                {metrics?.totalFlawsIdentified ?? 0}
              </div>
              <p className="text-[11px] font-mono text-[#7A7A7A] mt-1.5">
                Structural failure risks exposed
              </p>
            </div>

            {/* Stat 6: Competitors Indexed */}
            <div className="bg-white border border-[#E0DEDA] rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-[#5A5A5A] mb-3">
                <span className="text-xs font-medium">Competitors Found</span>
                <Globe className="w-4 h-4 text-[#7A7A7A]" />
              </div>
              <div className="text-3xl font-mono font-bold text-[#111111]">
                {metrics?.totalCompetitorsFound ?? 0}
              </div>
              <p className="text-[11px] font-mono text-[#7A7A7A] mt-1.5">
                Live market solutions discovered
              </p>
            </div>
          </div>
        </section>

        {/* RECENT VALIDATION RUNS TABLE */}
        <section className="bg-white border border-[#E0DEDA] rounded-xl overflow-hidden shadow-xs">
          <div className="p-5 sm:p-6 border-b border-[#E0DEDA] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#111111]">Recent Validation Activity</h2>
              <p className="text-xs text-[#5A5A5A] mt-0.5">
                Recent ideas checked and saved under your account.
              </p>
            </div>
            <span className="text-xs font-mono text-[#7A7A7A]">
              {metrics?.recentActivity.length || 0} recent runs
            </span>
          </div>

          {metrics && metrics.recentActivity.length > 0 ? (
            <div className="divide-y divide-[#E0DEDA]">
              {metrics.recentActivity.map((item) => {
                const dateStr = new Date(item.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 hover:bg-[#F5F4F0]/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-[#7A7A7A]">{dateStr}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200">
                          {item.flawsCount} flaws
                        </span>
                        {item.competitorsCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-stone-100 text-stone-700 border border-stone-200">
                            {item.competitorsCount} competitors
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-[#111111] truncate">{item.title}</h3>
                      {item.summary && (
                        <p className="text-xs text-[#5A5A5A] line-clamp-1 mt-0.5">
                          {item.summary}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        id={`open-check-${item.id}`}
                        onClick={() => onNavigate('/flaw/submit')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-mono text-[#111111] hover:bg-[#FFFFFF] border border-[#E0DEDA] rounded-lg transition-colors cursor-pointer"
                      >
                        <span>Open in Drawer</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#5A5A5A]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Layers className="w-8 h-8 text-[#999999] mx-auto mb-3" />
              <p className="text-sm font-bold text-[#111111]">No validation runs yet</p>
              <p className="text-xs text-[#5A5A5A] max-w-sm mx-auto mt-1 mb-4">
                Test your first product concept, pitch deck, or startup hypothesis against brutal market scrutiny.
              </p>
              <button
                id="usage-empty-run-btn"
                onClick={() => onNavigate('/flaw/submit')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E8481C] hover:bg-[#D03D14] text-white text-xs font-mono font-bold tracking-wide transition-colors cursor-pointer"
              >
                <span>Run Your First Check</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </section>

        {/* BILLING LINK FOOTER */}
        <div className="mt-8 p-5 rounded-xl border border-[#E0DEDA] bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#F5F4F0] flex items-center justify-center border border-[#E0DEDA] shrink-0">
              <CreditCard className="w-4 h-4 text-[#111111]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#111111]">Need more throughput, Vibe Code sessions, or AI Teammates?</p>
              <p className="text-xs text-[#5A5A5A]">
                Upgrade to Pro or Ultra for live browser coding sandboxes, AI employee office, and higher monthly model quotas.
              </p>
            </div>
          </div>
          <button
            id="usage-view-billing-cta-btn"
            onClick={() => onNavigate('/flaw/billing')}
            className="shrink-0 px-4 py-2 text-xs font-mono font-medium text-[#111111] hover:bg-[#F5F4F0] border border-[#E0DEDA] rounded-lg transition-colors cursor-pointer"
          >
            View Billing & Plans →
          </button>
        </div>
      </main>
    </div>
  );
};
