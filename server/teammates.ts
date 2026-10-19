import { decryptApiKey } from './encryption.ts';
import { callGroqChat, type ModelTier } from './groq.ts';

export async function testProviderApiKey(provider: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
        }),
      });
      if (!res.ok) {
        const errJson: any = await res.json().catch(() => ({}));
        return { success: false, error: errJson.error?.message || `HTTP ${res.status}: ${res.statusText}` };
      }
      return { success: true };
    } else if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Say hi' }],
          max_tokens: 5,
        }),
      });
      if (!res.ok) {
        const errJson: any = await res.json().catch(() => ({}));
        return { success: false, error: errJson.error?.message || `HTTP ${res.status}: ${res.statusText}` };
      }
      return { success: true };
    } else if (provider === 'perplexity') {
      const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{ role: 'user', content: 'Say hi' }],
          max_tokens: 5,
        }),
      });
      if (!res.ok) {
        const errJson: any = await res.json().catch(() => ({}));
        return { success: false, error: errJson.error?.message || `HTTP ${res.status}: ${res.statusText}` };
      }
      return { success: true };
    } else if (provider === 'xai') {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [{ role: 'user', content: 'Say hi' }],
          max_tokens: 5,
        }),
      });
      if (!res.ok) {
        const errJson: any = await res.json().catch(() => ({}));
        return { success: false, error: errJson.error?.message || `HTTP ${res.status}: ${res.statusText}` };
      }
      return { success: true };
    } else if (provider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://aistudio-build.local',
          'X-Title': 'AI Studio Build',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: 'Say hi' }],
          max_tokens: 5,
        }),
      });
      if (!res.ok) {
        const errJson: any = await res.json().catch(() => ({}));
        return { success: false, error: errJson.error?.message || `HTTP ${res.status}: ${res.statusText}` };
      }
      return { success: true };
    } else if (provider === 'elevenlabs') {
      const res = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': apiKey, Accept: 'application/json' },
      });
      if (!res.ok) {
        const errJson: any = await res.json().catch(() => ({}));
        return { success: false, error: errJson.detail?.message || errJson.message || `HTTP ${res.status}: ${res.statusText}` };
      }
      return { success: true };
    }
    return { success: false, error: `Unknown provider: ${provider}` };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function callProviderModel(
  provider: string,
  apiKey: string,
  prompt: string,
  tier: ModelTier = 'orbit'
): Promise<string> {
  if (provider === 'groq' || !provider || provider === 'flawlesz') {
    const res = await callGroqChat({
      tier,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });
    return res.content;
  } else if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
      }),
    });
    if (!res.ok) {
      const errJson: any = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `OpenAI API Error (${res.status})`);
    }
    const data: any = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } else if (provider === 'perplexity') {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
      }),
    });
    if (!res.ok) {
      const errJson: any = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Perplexity API Error (${res.status})`);
    }
    const data: any = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } else if (provider === 'xai') {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
      }),
    });
    if (!res.ok) {
      const errJson: any = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `xAI API Error (${res.status})`);
    }
    const data: any = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } else if (provider === 'openrouter') {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://aistudio-build.local',
        'X-Title': 'AI Studio Build',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
      }),
    });
    if (!res.ok) {
      const errJson: any = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `OpenRouter API Error (${res.status})`);
    }
    const data: any = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
  // Fallback to Groq engine
  const res = await callGroqChat({
    tier,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });
  return res.content;
}
