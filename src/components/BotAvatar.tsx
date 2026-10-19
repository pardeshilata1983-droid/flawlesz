import React, { useMemo, useState } from 'react';
import { createAvatar } from '@bible-strong/avatar-react';
import '@bible-strong/avatar-react/styles.css';
import baseKirbyDefinition from '../config/kirby.avatar.json';

export type BotStatus = 'idle' | 'thinking' | 'working' | 'done' | 'error';

export interface BotAvatarProps {
  status?: BotStatus;
  provider?: string;
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  animation?: string;
  className?: string;
  employeeName?: string;
  interactive?: boolean;
  onAnimationTrigger?: (anim: string) => void;
}

// Provider specific colors to distinguish teammates while preserving the cute Kirby bot charm
const PROVIDER_COLORS: Record<string, { body: string; eyes: string }> = {
  gemini: {
    body: '#b8dcfe', // Soft electric blue
    eyes: '#1e3a8a'
  },
  openai: {
    body: '#a7f3d0', // Fresh AI mint
    eyes: '#064e3b'
  },
  perplexity: {
    body: '#a5f3fc', // Deep search teal
    eyes: '#0e7490'
  },
  xai: {
    body: '#fed7aa', // Grok sunset orange
    eyes: '#7c2d12'
  },
  openrouter: {
    body: '#e9d5ff', // Purple multi-model
    eyes: '#581c87'
  },
  default: {
    body: '#ffc2e9', // Classic Kirby Pink
    eyes: '#3e4e65'
  }
};

// Cached component instances by provider to avoid recreating dynamic component types during renders
const avatarComponentsCache = new Map<string, React.ComponentType<any>>();

function getOrCreateAvatarComponent(provider: string): React.ComponentType<any> {
  const key = (provider || 'default').toLowerCase();
  if (avatarComponentsCache.has(key)) {
    return avatarComponentsCache.get(key)!;
  }
  const palette = PROVIDER_COLORS[key] || PROVIDER_COLORS.default;
  const avatarDefinition = {
    ...baseKirbyDefinition,
    colors: {
      body: palette.body,
      eyes: palette.eyes
    }
  };
  const comp = createAvatar(avatarDefinition) as unknown as React.ComponentType<any>;
  avatarComponentsCache.set(key, comp);
  return comp;
}

export const BotAvatar: React.FC<BotAvatarProps> = ({
  status = 'idle',
  provider = 'default',
  size = 'md',
  animation: explicitAnimation,
  className = '',
  employeeName,
  interactive = true
}) => {
  const [clickReaction, setClickReaction] = useState<string | null>(null);

  // Determine pixel size
  const pixelSize = typeof size === 'number' 
    ? size 
    : size === 'sm' 
    ? 44 
    : size === 'md' 
    ? 60 
    : size === 'lg' 
    ? 80 
    : 120;

  // Determine if this is the Grok / gork bot (xAI model)
  const isGrokBot = useMemo(() => {
    const prov = (provider || '').toLowerCase();
    const name = (employeeName || '').toLowerCase();
    return (
      prov === 'xai' ||
      prov === 'grok' ||
      prov === 'gork' ||
      name.includes('grok') ||
      name.includes('gork')
    );
  }, [provider, employeeName]);

  // Determine active animation based on employee working status
  const activeAnimation = useMemo(() => {
    if (clickReaction) return clickReaction;
    if (explicitAnimation) return explicitAnimation;
    switch (status) {
      case 'working':
        return 'working'; // Real energetic working animation with rhythmic concentration
      case 'thinking':
        return provider.toLowerCase() === 'perplexity' ? 'searching' : 'thinking';
      case 'done':
        return 'celebrate'; // Joyful celebration & cheering
      case 'error':
        return 'confused'; // Skeptical confused / concerned reaction
      case 'idle':
      default:
        // NOTE: "sleeping" animation is ONLY for gork/grok bot — all other models remain strictly on standard "idle"
        return isGrokBot ? 'sleeping' : 'idle';
    }
  }, [status, explicitAnimation, provider, clickReaction, isGrokBot]);

  // Retrieve cached avatar component for provider
  const AvatarComponent = useMemo(() => {
    return getOrCreateAvatarComponent(provider);
  }, [provider]);

  const handleClick = () => {
    if (!interactive || status === 'working' || status === 'thinking') return;
    const reactions = ['playful', 'excited', 'proud', 'curious', 'happy'];
    const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
    setClickReaction(randomReaction);
    setTimeout(() => {
      setClickReaction(null);
    }, 2400);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center select-none ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
      title={`${employeeName || 'AI Teammate'} (${status}) - Click to interact`}
    >
      <div className={`w-full h-full drop-shadow-sm transition-transform duration-300 transform-gpu ${
        status === 'working' ? 'scale-105 animate-pulse' : 'hover:scale-105'
      }`}>
        <AvatarComponent
          animation={activeAnimation}
          defaultAnimation={isGrokBot ? 'sleeping' : 'idle'}
          size={pixelSize}
          ariaLabel={`${employeeName || 'Bot'} avatar`}
        />
      </div>

      {/* Floating working activity indicator beacon */}
      {status === 'working' && (
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E8481C] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-[#E8481C] border-2 border-white items-center justify-center text-[7px] text-white font-bold">
            ⚡
          </span>
        </span>
      )}

      {status === 'thinking' && (
        <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border-2 border-white"></span>
        </span>
      )}

      {status === 'done' && (
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 rounded-full bg-emerald-500 border-2 border-white items-center justify-center text-[8px] text-white font-bold shadow-xs">
          ✓
        </span>
      )}

      {status === 'error' && (
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 rounded-full bg-red-500 border-2 border-white items-center justify-center text-[8px] text-white font-bold shadow-xs">
          !
        </span>
      )}
    </div>
  );
};
