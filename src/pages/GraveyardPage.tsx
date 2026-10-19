import React, { useState, useEffect } from 'react';
import { Skull, ExternalLink, RefreshCw, ArrowLeft, Search, BookOpen, AlertTriangle } from 'lucide-react';
import { Footer } from '../components/Footer.tsx';
import { GraveyardStartup } from '../types.ts';

interface GraveyardPageProps {
  onNavigate: (path: string, initialIdea?: string) => void;
}

export function GraveyardPage({ onNavigate }: GraveyardPageProps) {
  const [graveyardItems, setGraveyardItems] = useState<GraveyardStartup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStartup, setSelectedStartup] = useState<GraveyardStartup | null>(null);

  useEffect(() => {
    const sampleGraveyard: GraveyardStartup[] = [
      {
        name: 'Quibi',
        founded_year: 2018,
        closed_year: 2020,
        reported_cause: 'Raised $1.75B for short-form mobile video but misjudged consumer viewing habits during lockdown and lack of TV casting support.',
        lesson_for_this_idea: 'Validate core distribution channels before securing massive capital commitments.',
        source_urls: ['https://techcrunch.com/2020/10/21/quibi-is-officially-shutting-down/']
      },
      {
        name: 'Juicero',
        founded_year: 2013,
        closed_year: 2017,
        reported_cause: 'Created a $700 Wi-Fi connected juice press whose proprietary produce packs could be squeezed by hand just as effectively.',
        lesson_for_this_idea: 'Ensure hardware complexity genuinely solves a problem rather than adding friction and cost.',
        source_urls: ['https://www.theverge.com/2017/9/1/16242558/juicero-shutting-down-company-history']
      },
      {
        name: 'Theranos',
        founded_year: 2003,
        closed_year: 2018,
        reported_cause: 'Promised revolutionary blood testing from a single drop using proprietary machines that ultimately relied on standard commercial analyzers.',
        lesson_for_this_idea: 'Absolute technical transparency is mandatory when claims defy prevailing scientific constraints.',
        source_urls: ['https://www.bbc.com/news/world-us-canada-45185966']
      },
      {
        name: 'Jawbone',
        founded_year: 1999,
        closed_year: 2017,
        reported_cause: 'Pioneered wearable fitness trackers but suffered from severe hardware manufacturing defects and intense margin pressure from Fitbit and Apple.',
        lesson_for_this_idea: 'Build robust supply chain redundancies and margin safety buffers against well-capitalized incumbents.',
        source_urls: ['https://www.theverge.com/2017/7/6/15931758/jawbone-shutting-down-liquidation-up-fitness-tracker']
      },
      {
        name: 'Essential Products',
        founded_year: 2015,
        closed_year: 2020,
        reported_cause: 'Founded by Android creator Andy Rubin; released an innovative modular smartphone that faced lukewarm carrier distribution and saturated competition.',
        lesson_for_this_idea: 'Differentiate with software ecosystem lock-in rather than standalone modular hardware gimmicks.',
        source_urls: ['https://www.theverge.com/2020/2/12/21134907/essential-phone-shut-down-andy-rubin-ph-1']
      },
      {
        name: 'Streamlabs Mixer',
        founded_year: 2016,
        closed_year: 2020,
        reported_cause: 'Microsoft spent $50M+ acquiring and rebranding Mixer to compete with Twitch, but failed to migrate top streamers and active viewers.',
        lesson_for_this_idea: 'Creator network effects create insurmountable switching costs; features alone cannot steal audiences.',
        source_urls: ['https://news.microsoft.com/2020/06/22/microsoft-to-close-mixer-and-partner-with-facebook-gaming/']
      }
    ];

    let initialList = sampleGraveyard;
    try {
      const stored = sessionStorage.getItem('flawlesz_latest_graveyard');
      if (stored) {
        const parsed: GraveyardStartup[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const names = new Set(parsed.map((p) => p.name.toLowerCase()));
          initialList = [...parsed, ...sampleGraveyard.filter((s) => !names.has(s.name.toLowerCase()))];
        }
      }
    } catch {}

    setGraveyardItems(initialList);
    setLoading(false);
  }, []);

  const filteredItems = graveyardItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.reported_cause.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.lesson_for_this_idea.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#E9ECEA] text-[#111111] flex flex-col justify-between selection:bg-[#E8481C] selection:text-white font-mono">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        {/* Back Navigation */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate('/flaw')}
            className="inline-flex items-center gap-2 text-xs font-mono text-[#5A5A5A] hover:text-[#111111] transition-colors cursor-pointer py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Overview</span>
          </button>
        </div>

        {/* Header */}
        <div className="border-b border-[#D0CDC7] pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-black/10 text-[#111111] text-xs font-mono mb-4">
            <Skull className="w-4 h-4 text-[#E8481C]" />
            <span>Post-Mortem Archives</span>
          </div>
          <h1
            className="text-3xl sm:text-5xl font-bold tracking-tight text-[#111111] uppercase"
            style={{ fontFamily: '"Pixelify Sans", "Press Start 2P", monospace' }}
          >
            The Startup Graveyard
          </h1>
          <p className="mt-3 text-sm text-[#5A5A5A] font-sans max-w-2xl leading-relaxed">
            Explore post-mortems of notable startups that tried similar concepts and shut down. Learn from their structural vulnerabilities to protect your own initiatives before building.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 flex items-center gap-3 bg-white border border-[#D0CDC7] rounded-xl px-4 py-3 shadow-xs max-w-xl">
          <Search className="w-4 h-4 text-[#5A5A5A] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search failed startups, causes, or lessons..."
            className="w-full text-xs sm:text-sm bg-transparent border-0 focus:ring-0 focus:outline-none text-[#111111]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-[#5A5A5A] hover:text-[#111111]">
              Clear
            </button>
          )}
        </div>

        {/* Grid of Graves */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[#5A5A5A] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#E8481C]" />
            <span>Excavating archives...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white border border-[#D0CDC7] rounded-2xl p-12 text-center space-y-3">
            <Skull className="w-10 h-10 text-[#5A5A5A] mx-auto opacity-50" />
            <h3 className="font-bold text-sm text-[#111111]">No matching startups found</h3>
            <p className="text-xs text-[#5A5A5A]">Try adjusting your search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item, index) => (
              <div
                key={index}
                onClick={() => setSelectedStartup(item)}
                className="group cursor-pointer bg-white border-2 border-[#111111] rounded-xl p-6 shadow-[4px_4px_0px_0px_#111111] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#111111] transition-all flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                {/* Pixel Tombstone Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-stone-100 text-[10px] font-mono font-semibold text-[#5A5A5A] border border-stone-200">
                      <span>R.I.P.</span>
                      <span>{item.founded_year || '????'}–{item.closed_year || '????'}</span>
                    </div>
                    <h2
                      className="text-xl font-black text-[#111111] tracking-tight group-hover:text-[#E8481C] transition-colors pt-1"
                      style={{ fontFamily: '"Pixelify Sans", "Press Start 2P", monospace' }}
                    >
                      {item.name}
                    </h2>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-stone-100 border border-[#111111] flex items-center justify-center shrink-0 group-hover:bg-[#E8481C] group-hover:text-white transition-colors">
                    <Skull className="w-5 h-5" />
                  </div>
                </div>

                {/* Reported Cause */}
                <div className="space-y-1.5 flex-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#7A7A7A] font-bold">Reported Cause of Failure</div>
                  <p className="text-xs text-[#333333] font-sans leading-relaxed line-clamp-3">
                    {item.reported_cause}
                  </p>
                </div>

                {/* Lesson */}
                <div className="pt-3 border-t border-[#E0DEDA] space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#E8481C] font-bold">Defense Lesson</div>
                  <p className="text-xs text-[#111111] font-sans italic leading-relaxed line-clamp-2">
                    "{item.lesson_for_this_idea}"
                  </p>
                </div>

                {/* Footer link */}
                <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-[#5A5A5A] group-hover:text-[#111111]">
                  <span>View Post-Mortem</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for detailed startup view */}
      {selectedStartup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#111111] rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-[8px_8px_0px_0px_#111111] space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-stone-100 border border-stone-300 text-[#5A5A5A]">
                  {selectedStartup.founded_year || '????'} – {selectedStartup.closed_year || '????'}
                </span>
                <h3
                  className="text-2xl font-black text-[#111111] mt-3"
                  style={{ fontFamily: '"Pixelify Sans", "Press Start 2P", monospace' }}
                >
                  {selectedStartup.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedStartup(null)}
                className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#111111] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 font-sans text-sm">
              <div className="space-y-1.5 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div className="text-xs font-mono font-bold uppercase text-[#7A7A7A]">Why It Failed</div>
                <p className="text-[#333333] leading-relaxed">{selectedStartup.reported_cause}</p>
              </div>

              <div className="space-y-1.5 bg-[#FFF8F6] p-4 rounded-xl border border-[#E8481C]/30">
                <div className="text-xs font-mono font-bold uppercase text-[#E8481C]">Defense Lesson for Founders</div>
                <p className="text-[#111111] font-medium leading-relaxed">"{selectedStartup.lesson_for_this_idea}"</p>
              </div>

              {selectedStartup.source_urls && selectedStartup.source_urls.length > 0 && (
                <div className="space-y-1 pt-2">
                  <div className="text-xs font-mono font-bold uppercase text-[#7A7A7A]">Verified Source Archive</div>
                  {selectedStartup.source_urls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-[#E8481C] hover:underline flex items-center gap-1.5 truncate"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{url}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#E0DEDA] flex justify-end">
              <button
                onClick={() => setSelectedStartup(null)}
                className="px-5 py-2.5 rounded-xl bg-[#111111] text-white text-xs font-mono font-bold hover:bg-black cursor-pointer"
              >
                Close Archive
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
