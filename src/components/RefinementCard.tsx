import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Sparkles, Volume2, Square } from 'lucide-react';
import { RefinedVersion } from '../types.ts';
import { ttsManager, TTSState } from '../utils/audioTTS.ts';

interface RefinementCardProps {
  version?: RefinedVersion;
  refinement?: RefinedVersion;
  index?: number;
  onSelect?: (ideaText: string) => void;
  disabled?: boolean;
}

export const RefinementCard: React.FC<RefinementCardProps> = ({
  version,
  refinement,
  index = 0,
  onSelect,
  disabled
}) => {
  const [ttsState, setTtsState] = useState<TTSState>(ttsManager.getState());

  useEffect(() => {
    const unsub = ttsManager.subscribe((s) => setTtsState(s));
    return () => unsub();
  }, []);

  const item = version || refinement || {
    idea: 'Pivoted implementation strategy.',
    reasoning: 'Mitigates identified competitive and operational roadblocks.',
  };

  const idea = item.idea || 'Refined implementation strategy.';
  const reasoning = item.reasoning || 'Mitigates identified competitive roadblocks.';

  const speechScript = `Refined direction: ${idea}. Strategic reasoning: ${reasoning}`;
  const isCurrentlyPlaying = ttsState.isPlaying && ttsState.currentText === speechScript;

  const handleListen = () => {
    if (isCurrentlyPlaying) {
      ttsManager.stop();
    } else {
      ttsManager.play(speechScript);
    }
  };

  const handleIterate = () => {
    if (onSelect) {
      onSelect(idea);
    }
  };

  return (
    <div
      id={`refinement-card-${index}`}
      className={`bg-[#FFFFFF] border rounded-lg p-5 flex flex-col justify-between transition-all ${
        isCurrentlyPlaying ? 'border-[#111111] ring-2 ring-[#111111]/10' : 'border-[#E0DEDA]'
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#111111]" strokeWidth={1.5} />
            <span className="text-xs font-mono text-[#5A5A5A] uppercase tracking-wider">
              Refined Direction #{index + 1}
            </span>
          </div>

          <button
            id={`refinement-listen-btn-${index}`}
            type="button"
            onClick={handleListen}
            className={`cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              isCurrentlyPlaying
                ? 'bg-[#111111] text-[#FFFFFF]'
                : 'bg-[#F2EFE9] text-[#111111] hover:bg-[#E0DEDA]'
            }`}
            title="Listen to refined direction in bold male voice"
          >
            {isCurrentlyPlaying ? (
              <>
                <Square className="w-2.5 h-2.5 fill-current" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3 h-3 text-[#5A5A5A]" />
                <span>Listen</span>
              </>
            )}
          </button>
        </div>

        <h4 className="font-semibold text-base text-[#111111] leading-snug mb-3">
          {idea}
        </h4>

        <div className="bg-[#F5F4F0] border border-[#E0DEDA] rounded p-3 mb-4">
          <span className="block text-[11px] font-mono text-[#5A5A5A] uppercase mb-1">
            Reasoning & Defensibility:
          </span>
          <p className="text-xs text-[#5A5A5A] leading-relaxed">
            {reasoning}
          </p>
        </div>
      </div>

      <div className="pt-2">
        <button
          id={`refinement-select-btn-${index}`}
          onClick={handleIterate}
          disabled={disabled}
          className="cursor-pointer w-full text-xs font-medium border border-[#111111] text-[#111111] bg-transparent hover:bg-black/5 transition-colors rounded-lg py-2.5 px-3 flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <span>Iterate with this refined version</span>
          <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};
