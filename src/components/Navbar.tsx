import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { getStoredToken } from '../services/api.ts';
import {
  LogOut,
  User as UserIcon,
  ChevronDown,
  Activity,
  CreditCard,
  Settings,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { FlawWordmark } from './FlawWordmark.tsx';
import { BrandLogo } from './BrandLogo.tsx';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', path: '/flaw' },
  { id: 'gallery', label: 'Public Gallery', path: '/flaw/gallery' },
  { id: 'validator', label: 'Validator', path: '/flaw/submit' },
  { id: 'teammates', label: 'AI Teammates', path: '/flaw/teammates' },
  { id: 'vibecoding', label: 'Vibe Coding', path: '/flaw/vibecoding' },
  { id: 'pricing', label: 'Pricing', path: '/flaw/billing' },
];

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate }) => {
  const { user, loading, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  // Track 24px scroll to toggle compact state with 200ms transition
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setDropdownOpen(false);
      }
      if (
        mobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target) &&
        mobileToggleRef.current &&
        !mobileToggleRef.current.contains(target)
      ) {
        setMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  // Close menus on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [currentPath]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    await logout();
    onNavigate('/flaw');
  };

  const handleNavClick = useCallback(
    (path: string) => {
      setMobileMenuOpen(false);
      setDropdownOpen(false);
      onNavigate(path);
    },
    [onNavigate]
  );

  const isItemActive = (id: string) => {
    if (id === 'overview') return currentPath === '/flaw';
    if (id === 'gallery') return currentPath === '/flaw/gallery' || currentPath === '/gallery';
    if (id === 'validator') {
      return (
        currentPath === '/flaw/submit' ||
        currentPath === '/flaw/validator' ||
        currentPath === '/validator'
      );
    }
    if (id === 'teammates') return currentPath.startsWith('/flaw/teammates');
    if (id === 'pricing') {
      return (
        currentPath === '/flaw/billing' ||
        currentPath === '/flaw/pricing' ||
        currentPath === '/billing' ||
        currentPath === '/pricing'
      );
    }
    return false;
  };

  const isValidatingSession = loading && !user && Boolean(getStoredToken());

  return (
    <>
      {/* ====================================================================
          FLOATING LIQUID-GLASS NAVBAR PILL
          - Position: fixed; top: 16px (12px on phones); centered;
          - Width: calc(100% - 32px) (calc(100% - 24px) on phones); max-width: 1100px;
          - Height: 60px (56px on phones), switches to 52px after scrolling 24px
          - Border-radius: 999px;
          - On load: slide down 16px and fade in once (500ms)
          ==================================================================== */}
      <motion.header
        initial={shouldReduceMotion ? false : { y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
        className="fixed top-3 sm:top-4 left-0 right-0 z-50 flex justify-center pointer-events-none px-3 sm:px-4"
      >
        <div
          className={`nav-pill pointer-events-auto w-full max-w-[1100px] rounded-full flex items-center justify-between px-3.5 sm:px-5 relative select-none ${
            isScrolled ? 'h-[50px] sm:h-[52px] is-scrolled' : 'h-[56px] sm:h-[60px]'
          }`}
        >
          {/* Thin light sheen along top edge (1px white gradient fading at both ends) */}
          <div
            className="pointer-events-none absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/90 to-transparent"
            aria-hidden="true"
          />

          {/* LEFT: Logo mark plus wordmark from BRAND_NAME (no sub-label) */}
          <button
            id="nav-brand-logo"
            type="button"
            onClick={() => handleNavClick('/flaw')}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none rounded-full py-1 px-1.5 -ml-1 text-left min-h-[44px]"
            aria-label="Flawlesz AI Home"
          >
            <BrandLogo size="sm" rounded="sm" />
            <FlawWordmark size="md" className="text-[#111111]" />
          </button>

          {/* RIGHT: Desktop nav links from config array + Action Area */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            {user && (
              <nav aria-label="Main" className="flex items-center gap-0.5">
                {NAV_ITEMS.map((item) => {
                  const isActive = isItemActive(item.id);

                  return (
                    <button
                      key={item.id}
                      id={`nav-link-${item.id}`}
                      type="button"
                      onClick={() => handleNavClick(item.path)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`relative px-[14px] py-[8px] rounded-full text-[14px] leading-tight transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none min-h-[44px] flex items-center justify-center ${
                        isActive
                          ? 'font-semibold text-[#111111]'
                          : 'font-medium text-[#111111] hover:bg-[#111111]/[0.05]'
                      }`}
                    >
                      {/* Active sliding soft pill highlight (rgba(17,17,17,0.08)) over 250ms ease */}
                      {isActive && (
                        <motion.span
                          layoutId="navbar-liquid-active-pill"
                          transition={
                            shouldReduceMotion
                              ? { duration: 0 }
                              : {
                                  duration: 0.25,
                                  ease: [0.25, 0.1, 0.25, 1.0],
                                }
                          }
                          className="absolute inset-0 bg-[#111111]/[0.08] rounded-full pointer-events-none -z-0"
                        />
                      )}
                      <span className="relative z-10">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            )}

            {/* ACTION AREA */}
            <div className="flex items-center pl-1">
              {user ? (
                /* Signed in: Account chip and glass dropdown */
                <div className="relative" ref={dropdownRef}>
                  <button
                    id="nav-user-menu-btn"
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    aria-expanded={dropdownOpen}
                    aria-label="User Account Menu"
                    className="flex items-center gap-2 text-xs font-mono px-3.5 py-1.5 rounded-full transition-all cursor-pointer min-h-[44px] text-[#111111] bg-white/70 hover:bg-white/90 border border-black/[0.08] shadow-2xs focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#E8481C]" strokeWidth={1.75} />
                    <span className="truncate max-w-[110px] lg:max-w-[140px] font-medium text-[#111111]">
                      {user.name || user.email}
                    </span>
                    <ChevronDown
                      className={`w-3 h-3 text-[#5A5A5A] transition-transform duration-200 ${
                        dropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Account Glass Dropdown */}
                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        id="nav-user-dropdown-panel"
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        className="absolute right-0 mt-2 w-60 rounded-2xl shadow-xl p-1.5 z-50 text-xs font-mono nav-pill-glass text-[#111111]"
                      >
                        <div className="px-3 py-2 border-b border-black/[0.06] mb-1">
                          <p className="text-[10px] uppercase tracking-wider text-[#7A7A7A]">
                            Signed in as
                          </p>
                          <p className="font-bold truncate text-[#111111]">{user.email}</p>
                        </div>

                        <button
                          id="dropdown-link-account"
                          type="button"
                          onClick={() => handleNavClick('/flaw/account')}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer min-h-[40px] focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none ${
                            currentPath === '/flaw/account'
                              ? 'bg-black/[0.06] text-[#111111] font-bold'
                              : 'text-[#5A5A5A] hover:text-[#111111] hover:bg-black/[0.04]'
                          }`}
                        >
                          <Settings className="w-3.5 h-3.5 text-[#7A7A7A]" />
                          <span>Account Settings</span>
                        </button>

                        <button
                          id="dropdown-link-usage"
                          type="button"
                          onClick={() => handleNavClick('/flaw/usage')}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer min-h-[40px] focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none ${
                            currentPath === '/flaw/usage'
                              ? 'bg-black/[0.06] text-[#111111] font-bold'
                              : 'text-[#5A5A5A] hover:text-[#111111] hover:bg-black/[0.04]'
                          }`}
                        >
                          <Activity className="w-3.5 h-3.5 text-[#7A7A7A]" />
                          <span>Usage Metrics</span>
                        </button>

                        <button
                          id="dropdown-link-billing"
                          type="button"
                          onClick={() => handleNavClick('/flaw/billing')}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer min-h-[40px] focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none ${
                            currentPath === '/flaw/billing'
                              ? 'bg-black/[0.06] text-[#111111] font-bold'
                              : 'text-[#5A5A5A] hover:text-[#111111] hover:bg-black/[0.04]'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5 text-[#7A7A7A]" />
                          <span>Billing & Plans</span>
                        </button>

                        {user?.role === 'admin' && (
                          <button
                            id="dropdown-link-admin"
                            type="button"
                            onClick={() => handleNavClick('/flaw/console')}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer min-h-[40px] focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none ${
                              currentPath === '/flaw/console'
                                ? 'bg-[#E8481C] text-white font-bold'
                                : 'text-[#E8481C] font-semibold hover:bg-orange-50'
                            }`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-[#E8481C]" />
                            <span>Admin Console</span>
                          </button>
                        )}

                        <div className="border-t border-black/[0.06] my-1" />

                        <button
                          id="dropdown-btn-logout"
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer min-h-[40px] focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign out</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : isValidatingSession ? (
                <div className="h-9 w-20 rounded-full bg-black/[0.06] animate-pulse" />
              ) : (
                /* Signed out: "Log in" as a text link, and "Sign up" as solid orange-red #E8481C pill */
                <div className="flex items-center gap-1.5">
                  <button
                    id="nav-btn-login"
                    type="button"
                    onClick={() => handleNavClick('/flaw/login')}
                    className="text-[14px] font-medium text-[#111111] hover:bg-[#111111]/[0.05] px-[14px] py-[8px] rounded-full transition-colors cursor-pointer min-h-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
                  >
                    Log in
                  </button>
                  <button
                    id="nav-btn-signup"
                    type="button"
                    onClick={() => handleNavClick('/flaw/signup')}
                    className="text-[14px] font-semibold bg-[#E8481C] hover:bg-[#d43d14] text-white px-4 py-2 rounded-full transition-colors cursor-pointer min-h-[44px] flex items-center justify-center shadow-xs focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
                  >
                    Sign up
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* PHONES (below 768px): 40px glass circle hamburger */}
          <div className="md:hidden flex items-center">
            <button
              id="nav-mobile-toggle-btn"
              ref={mobileToggleRef}
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              aria-expanded={mobileMenuOpen}
              className="flex items-center justify-center w-10 h-10 rounded-full border border-black/[0.08] bg-white/60 hover:bg-white/85 text-[#111111] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* ====================================================================
          PHONES MOBILE GLASS PANEL (UNDER THE PILL)
          - 8px gap under pill, radius 24px, same glass styling
          - 48px tall stacked links with same active highlight
          - Log in and Sign up (or account chip) at the bottom
          - Closes on route change, outside tap, and Escape
          ==================================================================== */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            id="nav-mobile-drawer"
            ref={mobileMenuRef}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="md:hidden fixed left-3 right-3 max-w-[1100px] mx-auto z-50 p-3 rounded-[24px] nav-pill-glass space-y-1 text-[#111111]"
            style={{
              top: isScrolled ? '66px' : '72px',
            }}
          >
            {user && (
              <nav aria-label="Mobile Navigation" className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = isItemActive(item.id);

                  return (
                    <button
                      key={item.id}
                      id={`mobile-nav-link-${item.id}`}
                      type="button"
                      onClick={() => handleNavClick(item.path)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full h-12 flex items-center justify-between px-4 rounded-xl text-[15px] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none ${
                        isActive
                          ? 'bg-[#111111]/[0.08] font-semibold text-[#111111]'
                          : 'font-medium text-[#111111] hover:bg-[#111111]/[0.05]'
                      }`}
                    >
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-[#E8481C]" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </nav>
            )}

            {/* Mobile Action Area */}
            {user ? (
              <div className="pt-2 mt-1 border-t border-black/[0.06] space-y-1">
                <div className="px-4 py-1.5 text-xs font-mono text-[#7A7A7A] truncate">
                  Signed in as <span className="font-semibold text-[#111111]">{user.email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleNavClick('/flaw/account')}
                  className="w-full h-11 flex items-center gap-2.5 px-4 rounded-xl text-xs font-mono text-[#111111] hover:bg-[#111111]/[0.05] transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-[#7A7A7A]" />
                  <span>Account Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('/flaw/usage')}
                  className="w-full h-11 flex items-center gap-2.5 px-4 rounded-xl text-xs font-mono text-[#111111] hover:bg-[#111111]/[0.05] transition-colors cursor-pointer"
                >
                  <Activity className="w-4 h-4 text-[#7A7A7A]" />
                  <span>Usage Metrics</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('/flaw/billing')}
                  className="w-full h-11 flex items-center gap-2.5 px-4 rounded-xl text-xs font-mono text-[#111111] hover:bg-[#111111]/[0.05] transition-colors cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-[#7A7A7A]" />
                  <span>Billing & Plans</span>
                </button>
                {user?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => handleNavClick('/flaw/console')}
                    className="w-full h-11 flex items-center gap-2.5 px-4 rounded-xl text-xs font-mono text-[#E8481C] hover:bg-orange-50 font-semibold transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#E8481C]" />
                    <span>Admin Console</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full h-11 flex items-center gap-2.5 px-4 rounded-xl text-xs font-mono text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            ) : !isValidatingSession ? (
              <div className="pt-2 mt-1 border-t border-black/[0.06] flex flex-col gap-2">
                <button
                  id="mobile-nav-login"
                  type="button"
                  onClick={() => handleNavClick('/flaw/login')}
                  className="w-full h-12 flex items-center justify-center rounded-xl text-[15px] font-medium text-[#111111] hover:bg-[#111111]/[0.05] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
                >
                  Log in
                </button>
                <button
                  id="mobile-nav-signup"
                  type="button"
                  onClick={() => handleNavClick('/flaw/signup')}
                  className="w-full h-12 flex items-center justify-center rounded-xl text-[15px] font-semibold bg-[#E8481C] hover:bg-[#d43d14] text-white transition-colors cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
                >
                  Sign up
                </button>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
