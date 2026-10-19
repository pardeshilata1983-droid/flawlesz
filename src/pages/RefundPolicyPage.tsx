import React from 'react';
import { ArrowLeft, RefreshCw, Calendar, CheckCircle2, AlertCircle, HelpCircle, Mail } from 'lucide-react';
import { Footer } from '../components/Footer.tsx';

interface RefundPolicyPageProps {
  onNavigate: (path: string) => void;
}

export const RefundPolicyPage: React.FC<RefundPolicyPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#111111] flex flex-col justify-between">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        {/* Back navigation */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate('/flaw')}
            className="inline-flex items-center gap-2 text-xs font-mono text-[#5A5A5A] hover:text-[#111111] transition-colors cursor-pointer py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Overview</span>
          </button>
        </div>

        {/* Header */}
        <div className="border-b border-[#E0DEDA] pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/5 text-[#111111] text-xs font-mono mb-4">
            <RefreshCw className="w-3.5 h-3.5 text-[#E8481C]" />
            <span>Billing & Cancellation Terms</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
            Refund & Cancellation Policy
          </h1>
          <p className="mt-2 text-sm text-[#5A5A5A] font-mono flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Last Updated: September 24, 2026 • Effective Date: September 24, 2026</span>
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-10 text-[15px] leading-relaxed text-[#222222]">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[#111111] tracking-tight">
              1. Overview
            </h2>
            <p>
              At <strong>Flawlesz AI</strong>, we strive to provide complete transparency in our billing practices. Because Flawlesz AI is a digital software-as-a-service (SaaS) platform that provisions computational AI resources, real-time search queries, and diagnostic reports immediately upon subscription activation, this Refund & Cancellation Policy outlines the exact terms under which subscriptions may be cancelled and refunds may be issued.
            </p>
          </section>

          <hr className="border-[#E0DEDA]" />

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[#111111] tracking-tight">
              2. Subscription Cancellation
            </h2>
            <p>
              You maintain complete control over your subscription and may cancel anytime with zero cancellation penalties:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 my-3">
              <div className="p-4 rounded-lg bg-white border border-[#E0DEDA]">
                <h3 className="font-semibold text-sm text-[#111111] mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#E8481C]" />
                  <span>Self-Service via Billing Page</span>
                </h3>
                <p className="text-xs text-[#555555] leading-normal">
                  Navigate to your <button onClick={() => onNavigate('/flaw/billing')} className="text-[#E8481C] underline">Billing & Plans</button> page and click "Manage Subscription" to open the Razorpay customer billing portal. You can cancel with one click.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-white border border-[#E0DEDA]">
                <h3 className="font-semibold text-sm text-[#111111] mb-1 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-[#E8481C]" />
                  <span>Support-Assisted Cancellation</span>
                </h3>
                <p className="text-xs text-[#555555] leading-normal">
                  Email <a href="mailto:support@flaw.app" className="text-[#E8481C] underline">support@flaw.app</a> with your registered email address requesting cancellation. Our team will process it within 24 business hours.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-black/[0.02] border border-[#E0DEDA] text-sm">
              <strong>Access Post-Cancellation:</strong> When you cancel a paid plan, your subscription access will continue uninterrupted until the end of the current pre-paid billing cycle. Your account will then automatically transition to the free Orbit tier without further automated charges.
            </div>
          </section>

          <hr className="border-[#E0DEDA]" />

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[#111111] tracking-tight">
              3. Refund Eligibility & Conditions
            </h2>
            <p>
              Subscriptions are billed in advance on a recurring monthly or annual basis. Due to the high cost of real-time multi-agent computational pipelines, our general policy is:
            </p>

            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>No Prorated Refunds:</strong> We do not offer prorated refunds for partial billing cycles or unused validation check quotas once a billing period has commenced.
              </li>
              <li>
                <strong>Duplicate Charges:</strong> If an unintended duplicate transaction occurs due to network latency or payment gateway errors, the duplicate amount will be refunded in full immediately upon verification.
              </li>
              <li>
                <strong>Technical Failure Window (48 Hours):</strong> If you encounter verified system-wide technical outages that completely prevent you from running any validation checks within the first 48 hours of initial subscription activation, you are eligible for a 100% full refund upon request.
              </li>
              <li>
                <strong>Fraudulent / Unauthorized Transactions:</strong> If your card or payment account was used without authorization, notify us immediately along with Razorpay transaction details for immediate reversal and account lockdown.
              </li>
            </ul>
          </section>

          <hr className="border-[#E0DEDA]" />

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[#111111] tracking-tight">
              4. How to Request a Refund
            </h2>
            <p>
              To request a refund under the eligible conditions described above, please follow these steps:
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>Send an email to <a href="mailto:billing@flaw.app" className="text-[#E8481C] underline font-semibold">billing@flaw.app</a> within <strong>7 calendar days</strong> of the transaction date.</li>
              <li>Include your registered account email, date of payment, and the <strong>Razorpay Payment ID</strong> (starts with <code>pay_...</code>) from your email receipt.</li>
              <li>Provide a brief explanation of the technical issue or reason for the request.</li>
            </ol>
          </section>

          <hr className="border-[#E0DEDA]" />

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[#111111] tracking-tight">
              5. Refund Processing Timeline
            </h2>
            <p>
              Once your refund request is reviewed and approved by our billing department:
            </p>
            <div className="p-4 rounded-lg bg-white border border-[#E0DEDA] space-y-2 font-mono text-xs">
              <p><strong>Review & Decision:</strong> Within 1 to 2 business days.</p>
              <p><strong>Gateway Dispatch (Razorpay):</strong> Initiated instantly upon approval.</p>
              <p><strong>Bank Settlement:</strong> 5 to 7 business days to reflect in your original payment method (Credit/Debit Card, UPI, or Net Banking) according to your bank's processing cycles.</p>
            </div>
          </section>

          <hr className="border-[#E0DEDA]" />

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[#111111] tracking-tight">
              6. Contact Support
            </h2>
            <p>
              For all billing inquiries, invoice receipts, or refund questions, please reach out to:
            </p>
            <div className="p-4 rounded-lg bg-white border border-[#E0DEDA] space-y-1.5 font-mono text-xs">
              <p><strong>Billing Desk:</strong> <a href="mailto:billing@flaw.app" className="text-[#E8481C] underline">billing@flaw.app</a></p>
              <p><strong>General Support:</strong> <a href="mailto:support@flaw.app" className="text-[#E8481C] underline">support@flaw.app</a></p>
              <p><strong>Support Page:</strong> <button onClick={() => onNavigate('/flaw/contact')} className="text-[#E8481C] underline">flaw.app/contact</button></p>
            </div>
          </section>
        </div>
      </div>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};
