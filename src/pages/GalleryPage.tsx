import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ArrowUpRight,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  Layers,
  Share2,
  Check,
  X,
  Compass,
  Zap,
  TrendingDown,
  RefreshCw,
  Building,
} from 'lucide-react';
import { fetchGallery } from '../services/api.ts';
import { ValidationResult, Flaw } from '../types.ts';
import { Footer } from '../components/Footer.tsx';
import { ShareModal } from '../components/ShareModal.tsx';

interface GalleryPageProps {
  onNavigate: (path: string, initialIdea?: string) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Experiments' },
  { id: 'saas', label: 'SaaS & AI' },
  { id: 'marketplace', label: 'Marketplaces & Gig' },
  { id: 'enterprise', label: 'B2B & Enterprise' },
  { id: 'consumer', label: 'Consumer & Social' },
  { id: 'hardware', label: 'Hardware & Logistics' },
];

function getIdeaCategory(idea: string): string {
  const lower = idea.toLowerCase();
  if (lower.includes('hardware') || lower.includes('drone') || lower.includes('robot') || lower.includes('mower') || lower.includes('equipment')) {
    return 'hardware';
  }
  if (lower.includes('b2b') || lower.includes('enterprise') || lower.includes('contract') || lower.includes('compliance') || lower.includes('legal')) {
    return 'enterprise';
  }
  if (lower.includes('marketplace') || lower.includes('gig') || lower.includes('uber') || lower.includes('sublet') || lower.includes('escrow')) {
    return 'marketplace';
  }
  if (lower.includes('ai') || lower.includes('saas') || lower.includes('zoom') || lower.includes('bot') || lower.includes('summar') || lower.includes('software')) {
    return 'saas';
  }
  return 'consumer';
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export function GalleryPage({ onNavigate }: GalleryPageProps) {
  const [items, setItems] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<ValidationResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadGalleryData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[GALLERY PAGE] Fetching public gallery items...');
      const data = await fetchGallery();
      setItems(data);
    } catch (err: any) {
      console.error('[GALLERY PAGE] Error loading gallery:', err);
      setError(err?.message || 'Failed to load public gallery items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGalleryData();
  }, []);

  // Filtered and searched gallery items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all') {
        const cat = getIdeaCategory(item.idea);
        if (cat !== selectedCategory) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesIdea = item.idea.toLowerCase().includes(q);
        const matchesFlaws = item.flaws?.some(
          (f) => f.title.toLowerCase().includes(q) || f.explanation.toLowerCase().includes(q)
        );
        const matchesCompetitors = item.similar_products?.some(
          (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
        );
        const matchesPivots = item.refined_versions?.some(
          (p) => p.idea.toLowerCase().includes(q) || p.reasoning.toLowerCase().includes(q)
        );
        return matchesIdea || matchesFlaws || matchesCompetitors || matchesPivots;
      }

      return true;
    });
  }, [items, selectedCategory, searchQuery]);

  const [shareModalItem, setShareModalItem] = useState<ValidationResult | null>(null);

  const handleOpenShare = async (item: ValidationResult, e: React.MouseEvent) => {
    e.stopPropagation();

    // On mobile devices with native share sheet support
    if (typeof window !== 'undefined' && window.innerWidth < 768 && typeof navigator !== 'undefined' && navigator.share) {
      const shareUrl = `${window.location.origin}/share/${item.id}`;
      try {
        await navigator.share({
          title: `FLAWLESZ AI — "${item.idea.slice(0, 50)}"`,
          text: `Check out the stress-tested startup breakdown for "${item.idea}" on FLAWLESZ AI. Know Before You Build.`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('[GALLERY] Native share failed, falling back to modal:', err);
      }
    }

    // Open desktop / custom branded modal
    setShareModalItem(item);
  };

  const handleTestInValidator = (idea: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    console.log('[GALLERY PAGE] Launching validator with idea:', idea);
    onNavigate('/flaw/submit', idea);
  };

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#111111] flex flex-col">
      {/* ─────────────────────────────────────────────────────────────
          HERO BANNER
         ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-12 sm:pt-16 sm:pb-16 px-4 sm:px-6 border-b border-[#E0DEDA] overflow-hidden bg-gradient-to-b from-[#ECE9E2] to-[#F5F4F0]">
        {/* Grain Noise Overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#111111] text-white shadow-xs mb-4">
                <Compass className="w-3.5 h-3.5 text-[#E8481C]" />
                <span>COMMUNITY VENTURE DATABASE</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-serif font-medium tracking-tight text-[#111111]">
                Public Idea Gallery
              </h1>
              <p className="mt-3 text-sm sm:text-base text-[#5A5A5A] max-w-2xl leading-relaxed">
                Explore real startup concepts dissected by our adversarial model. Inspect structural flaws, incumbent moats, and validated pivot paths before deploying capital.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <button
                type="button"
                id="gallery-test-your-idea-cta"
                onClick={() => onNavigate('/flaw/submit')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#E8481C] hover:bg-[#D03D14] text-white text-xs font-mono font-semibold transition-all shadow-md hover:shadow-lg cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Test Your Idea in Validator</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar & Categories */}
          <div className="mt-8 pt-6 border-t border-[#E0DEDA]/80 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A7A7A]" />
                <input
                  type="text"
                  id="gallery-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search startup concepts, fatal flaws, competitors, or pivot angles..."
                  className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#E0DEDA] rounded-xl text-xs sm:text-sm font-sans focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] shadow-2xs placeholder-[#8E8B85]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7A7A] hover:text-[#111111]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={loadGalleryData}
                disabled={loading}
                title="Refresh gallery"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#E0DEDA] hover:bg-stone-50 rounded-xl text-xs font-mono text-[#5A5A5A] hover:text-[#111111] transition-colors shrink-0 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#111111] text-white shadow-2xs font-semibold'
                        : 'bg-white text-[#5A5A5A] hover:text-[#111111] border border-[#E0DEDA] hover:border-[#BDB9B3]'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          GALLERY GRID CONTENT
         ───────────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 flex-1">
        {loading && items.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#111111] border-t-transparent animate-spin" />
            <p className="text-xs font-mono text-[#5A5A5A]">Loading community experiments...</p>
          </div>
        ) : error && items.length === 0 ? (
          <div className="py-16 text-center bg-white border border-red-200 rounded-2xl p-8 max-w-lg mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#111111] mb-1">Failed to load public gallery</h3>
            <p className="text-xs text-[#5A5A5A] mb-4">{error}</p>
            <button
              type="button"
              onClick={loadGalleryData}
              className="px-4 py-2 bg-[#111111] text-white text-xs font-mono rounded-lg hover:bg-black"
            >
              Try Again
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center bg-white border border-[#E0DEDA] rounded-2xl p-10 max-w-md mx-auto shadow-2xs">
            <Layers className="w-10 h-10 text-[#8E8B85] mx-auto mb-3 stroke-[1.2]" />
            <h3 className="text-sm font-semibold text-[#111111] mb-1">No experiments found</h3>
            <p className="text-xs text-[#5A5A5A] mb-4">
              {searchQuery
                ? `No startup ideas matched "${searchQuery}". Try a different keyword or category.`
                : 'No startup concepts published in this category yet.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 bg-[#111111] text-white text-xs font-mono rounded-lg hover:bg-black"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const highFlaws = item.flaws?.filter((f) => f.severity === 'high') || [];
              const category = getIdeaCategory(item.idea);

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="group bg-white border border-[#E0DEDA] hover:border-[#111111] rounded-2xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 hover:shadow-md cursor-pointer relative"
                >
                  {/* Top Bar: Category pill, author / time */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#F5F4F0] text-[#5A5A5A] border border-[#E0DEDA]">
                        {category}
                      </span>
                      <span className="text-[11px] font-mono text-[#7A7A7A]">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    {/* Startup Idea Prompt */}
                    <h3 className="text-base font-serif font-bold text-[#111111] line-clamp-3 leading-snug group-hover:text-[#E8481C] transition-colors mb-4">
                      &ldquo;{item.idea}&rdquo;
                    </h3>

                    {/* Fatal Flaws Summary Badge */}
                    <div className="mb-4">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[#111111] mb-2">
                        <TrendingDown className="w-3.5 h-3.5 text-[#E8481C]" />
                        <span>{item.flaws.length} Structural Flaws</span>
                        {highFlaws.length > 0 && (
                          <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-800 font-bold border border-red-200">
                            {highFlaws.length} High Risk
                          </span>
                        )}
                      </div>

                      {/* Top 2 Flaws snippet */}
                      <ul className="space-y-1.5 text-xs text-[#5A5A5A]">
                        {item.flaws.slice(0, 2).map((flaw, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E8481C] shrink-0 mt-1.5" />
                            <span className="line-clamp-1 font-medium text-[#222222]">
                              {flaw.title}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Competitors Found */}
                    {item.similar_products && item.similar_products.length > 0 && (
                      <div className="mb-4 pt-3 border-t border-[#E0DEDA]">
                        <div className="text-[11px] font-mono text-[#7A7A7A] mb-1.5">
                          Incumbents & Prior Art ({item.similar_products.length}):
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {item.similar_products.slice(0, 3).map((prod, pIdx) => (
                            <span
                              key={pIdx}
                              className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-100 text-[#333333] border border-stone-200 truncate max-w-[150px]"
                            >
                              {prod.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pivot angle preview */}
                    {item.refined_versions && item.refined_versions.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-[#FFF9F6] border border-[#E8481C]/25 text-xs text-[#111111]">
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-[#E8481C] uppercase tracking-wider mb-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Pivoted Angle</span>
                        </div>
                        <p className="line-clamp-2 text-xs font-serif italic text-[#333333]">
                          &ldquo;{item.refined_versions[0].idea}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-6 pt-4 border-t border-[#E0DEDA] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleOpenShare(item, e)}
                      title="Share this validation report"
                      className="p-2 rounded-lg text-[#5A5A5A] hover:text-[#111111] hover:bg-stone-100 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-[#5A5A5A]" />
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#7A7A7A] group-hover:text-[#111111] transition-colors">
                        View Report
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleTestInValidator(item.idea, e)}
                        title="Test and modify this idea in the Validator"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#111111] hover:bg-black text-white text-xs font-mono font-medium transition-all shadow-2xs"
                      >
                        <span>Test Idea</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          FULL ANALYSIS DETAIL MODAL
         ───────────────────────────────────────────────────────────── */}
      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white border border-[#E0DEDA] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="absolute right-5 top-5 p-2 rounded-full text-[#7A7A7A] hover:text-[#111111] hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Top Metadata */}
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider bg-[#F5F4F0] text-[#5A5A5A] border border-[#E0DEDA]">
                {getIdeaCategory(selectedItem.idea)}
              </span>
              <span className="text-xs font-mono text-[#7A7A7A]">
                Validated {formatRelativeTime(selectedItem.createdAt)}
              </span>
            </div>

            {/* Original Idea */}
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#111111] leading-snug mb-6 pr-8">
              &ldquo;{selectedItem.idea}&rdquo;
            </h2>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA] mb-8">
              <button
                type="button"
                id="modal-test-in-validator-btn"
                onClick={() => {
                  const idea = selectedItem.idea;
                  setSelectedItem(null);
                  onNavigate('/flaw/submit', idea);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E8481C] hover:bg-[#D03D14] text-white text-xs font-mono font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Stress-Test in Validator</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={(e) => handleOpenShare(selectedItem, e)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[#E0DEDA] hover:bg-stone-50 text-xs font-mono text-[#111111] transition-colors cursor-pointer"
                title="Share this idea report"
              >
                <Share2 className="w-3.5 h-3.5 text-[#5A5A5A]" />
                <span>Share Idea</span>
              </button>
            </div>

            {/* 1. Structural Flaws Section */}
            <div className="mb-8">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[#111111] flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-[#E8481C]" />
                <span>Identified Fatal Flaws ({selectedItem.flaws.length})</span>
              </h3>

              <div className="space-y-3">
                {selectedItem.flaws.map((flaw, fIdx) => (
                  <div
                    key={fIdx}
                    className="p-4 rounded-xl border border-[#E0DEDA] bg-stone-50/60"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h4 className="text-sm font-semibold text-[#111111]">{flaw.title}</h4>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                          flaw.severity === 'high'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : flaw.severity === 'medium'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-stone-200 text-stone-800 border border-stone-300'
                        }`}
                      >
                        {flaw.severity}
                      </span>
                    </div>
                    <p className="text-xs text-[#4A4A4A] leading-relaxed">{flaw.explanation}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Existing Competitors */}
            {selectedItem.similar_products && selectedItem.similar_products.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[#111111] flex items-center gap-2 mb-4">
                  <Building className="w-4 h-4 text-[#5A5A5A]" />
                  <span>Existing Competitors & Incumbents</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedItem.similar_products.map((prod, pIdx) => (
                    <div
                      key={pIdx}
                      className="p-3.5 rounded-xl border border-[#E0DEDA] bg-white"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-xs text-[#111111]">{prod.name}</span>
                        {prod.source_url && (
                          <a
                            href={prod.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#7A7A7A] hover:text-[#111111]"
                            title={`Open ${prod.name}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-[#5A5A5A] leading-relaxed">{prod.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Refined Pivot Versions */}
            {selectedItem.refined_versions && selectedItem.refined_versions.length > 0 && (
              <div>
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[#111111] flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-[#E8481C]" />
                  <span>Strategic Pivot Angles</span>
                </h3>

                <div className="space-y-3">
                  {selectedItem.refined_versions.map((pivot, pIdx) => (
                    <div
                      key={pIdx}
                      className="p-4 rounded-xl border border-[#E8481C]/30 bg-[#FFF9F6]"
                    >
                      <div className="text-xs font-serif font-bold text-[#111111] mb-2">
                        &ldquo;{pivot.idea}&rdquo;
                      </div>
                      <p className="text-xs text-[#5A5A5A] leading-relaxed">
                        <span className="font-semibold text-[#111111]">Strategic Rationale: </span>
                        {pivot.reasoning}
                      </p>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => {
                            const idea = pivot.idea;
                            setSelectedItem(null);
                            onNavigate('/flaw/submit', idea);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-[#E8481C] hover:text-[#D03D14] font-semibold"
                        >
                          <span>Test this pivot angle in Validator</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer onNavigate={onNavigate} />

      {/* Official Share Modal */}
      <ShareModal
        isOpen={Boolean(shareModalItem)}
        onClose={() => setShareModalItem(null)}
        ideaData={shareModalItem}
        onNavigate={onNavigate}
      />
    </div>
  );
}
