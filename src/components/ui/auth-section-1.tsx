"use client";

import { GrainGradient } from "@paper-design/shaders-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { X, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

export interface GoogleAuthPayload {
  email?: string;
  name?: string;
  credential?: string;
  googleId?: string;
}

export interface AuthSectionProps {
  mode?: "login" | "signup";
  onLogin?: (data: { email: string; password: string }) => Promise<void> | void;
  onSignUp?: (data: { email: string; password: string; firstName?: string; lastName?: string }) => Promise<void> | void;
  onGoogleAuth?: (payload: GoogleAuthPayload) => Promise<void> | void;
  onGoogleSignUp?: (payload: GoogleAuthPayload) => Promise<void> | void;
  onNavigateToLogin?: () => void;
  onNavigateToSignUp?: () => void;
  onNavigate?: (path: string) => void;
  errorMessage?: string | null;
  isLoading?: boolean;
}

export default function AuthSectionOne({
  mode = "signup",
  onLogin,
  onSignUp,
  onGoogleAuth,
  onGoogleSignUp,
  onNavigateToLogin,
  onNavigateToSignUp,
  onNavigate,
  errorMessage,
  isLoading = false,
}: AuthSectionProps) {
  const isLogin = mode === "login";

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [noUpdates, setNoUpdates] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Google OAuth Dialog
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("");
  const [googleNameInput, setGoogleNameInput] = useState("");
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);

  const handleNavigate = (path: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Honeypot bot protection check
    if (honeypot && honeypot.trim().length > 0) {
      setLocalError("Spam detected.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setLocalError("Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 6) {
      setLocalError("Password must be at least 6 characters long.");
      return;
    }

    if (!isLogin && !agreedToTerms) {
      setLocalError("You must agree to the Terms and Conditions and Privacy Policy to create an account.");
      return;
    }

    try {
      if (isLogin) {
        if (onLogin) {
          await onLogin({ email, password });
        }
      } else {
        if (onSignUp) {
          await onSignUp({ email, password, firstName, lastName });
        }
      }
    } catch (err: any) {
      setLocalError(err.message || (isLogin ? "Sign in failed. Please check your credentials." : "Sign up failed."));
    }
  };

  const handleGoogleClick = () => {
    setLocalError(null);
    setIsGoogleModalOpen(true);
  };

  const handleConfirmGoogleOAuth = async (selectedEmail?: string, selectedName?: string) => {
    const targetEmail = selectedEmail || googleEmailInput.trim();
    const targetName = selectedName || googleNameInput.trim();

    if (!targetEmail || !targetEmail.includes("@")) {
      setLocalError("Please enter a valid Google email address.");
      return;
    }

    setGoogleAuthLoading(true);
    try {
      const handler = onGoogleAuth || onGoogleSignUp;
      if (handler) {
        await handler({
          email: targetEmail,
          name: targetName,
          googleId: `google-uid-${Date.now()}`
        });
      }
      setIsGoogleModalOpen(false);
    } catch (err: any) {
      setLocalError(err.message || "Google authentication failed.");
    } finally {
      setGoogleAuthLoading(false);
    }
  };

  const displayError = localError || errorMessage;

  return (
    /* Outer Page Container: Dark Mode on Mobile (<768px), Light/Off-White on Desktop (>=768px) */
    <section className="min-h-screen w-full bg-[#0A0A0A] md:bg-[#F5F4F0] p-3 sm:p-4 md:p-6 text-white md:text-black antialiased [font-synthesis:none] flex items-center justify-center transition-colors">
      {/* Reflow Container: 1 stacked column on mobile (<768px), 2 equal columns on desktop (>=768px) */}
      <div className="w-full max-w-7xl mx-auto flex flex-col md:grid md:grid-cols-2 gap-5 sm:gap-6 min-h-[calc(100vh-2rem)] items-stretch">
        
        {/* Top/Left: Form Card */}
        <div className="flex flex-col justify-center rounded-2xl border border-white/10 bg-[#18181B] px-5 py-8 sm:px-8 md:bg-white md:border-black/10 md:px-10 lg:px-12 xl:px-16 shadow-xs w-full transition-colors">
          <div className="w-full max-w-[540px] mx-auto">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-bold tracking-tight text-[#EDEDED] md:text-[#111111] leading-tight">
                {isLogin ? "Sign in to your account" : "Create an account"}
              </h1>
              <p className="mt-2 text-xs sm:text-sm md:text-base text-[#8A8A8A] md:text-[#5A5A5A] font-medium">
                {isLogin
                  ? "Access your startup ideas and automated stress-testing pipeline."
                  : "Stress-test startup ideas against live market competitors. Know Before You Build."}
              </p>
            </div>

            {/* Social Buttons: Standard White Pill Buttons on both Mobile and Desktop */}
            <div className="mt-6 sm:mt-8 grid gap-3 sm:grid-cols-2">
              <SocialButton
                id={isLogin ? "login-google-btn" : "signup-google-btn"}
                icon={<GoogleIcon />}
                label={isLogin ? "Sign in with Google" : "Sign up with Google"}
                onClick={handleGoogleClick}
                disabled={isLoading || googleAuthLoading}
              />
              <SocialButton
                id={isLogin ? "login-apple-btn" : "signup-apple-btn"}
                icon={<AppleIcon />}
                label={isLogin ? "Sign in with Apple" : "Sign up with Apple"}
                onClick={() => {
                  setLocalError("Apple sign-in is currently unavailable. Please continue with Google or email.");
                }}
                disabled={isLoading}
              />
            </div>

            <div className="relative my-6 sm:my-7 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10 md:border-[#E0DEDA]" />
              </div>
              <span className="relative bg-[#18181B] md:bg-white px-3 text-[11px] sm:text-xs font-mono uppercase text-[#8A8A8A] md:text-[#7A7A7A] transition-colors">
                or continue with email
              </span>
            </div>

            {displayError && (
              <div
                id="auth-error-box"
                className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs sm:text-sm text-red-400 md:text-red-600 leading-normal font-medium"
              >
                {displayError}
              </div>
            )}

            <form className="space-y-3.5 sm:space-y-4" onSubmit={handleSubmit}>
              {/* Invisible Honeypot field for bot spam detection */}
              <div style={{ display: 'none' }} aria-hidden="true">
                <input
                  type="text"
                  name="company_website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {!isLogin && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldBox
                    label="First Name"
                    value={firstName}
                    onChangeValue={setFirstName}
                  />
                  <FieldBox
                    label="Last Name"
                    value={lastName}
                    onChangeValue={setLastName}
                  />
                </div>
              )}

              <FieldBox
                label="Email Address"
                value={email}
                type="email"
                placeholder={isLogin ? "founder@venture.com" : "you@company.com"}
                onChangeValue={setEmail}
              />

              <FieldBox
                label="Password"
                value={password}
                type="password"
                placeholder="••••••••"
                onChangeValue={setPassword}
              />

              {!isLogin && (
                <div className="space-y-2 pt-1 text-xs leading-5 text-[#8A8A8A] md:text-[#5A5A5A]">
                  <CheckboxLine
                    id="signup-no-marketing-checkbox"
                    checked={noUpdates}
                    onChange={(checked) => setNoUpdates(checked)}
                  >
                    <span className="text-[#8A8A8A] md:text-[#6A6A6A]">
                      I don't want to receive occasional product and research updates
                    </span>
                  </CheckboxLine>

                  <CheckboxLine
                    id="signup-terms-agreement-checkbox"
                    checked={agreedToTerms}
                    onChange={(checked) => {
                      setAgreedToTerms(checked);
                      if (checked) setLocalError(null);
                    }}
                  >
                    <span className="text-[#EDEDED] md:text-[#111111] font-medium">
                      I agree to the{" "}
                      <button
                        type="button"
                        onClick={(e) => handleNavigate('/flaw/terms', e)}
                        className="font-semibold text-white md:text-[#111111] underline underline-offset-2 hover:text-[#E8481C] cursor-pointer"
                      >
                        Terms and Conditions
                      </button>{" "}
                      and{" "}
                      <button
                        type="button"
                        onClick={(e) => handleNavigate('/flaw/privacy', e)}
                        className="font-semibold text-white md:text-[#111111] underline underline-offset-2 hover:text-[#E8481C] cursor-pointer"
                      >
                        Privacy Policy
                      </button>
                      <span className="text-[#E8481C] ml-0.5">*</span>
                    </span>
                  </CheckboxLine>
                </div>
              )}

              {/* Primary Submit Button */}
              <button
                id="auth-submit-btn"
                type="submit"
                disabled={isLoading || googleAuthLoading}
                className="mt-5 sm:mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#E8481C] hover:bg-[#d63f15] text-base font-semibold text-white transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-[#E8481C]/25 active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isLogin ? "Signing in..." : "Creating account..."}</span>
                  </>
                ) : (
                  <span>{isLogin ? "Sign In" : "Create account"}</span>
                )}
              </button>

              <div className="mt-4 sm:mt-5 text-center text-xs sm:text-sm text-[#8A8A8A] md:text-[#5A5A5A]">
                {isLogin ? (
                  <p>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      id="switch-to-signup-btn"
                      onClick={() => {
                        if (onNavigateToSignUp) onNavigateToSignUp();
                        else if (onNavigate) onNavigate('/flaw/signup');
                      }}
                      className="font-semibold text-white md:text-[#111111] underline underline-offset-4 hover:text-[#E8481C] cursor-pointer"
                    >
                      Sign up here
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{" "}
                    <button
                      type="button"
                      id="switch-to-login-btn"
                      onClick={() => {
                        if (onNavigateToLogin) onNavigateToLogin();
                        else if (onNavigate) onNavigate('/flaw/login');
                      }}
                      className="font-semibold text-white md:text-[#111111] underline underline-offset-4 hover:text-[#E8481C] cursor-pointer"
                    >
                      Sign in here
                    </button>
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Bottom/Right: Visual Panel (Stacked below on mobile <768px, Side-by-side on desktop >=768px) */}
        <div className="relative flex overflow-hidden rounded-2xl bg-black border border-white/10 md:border-none p-6 sm:p-8 md:p-10 lg:p-12 xl:p-14 text-white w-full h-[270px] sm:h-[310px] md:h-full md:min-h-[580px] flex-col justify-between shadow-xs">
          {/* Ambient Fallback Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1c0f06] via-[#0b0806] to-black z-0" />
          
          {/* Grain Shader Canvas */}
          <GrainGradient
            speed={1}
            scale={1}
            rotation={0}
            offsetX={0}
            offsetY={0}
            softness={0.5}
            intensity={0.5}
            noise={0.25}
            shape="corners"
            frame={2854.5}
            colors={["#FFFFFF", "#FC7819", "#FC7819", "#FFFFFF"]}
            colorBack="#00000000"
            className="absolute inset-0 w-full h-full z-1"
          />

          <div className="relative z-10 flex h-full w-full flex-col justify-between">
            <div className="pt-1 md:pt-8">
              <span className="inline-flex items-center gap-2 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] sm:text-xs font-mono text-white/90 border border-white/15 mb-2 sm:mb-4 md:mb-6">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#FC7819] animate-pulse" />
                AI Stress-Testing Pipeline
              </span>
              <h2 className="max-w-[580px] text-2xl sm:text-3xl md:text-4xl lg:text-[50px] xl:text-[58px] font-bold tracking-tight text-white leading-[1.1]">
                Know fast,
                <br />
                Build faster
              </h2>
              <p className="hidden sm:block mt-2 md:mt-4 max-w-[460px] text-xs sm:text-sm md:text-base text-white/70 leading-relaxed">
                Identify lethal edge-case flaws, hidden competitors, and unit-economic traps before writing code.
              </p>
            </div>

            <div className="pt-3 sm:pt-4 md:pt-8">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (onNavigate) onNavigate('/flaw');
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 text-xs sm:text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 hover:border-white/40"
              >
                <span>Discover the validation engine</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Google OAuth Modal */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-[#18181B] md:bg-white p-6 shadow-2xl border border-white/10 md:border-[#E0DEDA] text-[#EDEDED] md:text-[#111111] relative">
            <button
              onClick={() => setIsGoogleModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-[#8A8A8A] md:text-[#7A7A7A] hover:text-white md:hover:text-[#111111] hover:bg-white/10 md:hover:bg-black/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#D0CECA] flex items-center justify-center shadow-xs">
                <GoogleIcon />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#EDEDED] md:text-[#111111]">
                  {isLogin ? "Sign in with Google" : "Sign up with Google"}
                </h3>
                <p className="text-xs text-[#8A8A8A] md:text-[#5A5A5A]">Choose a Google account to continue to Flawlesz AI</p>
              </div>
            </div>

            <div className="space-y-3 my-5">
              {/* Preset 1 */}
              <button
                type="button"
                onClick={() => handleConfirmGoogleOAuth("harshitlog@gmail.com", "Harshit Sharma")}
                disabled={googleAuthLoading}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-white/10 md:border-[#E0DEDA] hover:border-white/30 md:hover:border-[#111111] bg-[#1F1F23] md:bg-white md:hover:bg-[#F5F4F0] transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 md:bg-orange-100 md:text-orange-700 flex items-center justify-center font-bold text-xs">
                    HS
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#EDEDED] md:text-[#111111] group-hover:text-white md:group-hover:text-black">Harshit Sharma</p>
                    <p className="text-[11px] text-[#8A8A8A] md:text-[#5A5A5A] font-mono">harshitlog@gmail.com</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#8A8A8A] md:text-[#7A7A7A] group-hover:text-white md:group-hover:text-[#111111] transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* Preset 2 */}
              <button
                type="button"
                onClick={() => handleConfirmGoogleOAuth("founder@venture.dev", "Venture Founder")}
                disabled={googleAuthLoading}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-white/10 md:border-[#E0DEDA] hover:border-white/30 md:hover:border-[#111111] bg-[#1F1F23] md:bg-white md:hover:bg-[#F5F4F0] transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 md:bg-blue-100 md:text-blue-700 flex items-center justify-center font-bold text-xs">
                    VF
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#EDEDED] md:text-[#111111] group-hover:text-white md:group-hover:text-black">Venture Founder</p>
                    <p className="text-[11px] text-[#8A8A8A] md:text-[#5A5A5A] font-mono">founder@venture.dev</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#8A8A8A] md:text-[#7A7A7A] group-hover:text-white md:group-hover:text-[#111111] transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            {/* Custom Google Email Input */}
            <div className="pt-3 border-t border-white/10 md:border-[#E0DEDA] space-y-3">
              <label className="block text-xs font-semibold text-[#CCCCCC] md:text-[#333333]">
                Or enter custom Google Workspace account:
              </label>
              <div className="grid gap-2">
                <input
                  type="email"
                  value={googleEmailInput}
                  onChange={(e) => setGoogleEmailInput(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-white/10 bg-[#1F1F23] text-white focus:outline-none focus:ring-1 focus:ring-[#E8481C] md:border-[#E0DEDA] md:bg-[#FAF9F6] md:text-[#111111] md:focus:bg-white md:focus:ring-[#111111]"
                />
                <input
                  type="text"
                  value={googleNameInput}
                  onChange={(e) => setGoogleNameInput(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-white/10 bg-[#1F1F23] text-white focus:outline-none focus:ring-1 focus:ring-[#E8481C] md:border-[#E0DEDA] md:bg-[#FAF9F6] md:text-[#111111] md:focus:bg-white md:focus:ring-[#111111]"
                />
              </div>

              <button
                type="button"
                onClick={() => handleConfirmGoogleOAuth()}
                disabled={googleAuthLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#E8481C] md:bg-[#111111] text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {googleAuthLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Authenticating with Google...</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon />
                    <span>Authorize with Google</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#8A8A8A] md:text-[#7A7A7A]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 md:text-emerald-600" />
              <span>Secure Google OAuth 2.0 protocol</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SocialButton({
  id,
  icon,
  label,
  onClick,
  disabled = false,
}: {
  id?: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 items-center justify-center gap-2.5 rounded-xl border border-[#D0CECA] bg-white px-3.5 text-xs sm:text-sm font-semibold text-[#111111] transition-all hover:bg-[#FAF9F6] hover:border-[#111111] active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-2xs"
    >
      <span className="shrink-0">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function FieldBox({
  label,
  value,
  type = "text",
  placeholder,
  onChangeValue,
}: {
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  onChangeValue?: (val: string) => void;
}) {
  return (
    <label className="flex h-12 items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#1F1F23] px-3.5 text-sm leading-none focus-within:border-white/30 md:border-[#D0CECA] md:bg-[#FAF9F6] md:focus-within:border-[#111111] md:focus-within:bg-white transition-colors">
      <input
        type={type}
        value={value}
        aria-label={label}
        placeholder={placeholder}
        onChange={(event) => {
          onChangeValue?.(event.target.value);
        }}
        className="min-w-0 flex-1 truncate bg-transparent text-[#EDEDED] md:text-[#111111] outline-none placeholder:text-[#666666] md:placeholder:text-[#999999] font-medium text-sm"
      />
      <span className="shrink-0 text-[#8A8A8A] md:text-[#7A7A7A] text-xs select-none">{label}</span>
    </label>
  );
}

function CheckboxLine({
  id,
  children,
  checked = false,
  onChange,
}: {
  id?: string;
  children: ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer select-none">
      <span className="relative mt-0.5 size-4 shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          className="peer size-full appearance-none rounded-[4px] border border-white/20 bg-[#1F1F23] checked:border-white checked:bg-white md:border-[#B0AEA8] md:bg-white md:checked:border-[#111111] md:checked:bg-[#111111] transition-colors cursor-pointer"
        />
        <svg
          viewBox="0 0 12 12"
          className="pointer-events-none absolute inset-0 hidden size-full p-0.5 text-black md:text-white peer-checked:block"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2.5 6.2 4.8 8.4 9.5 3.6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="leading-tight">{children}</span>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
        fill="#EB4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="text-black"
    >
      <path d="M17.05 12.54c-.03-3.02 2.47-4.47 2.58-4.54-1.41-2.06-3.6-2.34-4.38-2.37-1.86-.19-3.64 1.1-4.58 1.1-.95 0-2.42-1.07-3.98-1.04-2.05.03-3.94 1.19-4.99 3.02-2.13 3.69-.54 9.16 1.53 12.15 1.01 1.46 2.22 3.1 3.81 3.04 1.53-.06 2.11-.99 3.96-.99s2.37.99 3.99.96c1.65-.03 2.69-1.49 3.69-2.96 1.16-1.69 1.64-3.33 1.66-3.41-.04-.02-3.2-1.23-3.24-4.87ZM14.03 3.66c.84-1.02 1.41-2.43 1.25-3.84-1.21.05-2.68.81-3.55 1.83-.78.9-1.46 2.34-1.28 3.72 1.35.1 2.73-.69 3.58-1.71Z" />
    </svg>
  );
}
