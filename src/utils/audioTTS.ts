import { ValidationResult } from '../types.ts';
import { fetchSpeechAudio } from '../services/api.ts';

export interface TTSState {
  isVisible: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentText: string;
  source: 'neural' | 'browser' | null;
  progress: number; // 0 to 1
  currentTime: number; // seconds
  duration: number; // seconds
  voiceName: string;
  playbackRate: number;
  error: string | null;
}

export type TTSListener = (state: TTSState) => void;

class TTSManager {
  private audioElement: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private listeners: Set<TTSListener> = new Set();
  private currentPlaySessionId = 0;
  private isStopping = false;
  private state: TTSState = {
    isVisible: false,
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    currentText: '',
    source: null,
    progress: 0,
    currentTime: 0,
    duration: 0,
    voiceName: 'Fenrir (Deep & Bold Male)',
    playbackRate: 1.0,
    error: null,
  };
  private progressInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioElement = new Audio();
      this.audioElement.preload = 'auto';

      this.audioElement.addEventListener('timeupdate', () => {
        if (this.isStopping || !this.state.isVisible) return;
        if (this.audioElement && this.audioElement.duration) {
          const cur = this.audioElement.currentTime;
          const dur = this.audioElement.duration;
          this.updateState({
            currentTime: cur,
            duration: dur,
            progress: dur > 0 ? cur / dur : 0,
          });
        }
      });

      this.audioElement.addEventListener('ended', () => {
        if (this.isStopping || !this.state.isVisible) return;
        this.updateState({
          isPlaying: false,
          isPaused: false,
          progress: 1,
        });
        this.stopProgressTimer();
      });

      this.audioElement.addEventListener('pause', () => {
        if (this.isStopping || !this.state.isVisible) return;
        if (!this.audioElement?.ended) {
          this.updateState({ isPaused: true, isPlaying: false });
        }
      });

      this.audioElement.addEventListener('play', () => {
        if (this.isStopping || !this.state.isVisible) return;
        this.updateState({ isPlaying: true, isPaused: false });
      });

      this.audioElement.addEventListener('error', (e) => {
        if (this.isStopping || !this.state.isVisible) return;
        console.warn('[TTS] Audio element playback error, falling back to Web Speech:', e);
      });
    }
  }

  public subscribe(listener: TTSListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(partial: Partial<TTSState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((l) => l({ ...this.state }));
  }

  public getState(): TTSState {
    return { ...this.state };
  }

  /**
   * Builds an assertive, structured narration script for the full teardown.
   */
  public buildTeardownNarration(result: ValidationResult): string {
    const lines: string[] = [];
    lines.push(`Flawlesz AI Analysis Report for: ${result.idea}.`);

    if (result.disclaimer) {
      lines.push(`Please note: ${result.disclaimer}`);
    }

    if (result.short_answer) {
      lines.push(`Executive Summary: ${result.short_answer}`);
    }

    if (result.key_findings && result.key_findings.length > 0) {
      lines.push(`Key Findings:`);
      result.key_findings.forEach((kf, i) => {
        lines.push(`Finding ${i + 1}: ${kf.title}. ${kf.explanation}`);
      });
    }

    if (result.risks_or_questions && result.risks_or_questions.length > 0) {
      lines.push(`Risks and Open Questions:`);
      result.risks_or_questions.forEach((rq, i) => {
        lines.push(`${rq.title}. ${rq.explanation}`);
      });
    }

    if (result.next_steps && result.next_steps.length > 0) {
      lines.push(`Recommended Next Steps:`);
      result.next_steps.forEach((ns, i) => {
        lines.push(`Step ${i + 1}: ${ns.step}. ${ns.detail}`);
      });
    }

    if (result.similar_products && result.similar_products.length > 0) {
      lines.push(
        `Market Reality Check. We identified ${result.similar_products.length} existing competitors already solving this.`
      );
      result.similar_products.slice(0, 3).forEach((prod, i) => {
        lines.push(`Competitor ${i + 1}: ${prod.name}. ${prod.description}`);
      });
    }

    if (result.flaws && result.flaws.length > 0) {
      lines.push(`Here are the fatal structural flaws you must address.`);
      result.flaws.forEach((flaw, i) => {
        const sev = (flaw.severity || 'medium').toUpperCase();
        lines.push(`Flaw ${i + 1}, ${sev} Severity: ${flaw.title}. ${flaw.explanation}`);
      });
    }

    if (result.refined_versions && result.refined_versions.length > 0) {
      lines.push(`Defensible Refinement Proposal.`);
      result.refined_versions.forEach((ref, i) => {
        lines.push(`Pivot option ${i + 1}: ${ref.idea}. Reasoning: ${ref.reasoning}`);
      });
    }

    lines.push(`End of analysis.`);
    return lines.join(' \n\n ');
  }

  /**
   * Main play entry point: tries neural synthetic TTS with Fenrir voice,
   * with seamless fallback to client-side tuned bold male speech synthesis.
   */
  public async play(
    text: string,
    voiceName: 'Fenrir' | 'Charon' | 'Puck' = 'Fenrir'
  ): Promise<void> {
    this.stop();

    const cleanText = text.trim();
    if (!cleanText) return;

    const sessionId = ++this.currentPlaySessionId;
    this.isStopping = false;

    this.updateState({
      isVisible: true,
      isLoading: true,
      currentText: cleanText,
      error: null,
      progress: 0,
      currentTime: 0,
      duration: 0,
      voiceName: voiceName === 'Fenrir' ? 'Fenrir (Deep & Bold Male)' : `${voiceName} (Bold Male)`,
    });

    try {
      // 1. Attempt Neural Synthetic TTS
      const res = await fetchSpeechAudio(cleanText, voiceName);

      // Check if session cancelled or closed while waiting for audio fetch
      if (this.currentPlaySessionId !== sessionId || !this.state.isVisible || this.isStopping) {
        return;
      }

      if (res.audioBase64 && this.audioElement) {
        this.audioElement.src = res.audioBase64;
        this.audioElement.playbackRate = this.state.playbackRate;
        await this.audioElement.play();

        if (this.currentPlaySessionId !== sessionId || !this.state.isVisible || this.isStopping) {
          try {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.audioElement.removeAttribute('src');
            this.audioElement.load();
          } catch {}
          return;
        }

        this.updateState({
          isLoading: false,
          isPlaying: true,
          isPaused: false,
          source: 'neural',
        });
        return;
      }
    } catch (err: any) {
      if (this.currentPlaySessionId !== sessionId || !this.state.isVisible || this.isStopping) {
        return;
      }
      console.warn('[TTS] Neural speech API unavailable or restricted, engaging tuned Web Speech bold male voice:', err?.message);
    }

    if (this.currentPlaySessionId !== sessionId || !this.state.isVisible || this.isStopping) {
      return;
    }

    // 2. Client Web Speech Fallback with bold male voice tuning
    this.playBrowserSpeech(cleanText, sessionId);
  }

  private playBrowserSpeech(text: string, sessionId?: number) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.updateState({
        isLoading: false,
        isPlaying: false,
        error: 'Speech synthesis is not supported on this browser.',
      });
      return;
    }

    const activeSession = sessionId ?? this.currentPlaySessionId;
    if (this.currentPlaySessionId !== activeSession || !this.state.isVisible || this.isStopping) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    // Tune for deep, bold, confident male delivery
    utterance.pitch = 0.85; // Lower pitch for deep/bold resonance
    utterance.rate = this.state.playbackRate * 0.95; // Steady authoritative pace

    // Select the best bold male English voice available
    const voices = window.speechSynthesis.getVoices();
    const maleVoice = voices.find(
      (v) =>
        (v.lang.startsWith('en') &&
          (v.name.toLowerCase().includes('male') ||
            v.name.toLowerCase().includes('david') ||
            v.name.toLowerCase().includes('guy') ||
            v.name.toLowerCase().includes('daniel') ||
            v.name.toLowerCase().includes('george') ||
            v.name.toLowerCase().includes('natural') ||
            v.name.toLowerCase().includes('google us english')))
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (maleVoice) {
      utterance.voice = maleVoice;
    }

    // Estimate duration for progress bar
    const estimatedSeconds = Math.max(3, (text.split(/\s+/).length / (140 * utterance.rate)) * 60);
    let elapsed = 0;

    utterance.onstart = () => {
      if (this.currentPlaySessionId !== activeSession || !this.state.isVisible || this.isStopping) {
        window.speechSynthesis.cancel();
        return;
      }

      this.updateState({
        isLoading: false,
        isPlaying: true,
        isPaused: false,
        source: 'browser',
        duration: estimatedSeconds,
      });

      this.stopProgressTimer();
      this.progressInterval = setInterval(() => {
        if (this.currentPlaySessionId !== activeSession || !this.state.isVisible || this.isStopping) {
          this.stopProgressTimer();
          return;
        }
        elapsed += 0.2;
        const prog = Math.min(1, elapsed / estimatedSeconds);
        this.updateState({
          currentTime: elapsed,
          progress: prog,
        });
      }, 200);
    };

    utterance.onend = () => {
      this.stopProgressTimer();
      if (this.currentPlaySessionId !== activeSession || this.isStopping) return;
      this.updateState({
        isPlaying: false,
        isPaused: false,
        progress: 1,
        currentTime: estimatedSeconds,
      });
    };

    utterance.onerror = (e) => {
      this.stopProgressTimer();
      if (this.currentPlaySessionId !== activeSession || this.isStopping) return;
      console.error('[TTS] Browser speech error:', e);
      this.updateState({
        isLoading: false,
        isPlaying: false,
        isPaused: false,
        error: 'Speech playback failed.',
      });
    };

    window.speechSynthesis.speak(utterance);
  }

  public pause(): void {
    if (this.state.source === 'neural' && this.audioElement) {
      this.audioElement.pause();
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    this.updateState({ isPaused: true, isPlaying: false });
  }

  public resume(): void {
    if (this.state.source === 'neural' && this.audioElement) {
      this.audioElement.play();
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
    this.updateState({ isPaused: false, isPlaying: true });
  }

  public stop(): void {
    this.currentPlaySessionId++;
    this.isStopping = true;
    this.stopProgressTimer();

    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.audioElement.removeAttribute('src');
        this.audioElement.load();
      } catch (err) {
        // Ignore abort/reset errors
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        // Ignore cancel errors
      }
    }

    this.currentUtterance = null;
    this.updateState({
      isVisible: false,
      isPlaying: false,
      isPaused: false,
      isLoading: false,
      progress: 0,
      currentTime: 0,
      duration: 0,
      currentText: '',
      source: null,
      error: null,
    });

    setTimeout(() => {
      this.isStopping = false;
    }, 60);
  }

  public close(): void {
    this.stop();
  }

  public setPlaybackRate(rate: number): void {
    this.updateState({ playbackRate: rate });
    if (this.audioElement) {
      this.audioElement.playbackRate = rate;
    }
    if (this.state.isPlaying && this.state.source === 'browser' && this.state.currentText) {
      // Restart browser speech with new rate
      this.playBrowserSpeech(this.state.currentText);
    }
  }

  public seek(progress: number): void {
    if (this.state.source === 'neural' && this.audioElement && this.audioElement.duration) {
      this.audioElement.currentTime = progress * this.audioElement.duration;
    }
  }

  private stopProgressTimer() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }
}

export const ttsManager = new TTSManager();
