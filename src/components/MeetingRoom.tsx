import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Pause,
  Play,
  SkipForward,
  Mic,
  MicOff,
  Square,
  Send,
  Loader2,
  AlertCircle,
  Sparkles,
  Users,
  Hand
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TeamMember } from '../pages/TeammatesOfficePage.tsx';
import { meetingVoice } from '../services/meetingVoice.ts';
import { getStoredToken } from '../services/api.ts';
import { GlowingEffect } from './ui/glowing-effect.tsx';

export interface MeetingTranscriptEntry {
  id: string;
  speakerName: string;
  speakerRole: string;
  provider?: string;
  text: string;
  timestamp: string;
  isUser?: boolean;
  isCoordinator?: boolean;
  isError?: boolean;
}

export interface MeetingRoomProps {
  topic: string;
  team: TeamMember[];
  onEndMeeting: (savedSession?: any) => void;
  onUpdateOfficeVisuals: (state: {
    speakingRole: string | null;
    speakingTextSnippet: string | null;
    pendingRole: string | null;
    errorRoles: Record<string, string>;
  }) => void;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({
  topic,
  team,
  onEndMeeting,
  onUpdateOfficeVisuals
}) => {
  const [meetingId, setMeetingId] = useState<string>('');
  const [transcript, setTranscript] = useState<MeetingTranscriptEntry[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [currentSpeaker, setCurrentSpeaker] = useState<{ name: string; role: string } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(meetingVoice.getMuted());
  const [isPrefetching, setIsPrefetching] = useState<boolean>(false);
  const [meetingStatus, setMeetingStatus] = useState<'initializing' | 'active' | 'completed' | 'stopped'>('initializing');
  const [errorRoles, setErrorRoles] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // User interruption states
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);
  const [micInterimText, setMicInterimText] = useState<string>('');
  const [micErrorToast, setMicErrorToast] = useState<string | null>(null);
  const [typingInput, setTypingInput] = useState<string>('');
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);

  // Prefetched turn buffer
  const prefetchedTurnRef = useRef<{
    turnIndex: number;
    text: string;
    speakerName: string;
    speakerRole: string;
    success: boolean;
    error?: string;
  } | null>(null);

  const isStoppedRef = useRef<boolean>(false);
  const transcriptRef = useRef<MeetingTranscriptEntry[]>([]);
  transcriptRef.current = transcript;

  const currentCancelVoiceRef = useRef<(() => void) | null>(null);
  const transcriptBottomRef = useRef<HTMLDivElement>(null);

  // Maximum turns: 2 rounds of team members + 1 coordinator summary (capped at 12)
  const totalTurnsPlanned = Math.min(12, team.length * 2 + 1);

  // Helper to determine speaker for a given turn index
  const getSpeakerForTurn = useCallback((turnIdx: number): { name: string; role: string; provider: string; useManaged?: boolean } => {
    const teamSize = team.length;
    if (turnIdx < teamSize) {
      // Round 1
      const member = team[turnIdx];
      return { name: member.name, role: member.role, provider: member.provider, useManaged: member.useManaged };
    } else if (turnIdx < teamSize * 2) {
      // Round 2
      const member = team[turnIdx - teamSize];
      return { name: member.name, role: member.role, provider: member.provider, useManaged: member.useManaged };
    } else {
      // Coordinator closing
      return { name: 'Coordinator', role: 'Coordinator', provider: 'groq', useManaged: true };
    }
  }, [team]);

  // Sync office scene visual states
  useEffect(() => {
    onUpdateOfficeVisuals({
      speakingRole: currentSpeaker ? currentSpeaker.role : null,
      speakingTextSnippet: isSpeaking && transcript.length > 0 ? transcript[transcript.length - 1]?.text : null,
      pendingRole: isPrefetching && !currentSpeaker ? (getSpeakerForTurn(currentTurnIndex)?.role || null) : null,
      errorRoles
    });
  }, [currentSpeaker, isSpeaking, transcript, isPrefetching, currentTurnIndex, errorRoles, getSpeakerForTurn, onUpdateOfficeVisuals]);

  // Clean up on unmount or page exit
  useEffect(() => {
    return () => {
      isStoppedRef.current = true;
      meetingVoice.stop();
      meetingVoice.stopSpeechRecognition();
      onUpdateOfficeVisuals({
        speakingRole: null,
        speakingTextSnippet: null,
        pendingRole: null,
        errorRoles: {}
      });
    };
  }, [onUpdateOfficeVisuals]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, micInterimText]);

  // Start Meeting lifecycle
  useEffect(() => {
    startMeetingFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startMeetingFlow = async () => {
    isStoppedRef.current = false;
    setMeetingStatus('initializing');
    setGeneralError(null);

    // Mobile audio unlock primer
    meetingVoice.unlockAudio();

    try {
      const token = getStoredToken();
      const res = await fetch('/api/teammates/meeting/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          topic,
          team: team.slice(0, 5)
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start meeting.');
      }

      setMeetingId(data.meetingId);
      setMeetingStatus('active');

      // Kick off Turn 0
      executeTurn(0, data.meetingId);
    } catch (err: any) {
      console.error('[MEETING] Init failed:', err);
      setGeneralError(err.message || 'Failed to initialize meeting session.');
      setMeetingStatus('stopped');
    }
  };

  // Fetch turn from server
  const fetchTurnFromServer = async (turnIdx: number, mId: string) => {
    const speaker = getSpeakerForTurn(turnIdx);
    const round = turnIdx < team.length ? 1 : 2;

    const token = getStoredToken();
    const res = await fetch('/api/teammates/meeting/turn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        meetingId: mId,
        topic,
        round,
        turnIndex: turnIdx,
        speaker,
        team,
        transcript: transcriptRef.current.map(t => ({
          speakerName: t.speakerName,
          speakerRole: t.speakerRole,
          text: t.text
        }))
      })
    });

    return await res.json();
  };

  // Execute turn and trigger prefetching for next turn
  const executeTurn = async (turnIdx: number, mId: string) => {
    if (isStoppedRef.current) return;

    if (turnIdx >= totalTurnsPlanned) {
      completeMeeting(mId);
      return;
    }

    setCurrentTurnIndex(turnIdx);
    const speaker = getSpeakerForTurn(turnIdx);

    let turnData: any = null;

    // Check if we have a valid prefetched turn ready
    if (prefetchedTurnRef.current && prefetchedTurnRef.current.turnIndex === turnIdx) {
      turnData = prefetchedTurnRef.current;
      prefetchedTurnRef.current = null;
    } else {
      setIsPrefetching(true);
      try {
        turnData = await fetchTurnFromServer(turnIdx, mId);
      } catch (err: any) {
        turnData = { success: false, error: err.message, speakerName: speaker.name, speakerRole: speaker.role };
      } finally {
        setIsPrefetching(false);
      }
    }

    if (isStoppedRef.current) return;

    // Handle turn failure honestly
    if (!turnData.success) {
      setErrorRoles(prev => ({
        ...prev,
        [speaker.role]: turnData.error || 'Provider execution failed'
      }));

      const errorEntry: MeetingTranscriptEntry = {
        id: `err-${Date.now()}-${turnIdx}`,
        speakerName: speaker.name,
        speakerRole: speaker.role,
        text: `⚠️ [${speaker.name} unavailable: ${turnData.error || 'Failed to generate response'}]`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };

      setTranscript(prev => [...prev, errorEntry]);

      // Brief delay before continuing to next speaker
      setTimeout(() => {
        if (!isStoppedRef.current) {
          executeTurn(turnIdx + 1, mId);
        }
      }, 1500);
      return;
    }

    // Add successfully generated text to transcript
    const newEntry: MeetingTranscriptEntry = {
      id: `entry-${Date.now()}-${turnIdx}`,
      speakerName: speaker.name,
      speakerRole: speaker.role,
      provider: speaker.provider,
      text: turnData.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCoordinator: speaker.role === 'Coordinator'
    };

    setTranscript(prev => [...prev, newEntry]);
    setCurrentSpeaker({ name: speaker.name, role: speaker.role });
    setIsSpeaking(true);

    // PREFETCH: while current turn plays voice, prefetch the next turn in background!
    const nextTurnIdx = turnIdx + 1;
    if (nextTurnIdx < totalTurnsPlanned && !isStoppedRef.current) {
      fetchTurnFromServer(nextTurnIdx, mId)
        .then(nextData => {
          if (!isStoppedRef.current) {
            prefetchedTurnRef.current = {
              turnIndex: nextTurnIdx,
              ...nextData
            };
          }
        })
        .catch(err => {
          console.warn('[MEETING PREFETCH] Could not prefetch next turn:', err);
        });
    }

    // Play Voice using Web Speech API (with captions fallback and distinct pitch/rate)
    const cancelVoice = meetingVoice.speakTurn(
      speaker.name,
      speaker.role,
      turnData.text,
      () => {
        setIsSpeaking(true);
      },
      () => {
        setIsSpeaking(false);
        setCurrentSpeaker(null);
        if (!isStoppedRef.current) {
          executeTurn(turnIdx + 1, mId);
        }
      }
    );

    currentCancelVoiceRef.current = cancelVoice;
  };

  // Complete Meeting and Save to Session History
  const completeMeeting = async (mId: string) => {
    setMeetingStatus('completed');
    setIsSpeaking(false);
    setCurrentSpeaker(null);
    meetingVoice.stop();

    try {
      const token = getStoredToken();
      const lastEntry = transcriptRef.current[transcriptRef.current.length - 1];
      const summaryText = lastEntry?.isCoordinator ? lastEntry.text : 'Executive meeting concluded.';

      const res = await fetch('/api/teammates/meeting/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          meetingId: mId,
          topic,
          team,
          transcript: transcriptRef.current,
          summary: summaryText
        })
      });

      const data = await res.json();
      if (data.session) {
        onEndMeeting(data.session);
      }
    } catch (err) {
      console.error('[MEETING] Error saving transcript:', err);
    }
  };

  // Stop / End meeting prematurely
  const handleStopMeeting = async () => {
    isStoppedRef.current = true;
    meetingVoice.stop();
    meetingVoice.stopSpeechRecognition();
    setIsSpeaking(false);
    setCurrentSpeaker(null);
    setMeetingStatus('stopped');

    if (transcriptRef.current.length > 0) {
      completeMeeting(meetingId);
    } else {
      onEndMeeting();
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    meetingVoice.setMuted(nextMuted);
  };

  // Toggle Pause / Resume
  const handleTogglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      meetingVoice.resume();
    } else {
      setIsPaused(true);
      meetingVoice.pause();
    }
  };

  // Skip speaker to next turn immediately
  const handleSkipSpeaker = () => {
    meetingVoice.stop();
    setIsSpeaking(false);
    setCurrentSpeaker(null);
    if (!isStoppedRef.current && currentTurnIndex < totalTurnsPlanned) {
      executeTurn(currentTurnIndex + 1, meetingId);
    }
  };

  // User Interruption handler
  const handleUserInterruption = (userMessage: string) => {
    if (!userMessage.trim()) return;

    // 1. Immediately halt current speaker
    meetingVoice.stop();
    setIsSpeaking(false);
    setCurrentSpeaker(null);

    // 2. Clear any prefetched turns because context has changed
    prefetchedTurnRef.current = null;

    // 3. Append user comment to transcript
    const userEntry: MeetingTranscriptEntry = {
      id: `usr-${Date.now()}`,
      speakerName: 'You (Founder)',
      speakerRole: 'User',
      text: userMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isUser: true
    };

    setTranscript(prev => [...prev, userEntry]);
    setTypingInput('');
    setIsHandRaised(false);
    setIsListeningMic(false);
    setMicInterimText('');

    // 4. Continue meeting — next speaker responds directly to user comment
    if (!isStoppedRef.current && currentTurnIndex < totalTurnsPlanned) {
      setTimeout(() => {
        executeTurn(currentTurnIndex + 1, meetingId);
      }, 500);
    }
  };

  // Start Speech Recognition
  const handleStartMic = () => {
    setIsHandRaised(true);
    setMicErrorToast(null);

    const started = meetingVoice.startSpeechRecognition(
      (interim) => {
        setMicInterimText(interim);
      },
      (finalText) => {
        setMicInterimText('');
        handleUserInterruption(finalText);
      },
      (errorMsg) => {
        setMicErrorToast(errorMsg);
        setIsListeningMic(false);
      },
      () => {
        setIsListeningMic(false);
      }
    );

    if (started) {
      setIsListeningMic(true);
      // Immediately pause speech while user speaks
      meetingVoice.stop();
    }
  };

  const handleStopMic = () => {
    meetingVoice.stopSpeechRecognition();
    setIsListeningMic(false);
    if (micInterimText.trim()) {
      handleUserInterruption(micInterimText);
    }
  };

  return (
    <div className="w-full bg-[#FFFFFF] border border-[#E0DEDA] rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* ─────────────────────────────────────────────────────────────
          TOP TOOLBAR & CONTROLS
          Icon-only controls with tooltips: Mute, Pause, Skip, Raise Hand, End
          ───────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-[#FAF9F5] border-b border-[#E0DEDA] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">
            Executive Roundtable Meeting
          </span>
          <span className="text-xs text-[#5A5A5A] font-mono">
            Turn {Math.min(currentTurnIndex + 1, totalTurnsPlanned)} / {totalTurnsPlanned}
          </span>
        </div>

        {/* Meeting Icon-Only Controls Bar */}
        <div className="flex items-center gap-1.5" role="toolbar" aria-label="Meeting audio controls">
          {/* Mute Voice */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              isMuted
                ? 'bg-rose-50 border-rose-300 text-rose-600'
                : 'bg-white border-[#E0DEDA] text-[#222222] hover:bg-[#F2EFE9]'
            }`}
            title={isMuted ? 'Unmute voice' : 'Mute voice (continue as text captions)'}
            aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Pause / Resume */}
          <button
            type="button"
            onClick={handleTogglePause}
            className="p-2 rounded-lg bg-white border border-[#E0DEDA] text-[#222222] hover:bg-[#F2EFE9] transition-colors cursor-pointer"
            title={isPaused ? 'Resume discussion' : 'Pause discussion'}
            aria-label={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play size={15} /> : <Pause size={15} />}
          </button>

          {/* Skip Speaker */}
          <button
            type="button"
            onClick={handleSkipSpeaker}
            className="p-2 rounded-lg bg-white border border-[#E0DEDA] text-[#222222] hover:bg-[#F2EFE9] transition-colors cursor-pointer"
            title="Skip current speaker"
            aria-label="Skip current speaker"
          >
            <SkipForward size={15} />
          </button>

          {/* Raise Hand / Mic */}
          <button
            type="button"
            onClick={isListeningMic ? handleStopMic : handleStartMic}
            className={`p-2 rounded-lg border transition-all cursor-pointer ${
              isListeningMic
                ? 'bg-[#E8481C] text-white border-[#E8481C] animate-pulse shadow-xs'
                : isHandRaised
                ? 'bg-amber-100 border-amber-400 text-amber-800'
                : 'bg-white border-[#E0DEDA] text-[#222222] hover:bg-[#F2EFE9]'
            }`}
            title={isListeningMic ? 'Stop listening' : 'Raise hand to speak (Voice interruption)'}
            aria-label={isListeningMic ? 'Stop listening' : 'Raise hand with microphone'}
          >
            {isListeningMic ? <Mic size={15} /> : <Hand size={15} />}
          </button>

          {/* End Meeting */}
          <button
            type="button"
            onClick={handleStopMeeting}
            className="p-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white border border-rose-600 transition-colors cursor-pointer ml-1"
            title="End meeting & save transcript"
            aria-label="End meeting"
          >
            <Square size={14} className="fill-current" />
          </button>
        </div>
      </div>

      {/* Meeting Topic Banner */}
      <div className="px-4 py-2 bg-white border-b border-[#E0DEDA]/70 flex items-center justify-between text-xs text-[#5A5A5A]">
        <div className="truncate max-w-xl">
          <span className="font-semibold text-[#111111]">Topic: </span>
          <span>"{topic}"</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-mono shrink-0">
          <Users size={12} />
          <span>{team.length} Teammates + Coordinator</span>
        </div>
      </div>

      {/* General Error Notice */}
      {generalError && (
        <div className="m-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Mic Error Toast */}
      {micErrorToast && (
        <div className="mx-4 mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <span>{micErrorToast}</span>
          <button
            type="button"
            onClick={() => setMicErrorToast(null)}
            className="font-bold ml-2 text-amber-700 hover:text-amber-900 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TRANSCRIPT FEED & CAPTIONS
          Accessible: aria-live="off" when voice is on to prevent dual screen-reader speech
          ───────────────────────────────────────────────────────────── */}
      <div
        className="flex-1 p-4 space-y-3.5 overflow-y-auto max-h-[420px] min-h-[220px] bg-[#FAF9F5]/40"
        aria-live={isMuted ? 'polite' : 'off'}
        aria-label="Meeting transcript"
      >
        {transcript.length === 0 && meetingStatus === 'initializing' && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[#5A5A5A]">
            <Loader2 size={24} className="animate-spin text-[#E8481C] mb-2" />
            <p className="text-sm font-semibold text-[#111111]">Seating teammates around conference table...</p>
            <p className="text-xs text-[#7A7A7A] mt-1">Starting live roundtable with voice</p>
          </div>
        )}

        {transcript.map((entry) => {
          const isCurrentActive = currentSpeaker?.role === entry.speakerRole && isSpeaking;
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`p-3 rounded-xl border transition-all text-xs sm:text-sm leading-relaxed ${
                entry.isUser
                  ? 'bg-blue-50/70 border-blue-200 text-blue-950 ml-6 sm:ml-12'
                  : entry.isCoordinator
                  ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                  : entry.isError
                  ? 'bg-rose-50 border-rose-200 text-rose-900 font-mono text-xs'
                  : isCurrentActive
                  ? 'bg-white border-[#E8481C] shadow-md ring-2 ring-[#E8481C]/20'
                  : 'bg-white border-[#E0DEDA] text-[#222222]'
              }`}
            >
              <div className="flex items-center justify-between mb-1 pb-1 border-b border-black/5 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 font-bold">
                  {isCurrentActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E8481C] animate-ping" />
                  )}
                  <span className={entry.isUser ? 'text-blue-700' : entry.isCoordinator ? 'text-amber-800' : 'text-[#111111]'}>
                    {entry.speakerName}
                  </span>
                  <span className="text-[#7A7A7A] font-normal">
                    ({entry.speakerRole})
                  </span>
                </div>
                <span className="text-[#888888]">{entry.timestamp}</span>
              </div>
              <p className="whitespace-pre-wrap">{entry.text}</p>
            </motion.div>
          );
        })}

        {/* Live Speech Recognition Interim Preview */}
        {isListeningMic && micInterimText && (
          <div className="p-3 rounded-xl bg-orange-50/80 border border-orange-200 text-xs text-orange-950 animate-pulse">
            <span className="font-mono font-bold text-orange-700 block mb-0.5">Hearing you:</span>
            <span>"{micInterimText}"</span>
          </div>
        )}

        <div ref={transcriptBottomRef} />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          INTERRUPTION / TYPING BAR
          Typing fallback + speech input indicator
          ───────────────────────────────────────────────────────────── */}
      <div className="p-3 bg-white border-t border-[#E0DEDA] flex items-center gap-2">
        {isListeningMic ? (
          <div className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl bg-orange-50 border border-orange-300 text-xs text-orange-900">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E8481C] animate-ping" />
              <span className="font-semibold">Listening to your voice... Speak now</span>
            </div>
            <button
              type="button"
              onClick={handleStopMic}
              className="px-2.5 py-1 rounded-lg bg-[#E8481C] text-white font-semibold text-xs hover:bg-[#D03D14] cursor-pointer"
            >
              Done Speaking
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUserInterruption(typingInput);
            }}
            className="flex-1 flex items-center gap-2"
          >
            <div className="relative flex-1 rounded-xl">
              <GlowingEffect
                blur={0}
                borderWidth={2}
                spread={70}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
              />
              <input
                type="text"
                value={typingInput}
                onChange={(e) => setTypingInput(e.target.value)}
                placeholder="Interrupt or share your perspective..."
                className="relative z-10 w-full px-3.5 py-2 text-xs sm:text-sm bg-[#FAF9F5] border border-[#E0DEDA] rounded-xl focus:outline-none focus:border-[#E8481C] text-[#111111]"
              />
            </div>
            <button
              type="button"
              onClick={handleStartMic}
              className="p-2 rounded-xl bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#E0DEDA] text-[#5A5A5A] hover:text-[#111111] transition-colors cursor-pointer"
              title="Speak with microphone"
              aria-label="Speak with microphone"
            >
              <Mic size={16} />
            </button>
            <button
              type="submit"
              disabled={!typingInput.trim()}
              className="px-3.5 py-2 rounded-xl bg-[#E8481C] hover:bg-[#D03D14] disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0"
              title="Send interruption message"
            >
              <Send size={13} />
              <span className="hidden sm:inline">Jump in</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
