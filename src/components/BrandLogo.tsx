import React from 'react';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

/**
 * BrandLogo reproduces the official geometric upward-right arrow brand mark:
 * - Solid black background container
 * - Precise white geometric arrow glyph with top-right right-angle frame and curved diagonal sweep
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  className = '',
  rounded = 'md',
}) => {
  const sizeMap = {
    xs: 'w-5 h-5',
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20',
  };

  const roundedMap = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
  };

  const sClass = sizeMap[size] || 'w-9 h-9';
  const rClass = roundedMap[rounded] || 'rounded-lg';

  return (
    <div
      className={`inline-flex items-center justify-center bg-[#000000] text-white ${rClass} ${sClass} flex-shrink-0 shadow-sm overflow-hidden select-none ${className}`}
      aria-label="Flawlesz AI Brand Logo"
      title="Flawlesz AI"
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="
            M 31 38
            L 31 28.5
            L 72.5 28.5
            L 72.5 70.5
            L 63 70.5
            L 63 44
            Q 46 57 28 71.5
            L 28 62
            L 55.5 38
            Z
          "
          fill="#FFFFFF"
        />
      </svg>
    </div>
  );
};
