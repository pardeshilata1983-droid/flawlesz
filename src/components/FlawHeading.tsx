import React from 'react';
import { FlawWordmark } from './FlawWordmark.tsx';

interface FlawHeadingProps {
  children?: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'span' | 'div';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  useWordmark?: boolean;
}

/**
 * FlawHeading applies the text style from the uploaded asset:
 * - Bold geometric typography
 * - Signature chromatic aberration text-shadow (-orange-red on left, +blue on right)
 * - Deep high-contrast black foreground
 */
export const FlawHeading: React.FC<FlawHeadingProps> = ({
  children,
  as: Component = 'h2',
  className = '',
  size = 'lg',
  useWordmark = false,
}) => {
  if (useWordmark) {
    const wordmarkSizeMap: Record<string, 'sm' | 'md' | 'lg' | 'xl' | '2xl'> = {
      sm: 'sm',
      md: 'md',
      lg: 'lg',
      xl: 'xl',
      '2xl': '2xl',
      '3xl': '2xl',
    };
    return (
      <Component className={`inline-flex items-center ${className}`}>
        <FlawWordmark size={wordmarkSizeMap[size] || 'lg'} />
      </Component>
    );
  }

  const sizeClasses: Record<string, string> = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
    '2xl': 'text-4xl',
    '3xl': 'text-5xl',
  };

  const fontClass = sizeClasses[size] || 'text-2xl';

  return (
    <Component
      className={`font-flaw text-[#111111] font-extrabold ${fontClass} tracking-tight ${className}`}
    >
      {children}
    </Component>
  );
};
