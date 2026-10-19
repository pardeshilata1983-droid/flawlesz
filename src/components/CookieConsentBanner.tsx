import React, { useState, useEffect } from 'react';
import { Shield, Cookie, Check, X } from 'lucide-react';

export const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';

interface CookieConsentBannerProps {
  currentPath: string;
}

// Checks if visitor's timezone corresponds to European Union, UK, or Switzerland
function isEuropeanVisitor(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.startsWith('Europe/')) return true;
    if (tz === 'Atlantic/Reykjavik' || tz === 'WET' || tz === 'CET' || tz === 'EET') return true;
  } catch {
    // If timezone detection fails, default to showing the consent banner for safety
    return true;
  }
  return false;
}

function initGA4(measurementId: string) {
  if (typeof window === 'undefined') return;
  if ((window as any)._ga4_loaded) return;
  (window as any)._ga4_loaded = true;

  console.log(`[ANALYTICS] Initializing Google Analytics 4 (${measurementId})`);

  // Dynamically inject Google Tag Manager gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  (window as any).gtag = gtag;

  gtag('js', new Date());
  gtag('config', measurementId, {
    anonymize_ip: true,
    send_page_view: false
  });
}

function sendGAPageView(path: string) {
  if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
    const fullUrl = window.location.href;
    (window as any).gtag('event', 'page_view', {
      page_path: path,
      page_location: fullUrl,
      page_title: document.title
    });

    // Send custom key event on thank-you view for conversion counting
    if (path === '/thank-you' || path === '/flaw/thank-you') {
      (window as any).gtag('event', 'form_submission_success', {
        page_path: path,
        page_location: fullUrl
      });
      console.log('[ANALYTICS] Triggered GA4 Key Event: form_submission_success');
    }
  }
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ currentPath }) => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const storedConsent = localStorage.getItem('flaw_cookie_consent');
    const isEU = isEuropeanVisitor();

    if (storedConsent === 'accepted') {
      initGA4(GA_MEASUREMENT_ID);
    } else if (storedConsent === 'declined') {
      // User explicitly declined analytics
      setShowBanner(false);
    } else {
      // No preference stored yet
      if (isEU) {
        // EU, UK, and Switzerland require prior consent before setting non-essential cookies
        setShowBanner(true);
      } else {
        // Outside EU/UK/CH: Load analytics directly with opt-out option available
        initGA4(GA_MEASUREMENT_ID);
        setShowBanner(false);
      }
    }
  }, []);

  // Track virtual pageviews on route change
  useEffect(() => {
    sendGAPageView(currentPath);
  }, [currentPath]);

  const handleAccept = () => {
    localStorage.setItem('flaw_cookie_consent', 'accepted');
    initGA4(GA_MEASUREMENT_ID);
    sendGAPageView(currentPath);
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('flaw_cookie_consent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div
      role="region"
      aria-label="Cookie preferences"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 p-4 sm:p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E0DEDA] shadow-xl text-[#111111] animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#E8481C]/10 border border-[#E8481C]/20 flex items-center justify-center shrink-0 text-[#E8481C] mt-0.5">
          <Cookie className="w-4 h-4" />
        </div>
        <div className="flex-1 space-y-1.5">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
            <span>Cookie & Analytics Notice</span>
          </h4>
          <p className="text-xs text-[#5A5A5A] leading-relaxed">
            We use Google Analytics 4 to understand website engagement. For visitors in the EU, UK, and Switzerland, cookies are only activated with your consent.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleAccept}
              className="px-3.5 py-1.5 rounded-lg bg-[#111111] text-white hover:bg-black text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Accept Cookies</span>
            </button>
            <button
              type="button"
              onClick={handleDecline}
              className="px-3.5 py-1.5 rounded-lg bg-transparent border border-[#E0DEDA] hover:bg-[#F5F4F0] text-xs font-mono text-[#5A5A5A] hover:text-[#111111] transition-colors cursor-pointer"
            >
              Essential Only
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
