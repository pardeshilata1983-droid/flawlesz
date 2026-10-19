import React, { useState, useEffect } from 'react';
import { AlertCircle, Volume2, Square } from 'lucide-react';
import { Flaw } from '../types.ts';
import { ttsManager, TTSState } from '../utils/audioTTS.ts';

interface FlawCardProps {
  flaw?: Flaw;
  index?: number;
}

export const FlawCard: React.FC<FlawCardProps> = ({ flaw, index = 0 }) => {
  const [ttsState, setTtsState] = useState<TTSState>(ttsManager.getState());

  useEffect(() => {
    const unsub = ttsManager.subscribe((s) => setTtsState(s));
    return () => unsub();
  }, []);

  const safeFlaw = flaw || {
    title: 'Diagnosed Vulnerability',
    explanation: 'Potential operational or market risk factor identified during idea analysis.',
    severity: 'medium' as const,
  };

  const title = safeFlaw.title || 'Diagnosed Vulnerability';
  const explanation = safeFlaw.explanation || 'Detailed risk factor identified.';
  const severity = (safeFlaw.severity === 'high' || safeFlaw.severity === 'low' || safeFlaw.severity === 'medium')
    ? safeFlaw.severity
    : 'medium';
  const isHigh = severity === 'high';

  const speechScript = `Flaw: ${title}. Severity: ${severity}. ${explanation}`;
  const isCurrentlyPlaying = ttsState.isPlaying && ttsState.currentText === speechScript;

  const handleListen = () => {
    if (isCurrentlyPlaying) {
      ttsManager.stop();
    } else {
      ttsManager.play(speechScript);
    }
  };

  return (
    <div
      id={`flaw-card-${index}`}
      className={`bg-[#FFFFFF] border rounded-lg p-5 flex flex-col justify-between transition-all ${
        isCurrentlyPlaying ? 'border-[#111111] ring-2 ring-[#111111]/10' : 'border-[#E0DEDA]'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle
              className={`w-4 h-4 flex-shrink-0 ${isHigh ? 'text-[#E8481C]' : 'text-[#5A5A5A]'}`}
              strokeWidth={1.5}
            />
            <span className="text-xs font-mono text-[#5A5A5A]">
              Risk #{index + 1}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Severity Badge: Only high severity uses orange-red #E8481C; others stay neutral black/gray */}
            {isHigh ? (
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold bg-[#E8481C] text-white px-2 py-0.5 rounded">
                High Severity
              </span>
            ) : (
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#111111] bg-[#F5F4F0] border border-[#E0DEDA] px-2 py-0.5 rounded">
                {severity} Severity
              </span>
            )}
          </div>
        </div>

        <h4 className="font-bold text-base text-[#111111] leading-snug mb-2 font-flaw tracking-tight">
          {title}
        </h4>

        <p className="text-sm text-[#5A5A5A] leading-relaxed">
          {explanation}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-[#E0DEDA]/60 flex items-center justify-between">
        <button
          id={`flaw-listen-btn-${index}`}
          type="button"
          onClick={handleListen}
          className={`cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            isCurrentlyPlaying
              ? 'bg-[#111111] text-[#FFFFFF]'
              : 'bg-[#F2EFE9] text-[#111111] hover:bg-[#E0DEDA]'
          }`}
          title="Listen in bold male voice"
        >
          {isCurrentlyPlaying ? (
            <>
              <Square className="w-3 h-3 fill-current" />
              <span>Stop Voice</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-[#5A5A5A]" />
              <span>Listen</span>
            </>
          )}
        </button>

        <span className="text-[10px] font-mono text-[#7A7A7A]">
          {isCurrentlyPlaying ? 'Speaking...' : 'Bold Voice'}
        </span>
      </div>
    </div>
  );
};
