import dotenv from 'dotenv';
dotenv.config();

/**
 * ElevenLabs Agent Voice Mapping
 * Each AI Teammate has a distinctive, carefully curated ElevenLabs pre-made voice ID
 * available across all ElevenLabs accounts.
 */
export interface AgentVoiceProfile {
  name: string;
  role: string;
  voiceId: string;
  voiceName: string;
  gender: 'male' | 'female';
  accent: string;
  description: string;
  previewSampleText: string;
  settings: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export const AGENT_VOICE_PROFILES: Record<string, AgentVoiceProfile> = {
  Atlas: {
    name: 'Atlas',
    role: 'Researcher',
    voiceId: 'JBFqnCBsd6RMkjVDRZzb', // George
    voiceName: 'George (Authoritative British Scholar)',
    gender: 'male',
    accent: 'British',
    description: 'Deep, warm, articulate British narrator suited for deep market research and evidence synthesis.',
    previewSampleText: "I've synthesized the competitive landscape and found three critical incumbent defensibility moats.",
    settings: {
      stability: 0.65,
      similarity_boost: 0.8,
      style: 0.1,
      use_speaker_boost: true
    }
  },
  Elena: {
    name: 'Elena',
    role: 'Writer',
    voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
    voiceName: 'Rachel (Calm & Expressive American)',
    gender: 'female',
    accent: 'American',
    description: 'Articulate, engaging, and clear American female voice tailored for value propositions and brand copy.',
    previewSampleText: "Our core narrative must highlight immediate customer pain relief before pitching secondary features.",
    settings: {
      stability: 0.55,
      similarity_boost: 0.85,
      style: 0.15,
      use_speaker_boost: true
    }
  },
  Nova: {
    name: 'Nova',
    role: 'Analyst',
    voiceId: 'XB0fDUnXU5powFXDhCwa', // Charlotte
    voiceName: 'Charlotte (Sharp & Analytical Swedish-English)',
    gender: 'female',
    accent: 'Swedish/European',
    description: 'Seductive yet razor-sharp, analytical European voice for stress-testing margins and unit economics.',
    previewSampleText: "At a thirty percent churn rate, your customer acquisition costs will invert cash flow in under six months.",
    settings: {
      stability: 0.7,
      similarity_boost: 0.8,
      style: 0.05,
      use_speaker_boost: true
    }
  },
  Marcus: {
    name: 'Marcus',
    role: 'Planner',
    voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam
    voiceName: 'Adam (Deep & Grounded Executive)',
    gender: 'male',
    accent: 'American',
    description: 'Deep, resolute, executive American voice for structural sequencing, operational roadmaps, and delivery milestones.',
    previewSampleText: "Let's sequence Phase One around the minimum viable core loop and defer secondary integrations.",
    settings: {
      stability: 0.6,
      similarity_boost: 0.75,
      style: 0.1,
      use_speaker_boost: true
    }
  },
  Iris: {
    name: 'Iris',
    role: 'Reviewer',
    voiceId: 'pFZP5JQG7iQjIQuC4Bku', // Lily
    voiceName: 'Lily (Poised & Discerning British Critic)',
    gender: 'female',
    accent: 'British',
    description: 'Poised, velvety British female voice for auditing blind spots, platform vulnerabilities, and failure modes.',
    previewSampleText: "I've flagged a critical regulatory compliance risk in the third-party data processing pipeline.",
    settings: {
      stability: 0.65,
      similarity_boost: 0.8,
      style: 0.15,
      use_speaker_boost: true
    }
  },
  Coordinator: {
    name: 'Coordinator',
    role: 'Coordinator',
    voiceId: 'nPczCjzI2devNBz1zQrb', // Brian
    voiceName: 'Brian (Resonant & Executive Director)',
    gender: 'male',
    accent: 'American',
    description: 'Commanding, warm, balanced leadership voice for summarizing debates and issuing decisive next steps.',
    previewSampleText: "Team, the verdict is clear: tighten unit economics first, then begin private alpha testing next week.",
    settings: {
      stability: 0.6,
      similarity_boost: 0.8,
      style: 0.05,
      use_speaker_boost: true
    }
  }
};

/**
 * Retrieve ElevenLabs API key from process.env or fallback
 */
export function getElevenLabsApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY || '';
  return key.trim().replace(/^["']|["']$/g, '').trim();
}

/**
 * Test connectivity with ElevenLabs API
 */
export async function testElevenLabsApiKey(apiKey: string): Promise<{
  success: boolean;
  userInfo?: {
    subscriptionTier: string;
    characterCount: number;
    characterLimit: number;
  };
  error?: string;
}> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { success: false, error: 'ElevenLabs API key is missing.' };
  }

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/user', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey.trim(),
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errBody: any = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errBody.detail?.message || errBody.message || `ElevenLabs returned HTTP ${res.status}`
      };
    }

    const userData: any = await res.json();
    return {
      success: true,
      userInfo: {
        subscriptionTier: userData?.subscription?.tier || 'Free',
        characterCount: userData?.subscription?.character_count ?? 0,
        characterLimit: userData?.subscription?.character_limit ?? 10000
      }
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to reach ElevenLabs API.'
    };
  }
}

/**
 * Generates spoken audio with ElevenLabs for a given text and agent profile.
 * Returns MP3 data URI ('data:audio/mpeg;base64,...').
 */
export async function generateSpeechWithElevenLabs(
  text: string,
  options: {
    agentName?: string;
    agentRole?: string;
    voiceId?: string;
    apiKey?: string;
  }
): Promise<{
  audioBase64: string;
  mimeType: string;
  voiceId: string;
  agentName: string;
  source: 'elevenlabs';
}> {
  const effectiveKey = (options.apiKey || getElevenLabsApiKey()).trim();

  if (!effectiveKey) {
    throw new Error('ElevenLabs API key is not configured.');
  }

  const lookupName = options.agentName || options.agentRole || 'Coordinator';
  const profile = AGENT_VOICE_PROFILES[lookupName] || AGENT_VOICE_PROFILES['Coordinator'];
  const voiceId = options.voiceId || profile.voiceId;

  // Sanitize text for crisp narration
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*_#~>[\]()"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) {
    throw new Error('No spoken text content provided for ElevenLabs synthesis.');
  }

  console.log(`[ELEVENLABS TTS] Generating voice for ${lookupName} (${voiceId}) - Text length: ${cleanText.length} chars...`);

  // Try multilingual v2 first, then fallback to turbo v2.5 or v1 if needed
  const modelsToTry = ['eleven_multilingual_v2', 'eleven_turbo_v2_5', 'eleven_turbo_v2', 'eleven_monolingual_v1'];
  let lastError = '';

  for (const model_id of modelsToTry) {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': effectiveKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: cleanText,
          model_id,
          voice_settings: profile.settings
        })
      });

      if (!response.ok) {
        const errorJson: any = await response.json().catch(() => ({}));
        const message = errorJson.detail?.message || errorJson.message || `HTTP ${response.status}: ${response.statusText}`;
        lastError = message;
        console.warn(`[ELEVENLABS TTS] Model ${model_id} note: ${message}. Trying next model...`);
        // If it's an auth error (401) or invalid key, don't keep retrying models
        if (response.status === 401 || response.status === 403) {
          throw new Error(`ElevenLabs API authorization failed: ${message}`);
        }
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString('base64');

      console.log(`[ELEVENLABS TTS] Generated ${arrayBuffer.byteLength} bytes of MP3 audio for ${lookupName} with ${model_id}.`);

      return {
        audioBase64: `data:audio/mpeg;base64,${base64Audio}`,
        mimeType: 'audio/mpeg',
        voiceId,
        agentName: profile.name,
        source: 'elevenlabs'
      };
    } catch (modelErr: any) {
      if (modelErr.message?.includes('authorization failed')) {
        throw modelErr;
      }
      lastError = modelErr.message || String(modelErr);
    }
  }

  throw new Error(`ElevenLabs speech generation failed: ${lastError || 'All voice models failed'}`);
}

// In-memory cache for agent preview samples to provide instant preview audio
const sampleAudioCache: Record<string, { audioBase64: string; mimeType: string }> = {};

export async function getAgentSampleSpeech(agentName: string, apiKey?: string): Promise<{
  audioBase64: string;
  mimeType: string;
  agentName: string;
  voiceName: string;
  sampleText: string;
}> {
  const profile = AGENT_VOICE_PROFILES[agentName] || AGENT_VOICE_PROFILES['Coordinator'];
  const cacheKey = `${profile.name}_sample`;

  if (sampleAudioCache[cacheKey]) {
    return {
      audioBase64: sampleAudioCache[cacheKey].audioBase64,
      mimeType: sampleAudioCache[cacheKey].mimeType,
      agentName: profile.name,
      voiceName: profile.voiceName,
      sampleText: profile.previewSampleText
    };
  }

  const generated = await generateSpeechWithElevenLabs(profile.previewSampleText, {
    agentName: profile.name,
    apiKey
  });

  sampleAudioCache[cacheKey] = {
    audioBase64: generated.audioBase64,
    mimeType: generated.mimeType
  };

  return {
    audioBase64: generated.audioBase64,
    mimeType: generated.mimeType,
    agentName: profile.name,
    voiceName: profile.voiceName,
    sampleText: profile.previewSampleText
  };
}
