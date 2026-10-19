import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  ArrowLeft,
  Shield,
  HelpCircle,
  Phone,
  CheckCircle2,
  Clock,
  Sparkles,
  CreditCard,
  Layers,
  Activity,
  Zap,
  Lock,
  Printer
} from 'lucide-react';
import { Footer } from '../components/Footer.tsx';
import { TierPricingSection } from '../components/TierPricingSection.tsx';
import { PaymentReceiptModal } from '../components/PaymentReceiptModal.tsx';
import {
  PLANS,
  PlanId,
  PRO_PULSAR_MONTHLY_LIMIT,
  PRO_QUASAR_MONTHLY_LIMIT,
  ULTRA_PULSAR_MONTHLY_LIMIT,
  ULTRA_QUASAR_MONTHLY_LIMIT
} from '../config/plans.ts';

interface BillingPageProps {
  onNavigate: (path: string) => void;
}

export const BillingPage: React.FC<BillingPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const isOwner = Boolean(
    user?.email && user.email.trim().toLowerCase() === 'pardeshilata1983@gmail.com'
  ) || user?.role === 'admin';
  const currentPlan: PlanId = isOwner ? 'enterprise' : (user?.plan || 'free');
  const planConfig = PLANS[currentPlan];
  const [receiptModalOpen, setReceiptModalOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#111111] flex flex-col selection:bg-[#E8481C]/20 selection:text-[#E8481C]">
      {/* Main Foreground Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <button
            id="billing-back-to-validator-btn"
            onClick={() => onNavigate('/flaw/submit')}
            className="inline-flex items-center gap-2 text-xs font-mono text-[#5A5A5A] hover:text-[#111111] transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Idea Validator</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              id="billing-header-account-link"
              onClick={() => onNavigate('/flaw/account')}
              className="text-xs font-mono text-[#5A5A5A] hover:text-[#111111] underline transition-colors cursor-pointer"
            >
              Account Settings
            </button>
            <span className="text-[#E0DEDA]">•</span>
            <button
              id="billing-header-usage-link"
              onClick={() => onNavigate('/flaw/usage')}
              className="text-xs font-mono text-[#5A5A5A] hover:text-[#111111] underline transition-colors cursor-pointer"
            >
              Usage Telemetry
            </button>
          </div>
        </div>

        {/* Current Active Plan Status Banner */}
        {user && (
          <div className="mb-10 p-5 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#E8481C]/10 border border-[#E8481C]/25 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-[#E8481C]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#5A5A5A]">Active Plan:</span>
                  <span className="text-xs font-mono font-bold text-[#E8481C] uppercase tracking-wider px-2 py-0.5 bg-[#E8481C]/10 rounded border border-[#E8481C]/20">
                    {isOwner ? 'Enterprise (Owner — All Features Free)' : planConfig.name}
                  </span>
                </div>
                <p className="text-xs text-[#5A5A5A] mt-0.5">
                  {isOwner
                    ? 'Owner privileges active: 100% free and unlimited access across Orbit, Pulsar, Quasar, AI Teammates, and Vibe Code IDE.'
                    : `Orbit: Unlimited validations • Vibe Code IDE & AI Teammates unlocked according to ${planConfig.name} entitlements.`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setReceiptModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-[#111111] hover:bg-black text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Print or view official subscription bill"
              >
                <Printer className="w-3.5 h-3.5 text-[#E8481C]" />
                <span>{currentPlan === 'free' ? 'Sample Bill Preview' : 'Print Official Bill'}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/flaw/usage')}
                className="px-3.5 py-1.5 rounded-lg border border-[#E0DEDA] text-xs font-mono text-[#111111] hover:bg-[#F5F4F0] transition-colors cursor-pointer"
              >
                View Quota Consumption
              </button>
            </div>
          </div>
        )}

        {/* Animated Bill Modal */}
        <PaymentReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          planId={currentPlan === 'free' ? 'pro' : currentPlan}
          paymentDetails={{
            paymentId: user?.subscription_id ? `pay_${user.subscription_id.slice(-8)}` : 'pay_flw_active_l1',
            subscriptionId: user?.subscription_id || 'sub_flaw_pro_monthly',
          }}
          customerName={user?.name || user?.email?.split('@')[0] || 'Valued Founder'}
          customerEmail={user?.email || 'founder@flawlesz.ai'}
          onNavigate={onNavigate}
        />

        {/* 4 Billing Plans Section */}
        <TierPricingSection mode="fullscreen" onNavigate={onNavigate} />

        {/* ─────────────────────────────────────────────────────────────
            PLANS & USAGE FAQ
           ───────────────────────────────────────────────────────────── */}
        <section className="mt-12 sm:mt-16 bg-white border border-[#E0DEDA] rounded-2xl p-6 sm:p-10 shadow-xs">
          <div className="flex items-center gap-2 mb-6 text-xs font-mono uppercase tracking-wider text-[#E8481C] font-semibold">
            <HelpCircle className="w-4 h-4" />
            <span>Frequently Asked Questions</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-[#111111] mb-6">
            Everything you need to know about Flawlesz AI plans and model access
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
            <div className="space-y-1.5 p-4 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA]/80">
              <h4 className="font-bold text-[#111111] text-sm">
                What is included with Vibe Code & AI Teammates in my subscription?
              </h4>
              <p className="text-[#5A5A5A]">
                Vibe Code provides a live browser development sandbox, code editor, interactive terminal, and resizable AI follow-up side panel. Pro unlocks Atlas (Lead Architect) and Elena (Frontend Engineer) with project ZIP export. Ultra unlocks the full 5-Specialist AI Teammate Office (Atlas, Elena, Nova, Cypher, and Iris) for complete end-to-end full-stack app construction.
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA]/80">
              <h4 className="font-bold text-[#111111] text-sm">
                What is the difference between AI Models and Billing Plans?
              </h4>
              <p className="text-[#5A5A5A]">
                Orbit, Pulsar, and Quasar are AI models selectable inside the validator input box based on diagnostic depth. Billing Plans (Free, Pro, Ultra, Enterprise) determine your monthly check volume, advanced model access, and active AI Teammates.
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA]/80">
              <h4 className="font-bold text-[#111111] text-sm">
                How do lifetime trials work on the Free plan?
              </h4>
              <p className="text-[#5A5A5A]">
                Free users get unlimited Orbit validations (fair-use cap), exactly 1 lifetime trial check for Pulsar, and exactly 1 lifetime trial check for Quasar. After you use each trial, that advanced model locks until you upgrade.
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA]/80">
              <h4 className="font-bold text-[#111111] text-sm">
                When do monthly quotas reset for Pro and Ultra?
              </h4>
              <p className="text-[#5A5A5A]">
                Paid monthly limits ({PRO_PULSAR_MONTHLY_LIMIT} Pulsar / {PRO_QUASAR_MONTHLY_LIMIT} Quasar on Pro; {ULTRA_PULSAR_MONTHLY_LIMIT} Pulsar / {ULTRA_QUASAR_MONTHLY_LIMIT} Quasar on Ultra) reset automatically at the start of each calendar billing month.
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA]/80">
              <h4 className="font-bold text-[#111111] text-sm">
                How do I get Enterprise access?
              </h4>
              <p className="text-[#5A5A5A]">
                Enterprise is not self-serve through credit card checkout. Custom limits and dedicated support are tailored to your team. Call our direct line at{' '}
                <a href="tel:+917702764081" className="text-[#E8481C] font-semibold underline">
                  7702764081
                </a>{' '}
                to get started. Access is provisioned manually by an admin flag on your account.
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA]/80">
              <h4 className="font-bold text-[#111111] text-sm">
                Is my payment secure?
              </h4>
              <p className="text-[#5A5A5A]">
                Yes. All transactions are handled through Razorpay Software Private Limited, an RBI-authorized PCI-DSS Level 1 compliant payment aggregator. We never store or touch your card details.
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA]/80">
              <h4 className="font-bold text-[#111111] text-sm">
                Can I cancel anytime?
              </h4>
              <p className="text-[#5A5A5A]">
                Yes. You can manage or downgrade your subscription at any time. When downgraded, your account retains access until the end of the billing period, after which it reverts to Free tier entitlements.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};
