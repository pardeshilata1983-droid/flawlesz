import React, { useState, useEffect, useRef } from 'react';
import { GraveyardStartup } from '../types.ts';
import { Skull, X, ExternalLink, AlertCircle, RefreshCw, Sprout } from 'lucide-react';

interface GraveyardSectionProps {
  graveyard?: GraveyardStartup[];
  onNavigate: (path: string) => void;
  isLoading?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
}

function getDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'public report';
  }
}

function getSpriteVariant(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 3; // 0: rounded top, 1: flat slab, 2: cross
}

export const GraveyardSection: React.FC<GraveyardSectionProps> = ({
  graveyard = [],
  onNavigate,
  isLoading = false,
  hasError = false,
  onRetry,
}) => {
  const [selectedStartup, setSelectedStartup] = useState<GraveyardStartup | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current;

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedStartup) {
        setSelectedStartup(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStartup]);

  const formatYears = (founded: number | null, closed: number | null) => {
    if (founded && closed) return `${founded}–${closed}`;
    if (closed) return `Closed ${closed}`;
    if (founded) return `Est. ${founded}`;
    return 'Dates unknown';
  };

  return (
    <div
      ref={sectionRef}
      className="bg-[#E9ECEA] border border-[#E0DEDA] rounded-[12px] p-5 sm:p-6 shadow-xs my-6 font-mono text-[#111111]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-lg font-bold uppercase tracking-tight text-[#111111]"
              style={{ fontFamily: '"Pixelify Sans", "Press Start 2P", monospace' }}
            >
              The Graveyard
            </span>
          </div>
          <p className="text-xs text-[#5A5A5A] font-sans">
            Startups that tried something like this and shut down
          </p>
        </div>
        <span className="text-xs font-mono bg-white border border-[#E0DEDA] px-2.5 py-1 rounded-md text-[#111111] shadow-2xs">
          {hasError ? 'Error' : `${graveyard.length} found`}
        </span>
      </div>

      {/* Error State */}
      {hasError ? (
        <div className="bg-white border border-[#E0DEDA] rounded-xl p-6 text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-[#111111]">Couldn't search for shutdowns right now</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#111111] text-white rounded-lg text-xs font-bold hover:bg-[#E8481C] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Search</span>
            </button>
          )}
        </div>
      ) : graveyard.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-[#E0DEDA] rounded-xl p-6 sm:p-8 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-2xs">
            <Sprout className="w-6 h-6" />
          </div>
          <h3
            className="text-sm font-bold text-[#111111]"
            style={{ fontFamily: '"Pixelify Sans", "Press Start 2P", monospace' }}
          >
            No shut-down startups found for this idea.
          </h3>
          <p className="text-xs text-[#5A5A5A] font-sans max-w-md mx-auto leading-relaxed">
            That can mean open space, or that nobody found enough demand to try. Check the flaws below before deciding.
          </p>
        </div>
      ) : (
        /* Grid of Tombstones */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {graveyard.map((startup, idx) => {
            const variant = getSpriteVariant(startup.name);
            const yearsStr = formatYears(startup.founded_year, startup.closed_year);
            const ariaLabel = `Tombstone: ${startup.name}, ${yearsStr}. Open details.`;

            return (
              <button
                key={idx}
                onClick={() => setSelectedStartup(startup)}
                aria-label={ariaLabel}
                style={{
                  animation: prefersReducedMotion || !isVisible ? 'none' : `riseFromGround 0.4s steps(8) both`,
                  animationDelay: `${idx * 120}ms`,
                }}
                className={`group relative flex flex-col items-center justify-between p-4 bg-white border border-[#E0DEDA] rounded-xl hover:border-[#111111] hover:shadow-md transition-all duration-150 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[#E8481C] ${
                  !isVisible && !prefersReducedMotion ? 'opacity-0 translate-y-6' : 'opacity-100 translate-y-0'
                }`}
              >
                {/* Tombstone Pixel Art SVG */}
                <div className="w-full flex justify-center py-2 transition-transform duration-100 group-hover:-translate-y-0.5">
                  <svg width="64" height="72" viewBox="0 0 32 36" className="drop-shadow-xs" shapeRendering="crispEdges">
                    {/* Grass base */}
                    <rect x="2" y="32" width="28" height="4" fill="#4C8F2F" />
                    <rect x="4" y="31" width="6" height="1" fill="#2F6B1F" />
                    <rect x="14" y="31" width="8" height="1" fill="#4C8F2F" />
                    <rect x="24" y="31" width="5" height="1" fill="#2F6B1F" />
                    {/* Flower accents */}
                    <rect x="8" y="31" width="1" height="1" fill="#E8481C" />
                    <rect x="21" y="31" width="1" height="1" fill="#E8481C" />

                    {variant === 0 && (
                      /* Rounded Top Tombstone */
                      <>
                        {/* Outline */}
                        <rect x="7" y="3" width="18" height="1" fill="#111111" />
                        <rect x="6" y="4" width="20" height="1" fill="#111111" />
                        <rect x="5" y="5" width="22" height="26" fill="#111111" />
                        {/* Stone Fill */}
                        <rect x="6" y="6" width="20" height="24" fill="#AEB6B8" />
                        {/* Left Highlight */}
                        <rect x="6" y="6" width="3" height="24" fill="#D0D6D8" />
                        {/* Right Shading */}
                        <rect x="22" y="6" width="4" height="24" fill="#8E9799" />
                        <rect x="24" y="8" width="2" height="22" fill="#6B7375" />
                        {/* R.I.P Text representation */}
                        <rect x="11" y="9" width="10" height="3" fill="#4A5254" />
                      </>
                    )}

                    {variant === 1 && (
                      /* Flat Slab Tombstone */
                      <>
                        {/* Outline */}
                        <rect x="5" y="4" width="22" height="27" fill="#111111" />
                        {/* Stone Fill */}
                        <rect x="6" y="5" width="20" height="25" fill="#AEB6B8" />
                        {/* Left Highlight */}
                        <rect x="6" y="5" width="3" height="25" fill="#D0D6D8" />
                        {/* Right Shading */}
                        <rect x="22" y="5" width="4" height="25" fill="#8E9799" />
                        <rect x="24" y="7" width="2" height="23" fill="#6B7375" />
                        {/* R.I.P Text representation */}
                        <rect x="11" y="8" width="10" height="3" fill="#4A5254" />
                      </>
                    )}

                    {variant === 2 && (
                      /* Cross Tombstone */
                      <>
                        {/* Outline */}
                        <rect x="13" y="2" width="6" height="30" fill="#111111" />
                        <rect x="7" y="8" width="18" height="6" fill="#111111" />
                        {/* Stone Fill */}
                        <rect x="14" y="3" width="4" height="28" fill="#AEB6B8" />
                        <rect x="8" y="9" width="16" height="4" fill="#AEB6B8" />
                        {/* Left Highlight */}
                        <rect x="14" y="3" width="1" height="28" fill="#D0D6D8" />
                        <rect x="8" y="9" width="1" height="4" fill="#D0D6D8" />
                        {/* Right Shading */}
                        <rect x="17" y="3" width="1" height="28" fill="#8E9799" />
                        <rect x="23" y="9" width="1" height="4" fill="#8E9799" />
                      </>
                    )}
                  </svg>
                </div>

                {/* Stone Labels */}
                <div className="w-full text-center mt-2 space-y-1">
                  <div
                    className="text-[10px] font-bold tracking-wider text-[#4A5254]"
                    style={{ fontFamily: '"Pixelify Sans", "Press Start 2P", monospace' }}
                  >
                    R.I.P.
                  </div>
                  <h4
                    className="text-xs font-bold text-[#111111] truncate px-1"
                    title={startup.name}
                    style={{ fontFamily: '"Pixelify Sans", "Press Start 2P", monospace' }}
                  >
                    {startup.name}
                  </h4>
                  <div className="text-[10px] font-mono text-[#5A5A5A]">
                    {yearsStr}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Trust Footer */}
      <div className="mt-5 pt-3 border-t border-[#E0DEDA]/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#5A5A5A] gap-2 font-sans">
        <span>Based on public reports. Details may be incomplete.</span>
        <button
          onClick={() => onNavigate('/flaw/contact')}
          className="hover:text-[#E8481C] underline underline-offset-2 transition-colors cursor-pointer"
        >
          Spot an error? Report it
        </button>
      </div>

      {/* Details Modal / Bottom Sheet */}
      {selectedStartup && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in duration-200">
          <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 shadow-2xl border border-[#E0DEDA] text-[#111111] relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedStartup(null)}
              className="absolute right-4 top-4 p-2 rounded-xl text-[#7A7A7A] hover:text-[#111111] hover:bg-black/5 transition-colors cursor-pointer"
              aria-label="Close details"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#E9ECEA] border border-[#E0DEDA] flex items-center justify-center text-[#111111]">
                <Skull className="w-5 h-5 text-[#E8481C]" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#7A7A7A] block">
                  Startup Post-Mortem
                </span>
                <h3
                  className="text-lg font-bold text-[#111111]"
                  style={{ fontFamily: '"Pixelify Sans", "Press Start 2P", monospace' }}
                >
                  {selectedStartup.name}
                </h3>
              </div>
            </div>

            <div className="space-y-4 text-xs font-sans leading-relaxed">
              <div className="p-3 bg-[#F5F4F0] border border-[#E0DEDA] rounded-xl flex items-center justify-between font-mono">
                <span className="text-[#5A5A5A]">Lifespan</span>
                <span className="font-bold text-[#111111]">
                  {formatYears(selectedStartup.founded_year, selectedStartup.closed_year)}
                </span>
              </div>

              {selectedStartup.reported_cause && (
                <div className="space-y-1.5 p-4 rounded-xl bg-rose-50/60 border border-rose-200/80">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-rose-800 font-bold block">
                    Reported Cause (According to {getDomain(selectedStartup.source_urls[0] || '')}):
                  </span>
                  <p className="text-rose-950">
                    {selectedStartup.reported_cause}
                  </p>
                </div>
              )}

              <div className="space-y-1.5 p-4 rounded-xl bg-orange-50/60 border border-orange-200/80">
                <span className="text-[10px] font-mono uppercase tracking-wider text-orange-900 font-bold block">
                  What This Means For Your Idea:
                </span>
                <p className="text-orange-950 font-medium">
                  {selectedStartup.lesson_for_this_idea}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#7A7A7A] font-bold block">
                  Verified Public Sources ({selectedStartup.source_urls.length})
                </span>
                <div className="space-y-1.5">
                  {selectedStartup.source_urls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#F5F4F0] hover:bg-[#E9ECEA] border border-[#E0DEDA] text-[#111111] transition-colors group"
                    >
                      <span className="font-mono text-[11px] truncate mr-2">{getDomain(url)}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#7A7A7A] group-hover:text-[#E8481C] shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E0DEDA] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStartup(null)}
                className="px-4 py-2 bg-[#111111] hover:bg-[#E8481C] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Keyframes for Tombstone Rise Animation */}
      <style>{`
        @keyframes riseFromGround {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
