import React from 'react';
import { ArrowLeft, CheckCircle2, Clock, Sparkles, MessageSquare, ShieldCheck, ArrowRight } from 'lucide-react';
import { Footer } from '../components/Footer.tsx';

interface ThankYouPageProps {
  onNavigate: (path: string) => void;
}

export const ThankYouPage: React.FC<ThankYouPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#111111] flex flex-col justify-between selection:bg-[#E8481C] selection:text-white">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 w-full flex-1 flex flex-col justify-center">
        {/* Navigation Breadcrumb */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate('/flaw')}
            className="inline-flex items-center gap-2 text-xs font-mono text-[#5A5A5A] hover:text-[#111111] transition-colors cursor-pointer py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Overview</span>
          </button>
        </div>

        {/* Success Card */}
        <div className="p-8 sm:p-12 rounded-2xl bg-white border border-[#E0DEDA] shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-9 h-9" strokeWidth={2.2} />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-mono uppercase tracking-wider font-semibold border border-emerald-200">
              Inquiry Confirmed
            </span>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#111111]">
              Thank You! We Received Your Message
            </h1>
            <p className="text-sm sm:text-base text-[#5A5A5A] max-w-lg mx-auto leading-relaxed">
              Your inquiry has been logged into our support queue. Here is what will happen next:
            </p>
          </div>

          {/* Timeline / What happens next */}
          <div className="grid sm:grid-cols-3 gap-4 text-left pt-4">
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E0DEDA]/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#111111]">
                <Clock className="w-4 h-4 text-[#E8481C]" />
                <span>1. Review</span>
              </div>
              <p className="text-xs text-[#555555] leading-relaxed">
                Our support and engineering teams evaluate your request within <strong>24–48 business hours</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E0DEDA]/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#111111]">
                <MessageSquare className="w-4 h-4 text-[#E8481C]" />
                <span>2. Follow-Up</span>
              </div>
              <p className="text-xs text-[#555555] leading-relaxed">
                We will reply directly to your contact email with troubleshooting steps, answers, or invoice details.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E0DEDA]/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#111111]">
                <ShieldCheck className="w-4 h-4 text-[#E8481C]" />
                <span>3. Confidential</span>
              </div>
              <p className="text-xs text-[#555555] leading-relaxed">
                All communications and project details remain 100% confidential under our data protection terms.
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-6 border-t border-[#E0DEDA] flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('/flaw/submit')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#E8481C] text-white text-xs font-mono uppercase tracking-wider font-semibold hover:bg-[#d63f15] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Idea Validator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigate('/flaw/gallery')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white border border-[#E0DEDA] text-[#111111] text-xs font-mono uppercase tracking-wider font-semibold hover:bg-[#FAF9F6] transition-all cursor-pointer"
            >
              Explore Public Gallery
            </button>
          </div>
        </div>
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};
