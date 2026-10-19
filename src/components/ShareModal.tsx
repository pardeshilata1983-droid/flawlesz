import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Linkedin,
  Twitter,
  Mail,
  MessageCircle,
  Shield,
  Eye,
  AlertTriangle,
  Globe,
  Sparkles,
  RotateCcw,
  Trash2,
  Lock,
  Smartphone,
  ChevronRight,
  Info,
  CheckCircle2,
  Send
} from 'lucide-react';
import { Flaw, SimilarProduct, RefinedVersion, GraveyardStartup, ChatMessage, ShareOptions, ShareRecord, SharePayload } from '../types.ts';
import { createPublicShare, revokePublicShare } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  ideaData: {
    id?: string;
    idea: string;
    title?: string;
    flaws?: Flaw[];
    similar_products?: SimilarProduct[];
    refined_versions?: RefinedVersion[];
    graveyard?: GraveyardStartup[];
    messages?: ChatMessage[];
    createdAt?: string;
  } | null;
  onNavigate?: (path: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  ideaData,
  onNavigate
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'share' | 'options' | 'preview'>('share');
  const [isCopied, setIsCopied] = useState(false);
  const [isTextCopied, setIsTextCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareRecord, setShareRecord] = useState<ShareRecord | null>(null);
  const [isRevoked, setIsRevoked] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [hasConfirmedShare, setHasConfirmedShare] = useState(false);

  // Privacy toggles
  const [options, setOptions] = useState<ShareOptions>({
    includeFlaws: true,
    includeCompetitors: true,
    includeRefinements: true,
    includeGraveyard: true,
    includeMessages: false,
    isAnonymous: false,
  });

  // Reset or initialize when opened
  useEffect(() => {
    if (isOpen && ideaData) {
      setShareRecord(null);
      setIsRevoked(false);
      setError(null);
      setIsCopied(false);
      setIsTextCopied(false);
      // Automatically generate public link on open so it is instantly ready
      handleGenerateShareLink(options);
    }
  }, [isOpen, ideaData?.id, ideaData?.idea]);

  if (!isOpen || !ideaData) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://flawlesz.ai.studio';
  const publicUrl = shareRecord ? `${origin}/share/${shareRecord.id}` : '';
  const cleanIdea = ideaData.idea.trim();
  const title = ideaData.title || (cleanIdea.length > 70 ? cleanIdea.slice(0, 67) + '...' : cleanIdea);

  const handleGenerateShareLink = async (customOptions = options) => {
    setLoading(true);
    setError(null);
    try {
      const payload: SharePayload = {
        id: shareRecord?.id,
        validationId: ideaData.id,
        idea: cleanIdea,
        title,
        options: customOptions,
        content: {
          flaws: customOptions.includeFlaws ? (ideaData.flaws || []) : [],
          similar_products: customOptions.includeCompetitors ? (ideaData.similar_products || []) : [],
          refined_versions: customOptions.includeRefinements ? (ideaData.refined_versions || []) : [],
          graveyard: customOptions.includeGraveyard ? (ideaData.graveyard || []) : [],
          messages: customOptions.includeMessages ? (ideaData.messages || []) : [],
          authorName: customOptions.isAnonymous ? undefined : (user?.name || user?.email?.split('@')[0] || undefined),
        },
      };

      const res = await createPublicShare(payload);
      setShareRecord(res.share);
      setIsRevoked(false);
      setHasConfirmedShare(true);
    } catch (err: any) {
      console.error('[SHARE MODAL] Failed to create share:', err);
      setError(err.message || 'Unable to generate public share link.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionToggle = (key: keyof ShareOptions) => {
    const updated = { ...options, [key]: !options[key] };
    setOptions(updated);
    // Refresh the share record with new options
    if (shareRecord) {
      handleGenerateShareLink(updated);
    }
  };

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleCopySummaryText = async () => {
    const flawsCount = options.includeFlaws ? (ideaData.flaws || []).length : 0;
    const compCount = options.includeCompetitors ? (ideaData.similar_products || []).length : 0;
    const summaryText = `FLAWLESZ AI — Stress-Tested Idea Report: "${title}"\n\n` +
      `Summary: ${flawsCount} critical market flaws identified • ${compCount} incumbents benchmarked.\n` +
      `Know Before You Build.\n\n` +
      `View official interactive breakdown: ${publicUrl}`;

    try {
      await navigator.clipboard.writeText(summaryText);
      setIsTextCopied(true);
      setTimeout(() => setIsTextCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share && publicUrl) {
      try {
        await navigator.share({
          title: `FLAWLESZ AI Report: ${title}`,
          text: `Check out the stress-tested startup breakdown for "${title}" on FLAWLESZ AI. Know Before You Build.`,
          url: publicUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('[SHARE MODAL] Native share error:', err);
        }
      }
    }
  };

  const handleRevoke = async () => {
    if (!shareRecord) return;
    setRevoking(true);
    try {
      await revokePublicShare(shareRecord.id);
      setIsRevoked(true);
    } catch (err: any) {
      setError(err.message || 'Failed to revoke link.');
    } finally {
      setRevoking(false);
    }
  };

  // Social share intents
  const encodedUrl = encodeURIComponent(publicUrl);
  const encodedText = encodeURIComponent(`Stress-tested startup idea on FLAWLESZ AI: "${title}". Know Before You Build.`);
  const encodedSubject = encodeURIComponent(`FLAWLESZ AI Idea Analysis: ${title}`);
  const encodedBody = encodeURIComponent(`Hi,\n\nTake a look at this stress-tested startup validation report for "${title}" on FLAWLESZ AI:\n\n${publicUrl}\n\nKnow Before You Build.`);

  const shareLinks = {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    email: `mailto:?subject=${encodedSubject}&body=${encodedBody}`,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#E0DEDA] rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E0DEDA] flex items-center justify-between bg-[#FDFCFA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#111111] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs">
              F
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#111111]">Official Idea Sharing</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-[#E8481C]/10 text-[#E8481C]">
                  Public Link
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#7A7A7A]">
                Know Before You Build • Branded venture preview
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer p-1.5 rounded-lg text-[#7A7A7A] hover:text-[#111111] hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[#E0DEDA] px-5 bg-white text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('share')}
            className={`py-3 px-3 -mb-px border-b-2 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'share'
                ? 'border-[#E8481C] text-[#E8481C]'
                : 'border-transparent text-[#7A7A7A] hover:text-[#111111]'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share & Distribute</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('options')}
            className={`py-3 px-3 -mb-px border-b-2 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'options'
                ? 'border-[#E8481C] text-[#E8481C]'
                : 'border-transparent text-[#7A7A7A] hover:text-[#111111]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Privacy & Sections</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`py-3 px-3 -mb-px border-b-2 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'preview'
                ? 'border-[#E8481C] text-[#E8481C]'
                : 'border-transparent text-[#7A7A7A] hover:text-[#111111]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Recipient Preview</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#F9F8F5]">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isRevoked ? (
            <div className="p-6 rounded-xl bg-white border border-[#E0DEDA] text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-[#7A7A7A]">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-[#111111]">Share Link Revoked</h4>
              <p className="text-xs text-[#5A5A5A] max-w-sm mx-auto">
                This public share URL has been deactivated. Anyone visiting the link will be notified that the author revoked access.
              </p>
              <button
                type="button"
                onClick={() => handleGenerateShareLink()}
                className="cursor-pointer px-4 py-2 rounded-lg bg-[#111111] hover:bg-black text-white text-xs font-mono font-medium inline-flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-activate Public Link</span>
              </button>
            </div>
          ) : (
            <>
              {/* TAB 1: SHARE & DISTRIBUTE */}
              {activeTab === 'share' && (
                <div className="space-y-4">
                  {/* Idea Card Header Preview */}
                  <div className="p-4 rounded-xl bg-white border border-[#E0DEDA] shadow-2xs">
                    <span className="text-[10px] font-mono uppercase text-[#7A7A7A] font-bold tracking-wider">
                      Target Venture
                    </span>
                    <h4 className="text-sm font-bold text-[#111111] mt-1 line-clamp-2 leading-snug">
                      &ldquo;{title}&rdquo;
                    </h4>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[10px] font-mono text-[#5A5A5A]">
                      {options.includeFlaws && (
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          {(ideaData.flaws || []).length} Flaws
                        </span>
                      )}
                      {options.includeCompetitors && (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                          {(ideaData.similar_products || []).length} Incumbents
                        </span>
                      )}
                      {options.includeRefinements && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {(ideaData.refined_versions || []).length} Pivots
                        </span>
                      )}
                      <span className="text-[#8C8C8C]">
                        • {options.isAnonymous ? 'Shared Anonymously' : `By ${user?.name || user?.email?.split('@')[0] || 'Author'}`}
                      </span>
                    </div>
                  </div>

                  {/* Public Link Copy Bar */}
                  <div className="p-4 rounded-xl bg-white border border-[#E0DEDA] space-y-2.5 shadow-2xs">
                    <label className="block text-xs font-bold text-[#111111]">
                      Official Shareable URL
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center px-3 py-2 rounded-lg bg-[#F5F4F0] border border-[#E0DEDA] text-xs font-mono text-[#111111] overflow-hidden">
                        <Globe className="w-3.5 h-3.5 text-[#7A7A7A] mr-2 shrink-0" />
                        <span className="truncate select-all">{loading ? 'Generating official token...' : publicUrl}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        disabled={loading || !publicUrl}
                        className={`cursor-pointer px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                          isCopied
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-[#E8481C] hover:bg-[#D03D14] text-white shadow-2xs'
                        }`}
                        title="Copy official link to clipboard"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                    {isCopied && (
                      <p className="text-[11px] font-mono text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Link copied to clipboard! Anyone with this link can view the report.</span>
                      </p>
                    )}
                  </div>

                  {/* Social Share Grid */}
                  <div className="p-4 rounded-xl bg-white border border-[#E0DEDA] space-y-3 shadow-2xs">
                    <span className="block text-xs font-bold text-[#111111]">
                      Share Directly via Platform
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <a
                        href={shareLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-3 rounded-lg border border-[#E0DEDA] hover:border-[#0077b5] hover:bg-sky-50/50 transition-colors text-center group cursor-pointer"
                      >
                        <Linkedin className="w-5 h-5 text-[#0077b5] mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-mono text-[#111111] font-semibold">LinkedIn</span>
                      </a>

                      <a
                        href={shareLinks.whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-3 rounded-lg border border-[#E0DEDA] hover:border-[#25D366] hover:bg-emerald-50/50 transition-colors text-center group cursor-pointer"
                      >
                        <MessageCircle className="w-5 h-5 text-[#25D366] mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-mono text-[#111111] font-semibold">WhatsApp</span>
                      </a>

                      <a
                        href={shareLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-3 rounded-lg border border-[#E0DEDA] hover:border-black hover:bg-stone-50 transition-colors text-center group cursor-pointer"
                      >
                        <Twitter className="w-5 h-5 text-[#111111] mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-mono text-[#111111] font-semibold">X / Twitter</span>
                      </a>

                      <a
                        href={shareLinks.email}
                        className="flex flex-col items-center justify-center p-3 rounded-lg border border-[#E0DEDA] hover:border-amber-600 hover:bg-amber-50/50 transition-colors text-center group cursor-pointer"
                      >
                        <Mail className="w-5 h-5 text-amber-700 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-mono text-[#111111] font-semibold">Email</span>
                      </a>
                    </div>

                    {/* Additional Native Device Action if Supported */}
                    {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                      <button
                        type="button"
                        onClick={handleNativeShare}
                        className="w-full mt-2 py-2 px-3 rounded-lg bg-[#F5F4F0] hover:bg-[#EAE8E2] border border-[#E0DEDA] text-xs font-mono font-medium text-[#111111] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-[#E8481C]" />
                        <span>Share using device apps (AirDrop, Messages, Slack)...</span>
                      </button>
                    )}
                  </div>

                  {/* Secondary Copy Text */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E0DEDA]">
                    <div>
                      <span className="text-xs font-bold text-[#111111] block">Copy Executive Briefing Text</span>
                      <span className="text-[11px] text-[#7A7A7A] font-mono">
                        Formatted for Slack, Notion, or pitch deck notes
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopySummaryText}
                      className="cursor-pointer px-3 py-1.5 rounded-lg border border-[#E0DEDA] bg-white hover:bg-stone-50 text-xs font-mono text-[#111111] flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      {isTextCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#7A7A7A]" />
                          <span>Copy Text</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: PRIVACY & PERMISSIONS */}
              {activeTab === 'options' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-[#E8481C] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[#111111]">Privacy-First Sharing Architecture</p>
                      <p className="text-[11px] text-[#5A5A5A] mt-0.5 leading-relaxed">
                        FLAWLESZ AI only exposes sections you intentionally check. Private keys, backend prompts, user account credentials, and unselected chats remain strictly confidential.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-[#E0DEDA] space-y-3.5 shadow-2xs">
                    <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider font-mono">
                      Include in Public Share
                    </h4>

                    {/* Flaws toggle */}
                    <label className="flex items-center justify-between cursor-pointer py-1.5">
                      <div className="pr-4">
                        <span className="text-xs font-bold text-[#111111] block">Identified Structural Flaws</span>
                        <span className="text-[11px] text-[#7A7A7A]">Show market vulnerabilities and severity ratings</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={options.includeFlaws}
                        onChange={() => handleOptionToggle('includeFlaws')}
                        className="w-4 h-4 rounded text-[#E8481C] focus:ring-[#E8481C] cursor-pointer"
                      />
                    </label>

                    {/* Competitors toggle */}
                    <label className="flex items-center justify-between cursor-pointer py-1.5 border-t border-[#F0EFEB]">
                      <div className="pr-4">
                        <span className="text-xs font-bold text-[#111111] block">Competitor & Incumbent Benchmarks</span>
                        <span className="text-[11px] text-[#7A7A7A]">Show live-grounded existing products</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={options.includeCompetitors}
                        onChange={() => handleOptionToggle('includeCompetitors')}
                        className="w-4 h-4 rounded text-[#E8481C] focus:ring-[#E8481C] cursor-pointer"
                      />
                    </label>

                    {/* Pivots toggle */}
                    <label className="flex items-center justify-between cursor-pointer py-1.5 border-t border-[#F0EFEB]">
                      <div className="pr-4">
                        <span className="text-xs font-bold text-[#111111] block">Refined Pivot Angles</span>
                        <span className="text-[11px] text-[#7A7A7A]">Share recommended positioning iterations</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={options.includeRefinements}
                        onChange={() => handleOptionToggle('includeRefinements')}
                        className="w-4 h-4 rounded text-[#E8481C] focus:ring-[#E8481C] cursor-pointer"
                      />
                    </label>

                    {/* Graveyard toggle */}
                    <label className="flex items-center justify-between cursor-pointer py-1.5 border-t border-[#F0EFEB]">
                      <div className="pr-4">
                        <span className="text-xs font-bold text-[#111111] block">Cautionary Tales (Startup Graveyard)</span>
                        <span className="text-[11px] text-[#7A7A7A]">Include post-mortem lessons from past venture failures</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={options.includeGraveyard}
                        onChange={() => handleOptionToggle('includeGraveyard')}
                        className="w-4 h-4 rounded text-[#E8481C] focus:ring-[#E8481C] cursor-pointer"
                      />
                    </label>

                    {/* Messages toggle */}
                    <label className="flex items-center justify-between cursor-pointer py-1.5 border-t border-[#F0EFEB]">
                      <div className="pr-4">
                        <span className="text-xs font-bold text-[#111111] block">Follow-Up Q&A Thread</span>
                        <span className="text-[11px] text-[#7A7A7A]">Include subsequent chat questions and answers</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={options.includeMessages}
                        onChange={() => handleOptionToggle('includeMessages')}
                        className="w-4 h-4 rounded text-[#E8481C] focus:ring-[#E8481C] cursor-pointer"
                      />
                    </label>

                    {/* Anonymous toggle */}
                    <label className="flex items-center justify-between cursor-pointer py-1.5 border-t border-[#F0EFEB]">
                      <div className="pr-4">
                        <span className="text-xs font-bold text-[#111111] block">Share Anonymously</span>
                        <span className="text-[11px] text-[#7A7A7A]">Hide your account name and email address from the public page</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={options.isAnonymous}
                        onChange={() => handleOptionToggle('isAnonymous')}
                        className="w-4 h-4 rounded text-[#E8481C] focus:ring-[#E8481C] cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Revoke link control */}
                  <div className="p-4 rounded-xl bg-white border border-[#E0DEDA] flex items-center justify-between shadow-2xs">
                    <div>
                      <h4 className="text-xs font-bold text-[#111111]">Revoke Public Access</h4>
                      <p className="text-[11px] text-[#7A7A7A]">Immediately disables this public URL so nobody can view it</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRevoke}
                      disabled={revoking || !shareRecord}
                      className="cursor-pointer px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-mono font-medium transition-colors"
                    >
                      {revoking ? 'Revoking...' : 'Revoke Link'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: RECIPIENT PREVIEW */}
              {activeTab === 'preview' && (
                <div className="space-y-3">
                  <div className="text-[11px] font-mono text-[#7A7A7A] flex items-center justify-between">
                    <span>What recipients will see at {publicUrl || 'https://flawlesz.ai.studio/share/...'}:</span>
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#E8481C] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Open live page</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Live Mini Preview Canvas */}
                  <div className="rounded-xl border border-[#E0DEDA] bg-white overflow-hidden shadow-sm">
                    {/* Branded Bar */}
                    <div className="px-4 py-2.5 bg-[#111111] text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-[#E8481C] text-white flex items-center justify-center font-bold text-[10px]">
                          F
                        </span>
                        <span className="font-bold text-xs tracking-wider">FLAWLESZ AI</span>
                      </div>
                      <span className="text-[9px] font-mono uppercase tracking-widest text-[#A0A0A0]">
                        Know Before You Build
                      </span>
                    </div>

                    <div className="p-5 space-y-4">
                      <div>
                        <span className="text-[9px] font-mono text-[#E8481C] uppercase font-bold tracking-wider">
                          Official Validation Breakdown
                        </span>
                        <h3 className="text-base font-serif font-bold text-[#111111] mt-0.5 leading-snug">
                          &ldquo;{title}&rdquo;
                        </h3>
                        <p className="text-[10px] font-mono text-[#7A7A7A] mt-1">
                          {options.isAnonymous ? 'Shared Anonymously' : `Shared by ${user?.name || user?.email?.split('@')[0] || 'Venture Creator'}`} • Live Web Grounded
                        </p>
                      </div>

                      {/* Sections included indicator */}
                      <div className="space-y-2 border-t border-[#F0EFEB] pt-3 text-xs">
                        {options.includeFlaws && (
                          <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/60 flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-[11px] text-amber-900">
                                {(ideaData.flaws || []).length} Fatal Market Flaws
                              </span>
                              <p className="text-[10px] text-amber-800 line-clamp-1">
                                {ideaData.flaws?.[0]?.title || 'Detailed unit economics and adoption friction'}
                              </p>
                            </div>
                          </div>
                        )}

                        {options.includeCompetitors && (
                          <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200/60 flex items-start gap-2">
                            <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-[11px] text-blue-900">
                                {(ideaData.similar_products || []).length} Live Competitors & Incumbents
                              </span>
                              <p className="text-[10px] text-blue-800 line-clamp-1">
                                {ideaData.similar_products?.[0]?.name || 'Real products discovered via live web search'}
                              </p>
                            </div>
                          </div>
                        )}

                        {options.includeRefinements && (
                          <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200/60 flex items-start gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-[11px] text-emerald-900">
                                {(ideaData.refined_versions || []).length} Strategic Pivot Angles
                              </span>
                              <p className="text-[10px] text-emerald-800 line-clamp-1">
                                {ideaData.refined_versions?.[0]?.idea || 'Alternative high-defensibility angles'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Recipient CTA Preview */}
                      <div className="pt-2 border-t border-[#F0EFEB] flex items-center justify-between">
                        <span className="text-[10px] font-mono text-[#7A7A7A]">Interactive analysis page</span>
                        <span className="text-[11px] font-mono font-bold text-[#E8481C] flex items-center gap-1">
                          <span>Explore FLAWLESZ AI</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-[#E0DEDA] bg-white flex items-center justify-between">
          <div className="text-[11px] font-mono text-[#7A7A7A] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Secure 256-bit unguessable link</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer px-4 py-2 rounded-lg border border-[#E0DEDA] bg-white hover:bg-stone-50 text-xs font-mono text-[#111111] transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={loading || !publicUrl || isRevoked}
              className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                isCopied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#111111] hover:bg-black text-white shadow-2xs'
              }`}
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
