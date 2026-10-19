import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Play, Pause, Square, RotateCcw, Sparkles, X, ChevronUp, ChevronDown, FastForward } from 'lucide-react';
import { ThinkingOrb } from 'thinking-orbs';
import { motion, AnimatePresence } from 'motion/react';
import { ttsManager, TTSState } from '../utils/audioTTS.ts';

interface AudioTeardownPlayerProps {
  onClose?: () => void;
}

export const AudioTeardownPlayer: React.FC<AudioTeardownPlayerProps> = ({ onClose }) => {
  const [state, setState] = useState<TTSState>(ttsManager.getState());
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = ttsManager.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const handleTogglePlay = () => {
    if (state.isPlaying) {
      ttsManager.pause();
    } else if (state.isPaused) {
      ttsManager.resume();
    } else if (state.currentText) {
      ttsManager.play(state.currentText);
    }
  };

  const handleClose = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    ttsManager.close();
    if (onClose) onClose();
  };

  const handleStop = () => {
    ttsManager.stop();
  };

  const handleReplay = () => {
    if (state.currentText) {
      ttsManager.play(state.currentText);
    }
  };

  const handleSpeedChange = () => {
    const rates = [0.9, 1.0, 1.25];
    const currentIndex = rates.indexOf(state.playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    ttsManager.setPlaybackRate(nextRate);
  };

  return (
    <AnimatePresence>
      {state.isVisible && (
        <motion.div
          key="audio-player-bar"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          id="tts-audio-player-bar"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl bg-[#FFFFFF] border border-[#111111] shadow-2xl rounded-2xl p-3 sm:p-4 text-[#111111]"
        >
        {isMinimized ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E8481C] animate-pulse"></span>
              <span className="text-xs font-semibold text-[#111111] truncate">
                {state.isPlaying ? 'Reading in Bold Male Voice...' : 'Audio Paused'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                id="tts-minimized-toggle-btn"
                type="button"
                onClick={handleTogglePlay}
                className="cursor-pointer p-1.5 rounded-lg bg-[#111111] text-[#FFFFFF] hover:bg-[#333333] transition-colors"
                title={state.isPlaying ? 'Pause' : 'Resume'}
              >
                {state.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(false)}
                className="cursor-pointer p-1.5 rounded-lg border border-[#E0DEDA] hover:border-[#111111] text-[#5A5A5A]"
                title="Expand Player"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                id="tts-minimized-close-btn"
                type="button"
                onClick={handleClose}
                className="cursor-pointer p-1.5 rounded-lg border border-[#E0DEDA] hover:border-[#111111] text-[#5A5A5A] hover:text-[#111111] hover:bg-[#F2EFE9] transition-colors"
                title="Close audio player"
                aria-label="Close audio player"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header info row */}
            <div className="flex items-center justify-between gap-2 border-b border-[#E0DEDA]/60 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-1 rounded-md bg-[#E8481C]/10 text-[#E8481C] flex-shrink-0">
                  <Volume2 className="w-4 h-4" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                      Bold Male Voice Narration
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#F2EFE9] text-[#5A5A5A] rounded border border-[#E0DEDA]">
                      Fenrir Profile • Assertive
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5A5A5A] truncate mt-0.5">
                    {state.isLoading
                      ? 'Synthesizing voice audio...'
                      : (state.currentText || '').slice(0, 75) + '...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  id="tts-minimize-btn"
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="cursor-pointer p-1 text-[#7A7A7A] hover:text-[#111111] rounded hover:bg-[#F2EFE9] transition-colors"
                  title="Minimize"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  id="tts-close-btn"
                  type="button"
                  onClick={handleClose}
                  className="cursor-pointer p-1.5 text-[#7A7A7A] hover:text-[#111111] rounded-md hover:bg-[#F2EFE9] transition-colors flex items-center justify-center"
                  title="Close audio player"
                  aria-label="Close audio player"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress track */}
            <div className="space-y-1">
              <div className="w-full bg-[#E0DEDA] h-1.5 rounded-full overflow-hidden relative">
                <motion.div
                  className="bg-[#E8481C] h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, state.progress * 100))}%` }}
                  transition={{ ease: 'linear', duration: 0.15 }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[#7A7A7A]">
                <span>{formatTime(state.currentTime)}</span>
                <span>{state.duration > 0 ? formatTime(state.duration) : '--:--'}</span>
              </div>
            </div>

            {/* Controls bar */}
            <div className="flex items-center justify-between gap-3 pt-1">
              {/* Equalizer animation */}
              <div className="flex items-center gap-1 h-5 px-2">
                {[40, 90, 60, 100, 70, 85, 45].map((h, i) => (
                  <motion.span
                    key={i}
                    className="w-1 bg-[#111111] rounded-full"
                    animate={{
                      height: state.isPlaying ? [`${Math.max(4, h * 0.2)}px`, `${h * 0.18}px`, `${Math.max(4, h * 0.12)}px`] : '4px',
                      opacity: state.isPlaying ? 1 : 0.4,
                    }}
                    transition={{
                      repeat: Infinity,
                      repeatType: 'reverse',
                      duration: 0.35 + i * 0.08,
                    }}
                  />
                ))}
              </div>

              {/* Main action buttons */}
              <div className="flex items-center gap-2">
                <button
                  id="tts-replay-btn"
                  type="button"
                  onClick={handleReplay}
                  disabled={state.isLoading}
                  className="cursor-pointer p-2 rounded-xl border border-[#E0DEDA] hover:border-[#111111] text-[#5A5A5A] hover:text-[#111111] transition-colors"
                  title="Replay from start"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  id="tts-main-play-btn"
                  type="button"
                  onClick={handleTogglePlay}
                  disabled={state.isLoading}
                  className="cursor-pointer px-4 py-2 rounded-xl bg-[#111111] hover:bg-[#333333] text-[#FFFFFF] font-medium text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
                >
                  {state.isLoading ? (
                    <>
                      <ThinkingOrb state="weaving" size={20} theme="dark" />
                      <span>Synthesizing...</span>
                    </>
                  ) : state.isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Resume</span>
                    </>
                  )}
                </button>

                <button
                  id="tts-stop-btn"
                  type="button"
                  onClick={handleStop}
                  className="cursor-pointer p-2 rounded-xl border border-[#E0DEDA] hover:border-[#111111] text-[#5A5A5A] hover:text-[#111111] transition-colors"
                  title="Stop"
                >
                  <Square className="w-4 h-4" />
                </button>
              </div>

              {/* Speed multiplier button */}
              <button
                id="tts-speed-btn"
                type="button"
                onClick={handleSpeedChange}
                className="cursor-pointer px-2.5 py-1.5 rounded-lg border border-[#E0DEDA] hover:border-[#111111] text-xs font-mono font-medium text-[#111111] flex items-center gap-1 transition-colors"
                title="Change playback speed"
              >
                <FastForward className="w-3.5 h-3.5 text-[#5A5A5A]" />
                <span>{state.playbackRate}x</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
      )}
    </AnimatePresence>
  );
};
