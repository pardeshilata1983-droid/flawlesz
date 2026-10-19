// src/services/meetingVoice.ts
// Dual-engine voice manager for AI Teammates: ElevenLabs Neural Audio + zero-cost Web Speech API fallback

export interface TeammateVoiceConfig {
  pitch: number;
  rate: number;
  preferredVoices: string[];
}

// Consistent, distinct voice profiles per teammate for client-side fallback
export const TEAMMATE_VOICES: Record<string, TeammateVoiceConfig> = {
  Atlas: {
    pitch: 0.88,
    rate: 1.0,
    preferredVoices: ['Google UK English Male', 'Daniel', 'Alex', 'David', 'Arthur', 'en-GB']
  },
  Elena: {
    pitch: 1.18,
    rate: 1.05,
    preferredVoices: ['Google US English', 'Samantha', 'Victoria', 'Karen', 'Zira', 'en-US']
  },
  Nova: {
    pitch: 1.0,
    rate: 1.1,
    preferredVoices: ['Google UK English Female', 'Moira', 'Fiona', 'Stephanie', 'en-GB']
  },
  Marcus: {
    pitch: 0.82,
    rate: 0.96,
    preferredVoices: ['Fred', 'Google US English Male', 'George', 'Tom', 'en-US']
  },
  Iris: {
    pitch: 1.22,
    rate: 1.0,
    preferredVoices: ['Tessa', 'Google US English Female', 'Serena', 'Ava', 'en-US']
  },
  Coordinator: {
    pitch: 1.04,
    rate: 1.02,
    preferredVoices: ['Google US English', 'Samantha', 'Daniel', 'Alex', 'en-US']
  }
};

export type VoiceStateListener = (state: {
  isSpeaking: boolean;
  speakerName: string | null;
  engine: 'elevenlabs' | 'browser' | null;
}) => void;

class MeetingVoiceManager {
  private audioElement: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isMuted: boolean = false;
  private isPaused: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];
  private recognition: any = null;
  private activeSpeaker: string | null = null;
  private activeEngine: 'elevenlabs' | 'browser' | null = null;
  private listeners: Set<VoiceStateListener> = new Set();
  private playSessionId = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioElement = new Audio();
      this.audioElement.preload = 'auto';

      this.audioElement.addEventListener('ended', () => {
        this.notifyState(false, null, null);
      });

      this.audioElement.addEventListener('pause', () => {
        if (!this.audioElement?.ended) {
          this.notifyState(false, this.activeSpeaker, this.activeEngine);
        }
      });

      this.audioElement.addEventListener('play', () => {
        this.notifyState(true, this.activeSpeaker, 'elevenlabs');
      });

      if ('speechSynthesis' in window) {
        this.loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
      }
    }
  }

  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    listener({
      isSpeaking: this.isSpeaking(),
      speakerName: this.activeSpeaker,
      engine: this.activeEngine,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyState(isSpeaking: boolean, speakerName: string | null, engine: 'elevenlabs' | 'browser' | null) {
    this.activeSpeaker = speakerName;
    this.activeEngine = engine;
    this.listeners.forEach((fn) => {
      try {
        fn({ isSpeaking, speakerName, engine });
      } catch (err) {
        console.error('[VOICE] Listener error:', err);
      }
    });
  }

  private loadVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.voices = window.speechSynthesis.getVoices() || [];
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0) {
      this.loadVoices();
    }
    return this.voices;
  }

  /**
   * Mobile Safari / Chrome audio unlock primer.
   * Call on user touch gesture ("Start meeting" button tap or speaker click).
   */
  public unlockAudio(): void {
    if (typeof window === 'undefined') return;
    try {
      if (this.audioElement) {
        this.audioElement.load();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.resume();
        const primer = new SpeechSynthesisUtterance('');
        primer.volume = 0;
        primer.rate = 10;
        window.speechSynthesis.speak(primer);
      }
    } catch (e) {
      console.warn('[VOICE] Audio unlock attempted:', e);
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public stop(): void {
    this.playSessionId++;

    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.audioElement.removeAttribute('src');
      } catch (e) {
        // Ignore abort errors
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // Ignore cancel errors
      }
      this.currentUtterance = null;
      this.isPaused = false;
    }

    this.notifyState(false, null, null);
  }

  public pause(): void {
    if (this.activeEngine === 'elevenlabs' && this.audioElement) {
      this.audioElement.pause();
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    this.isPaused = true;
    this.notifyState(false, this.activeSpeaker, this.activeEngine);
  }

  public resume(): void {
    if (this.activeEngine === 'elevenlabs' && this.audioElement) {
      this.audioElement.play().catch(() => {});
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
    this.isPaused = false;
    this.notifyState(true, this.activeSpeaker, this.activeEngine);
  }

  public isSpeaking(): boolean {
    const isAudioPlaying = Boolean(
      this.audioElement &&
      !this.audioElement.paused &&
      !this.audioElement.ended &&
      this.audioElement.currentTime > 0
    );
    const isSynthSpeaking = Boolean(
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      window.speechSynthesis.speaking &&
      !window.speechSynthesis.paused
    );
    return isAudioPlaying || isSynthSpeaking;
  }

  public getActiveSpeaker(): string | null {
    return this.activeSpeaker;
  }

  public getActiveEngine(): 'elevenlabs' | 'browser' | null {
    return this.activeEngine;
  }

  /**
   * Speaks a turn with ElevenLabs generated neural audio if available,
   * falling back smoothly to Web Speech API with the teammate's distinct voice.
   */
  public speakTurn(
    speakerName: string,
    speakerRole: string,
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    audioBase64?: string
  ): () => void {
    this.stop();
    const sessionId = ++this.playSessionId;

    const wordCount = text.trim().split(/\s+/).length;
    const readingTimeMs = Math.max(2200, Math.min(10000, wordCount * 260 + 1200));

    if (this.isMuted) {
      onStart?.();
      const timer = setTimeout(() => {
        onEnd?.();
      }, readingTimeMs);
      return () => clearTimeout(timer);
    }

    let ended = false;
    const safeEnd = () => {
      if (!ended && this.playSessionId === sessionId) {
        ended = true;
        this.notifyState(false, null, null);
        onEnd?.();
      }
    };

    // 1. If ElevenLabs Audio is provided, play high-definition neural MP3
    if (audioBase64 && this.audioElement) {
      try {
        this.audioElement.src = audioBase64;
        this.notifyState(true, speakerName, 'elevenlabs');
        onStart?.();

        const onEndedHandler = () => {
          this.audioElement?.removeEventListener('ended', onEndedHandler);
          safeEnd();
        };
        const onErrorHandler = (e: any) => {
          this.audioElement?.removeEventListener('error', onErrorHandler);
          console.warn('[VOICE] ElevenLabs audio playback error, falling back to Web Speech:', e);
          if (!ended && this.playSessionId === sessionId) {
            this.playBrowserSpeech(speakerName, speakerRole, text, onStart, safeEnd, sessionId);
          }
        };

        this.audioElement.addEventListener('ended', onEndedHandler, { once: true });
        this.audioElement.addEventListener('error', onErrorHandler, { once: true });

        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('[VOICE] Audio play promise rejected (browser autoplay policy), falling back to Web Speech:', err);
            if (!ended && this.playSessionId === sessionId) {
              this.playBrowserSpeech(speakerName, speakerRole, text, onStart, safeEnd, sessionId);
            }
          });
        }

        return () => {
          this.stop();
          safeEnd();
        };
      } catch (audioErr) {
        console.warn('[VOICE] Failed to start HTMLAudioElement, using browser speech fallback:', audioErr);
      }
    }

    // 2. Client Web Speech Fallback with distinct personality tuning
    this.playBrowserSpeech(speakerName, speakerRole, text, onStart, safeEnd, sessionId);

    return () => {
      this.stop();
      safeEnd();
    };
  }

  private playBrowserSpeech(
    speakerName: string,
    speakerRole: string,
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    sessionId?: number
  ) {
    const currentSession = sessionId ?? this.playSessionId;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onStart?.();
      const wordCount = text.trim().split(/\s+/).length;
      setTimeout(() => onEnd?.(), Math.max(2000, wordCount * 250));
      return;
    }

    const voiceConfig = TEAMMATE_VOICES[speakerName] || TEAMMATE_VOICES[speakerRole] || {
      pitch: 1.0,
      rate: 1.0,
      preferredVoices: []
    };

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = voiceConfig.pitch;
    utterance.rate = voiceConfig.rate;

    const available = this.getVoices();
    let selectedVoice = available.find((v) =>
      voiceConfig.preferredVoices.some((pref) => v.name.includes(pref) || v.lang.includes(pref))
    );

    if (!selectedVoice && available.length > 0) {
      selectedVoice = available[0];
    }
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    let ended = false;
    const safeEnd = () => {
      if (!ended && this.playSessionId === currentSession) {
        ended = true;
        this.currentUtterance = null;
        this.notifyState(false, null, null);
        onEnd?.();
      }
    };

    utterance.onstart = () => {
      if (this.playSessionId === currentSession) {
        this.notifyState(true, speakerName, 'browser');
        onStart?.();
      }
    };

    utterance.onend = safeEnd;
    utterance.onerror = (e) => {
      console.warn('[VOICE] Speech synthesis error:', e);
      safeEnd();
    };

    this.currentUtterance = utterance;

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[VOICE] Speech synthesis speak failed:', err);
      safeEnd();
    }
  }

  /**
   * Plays an on-demand voice sound sample for an agent.
   */
  public async playAgentSample(
    agentName: string,
    fallbackText?: string,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<() => void> {
    this.stop();
    this.unlockAudio();

    try {
      const res = await fetch(`/api/elevenlabs/sample/${encodeURIComponent(agentName)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.configured && data.audioBase64) {
          return this.speakTurn(agentName, data.role || agentName, data.sampleText, onStart, onEnd, data.audioBase64);
        } else if (data.sampleText) {
          return this.speakTurn(agentName, data.role || agentName, data.sampleText, onStart, onEnd);
        }
      }
    } catch (err) {
      console.warn('[VOICE] Sample fetch note:', err);
    }

    // Default sample fallback
    const sampleText = fallbackText || `Hello, I'm ${agentName}. Ready to assist your strategic review.`;
    return this.speakTurn(agentName, agentName, sampleText, onStart, onEnd);
  }

  /**
   * Starts Speech Recognition (Web Speech API STT) for user interruptions.
   * Zero cost, client-side, falls back to typing gracefully.
   */
  public startSpeechRecognition(
    onInterim: (text: string) => void,
    onFinal: (text: string) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ): boolean {
    if (typeof window === 'undefined') return false;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      onError('Speech recognition is not supported in this browser. Please type your message.');
      return false;
    }

    try {
      this.stopSpeechRecognition();

      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          onFinal(finalTranscript.trim());
        } else if (interimTranscript) {
          onInterim(interimTranscript.trim());
        }
      };

      rec.onerror = (event: any) => {
        let message = 'Microphone input error.';
        if (event.error === 'not-allowed') {
          message = 'Microphone access blocked. Please allow microphone in browser settings or type your message.';
        } else if (event.error === 'no-speech') {
          message = 'No speech heard. You can try speaking again or type.';
        }
        onError(message);
      };

      rec.onend = () => {
        this.recognition = null;
        onEnd();
      };

      this.recognition = rec;
      rec.start();
      return true;
    } catch (err: any) {
      console.warn('[VOICE] Failed to start speech recognition:', err);
      onError(err?.message || 'Could not start microphone.');
      return false;
    }
  }

  public stopSpeechRecognition(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        // Ignore
      }
      this.recognition = null;
    }
  }
}

export const meetingVoice = new MeetingVoiceManager();
