import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { getStoredToken } from '../services/api.ts';
import {
  KeyRound,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  ArrowLeft,
  Trash2,
  Cpu,
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface TeammatesSetupPageProps {
  onNavigate: (path: string) => void;
}

const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    modelDesc: 'GPT-4o / GPT-4o-mini',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    pricingUrl: 'https://openai.com/api/pricing/',
    steps: [
      'Log into your OpenAI platform account.',
      'Navigate to API Keys in your dashboard.',
      'Click "Create new secret key" and copy the generated key.'
    ],
    placeholder: 'sk-...'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    modelDesc: 'Gemini 2.5 Flash / Pro',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    pricingUrl: 'https://ai.google.dev/pricing',
    steps: [
      'Open Google AI Studio.',
      'Click "Get API Key" in the top left menu.',
      'Create an API key in your Google Cloud project and copy it.'
    ],
    placeholder: 'AIza...'
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    modelDesc: 'Sonar / Sonar Pro',
    apiKeyUrl: 'https://www.perplexity.ai/settings/api',
    pricingUrl: 'https://docs.perplexity.ai/guides/pricing',
    steps: [
      'Go to Perplexity Settings > API.',
      'Generate a new API subscription key.',
      'Copy your API key securely.'
    ],
    placeholder: 'pplx-...'
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    modelDesc: 'Grok Beta / Grok 2',
    apiKeyUrl: 'https://console.x.ai/',
    pricingUrl: 'https://x.ai/api',
    steps: [
      'Log into the xAI console.',
      'Navigate to API credentials / keys.',
      'Generate and copy your xAI key.'
    ],
    placeholder: 'xai-...'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    modelDesc: '100+ Models (Claude, Llama, DeepSeek, GPT-4o)',
    apiKeyUrl: 'https://openrouter.ai/keys',
    pricingUrl: 'https://openrouter.ai/models',
    steps: [
      'Log in to OpenRouter.ai.',
      'Navigate to Account > API Keys.',
      'Create a key and copy it securely.'
    ],
    placeholder: 'sk-or-v1-...'
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    modelDesc: 'Neural Voice Synthesis & Agent Soundboards',
    apiKeyUrl: 'https://elevenlabs.io/app/settings/api-keys',
    pricingUrl: 'https://elevenlabs.io/pricing',
    steps: [
      'Log in to ElevenLabs.',
      'Go to Profile > API Keys.',
      'Copy your xi-api-key securely.'
    ],
    placeholder: 'xi_...'
  }
];

export const TeammatesSetupPage: React.FC<TeammatesSetupPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const isOwner = Boolean(user?.isOwner) || Boolean(
    user?.email && user.email.trim().toLowerCase() === 'pardeshilata1983@gmail.com'
  ) || user?.role === 'admin' || user?.plan === 'enterprise';

  const [keys, setKeys] = useState<Record<string, string>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { success?: boolean; error?: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const token = getStoredToken();
      const res = await fetch('/api/teammates/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || {});
      }
    } catch (err) {
      console.error('Failed to load teammate keys status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestKey = async (provider: string) => {
    const keyToTest = inputs[provider]?.trim() || keys[provider];
    if (!keyToTest) return;

    setTesting(prev => ({ ...prev, [provider]: true }));
    setTestResults(prev => ({ ...prev, [provider]: {} }));

    try {
      const token = getStoredToken();
      const res = await fetch('/api/teammates/test-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ provider, apiKey: keyToTest })
      });
      const data = await res.json();
      setTestResults(prev => ({
        ...prev,
        [provider]: { success: data.success, error: data.error }
      }));
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [provider]: { success: false, error: err?.message || 'Network error testing key' }
      }));
    } finally {
      setTesting(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleSaveKey = async (provider: string) => {
    const val = inputs[provider]?.trim();
    if (val === undefined) return;

    setSaving(provider);
    try {
      const token = getStoredToken();
      const res = await fetch('/api/teammates/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ provider, apiKey: val })
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || {});
        setInputs(prev => ({ ...prev, [provider]: '' }));
      }
    } catch (err) {
      console.error('Failed to save key:', err);
    } finally {
      setSaving(null);
    }
  };

  const handleRemoveKey = async (provider: string) => {
    setSaving(provider);
    try {
      const token = getStoredToken();
      const res = await fetch('/api/teammates/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ provider, apiKey: '' })
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || {});
        setInputs(prev => ({ ...prev, [provider]: '' }));
        setTestResults(prev => ({ ...prev, [provider]: {} }));
      }
    } catch (err) {
      console.error('Failed to remove key:', err);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F5F4F0] text-[#111111] flex flex-col font-mono overflow-x-hidden">
      {/* Background video layer */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-25 select-none"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260815_032550_4c49689d-a215-41e0-bb76-8ef78f562429.mp4"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#F5F4F0]/70 via-[#F5F4F0]/85 to-[#F5F4F0]" />
      </div>

      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => onNavigate('/flaw/teammates')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#111111] bg-white/70 hover:bg-white backdrop-blur-md min-h-[44px] px-4 py-2.5 rounded-xl border border-white/60 mb-6 cursor-pointer shadow-2xs transition-colors"
          style={{ textShadow: '0 1px 3px rgba(255, 255, 255, 0.5)' }}
        >
          <ArrowLeft className="w-4 h-4 text-[#E8481C] shrink-0" />
          <span>
            <span className="sm:hidden">Back to Office</span>
            <span className="hidden sm:inline">Back to AI Teammates Office</span>
          </span>
        </button>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#E0DEDA] rounded-full text-xs font-semibold text-[#E8481C] mb-3">
            <Shield className="w-3.5 h-3.5" />
            <span>Bring Your Own Key (BYOK) Security</span>
          </div>
          <h1 className="text-3xl font-black text-[#111111] tracking-tight mb-2">
            AI Teammate Provider Setup
          </h1>
          <p className="text-sm text-[#5A5A5A] max-w-2xl">
            Configure API keys for your AI teammates. Keys are encrypted securely at rest and used solely to execute your tasks. You are billed directly by each provider for your usage.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#E8481C]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PROVIDERS.map((provider) => {
              const isConnected = Boolean(keys[provider.id]);
              const testRes = testResults[provider.id];
              const inputVal = inputs[provider.id] !== undefined ? inputs[provider.id] : '';

              return (
                <div
                  key={provider.id}
                  className="bg-white border border-[#E0DEDA] rounded-2xl p-6 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA] flex items-center justify-center font-bold text-sm text-[#111111]">
                          {provider.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-[#111111]">{provider.name}</h2>
                          <span className="text-xs text-[#5A5A5A]">{provider.modelDesc}</span>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isConnected
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                        }`}
                      >
                        {isConnected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>

                    <div className="bg-[#F9F8F5] rounded-xl p-3.5 border border-[#E0DEDA] mb-4 text-xs space-y-1.5 text-[#5A5A5A]">
                      <div className="font-semibold text-[#111111] mb-1">How to get your key:</div>
                      {provider.steps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="font-bold text-[#111111]">{idx + 1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                      <div className="pt-2 flex items-center justify-between border-t border-[#E0DEDA] mt-2">
                        <a
                          href={provider.apiKeyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#E8481C] hover:underline font-semibold"
                        >
                          <span>Get API Key</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <a
                          href={provider.pricingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#5A5A5A] hover:underline text-[11px]"
                        >
                          <span>View Pricing</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-[#111111] mb-1">
                          {isConnected ? 'Replace API Key' : 'API Key'}
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="password"
                            placeholder={isConnected ? keys[provider.id] : provider.placeholder}
                            value={inputVal}
                            onChange={(e) => setInputs(prev => ({ ...prev, [provider.id]: e.target.value }))}
                            className="w-full flex-1 px-3.5 py-2.5 min-h-[44px] bg-[#F9F8F5] border border-[#E0DEDA] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#E8481C]"
                          />
                          <button
                            onClick={() => handleSaveKey(provider.id)}
                            disabled={saving === provider.id || !inputVal.trim()}
                            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-[#111111] text-white rounded-xl text-xs font-bold hover:bg-black transition-colors disabled:opacity-50 cursor-pointer inline-flex items-center justify-center shrink-0 shadow-xs"
                          >
                            {saving === provider.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Key'}
                          </button>
                        </div>
                      </div>

                      {testRes && testRes.success !== undefined && (
                        <div
                          className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                            testRes.success
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                              : 'bg-red-50 border border-red-200 text-red-800'
                          }`}
                        >
                          {testRes.success ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <span className="font-bold">
                              {testRes.success ? 'Connection Successful!' : 'Connection Failed:'}
                            </span>
                            {!testRes.success && <p className="mt-1 font-mono text-[11px] leading-relaxed break-words">{testRes.error}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-5 border-t border-[#E0DEDA] mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      onClick={() => handleTestKey(provider.id)}
                      disabled={testing[provider.id] || (!inputVal.trim() && !isConnected)}
                      className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-[#F5F4F0] border border-[#E0DEDA] rounded-xl text-xs font-bold text-[#111111] hover:bg-[#E0DEDA] transition-colors disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-2 shadow-2xs"
                    >
                      {testing[provider.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-[#E8481C]" />}
                      <span>Test Connection</span>
                    </button>

                    {isConnected && (
                      <button
                        onClick={() => handleRemoveKey(provider.id)}
                        disabled={saving === provider.id}
                        className="w-full sm:w-auto min-h-[44px] px-3.5 py-2 text-xs text-red-600 hover:text-red-700 font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Remove Key</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
