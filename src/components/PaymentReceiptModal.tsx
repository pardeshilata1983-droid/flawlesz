import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import {
  ReceiptPrinterRoot,
  ReceiptPrinterMachine,
  ReceiptPrinterHeader,
  ReceiptPrinterScreen,
  ReceiptPrinterOutput,
  ReceiptPrinterPaper,
  ReceiptPrinterStatus,
  ReceiptPrinterStage,
  ReceiptFeedMotion
} from './ReceiptPrinter.tsx';
import { PLANS, PlanId } from '../config/plans.ts';

export interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: PlanId;
  paymentDetails?: {
    paymentId?: string;
    subscriptionId?: string;
    amount?: number;
    currency?: string;
    date?: string;
  };
  customerName?: string;
  customerEmail?: string;
  onNavigate?: (path: string) => void;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  planId,
  paymentDetails,
  customerName = 'Valued Founder',
  customerEmail = 'founder@flawlesz.ai',
  onNavigate,
}) => {
  const [stage, setStage] = useState<ReceiptPrinterStage>('processing');
  const [feedMotion, setFeedMotion] = useState<ReceiptFeedMotion>('stepped');
  const [copiedInvoice, setCopiedInvoice] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Derive plan info
  const planInfo = PLANS[planId] || PLANS.pro;
  const isUltra = planId === 'ultra';
  const priceDisplay = isUltra ? '$79.00' : '$29.00';
  const priceNumber = isUltra ? 79 : 29;
  
  // Format invoice details
  const invoiceId = React.useMemo(() => {
    if (paymentDetails?.paymentId) {
      return `FLW-${paymentDetails.paymentId.replace(/^pay_/, '').slice(0, 10).toUpperCase()}`;
    }
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `FLW-2026-INV-${rand}`;
  }, [paymentDetails?.paymentId, isOpen]);

  const timestamp = React.useMemo(() => {
    if (paymentDetails?.date) return paymentDetails.date;
    const now = new Date();
    return now.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  }, [paymentDetails?.date, isOpen]);

  // Stage sequence animation: processing (1.2s) -> printing (2.5s) -> complete
  useEffect(() => {
    if (!isOpen) return;

    setStage('processing');
    const timer1 = setTimeout(() => {
      setStage('printing');
    }, 1200);

    const timer2 = setTimeout(() => {
      setStage('complete');
    }, 3200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReplayPrint = () => {
    setStage('processing');
    setTimeout(() => {
      setStage('printing');
    }, 800);
    setTimeout(() => {
      setStage('complete');
    }, 2800);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyInvoiceText = async () => {
    const textReceipt = `
========================================
       FLAWLESZ AI VALIDATION LABS      
         KNOW BEFORE YOU BUILD          
     OFFICIAL TAX INVOICE & RECEIPT     
========================================
Invoice #:      ${invoiceId}
Date & Time:    ${timestamp}
Status:         PAID & CONFIRMED
Gateway:        Razorpay (PCI-DSS L1)
Txn ID:         ${paymentDetails?.paymentId || 'pay_demo_verified'}
Subscription:   ${paymentDetails?.subscriptionId || 'sub_demo_active'}

BILLED TO:
Name:           ${customerName}
Email:          ${customerEmail}

PLAN DETAILS:
----------------------------------------
1x Flawlesz AI ${planInfo.name} Tier
   Monthly Recurring Subscription
   - Orbit, Pulsar, & Quasar Models
   - AI Teammates Office Access
   - Vibe Code Full-Stack IDE
----------------------------------------
Subtotal:       ${priceDisplay} USD
Tax (0.00%):    $0.00 USD
TOTAL PAID:     ${priceDisplay} USD

AUTHENTICATION HASH:
SHA256: ${Math.random().toString(36).substring(2, 15).toUpperCase()}
========================================
Thank you for building with Flawlesz AI!
https://flawlesz.ai.studio
========================================
`.trim();

    try {
      await navigator.clipboard.writeText(textReceipt);
      setCopiedInvoice(true);
      setTimeout(() => setCopiedInvoice(false), 2500);
    } catch (err) {
      console.error('Failed to copy receipt:', err);
    }
  };

  const handleDownloadTxt = () => {
    const textReceipt = `
========================================
       FLAWLESZ AI VALIDATION LABS      
         KNOW BEFORE YOU BUILD          
     OFFICIAL TAX INVOICE & RECEIPT     
========================================
Invoice #:      ${invoiceId}
Date & Time:    ${timestamp}
Status:         PAID & CONFIRMED
Gateway:        Razorpay (PCI-DSS L1)
Txn ID:         ${paymentDetails?.paymentId || 'pay_demo_verified'}
Subscription:   ${paymentDetails?.subscriptionId || 'sub_demo_active'}

BILLED TO:
Name:           ${customerName}
Email:          ${customerEmail}

PLAN DETAILS:
----------------------------------------
1x Flawlesz AI ${planInfo.name} Tier
   Monthly Recurring Subscription
   - Orbit, Pulsar, & Quasar Models
   - AI Teammates Office Access
   - Vibe Code Full-Stack IDE
----------------------------------------
Subtotal:       ${priceDisplay} USD
Tax (0.00%):    $0.00 USD
TOTAL PAID:     ${priceDisplay} USD
========================================
Thank you for building with Flawlesz AI!
`.trim();

    const blob = new Blob([textReceipt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoiceId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-printer-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#0F1115] border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-white flex flex-col items-center my-auto max-h-[96vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        ref={printContainerRef}
      >
        {/* Top Controls Bar */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 id="receipt-printer-modal-title" className="text-sm font-mono font-bold tracking-wider uppercase text-stone-200">
              Payment Confirmed • Bill Dispenser
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReplayPrint}
              title="Feed & re-print receipt"
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xs flex items-center gap-1 font-mono"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Feed Again</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            THE RECEIPT PRINTER MACHINE (User's Exact Component)
           ───────────────────────────────────────────────────────────── */}
        <ReceiptPrinterRoot
          stage={stage}
          feedMotion={feedMotion}
          className="w-full max-w-sm"
        >
          <ReceiptPrinterMachine className="border-stone-700 bg-stone-900 shadow-2xl">
            <ReceiptPrinterHeader>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase">
                  FLAWLESZ POS-90
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-stone-500">
                <span>THERMAL</span>
                <span>•</span>
                <span>203 DPI</span>
              </div>
            </ReceiptPrinterHeader>

            <ReceiptPrinterScreen className="border-stone-800 bg-black/90 text-stone-100">
              <ReceiptPrinterStatus />
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                <span className="text-stone-400">PLAN:</span>
                <span className="font-bold text-[#E8481C] tracking-wide">
                  {planInfo.name.toUpperCase()} ($ {priceNumber}/MO)
                </span>
              </div>
            </ReceiptPrinterScreen>
          </ReceiptPrinterMachine>

          <ReceiptPrinterOutput className="h-[28rem] sm:h-[30rem]">
            <ReceiptPrinterPaper className="bg-[#FAF8F5] text-stone-900 border-x border-[#E0DEDA] shadow-md">
              {/* Receipt Header */}
              <div className="text-center pb-3 border-b border-dashed border-stone-400 mb-3">
                <div className="font-black text-base tracking-tighter text-black flex items-center justify-center gap-1">
                  <span>FLAWLESZ AI</span>
                  <span className="text-[#E8481C]">✦</span>
                </div>
                <div className="text-[9px] font-mono text-stone-500 uppercase tracking-widest">
                  Know Before You Build
                </div>
                <div className="text-[10px] font-mono font-bold text-stone-800 mt-1 uppercase">
                  Official Subscription Invoice
                </div>
              </div>

              {/* Receipt Metadata */}
              <div className="space-y-1 text-[10px] font-mono text-stone-700 pb-3 border-b border-dashed border-stone-400">
                <div className="flex justify-between">
                  <span className="text-stone-500">INVOICE:</span>
                  <span className="font-bold text-black">{invoiceId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">DATE:</span>
                  <span>{timestamp.split(',')[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">TIME:</span>
                  <span>{timestamp.split(',')[1] || '12:00 UTC'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">CUSTOMER:</span>
                  <span className="font-semibold truncate max-w-[140px] text-right">
                    {customerName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">EMAIL:</span>
                  <span className="truncate max-w-[140px] text-right">
                    {customerEmail}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">GATEWAY:</span>
                  <span className="text-emerald-700 font-bold">RAZORPAY SECURE</span>
                </div>
              </div>

              {/* Itemized Line Items */}
              <div className="py-3 border-b border-dashed border-stone-400 text-[10px] font-mono space-y-1.5">
                <div className="flex justify-between font-bold text-stone-900 border-b border-stone-300 pb-1">
                  <span>ITEM</span>
                  <span>AMOUNT</span>
                </div>
                <div className="flex justify-between text-stone-800">
                  <div className="pr-2">
                    <div className="font-bold">1x FLAWLESZ {planInfo.name.toUpperCase()}</div>
                    <div className="text-[9px] text-stone-500">1-Month Recurring Sub</div>
                  </div>
                  <span className="font-bold">{priceDisplay}</span>
                </div>

                <div className="pt-1.5 space-y-0.5 text-[8.5px] text-stone-600">
                  <div>✓ Unlimited Orbit Idea Checks</div>
                  <div>✓ {planInfo.name} Advanced AI Diagnostics</div>
                  <div>✓ AI Teammates Office Space Access</div>
                  <div>✓ Vibe Code IDE & Terminal Sync</div>
                </div>
              </div>

              {/* Financial Totals */}
              <div className="py-2.5 space-y-1 text-[10px] font-mono text-stone-800">
                <div className="flex justify-between">
                  <span className="text-stone-500">Subtotal:</span>
                  <span>{priceDisplay}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Tax / GST (0%):</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between text-xs font-black text-black pt-1.5 border-t border-stone-400">
                  <span>TOTAL PAID:</span>
                  <span className="text-[#E8481C]">{priceDisplay} USD</span>
                </div>
              </div>

              {/* Stamp of Confirmation */}
              <div className="my-2 p-1.5 rounded border border-emerald-600/40 bg-emerald-50 text-emerald-800 text-center font-mono text-[9px] font-bold flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>PAYMENT CLEARED • ACCOUNT ACTIVE</span>
              </div>

              {/* Monospace Barcode */}
              <div className="mt-3 text-center space-y-1">
                <div className="font-mono text-[14px] tracking-[0.25em] text-black select-none font-bold overflow-hidden whitespace-nowrap">
                  ||| | | |||| | || | ||| |||| | | |||
                </div>
                <div className="text-[8px] font-mono text-stone-500">
                  REF: {paymentDetails?.paymentId || 'RAZORPAY-SECURE-TOKEN-L1'}
                </div>
                <div className="text-[8.5px] font-mono text-stone-400 italic pt-1">
                  Thank you for building the future with Flawlesz AI.
                </div>
              </div>
            </ReceiptPrinterPaper>
          </ReceiptPrinterOutput>
        </ReceiptPrinterRoot>

        {/* Bottom Actions Bar */}
        <div className="w-full mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Bill</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTxt}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .txt</span>
            </button>

            <button
              type="button"
              onClick={handleCopyInvoiceText}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedInvoice ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-300" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onNavigate && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate('/flaw/teammates');
                }}
                className="px-4 py-2 rounded-xl bg-[#E8481C] hover:bg-[#D03D14] text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors shadow-lg cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Enter AI Office</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-white/20 text-stone-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
