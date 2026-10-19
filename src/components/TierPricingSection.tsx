import React, { useState } from 'react';
import {
  Check,
  ArrowRight,
  Phone,
  Shield,
  Loader2,
  CheckCircle2,
  Lock,
  Zap,
  Sparkles,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import {
  PLANS,
  PlanId,
  PRO_PULSAR_MONTHLY_LIMIT,
  PRO_QUASAR_MONTHLY_LIMIT,
  ULTRA_PULSAR_MONTHLY_LIMIT,
  ULTRA_QUASAR_MONTHLY_LIMIT,
  PRO_PRICE,
  ULTRA_PRICE
} from '../config/plans.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  createBillingSubscription,
  verifyBillingPayment,
  fetchBillingStatus,
  cancelSubscription
} from '../services/api.ts';
import { PaymentReceiptModal } from './PaymentReceiptModal.tsx';

interface TierPricingSectionProps {
  mode?: 'fullscreen' | 'section';
  onNavigate?: (path: string) => void;
  userEmail?: string;
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const TierPricingSection: React.FC<TierPricingSectionProps> = ({
  mode = 'section',
  onNavigate,
}) => {
  const { user, updateUser } = useAuth();
  
  // Preload Razorpay script on mount for faster initialization
  React.useEffect(() => {
    loadRazorpayScript();
  }, []);
  
  const isOwner = Boolean(
    user?.email && user.email.trim().toLowerCase() === 'pardeshilata1983@gmail.com'
  ) || user?.role === 'admin';
  const currentPlan: PlanId = isOwner ? 'enterprise' : (user?.plan || 'free');
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [activatingPlan, setActivatingPlan] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState<boolean>(false);
  const [receiptPaymentInfo, setReceiptPaymentInfo] = useState<{
    planId: PlanId;
    paymentId?: string;
    subscriptionId?: string;
    date?: string;
  } | null>(null);

  const planOrder: PlanId[] = ['free', 'pro', 'ultra', 'enterprise'];

  const handleSelectPlan = async (planId: PlanId) => {
    if (isOwner) {
      setSuccessMessage('As the owner (pardeshilata1983@gmail.com), all AI features, models, and tools are 100% free and permanently unlocked for your account.');
      return;
    }

    if (planId === 'enterprise') {
      // Enterprise is not self-serve; handled by telephone link
      return;
    }

    if (!user) {
      if (onNavigate) {
        onNavigate(`/flaw/signup?redirect=/flaw/billing&plan=${planId}`);
      }
      return;
    }

    if (currentPlan === planId) {
      return;
    }

    // Downgrade to Free
    if (planId === 'free') {
      if (user.subscription_id && user.subscription_status === 'active') {
        setShowCancelModal(true);
      }
      return;
    }

    // Upgrade to Pro or Ultra via Razorpay Subscriptions
    setLoadingPlan(planId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Unable to connect to Razorpay payment gateway. Please check your internet connection.');
      }

      console.log(`[CHECKOUT] Initializing Razorpay subscription for plan: ${planId}`);
      const res = await createBillingSubscription(planId);

      const hasValidId = (res.subscription_id && res.subscription_id.startsWith('sub_')) ||
                         (res.order_id && res.order_id.startsWith('order_'));

      if (!hasValidId) {
        throw new Error(
          (res as any).error || 'The payment server did not return a valid session ID. Please try again.'
        );
      }

      // If in sandbox mode without real gateway credentials, run instant simulated test activation
      if (res.is_sandbox || res.key_id.includes('FlawEngine') || res.subscription_id?.startsWith('sub_sandbox_') || res.order_id?.startsWith('order_sandbox_')) {
        console.log('[CHECKOUT] Sandbox test mode active — activating simulated payment directly');
        await handlePaymentSuccess(
          'pay_sandbox_' + Date.now(),
          res.subscription_id || '',
          res.order_id || '',
          'sandbox_sig_' + Date.now(),
          planId
        );
        return;
      }

      const options: any = {
        key: res.key_id,
        name: 'Flawlesz AI Validation Engine',
        description: `${PLANS[planId].name} Membership`,
        image: '/brand-logo.svg',
        prefill: {
          email: user.email,
          name: user.name || user.email.split('@')[0],
        },
        theme: {
          color: '#E8481C',
        },
        handler: async (response: any) => {
          console.log('[CHECKOUT] Razorpay payment successful callback:', response);
          await handlePaymentSuccess(
            response.razorpay_payment_id,
            response.razorpay_subscription_id || res.subscription_id || '',
            response.razorpay_order_id || res.order_id || '',
            response.razorpay_signature,
            planId
          );
        },
        modal: {
          ondismiss: () => {
            console.log('[CHECKOUT] User dismissed payment modal.');
            setLoadingPlan(null);
          },
        },
      };

      if (res.subscription_id) {
        options.subscription_id = res.subscription_id;
      } else if (res.order_id) {
        options.order_id = res.order_id;
        options.amount = res.amount;
        options.currency = res.currency || 'INR';
      }

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on('payment.failed', (failResp: any) => {
        console.error('[CHECKOUT] Payment failed:', failResp);
        setErrorMessage(
          failResp.error?.description ||
          failResp.error?.reason ||
          'Payment could not be completed. Please verify your payment details and try again.'
        );
        setLoadingPlan(null);
      });
      razorpayInstance.open();
    } catch (err: any) {
      console.error('[CHECKOUT] Error starting Razorpay checkout:', err);
      setErrorMessage(err.message || 'Failed to initialize checkout. Please try again.');
      setLoadingPlan(null);
    }
  };

  const handlePaymentSuccess = async (
    paymentId: string,
    subscriptionId: string,
    orderId: string,
    signature: string,
    targetPlan: PlanId
  ) => {
    setActivatingPlan(true);
    setSuccessMessage('Payment confirmed! Activating your plan...');

    try {
      const verifyRes: any = await verifyBillingPayment(paymentId, subscriptionId, signature, orderId);
      if (verifyRes && verifyRes.user) {
        updateUser(verifyRes.user);
      } else {
        const statusRes = await fetchBillingStatus();
        if (statusRes?.user) {
          updateUser(statusRes.user);
        }
      }
      setSuccessMessage(`Welcome to Flawlesz AI ${PLANS[targetPlan].name}! Your subscription is now active.`);
      
      // Automatically pop open the animated receipt printer to dispense the bill
      setReceiptPaymentInfo({
        planId: targetPlan,
        paymentId,
        subscriptionId: subscriptionId || orderId,
        date: new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short'
        }),
      });
      setReceiptModalOpen(true);

      setTimeout(() => setSuccessMessage(null), 8000);
    } catch (verifyErr: any) {
      console.error('[CHECKOUT] Signature verify error:', verifyErr);
      setErrorMessage(verifyErr.message || 'Payment signature verification failed.');
      const statusRes = await fetchBillingStatus();
      if (statusRes?.user) updateUser(statusRes.user);
    } finally {
      setActivatingPlan(false);
      setLoadingPlan(null);
    }
  };

  const handleConfirmCancel = async () => {
    setCancelling(true);
    setErrorMessage(null);
    try {
      await cancelSubscription();
      setShowCancelModal(false);
      const statusRes = await fetchBillingStatus();
      if (statusRes?.user) {
        updateUser(statusRes.user);
      }
      setSuccessMessage('Subscription scheduled for cancellation at the end of your current billing cycle.');
      setTimeout(() => setSuccessMessage(null), 7000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel subscription.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <section
      id="pricing"
      aria-label="Subscription Plans and Model Access"
      className={`relative w-full ${
        mode === 'fullscreen' ? 'min-h-screen py-8 sm:py-12 bg-[#F4F8FC]' : 'py-16 sm:py-24 bg-transparent'
      }`}
    >
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-3 bg-[#E8481C]/10 border border-[#E8481C]/25 text-[#E8481C]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Four Transparent Billing Plans</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#111111]">
            Validate, Stress-Test & Build with AI Teammates
          </h2>
          <p className="text-sm sm:text-base mt-2.5 text-[#5A5A5A] leading-relaxed">
            Choose the throughput, diagnostic depth, and Vibe Code capabilities your project demands. Unlock AI Models (Orbit, Pulsar, Quasar) and specialized AI Employees (Atlas, Elena, Nova, Cypher, Iris).
          </p>
        </div>

        {/* Success / Activating Notifications */}
        {activatingPlan && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3 text-xs font-mono text-[#E8481C]">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>Payment received! Activating your subscription and synchronizing model quotas...</span>
          </div>
        )}

        {successMessage && !activatingPlan && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-mono text-emerald-800">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-xs font-bold text-emerald-800 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs font-mono text-rose-800">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-xs font-bold text-rose-800 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {planOrder.map((planId) => {
            const plan = PLANS[planId];
            const isCurrent = currentPlan === planId;
            const isHighlight = plan.highlight && !isCurrent;
            const isLoading = loadingPlan === planId;

            return (
              <div
                key={planId}
                id={`pricing-card-${planId}`}
                className={`relative flex flex-col justify-between rounded-2xl p-6 sm:p-7 transition-all duration-200 ${
                  isCurrent
                    ? 'bg-white border-2 border-[#E8481C] shadow-lg ring-1 ring-[#E8481C]/20'
                    : isHighlight
                    ? 'bg-white border-2 border-[#111111] shadow-md hover:shadow-xl'
                    : 'bg-white border border-[#E0DEDA] shadow-xs hover:border-[#111111]/30 hover:shadow-md'
                }`}
              >
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2 mb-4 min-h-[24px]">
                  {plan.badge ? (
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        isCurrent
                          ? 'bg-[#E8481C] text-white'
                          : isHighlight
                          ? 'bg-[#111111] text-white'
                          : 'bg-[#F5F4F0] text-[#5A5A5A] border border-[#E0DEDA]'
                      }`}
                    >
                      {plan.badge}
                    </span>
                  ) : <span />}

                  {isCurrent && (
                    <span className="text-[10px] font-mono font-bold text-[#E8481C] uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Active Plan
                    </span>
                  )}
                </div>

                {/* Plan Title & Price */}
                <div>
                  <h3 className="text-xl font-bold text-[#111111] tracking-tight">{plan.name}</h3>
                  <p className="text-xs text-[#5A5A5A] mt-1 line-clamp-2 min-h-[32px]">{plan.description}</p>

                  <div className="mt-5 pb-6 border-b border-[#E0DEDA]">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black font-mono text-[#111111] tracking-tight">
                        {plan.price}
                      </span>
                      <span className="text-xs font-mono text-[#7A7A7A]">/ {plan.frequency}</span>
                    </div>
                  </div>

                  {/* Model Quota Highlights */}
                  <div className="my-5 p-3 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA]/80 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#5A5A5A]">Monthly Checks:</span>
                      <span className="font-bold text-[#E8481C]">
                        {plan.id === 'free' ? '25 checks / mo' : plan.id === 'pro' ? '50 checks / mo' : plan.id === 'ultra' ? '100 checks / mo' : 'Unlimited'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#5A5A5A]">Orbit Model:</span>
                      <span className="font-semibold text-[#111111]">Included in checks</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#5A5A5A]">Pulsar Model:</span>
                      <span className="font-bold text-[#E8481C]">
                        {typeof plan.pulsar === 'object' && 'monthly' in plan.pulsar
                          ? `${plan.pulsar.monthly}/mo`
                          : typeof plan.pulsar === 'object' && 'lifetime' in plan.pulsar
                          ? `${plan.pulsar.lifetime} lifetime trial`
                          : 'Custom'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#5A5A5A]">Quasar Model:</span>
                      <span className="font-bold text-[#4A5568]">
                        {typeof plan.quasar === 'object' && 'monthly' in plan.quasar
                          ? `${plan.quasar.monthly}/mo`
                          : typeof plan.quasar === 'object' && 'lifetime' in plan.quasar
                          ? `${plan.quasar.lifetime} lifetime trial`
                          : 'Custom'}
                      </span>
                    </div>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-2.5 mb-6 text-xs text-[#5A5A5A]">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-3.5 h-3.5 text-[#E8481C] shrink-0 mt-0.5" />
                        <span className="leading-tight text-[#111111]">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Call-to-Action Button */}
                <div className="pt-4 border-t border-[#E0DEDA]/60 mt-auto">
                  {planId === 'enterprise' ? (
                    <a
                      id="pricing-btn-enterprise"
                      href={plan.contactTel || 'tel:+917702764081'}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-mono font-bold bg-[#111111] text-white hover:bg-black transition-colors min-h-[44px] cursor-pointer shadow-xs"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#E8481C]" />
                      <span>Contact Us ({plan.contactPhone || '7702764081'})</span>
                    </a>
                  ) : isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-3 px-4 rounded-xl text-xs font-mono font-bold bg-[#F5F4F0] text-[#7A7A7A] border border-[#E0DEDA] min-h-[44px] cursor-default text-center flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#E8481C]" />
                      <span>Current Plan</span>
                    </button>
                  ) : (
                    <button
                      id={`pricing-btn-${planId}`}
                      type="button"
                      disabled={isLoading || activatingPlan}
                      onClick={() => handleSelectPlan(planId)}
                      className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-mono font-bold transition-all min-h-[44px] cursor-pointer shadow-xs ${
                        isHighlight
                          ? 'bg-[#E8481C] text-white hover:bg-[#d63f15] hover:shadow-md'
                          : 'bg-[#111111] text-white hover:bg-black'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Preparing Checkout...</span>
                        </>
                      ) : (
                        <>
                          <span>
                            {!user
                              ? 'Get Started'
                              : planId === 'free'
                              ? 'Downgrade to Free'
                              : `Upgrade to ${plan.name}`}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cancellation Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#E0DEDA] max-w-md w-full p-6 space-y-4 font-mono">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-bold">Downgrade to Free Tier?</h3>
              </div>
              <p className="text-xs text-[#5A5A5A] leading-relaxed">
                Cancelling your subscription will stop future automatic recurring payments through Razorpay. You will retain full {PLANS[currentPlan].name} access until the end of your current paid billing period, after which your account will revert to Free tier entitlements.
              </p>
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F5F4F0] text-xs font-bold text-[#111111] hover:bg-[#E2DDD5] cursor-pointer"
                >
                  Keep Subscription
                </button>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleConfirmCancel}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer flex items-center gap-2"
                >
                  {cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Downgrade</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Animated Receipt Printer Bill Modal */}
        {receiptModalOpen && receiptPaymentInfo && (
          <PaymentReceiptModal
            isOpen={receiptModalOpen}
            onClose={() => setReceiptModalOpen(false)}
            planId={receiptPaymentInfo.planId}
            paymentDetails={receiptPaymentInfo}
            customerName={user?.name || user?.email?.split('@')[0] || 'Valued Founder'}
            customerEmail={user?.email || 'founder@flawlesz.ai'}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </section>
  );
};
