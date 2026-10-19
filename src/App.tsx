import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { SubmitPage } from './pages/SubmitPage.tsx';
import { GalleryPage } from './pages/GalleryPage.tsx';
import { OnboardingPage } from './pages/OnboardingPage.tsx';
import { AccountPage } from './pages/AccountPage.tsx';
import { UsagePage } from './pages/UsagePage.tsx';
import { BillingPage } from './pages/BillingPage.tsx';
import { TermsPage } from './pages/TermsPage.tsx';
import { PrivacyPage } from './pages/PrivacyPage.tsx';
import { RefundPolicyPage } from './pages/RefundPolicyPage.tsx';
import { ContactPage } from './pages/ContactPage.tsx';
import { AdminConsolePage } from './pages/AdminConsolePage.tsx';
import { TeammatesSetupPage } from './pages/TeammatesSetupPage.tsx';
import { TeammatesOfficePage } from './pages/TeammatesOfficePage.tsx';
import { ThankYouPage } from './pages/ThankYouPage.tsx';
import { PublicSharePage } from './pages/PublicSharePage.tsx';
import { SeoHead } from './components/SeoHead.tsx';
import { CookieConsentBanner } from './components/CookieConsentBanner.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { GraveyardPage } from './pages/GraveyardPage.tsx';
import { ConnectPage } from './pages/ConnectPage.tsx';

function normalizePath(pathname: string): string {
  if (!pathname) return '/flaw';
  const pathOnly = pathname.split('?')[0].split('#')[0];
  if (!pathOnly || pathOnly === '/' || pathOnly === '') {
    return '/flaw';
  }
  if (pathOnly.length > 1 && pathOnly.endsWith('/')) {
    return pathOnly.slice(0, -1);
  }
  return pathOnly;
}

function NotFoundView({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 font-mono relative overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260815_040604_b04410ba-c173-4b68-826d-212a24bccdad.mp4" type="video/mp4" />
      </video>
      <div className="relative z-10 bg-white/60 backdrop-blur-md p-8 rounded-2xl border border-white/20">
        <h1 className="text-6xl font-black text-[#111111] mb-4">404</h1>
        <p className="text-lg text-[#5A5A5A] mb-6">The page you are looking for does not exist.</p>
        <button
          onClick={() => onNavigate('/flaw')}
          className="px-6 py-3 bg-[#E8481C] text-white font-medium rounded-xl hover:bg-[#d63f15] transition-colors cursor-pointer"
        >
          Return to Overview
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return normalizePath(window.location.pathname);
  });
  const [ideaToValidate, setIdeaToValidate] = useState<string>('');

  useEffect(() => {
    if (window.location.pathname === '/' || window.location.pathname === '') {
      window.history.replaceState({}, '', '/flaw');
    }

    const handlePopState = () => {
      const normalized = normalizePath(window.location.pathname);
      console.log('[ROUTER] PopState event, navigating to:', normalized);
      setCurrentPath(normalized);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string, initialIdea?: string) => {
    if (initialIdea !== undefined) {
      setIdeaToValidate(initialIdea);
    }
    const target = normalizePath(path);

    console.log(`[ROUTER] Navigating to: ${path}`);
    if (window.location.pathname + window.location.search !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className={`min-h-[100dvh] w-full ${
        currentPath === '/flaw/submit' || currentPath === '/flaw/validator' || currentPath === '/validator'
          ? 'bg-[#080B10]'
          : currentPath === '/flaw'
          ? 'bg-[#F4F8FC]'
          : 'bg-[#F5F4F0]'
      } text-[#111111] flex flex-col selection:bg-[#E8481C] selection:text-white`}
    >
      <SeoHead currentPath={currentPath} />
      <CookieConsentBanner currentPath={currentPath} />
      <Navbar currentPath={currentPath} onNavigate={navigate} />

      <main
        className={`flex-1 w-full min-h-0 flex flex-col ${
          currentPath === '/flaw' ? '' : 'pt-[var(--nav-offset)]'
        }`}
      >
        <ErrorBoundary>
          {(() => {
            if (currentPath.startsWith('/share/') || currentPath.startsWith('/flaw/share/')) {
              const shareId = currentPath.replace(/^\/(?:flaw\/)?share\//, '');
              return <PublicSharePage shareId={shareId} onNavigate={navigate} />;
            }

            switch (currentPath) {
              case '/flaw':
                return <LandingPage onNavigate={navigate} />;

              case '/flaw/gallery':
              case '/gallery':
                return <GalleryPage onNavigate={navigate} />;

              case '/flaw/login':
                return (
                  <AuthPage
                    mode="login"
                    onNavigate={navigate}
                    redirectPath="/flaw/submit"
                  />
                );

              case '/flaw/signup':
                return (
                  <AuthPage
                    mode="signup"
                    onNavigate={navigate}
                    redirectPath="/flaw/onboarding"
                  />
                );

              case '/flaw/onboarding':
                return <OnboardingPage onNavigate={navigate} />;

              case '/flaw/submit':
              case '/flaw/validator':
              case '/validator':
                return (
                  <SubmitPage
                    onNavigate={navigate}
                    initialIdea={ideaToValidate}
                  />
                );

              case '/flaw/teammates':
              case '/teammates':
                return <TeammatesOfficePage onNavigate={navigate} />;

              case '/flaw/teammates/setup':
                return <TeammatesSetupPage onNavigate={navigate} />;

              case '/flaw/account':
                return <AccountPage onNavigate={navigate} />;

              case '/flaw/connect':
              case '/connect':
                return <ConnectPage onNavigate={navigate} />;

              case '/flaw/usage':
                return <UsagePage onNavigate={navigate} />;

              case '/flaw/billing':
              case '/flaw/pricing':
              case '/billing':
              case '/pricing':
                return <BillingPage onNavigate={navigate} />;

              case '/flaw/terms':
              case '/terms':
                return <TermsPage onNavigate={navigate} />;

              case '/flaw/privacy':
              case '/privacy':
                return <PrivacyPage onNavigate={navigate} />;

              case '/flaw/refund-policy':
              case '/refund-policy':
              case '/flaw/refunds':
              case '/refunds':
                return <RefundPolicyPage onNavigate={navigate} />;

              case '/flaw/contact':
              case '/contact':
              case '/support':
              case '/flaw/support':
                return <ContactPage onNavigate={navigate} />;

              case '/flaw/thank-you':
              case '/thank-you':
                return <ThankYouPage onNavigate={navigate} />;

              case '/flaw/console':
                return user && user.role === 'admin' ? (
                  <AdminConsolePage onNavigate={navigate} />
                ) : (
                  <NotFoundView onNavigate={navigate} />
                );

              default:
                return <NotFoundView onNavigate={navigate} />;
            }
          })()}
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
