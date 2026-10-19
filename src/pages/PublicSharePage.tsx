import React, { useState, useEffect } from 'react';
import {
  Compass,
  AlertTriangle,
  Globe,
  Sparkles,
  ArrowUpRight,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Lock,
  ArrowRight,
  Shield,
  Zap,
  RotateCcw,
  Skull,
  User,
  Clock,
  ChevronRight
} from 'lucide-react';
import { ShareRecord } from '../types.ts';
import { fetchPublicShare } from '../services/api.ts';
import { ShareModal } from '../components/ShareModal.tsx';

interface PublicSharePageProps {
  shareId: string;
  onNavigate: (path: string, initialIdea?: string) => void;
}

export const PublicSharePage: React.FC<PublicSharePageProps> = ({
  shareId,
  onNavigate
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<ShareRecord | null>(null);
  const [isRevoked, setIsRevoked] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadShare() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchPublicShare(shareId);
        if (!isMounted) return;

        if (res.revoked) {
          setIsRevoked(true);
          setShareData(res.share);
        } else if (res.share) {
          setShareData(res.share);
          setIsRevoked(Boolean(res.share.revoked));
        } else {
          setError('Shared idea could not be found.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('[PUBLIC SHARE PAGE] Error loading share:', err);
        setError(err.message || 'Unable to load shared validation report.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (shareId) {
      loadShare();
    }
    return () => {
      isMounted = false;
    };
  }, [shareId]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      console.error('Failed to copy share link:', e);
    }
  };

  const handleTestInValidator = (ideaToTest?: string) => {
    const targetIdea = ideaToTest || shareData?.idea || '';
    onNavigate('/flaw/submit', targetIdea);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F4F0] text-[#111111] flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-xl bg-[#111111] text-white flex items-center justify-center font-bold text-lg mb-4 animate-bounce">
          F
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-[#7A7A7A]">
          Loading Official FLAWLESZ Report...
        </p>
      </div>
    );
  }

  if (isRevoked) {
    return (
      <div className="min-h-screen bg-[#F5F4F0] text-[#111111] flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white border border-[#E0DEDA] rounded-2xl p-8 text-center shadow-lg space-y-4">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-[#7A7A7A]">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-serif font-bold text-[#111111]">
            Share Link Revoked
          </h2>
          <p className="text-sm text-[#5A5A5A] leading-relaxed">
            The creator of this validation report has revoked public access or the link has expired.
          </p>
          <div className="pt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onNavigate('/flaw')}
              className="w-full py-2.5 px-4 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-mono font-semibold transition-colors cursor-pointer"
            >
              Explore FLAWLESZ AI
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/flaw/submit')}
              className="w-full py-2.5 px-4 rounded-xl border border-[#E0DEDA] hover:bg-stone-50 text-xs font-mono text-[#111111] transition-colors cursor-pointer"
            >
              Stress-Test Your Own Idea
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen bg-[#F5F4F0] text-[#111111] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-[#E0DEDA] rounded-2xl p-8 text-center shadow-lg space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-serif font-bold text-[#111111]">
            Report Not Found
          </h2>
          <p className="text-sm text-[#5A5A5A] leading-relaxed">
            {error || 'This shared idea could not be located. The link may be incorrect.'}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/flaw')}
            className="w-full py-2.5 px-4 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-mono font-semibold transition-colors cursor-pointer"
          >
            Go to FLAWLESZ AI Overview
          </button>
        </div>
      </div>
    );
  }

  const { title, idea, content, options, createdAt } = shareData;
  const flaws = content.flaws || [];
  const competitors = content.similar_products || [];
  const refinements = content.refined_versions || [];
  const graveyard = content.graveyard || [];
  const messages = content.messages || [];

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#111111] flex flex-col font-sans">
      {/* ─────────────────────────────────────────────────────────────
          TOP BRANDED HEADER
         ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E0DEDA] px-4 sm:px-6 py-3.5 transition-all">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div
            onClick={() => onNavigate('/flaw')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#111111] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-2xs group-hover:bg-[#E8481C] transition-colors">
              F
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight text-[#111111]">
                  FLAWLESZ AI
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#111111] text-white font-semibold">
                  Official Report
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#7A7A7A] block">
                Know Before You Build
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E0DEDA] hover:bg-stone-50 text-xs font-mono text-[#111111] transition-colors"
              title="Copy share link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#5A5A5A]" />
                  <span className="hidden sm:inline">Copy Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E0DEDA] hover:bg-stone-50 text-xs font-mono text-[#111111] transition-colors"
              title="Share report options"
            >
              <Share2 className="w-3.5 h-3.5 text-[#5A5A5A]" />
              <span className="hidden sm:inline">Share</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('/flaw')}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#111111] hover:bg-black text-white text-xs font-mono font-semibold shadow-2xs transition-colors"
            >
              <span>Explore FLAWLESZ</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#E8481C]" />
            </button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          HERO EXECUTIVE BANNER
         ───────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-[#ECE9E2] to-[#F5F4F0] border-b border-[#E0DEDA] py-10 sm:py-14 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Metadata pill bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#111111] text-white font-semibold">
              <Compass className="w-3.5 h-3.5 text-[#E8481C]" />
              <span>STRESS-TESTED IDEA</span>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white border border-[#E0DEDA] text-[#5A5A5A]">
              {content.authorName ? `Shared by ${content.authorName}` : 'Shared Anonymously'}
            </span>
            <span className="text-[#8C8C8C] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </span>
          </div>

          {/* Main Idea Quote */}
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#E8481C] font-bold block mb-1">
              Target Venture Hypothesis
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#111111] leading-tight">
              &ldquo;{idea}&rdquo;
            </h1>
          </div>

          {/* Quick Metrics & Call to Action */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#5A5A5A]">
              {flaws.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#E8481C]"></span>
                  <span>{flaws.length} Structural Flaws</span>
                </span>
              )}
              {competitors.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>{competitors.length} Live Competitors</span>
                </span>
              )}
              {refinements.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>{refinements.length} Strategic Pivots</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTestInValidator()}
                className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E8481C] hover:bg-[#D03D14] text-white text-xs font-mono font-bold shadow-xs transition-colors"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Stress-Test This in Validator</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          REPORT CONTENT BODY
         ───────────────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-12 flex-1 w-full">
        {/* 1. STRUCTURAL FLAWS SECTION */}
        {options.includeFlaws && flaws.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0DEDA] pb-3">
              <div>
                <h2 className="text-lg font-mono font-bold uppercase tracking-wider text-[#111111] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#E8481C]" />
                  <span>Identified Fatal Flaws ({flaws.length})</span>
                </h2>
                <p className="text-xs text-[#5A5A5A] mt-0.5">
                  Vulnerabilities in economics, acquisition friction, and market defensibility.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {flaws.map((flaw, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-white border border-[#E0DEDA] shadow-2xs space-y-2 hover:border-[#111111]/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-bold text-[#111111] leading-snug">
                      {idx + 1}. {flaw.title}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                        flaw.severity === 'high'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : flaw.severity === 'medium'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-stone-100 text-[#5A5A5A] border border-stone-200'
                      }`}
                    >
                      {flaw.severity} Risk
                    </span>
                  </div>
                  <p className="text-xs text-[#5A5A5A] leading-relaxed">
                    {flaw.explanation}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 2. SIMILAR PRODUCTS & COMPETITORS SECTION */}
        {options.includeCompetitors && competitors.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0DEDA] pb-3">
              <div>
                <h2 className="text-lg font-mono font-bold uppercase tracking-wider text-[#111111] flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>Live Market Incumbents & Competitors ({competitors.length})</span>
                </h2>
                <p className="text-xs text-[#5A5A5A] mt-0.5">
                  Direct products discovered on the live web via search grounding.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {competitors.map((prod, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-white border border-[#E0DEDA] shadow-2xs space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm font-bold text-[#111111]">
                        {prod.name}
                      </h3>
                      {prod.source_url && (
                        <a
                          href={prod.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#7A7A7A] hover:text-[#111111] p-1 transition-colors"
                          title="Open competitor URL"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-[#5A5A5A] leading-relaxed">
                      {prod.description}
                    </p>
                  </div>
                  {prod.source_url && (
                    <div className="pt-3 border-t border-[#F0EFEB] text-[11px] font-mono text-[#7A7A7A] truncate">
                      Source: {prod.source_url.replace(/^https?:\/\//, '').split('/')[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. REFINED PIVOT ANGLES SECTION */}
        {options.includeRefinements && refinements.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0DEDA] pb-3">
              <div>
                <h2 className="text-lg font-mono font-bold uppercase tracking-wider text-[#111111] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Strategic Pivot Angles ({refinements.length})</span>
                </h2>
                <p className="text-xs text-[#5A5A5A] mt-0.5">
                  High-defensibility iterations to avoid discovered pitfalls.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {refinements.map((ref, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-white border border-[#E0DEDA] shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#E8481C] font-bold">
                        Angle #{idx + 1}
                      </span>
                      <h3 className="text-sm font-bold text-[#111111] mt-0.5 leading-snug">
                        &ldquo;{ref.idea}&rdquo;
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTestInValidator(ref.idea)}
                      className="cursor-pointer shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E0DEDA] hover:bg-stone-50 text-xs font-mono font-semibold text-[#111111] transition-colors"
                      title="Stress-test this pivot variation"
                    >
                      <span>Test Pivot</span>
                      <ArrowUpRight className="w-3 h-3 text-[#E8481C]" />
                    </button>
                  </div>
                  <p className="text-xs text-[#5A5A5A] leading-relaxed bg-[#F9F8F5] p-3 rounded-lg border border-[#E0DEDA]/60">
                    <span className="font-semibold text-[#111111]">Strategic Defense: </span>
                    {ref.reasoning}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. STARTUP GRAVEYARD / CAUTIONARY TALES SECTION */}
        {options.includeGraveyard && graveyard.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0DEDA] pb-3">
              <div>
                <h2 className="text-lg font-mono font-bold uppercase tracking-wider text-[#111111] flex items-center gap-2">
                  <Skull className="w-4 h-4 text-[#7A7A7A]" />
                  <span>Cautionary Tales & Graveyard Lessons ({graveyard.length})</span>
                </h2>
                <p className="text-xs text-[#5A5A5A] mt-0.5">
                  Historical startups in this space that shut down and lessons learned.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {graveyard.map((grave, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-white border border-[#E0DEDA] shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#111111]">
                      {grave.name}
                    </h3>
                    <span className="text-xs font-mono text-[#7A7A7A]">
                      {grave.founded_year || '?'} – {grave.closed_year || '?'}
                    </span>
                  </div>
                  {grave.reported_cause && (
                    <p className="text-xs text-rose-700 font-mono">
                      Failure Cause: {grave.reported_cause}
                    </p>
                  )}
                  <p className="text-xs text-[#5A5A5A] leading-relaxed">
                    <span className="font-semibold text-[#111111]">Lesson: </span>
                    {grave.lesson_for_this_idea}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5. FOLLOW-UP Q&A THREAD (IF INCLUDED) */}
        {options.includeMessages && messages.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0DEDA] pb-3">
              <div>
                <h2 className="text-lg font-mono font-bold uppercase tracking-wider text-[#111111] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#E8481C]" />
                  <span>Follow-Up Q&A Insights ({messages.length})</span>
                </h2>
                <p className="text-xs text-[#5A5A5A] mt-0.5">
                  Strategic discussions and clarification questions.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-white border border-[#E0DEDA] text-[#111111] font-medium'
                      : 'bg-[#F9F8F5] border border-[#E0DEDA] text-[#333333]'
                  }`}
                >
                  <span className="text-[10px] font-mono uppercase text-[#7A7A7A] block mb-1">
                    {msg.role === 'user' ? 'Creator Query' : 'AI Analysis Response'}
                  </span>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─────────────────────────────────────────────────────────────
            BOTTOM CALL TO ACTION BANNER
           ───────────────────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-[#111111] text-white p-6 sm:p-8 md:p-10 relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[#E8481C] text-white">
              <span>KNOW BEFORE YOU BUILD</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white leading-tight">
              Validate your idea before writing a single line of code.
            </h2>
            <p className="text-xs sm:text-sm text-[#A0A0A0] leading-relaxed">
              FLAWLESZ AI checks real search data, exposes hidden failure modes, and crafts bulletproof positioning in under 30 seconds.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('/flaw/submit')}
                className="cursor-pointer px-5 py-2.5 rounded-xl bg-[#E8481C] hover:bg-[#D03D14] text-white text-xs font-mono font-bold shadow-md transition-all flex items-center gap-2"
              >
                <span>Start Free Idea Validation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/flaw')}
                className="cursor-pointer px-4 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-white text-xs font-mono font-medium transition-colors"
              >
                <span>Learn More</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Branded Footer */}
      <footer className="border-t border-[#E0DEDA] py-6 px-4 sm:px-6 bg-white text-center text-xs font-mono text-[#7A7A7A]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#111111]">FLAWLESZ AI</span>
            <span>•</span>
            <span>Know Before You Build</span>
          </div>
          <div>
            <span>Official Venture Report #{shareId}</span>
          </div>
        </div>
      </footer>

      {/* Share Modal Dialog */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        ideaData={{
          id: shareData.validationId || shareData.id,
          idea: shareData.idea,
          title: shareData.title,
          flaws: shareData.content.flaws,
          similar_products: shareData.content.similar_products,
          refined_versions: shareData.content.refined_versions,
          graveyard: shareData.content.graveyard,
          messages: shareData.content.messages,
          createdAt: shareData.createdAt,
        }}
        onNavigate={onNavigate}
      />
    </div>
  );
};
