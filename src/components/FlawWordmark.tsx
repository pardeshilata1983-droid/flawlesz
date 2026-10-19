import React from 'react';
import { BRAND } from '../config/brand.ts';

export interface FlawWordmarkProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  style?: React.CSSProperties;
  showAi?: boolean;
  variant?: 'standard' | 'instrument';
}

/**
 * FlawWordmark renders the Flawlesz AI brand wordmark:
 * - 'instrument': Instrument Serif typography with matching font styling, text shadow, and warm accent
 * - 'standard': Geometric grotesque typography (Plus Jakarta Sans)
 */
export const FlawWordmark: React.FC<FlawWordmarkProps> = ({
  className = '',
  size = 'md',
  style,
  showAi = true,
  variant = 'instrument',
}) => {
  if (variant === 'instrument') {
    const sizeMap = {
      xs: 'text-base',
      sm: 'text-lg',
      md: 'text-[22px]',
      lg: 'text-2xl',
      xl: 'text-3xl',
      '2xl': 'text-4xl',
    };

    const sClass = sizeMap[size] || 'text-[22px]';
    const colorClass = className.includes('text-') ? '' : 'text-[#0F172A]';

    return (
      <span
        className={`inline-flex items-baseline select-none leading-none font-instrument-serif ${colorClass} ${sClass} ${className}`}
        style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          letterSpacing: '-0.02em',
          textShadow: '0 1px 12px rgba(255, 255, 255, 0.4)',
          ...style,
        }}
        aria-label={BRAND.nameWithSuffix}
        title={BRAND.nameWithSuffix}
      >
        <span className="font-normal font-instrument-serif">
          flawles<span className="text-[#E8481C]">z</span>
        </span>
        {showAi && (
          <span
            className="ml-1.5 font-instrument-serif italic text-[0.88em] font-normal tracking-tight text-[#0F172A]"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            AI
          </span>
        )}
      </span>
    );
  }

  const sizeMap = {
    xs: 'text-sm font-extrabold tracking-tight',
    sm: 'text-base font-extrabold tracking-tight',
    md: 'text-xl font-extrabold tracking-tight',
    lg: 'text-2xl font-extrabold tracking-tight',
    xl: 'text-3xl font-extrabold tracking-tight',
    '2xl': 'text-4xl font-extrabold tracking-tight',
  };

  const sClass = sizeMap[size] || 'text-xl font-extrabold tracking-tight';
  const colorClass = className.includes('text-') ? '' : 'text-[#111111]';

  return (
    <span
      className={`inline-flex items-center font-flaw select-none leading-none ${colorClass} ${sClass} ${className}`}
      style={style}
      aria-label={BRAND.nameWithSuffix}
      title={BRAND.nameWithSuffix}
    >
      <span className="tracking-tight uppercase">
        FLAWLES<span className="text-[#E8481C]">Z</span>
      </span>
      {showAi && (
        <span className="ml-1.5 font-mono text-[0.52em] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#111111] text-white tracking-widest self-center shadow-xs">
          AI
        </span>
      )}
    </span>
  );
};
