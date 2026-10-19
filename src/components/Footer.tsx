import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, ShieldCheck, Lock } from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';
import { FlawWordmark } from './FlawWordmark.tsx';
import { BRAND } from '../config/brand.ts';

export const BRAND_NAME = BRAND.name;

interface FooterProps {
  onNavigate: (path: string) => void;
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, className = '' }) => {
  const [hasAnimated, setHasAnimated] = useState(false);
  const wordmarkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wordmarkRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setHasAnimated(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setHasAnimated(true);
          observer.disconnect(); // once: true
        }
      },
      {
        threshold: 0.05,
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <footer className={`w-full border-t border-[#E2E8F0] bg-[#F4F8FC] text-[#111111] pt-12 pb-0 mt-auto overflow-hidden ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Column */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <BrandLogo size="sm" rounded="sm" />
              <FlawWordmark size="md" className="text-[#111111]" />
            </div>
            <p className="text-xs text-[#5A5A5A] leading-relaxed">
              Automated AI validation engine that uncovers edge-case risks, unit economic traps, and hidden competitors.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#7A7A7A] pt-1">
              <Lock className="w-3 h-3 text-[#E8481C]" />
              <span>Secure Payments via Razorpay</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#111111]">
              Product
            </h4>
            <ul className="space-y-2 text-xs text-[#5A5A5A]">
              <li>
                <button
                  onClick={() => onNavigate('/flaw')}
                  className="hover:text-[#111111] transition-colors cursor-pointer text-left"
                >
                  Overview & Pipeline
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/flaw/submit')}
                  className="hover:text-[#111111] transition-colors cursor-pointer text-left"
                >
                  Idea Validator
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/flaw/billing')}
                  className="hover:text-[#111111] transition-colors cursor-pointer text-left"
                >
                  Pricing & Plans
                </button>
              </li>
              <li>
                <button
                  type="button"
                  id="footer-link-gallery"
                  onClick={() => onNavigate('/flaw/gallery')}
                  className="hover:text-[#111111] transition-colors cursor-pointer text-left inline-flex items-center gap-1"
                >
                  <span>Public Gallery</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  id="footer-link-connect"
                  onClick={() => onNavigate('/flaw/connect')}
                  className="hover:text-[#111111] transition-colors cursor-pointer text-left inline-flex items-center gap-1 text-[#E8481C] font-mono"
                >
                  <span>Connect your AI (MCP)</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#111111]">
              Legal & Trust
            </h4>
            <ul className="space-y-2 text-xs text-[#5A5A5A]">
              <li>
                <button
                  id="footer-link-terms"
                  onClick={() => onNavigate('/flaw/terms')}
                  className="hover:text-[#111111] transition-colors cursor-pointer text-left"
                >
                  Terms and Conditions
                </button>
              </li>
              <li>
                <button
                  id="footer-link-privacy"
                  onClick={() => onNavigate('/flaw/privacy')}
                  className="hover:text-[#111111] transition-colors cursor-pointer text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  id="footer-link-refund"
                  onClick={() => onNavigate('/flaw/refund-policy')}
                  className="hover:text-[#111111] transition-colors cursor-pointer text-left"
                >
                  Refund & Cancellation Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Support & Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#111111]">
              Support
            </h4>
            <ul className="space-y-2 text-xs text-[#5A5A5A]">
              <li>
                <button
                  id="footer-link-contact"
                  onClick={() => onNavigate('/flaw/contact')}
                  className="hover:text-[#111111] transition-colors cursor-pointer text-left font-medium text-[#111111]"
                >
                  Contact & Support
                </button>
              </li>
              <li>
                <a
                  href="mailto:support@flaw.app"
                  className="hover:text-[#111111] transition-colors font-mono text-[11px]"
                >
                  support@flaw.app
                </a>
              </li>
              <li>
                <span className="text-[11px] text-[#7A7A7A] block">
                  Mon – Fri: 9:00 AM – 6:00 PM IST
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright bar */}
        <div className="pt-6 border-t border-[#E0DEDA] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7A7A7A]">
          <p>© {new Date().getFullYear()} <span className="bg-gradient-to-r from-[#111111] via-[#111111]/70 to-[#111111]/20 bg-clip-text text-transparent font-semibold tracking-wide">FLAWLESZ AI</span>. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => onNavigate('/flaw/terms')}
              className="hover:text-[#111111] transition-colors cursor-pointer"
            >
              Terms
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('/flaw/privacy')}
              className="hover:text-[#111111] transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('/flaw/refund-policy')}
              className="hover:text-[#111111] transition-colors cursor-pointer"
            >
              Refunds
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('/flaw/contact')}
              className="hover:text-[#111111] transition-colors cursor-pointer"
            >
              Contact
            </button>
          </div>
        </div>
      </div>

      {/* Giant Faded Brand Wordmark */}
      <div
        ref={wordmarkRef}
        className="footer-wordmark-wrap"
        aria-hidden="true"
      >
        <div className="footer-wordmark-glow" />
        <p
          className="footer-wordmark font-instrument-serif"
          style={{
            opacity: hasAnimated ? 1 : 0,
            transform: hasAnimated ? 'translateY(0px)' : 'translateY(24px)',
            transition: 'opacity 1000ms cubic-bezier(0.16, 1, 0.3, 1), transform 1000ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <span className="footer-wordmark-stem">flawles</span>
          <span className="footer-wordmark-accent">z</span>
        </p>
      </div>
    </footer>
  );
};
