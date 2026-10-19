import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { SimilarProduct } from '../types.ts';

interface CompetitorCardProps {
  product?: SimilarProduct;
  competitor?: SimilarProduct;
  index?: number;
}

export const CompetitorCard: React.FC<CompetitorCardProps> = ({ product, competitor, index = 0 }) => {
  const item = product || competitor || {
    name: 'Competitor Reference',
    description: 'Existing market alternative.',
    source_url: '#',
  };

  const name = item.name || 'Unnamed Competitor';
  const description = item.description || 'Existing market solution.';
  const source_url = item.source_url || '#';

  // Format display url cleanly
  let displayHost = source_url;
  try {
    if (source_url && (source_url.startsWith('http://') || source_url.startsWith('https://'))) {
      const parsed = new URL(source_url);
      if (parsed.hostname.includes('vertexaisearch') || parsed.hostname.includes('google.com')) {
        displayHost = `${name} — Web Citation`;
      } else {
        displayHost = parsed.hostname.replace(/^www\./, '') + (parsed.pathname !== '/' && parsed.pathname.length < 15 ? parsed.pathname : '');
        if (displayHost.length > 38) {
          displayHost = displayHost.substring(0, 35) + '...';
        }
      }
    } else {
      displayHost = 'View Web Source';
    }
  } catch {
    displayHost = 'View Web Source';
  }

  return (
    <div
      id={`competitor-card-${index}`}
      className="bg-[#FFFFFF] border border-[#E0DEDA] rounded-lg p-5 flex flex-col justify-between transition-colors hover:border-[#111111]"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#5A5A5A] flex-shrink-0" strokeWidth={1.5} />
            <h4 className="font-semibold text-base text-[#111111] leading-snug">
              {name}
            </h4>
          </div>
          <span className="text-[11px] font-mono text-[#5A5A5A] bg-[#F5F4F0] px-2 py-0.5 rounded border border-[#E0DEDA]">
            Live Web
          </span>
        </div>

        <p className="text-sm text-[#5A5A5A] leading-relaxed mb-4">
          {description}
        </p>
      </div>

      <div className="pt-3 border-t border-[#E0DEDA] flex items-center justify-between">
        <a
          href={source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[#111111] hover:underline underline-offset-4 decoration-1 group max-w-full truncate"
          title={source_url}
        >
          <span className="truncate">{displayHost}</span>
          <ExternalLink className="w-3.5 h-3.5 text-[#5A5A5A] group-hover:text-[#111111] flex-shrink-0" strokeWidth={1.5} />
        </a>
      </div>
    </div>
  );
};
