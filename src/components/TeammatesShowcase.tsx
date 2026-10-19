import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BotAvatar } from './BotAvatar.tsx';
import { TEAMMATE_PRESETS, TeammateConfig } from '../config/teammates.ts';

export interface TeammatesShowcaseProps {
  teammates?: TeammateConfig[];
  onNavigate?: (path: string) => void;
}

export const TeammatesShowcase: React.FC<TeammatesShowcaseProps> = ({
  teammates = TEAMMATE_PRESETS
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // Check prefers-reduced-motion setting
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  const total = teammates.length;
  const safeIndex = ((activeIndex % total) + total) % total;
  const currentTeammate = teammates[safeIndex];

  // Neighbors: previous and next teammates
  const prevIndex = (safeIndex - 1 + total) % total;
  const nextIndex = (safeIndex + 1) % total;
  const prevTeammate = teammates[prevIndex];
  const nextTeammate = teammates[nextIndex];

  const handleNext = useCallback(() => {
    setDirection(1);
    setActiveIndex(prev => (prev + 1) % total);
  }, [total]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setActiveIndex(prev => (prev - 1 + total) % total);
  }, [total]);

  const handleGoTo = useCallback((targetIndex: number) => {
    setDirection(targetIndex > safeIndex ? 1 : -1);
    setActiveIndex(targetIndex);
  }, [safeIndex]);

  // Auto-advance every 4.5 seconds, paused on hover/focus or if prefers-reduced-motion
  useEffect(() => {
    if (isPaused || prefersReducedMotion || total <= 1) return;

    const timer = setInterval(() => {
      setDirection(1);
      setActiveIndex(prev => (prev + 1) % total);
    }, 4500);

    return () => clearInterval(timer);
  }, [isPaused, prefersReducedMotion, total]);

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartXRef.current;

    if (deltaX > 40) {
      handlePrev();
    } else if (deltaX < -40) {
      handleNext();
    }
    touchStartXRef.current = null;
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    }
  };

  return (
    <div
      className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[440px] sm:min-h-[560px] select-none focus:outline-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="AI Teammates interactive showcase"
    >
      {/* ─────────────────────────────────────────────────────────────
          STAGE: Neighbors + Center Orb
          Desktop orb: 240px | Mobile orb: 170px
          Neighbors: 55% scale, 35% opacity, decorative, hidden below 600px
          ───────────────────────────────────────────────────────────── */}
      <div className="relative w-full flex items-center justify-center px-4 overflow-x-clip">
        {/* Previous Neighbor (Decorative, hidden < 600px) */}
        {total > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            tabIndex={-1}
            aria-hidden="true"
            className="cursor-pointer hidden min-[600px]:flex items-center justify-center opacity-35 hover:opacity-60 transition-opacity transform scale-[0.55] -mr-8 lg:-mr-4 shrink-0 focus:outline-none"
            title={`Previous: ${prevTeammate.name}`}
          >
            <div className="w-[240px] h-[240px] flex items-center justify-center">
              <BotAvatar
                employeeName={prevTeammate.name}
                provider={prevTeammate.provider}
                size={240}
                status="idle"
                interactive={false}
              />
            </div>
          </button>
        )}

        {/* Center Orb Showcase */}
        <div className="relative flex flex-col items-center justify-center z-10 shrink-0">
          <div
            className="relative w-[170px] h-[170px] sm:w-[240px] sm:h-[240px] flex items-center justify-center"
            role="img"
            aria-label={`${currentTeammate.name}, ${currentTeammate.role}`}
          >
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentTeammate.id}
                custom={direction}
                initial={{
                  x: prefersReducedMotion ? 0 : direction > 0 ? 60 : -60,
                  opacity: 0
                }}
                animate={{
                  x: 0,
                  opacity: 1,
                  transition: {
                    duration: prefersReducedMotion ? 0.3 : 0.5,
                    ease: [0.25, 1, 0.5, 1]
                  }
                }}
                exit={{
                  x: prefersReducedMotion ? 0 : direction > 0 ? -60 : 60,
                  opacity: 0,
                  transition: {
                    duration: prefersReducedMotion ? 0.3 : 0.5,
                    ease: [0.25, 1, 0.5, 1]
                  }
                }}
                className="w-full h-full flex items-center justify-center"
              >
                {/* Desktop 240px */}
                <div className="hidden sm:block">
                  <BotAvatar
                    employeeName={currentTeammate.name}
                    provider={currentTeammate.provider}
                    size={240}
                    status="idle"
                    interactive={true}
                  />
                </div>
                {/* Mobile 170px */}
                <div className="block sm:hidden">
                  <BotAvatar
                    employeeName={currentTeammate.name}
                    provider={currentTeammate.provider}
                    size={170}
                    status="idle"
                    interactive={true}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Soft blurred gray contact shadow */}
          <div
            className="w-28 sm:w-44 h-3 sm:h-4.5 bg-black/15 rounded-[100%] blur-md -mt-1 sm:-mt-2 pointer-events-none transform-gpu"
            aria-hidden="true"
          />
        </div>

        {/* Next Neighbor (Decorative, hidden < 600px) */}
        {total > 1 && (
          <button
            type="button"
            onClick={handleNext}
            tabIndex={-1}
            aria-hidden="true"
            className="cursor-pointer hidden min-[600px]:flex items-center justify-center opacity-35 hover:opacity-60 transition-opacity transform scale-[0.55] -ml-8 lg:-ml-4 shrink-0 focus:outline-none"
            title={`Next: ${nextTeammate.name}`}
          >
            <div className="w-[240px] h-[240px] flex items-center justify-center">
              <BotAvatar
                employeeName={nextTeammate.name}
                provider={nextTeammate.provider}
                size={240}
                status="idle"
                interactive={false}
              />
            </div>
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TEXT UNDERNEATH (Stacked and Centered)
          Role: small caps monospace, orange-red (#E8481C)
          Name: 36px bold on desktop, 26px on phones, #111111
          Description: max 12 words, gray #5A5A5A, max-width 420px
          Nothing else in the slide.
          ───────────────────────────────────────────────────────────── */}
      <div className="mt-7 sm:mt-9 text-center flex flex-col items-center justify-center px-4 w-full max-w-[460px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentTeammate.id}
            custom={direction}
            initial={{
              opacity: 0,
              y: prefersReducedMotion ? 0 : 8
            }}
            animate={{
              opacity: 1,
              y: 0,
              transition: {
                duration: prefersReducedMotion ? 0.3 : 0.45,
                ease: [0.25, 1, 0.5, 1]
              }
            }}
            exit={{
              opacity: 0,
              y: prefersReducedMotion ? 0 : -8,
              transition: {
                duration: prefersReducedMotion ? 0.3 : 0.45,
                ease: [0.25, 1, 0.5, 1]
              }
            }}
            className="space-y-1.5 w-full flex flex-col items-center"
          >
            {/* Role (Small caps monospace, orange-red) */}
            <span className="font-mono text-xs uppercase tracking-widest text-[#E8481C] font-semibold">
              {currentTeammate.role}
            </span>

            {/* Name (36px bold on desktop, 26px on phones) */}
            <h3 className="text-[26px] sm:text-[36px] font-bold text-[#111111] leading-tight tracking-tight">
              {currentTeammate.name}
            </h3>

            {/* 1-Line Description (Max 12 words, gray #5A5A5A, max-width 420px) */}
            <p className="text-sm sm:text-base text-[#5A5A5A] max-w-[420px] mx-auto text-center leading-relaxed">
              {currentTeammate.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PAGINATION DOTS (Clickable, Accessible, Focus Rings)
          ───────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-center gap-2 mt-8"
        role="tablist"
        aria-label="Teammate slide pagination"
      >
        {teammates.map((teammate, idx) => {
          const isActive = idx === safeIndex;
          return (
            <button
              key={teammate.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Show ${teammate.name}, ${teammate.role}`}
              onClick={() => handleGoTo(idx)}
              className={`cursor-pointer transition-all duration-300 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8481C] focus-visible:ring-offset-2 ${
                isActive
                  ? 'w-6 h-2 bg-[#E8481C]'
                  : 'w-2 h-2 bg-[#D0CECB] hover:bg-[#A09E99]'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};
