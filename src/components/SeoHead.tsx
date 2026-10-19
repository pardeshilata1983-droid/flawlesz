import React, { useEffect } from 'react';

interface SeoHeadProps {
  currentPath: string;
}

interface PageMeta {
  title: string;
  description: string;
  image: string;
  type?: string;
  noindex?: boolean;
}

const PAGE_METADATA: Record<string, PageMeta> = {
  '/flaw': {
    title: 'Flawlesz AI – Know Before You Build | Automated AI Idea Validation',
    description: 'Flawlesz AI – Know Before You Build. Stress-test startup ideas against live market competitors, uncover hidden flaws, and coordinate autonomous AI Teammates.',
    image: '/og-default.png',
    type: 'website'
  },
  '/flaw/submit': {
    title: 'Idea Validator – Live Competitor & Flaw Analysis | Flawlesz AI',
    description: 'Validate hypotheses with multi-model stress tests (Orbit, Pulsar, Quasar). Detect structural blindspots, analyze live competitors, and refine value propositions.',
    image: '/og-validator.png',
    type: 'website'
  },
  '/validator': {
    title: 'Idea Validator – Live Competitor & Flaw Analysis | Flawlesz AI',
    description: 'Validate hypotheses with multi-model stress tests (Orbit, Pulsar, Quasar). Detect structural blindspots, analyze live competitors, and refine value propositions.',
    image: '/og-validator.png',
    type: 'website'
  },
  '/flaw/teammates': {
    title: 'AI Teammates Office – 5 Specialist Autonomous Agents | Flawlesz AI',
    description: 'Collaborate with Atlas (Architect), Elena (Frontend), Nova (Backend), Cypher (Debugger), and Iris (Reviewer) constructing software in a live sandbox.',
    image: '/og-teammates.png',
    type: 'website'
  },
  '/flaw/teammates/setup': {
    title: 'Assemble AI Teammates – Custom Specialist Configurations | Flawlesz AI',
    description: 'Configure and provision autonomous AI employee specialists across Gemini, Claude, OpenAI, and Grok with custom credentials.',
    image: '/og-teammates.png',
    type: 'website'
  },
  '/flaw/billing': {
    title: 'Plans & Pricing – Fair-Use Quotas & Enterprise Models | Flawlesz AI',
    description: 'Explore transparent pricing for founders and builders on Flawlesz AI. Unlock Orbit, Pulsar, Quasar, and autonomous AI Teammates with zero lock-in.',
    image: '/og-pricing.png',
    type: 'website'
  },
  '/pricing': {
    title: 'Plans & Pricing – Fair-Use Quotas & Enterprise Models | Flawlesz AI',
    description: 'Explore transparent pricing for founders and builders on Flawlesz AI. Unlock Orbit, Pulsar, Quasar, and autonomous AI Teammates with zero lock-in.',
    image: '/og-pricing.png',
    type: 'website'
  },
  '/flaw/gallery': {
    title: 'Public Idea Gallery – Community Validations & Reports | Flawlesz AI',
    description: 'Browse verified diagnostic viability reports, competitor breakdowns, and evaluated concepts from the Flawlesz AI builder community.',
    image: '/og-gallery.png',
    type: 'website'
  },
  '/gallery': {
    title: 'Public Idea Gallery – Community Validations & Reports | Flawlesz AI',
    description: 'Browse verified diagnostic viability reports, competitor breakdowns, and evaluated concepts from the Flawlesz AI builder community.',
    image: '/og-gallery.png',
    type: 'website'
  },
  '/flaw/contact': {
    title: 'Contact Support & Inquiries | Flawlesz AI',
    description: 'Reach out to the Flawlesz AI engineering, billing, and customer support team. We reply to all inquiries within 24-48 business hours.',
    image: '/og-default.png',
    type: 'website'
  },
  '/contact': {
    title: 'Contact Support & Inquiries | Flawlesz AI',
    description: 'Reach out to the Flawlesz AI engineering, billing, and customer support team. We reply to all inquiries within 24-48 business hours.',
    image: '/og-default.png',
    type: 'website'
  },
  '/flaw/privacy': {
    title: 'Privacy Policy | Flawlesz AI',
    description: 'Learn how Flawlesz AI collects, safeguards, and handles user accounts, startup concepts, cookies, and data.',
    image: '/og-default.png',
    type: 'website'
  },
  '/privacy': {
    title: 'Privacy Policy | Flawlesz AI',
    description: 'Learn how Flawlesz AI collects, safeguards, and handles user accounts, startup concepts, cookies, and data.',
    image: '/og-default.png',
    type: 'website'
  },
  '/flaw/terms': {
    title: 'Terms and Conditions | Flawlesz AI',
    description: 'Terms of service, user rights, 100% idea ownership, and commercial terms governing the Flawlesz AI validation platform.',
    image: '/og-default.png',
    type: 'website'
  },
  '/terms': {
    title: 'Terms and Conditions | Flawlesz AI',
    description: 'Terms of service, user rights, 100% idea ownership, and commercial terms governing the Flawlesz AI validation platform.',
    image: '/og-default.png',
    type: 'website'
  },
  '/flaw/thank-you': {
    title: 'Thank You – Submission Received | Flawlesz AI',
    description: 'Thank you for contacting Flawlesz AI. Your inquiry has been securely received by our team.',
    image: '/og-default.png',
    noindex: true
  },
  '/thank-you': {
    title: 'Thank You – Submission Received | Flawlesz AI',
    description: 'Thank you for contacting Flawlesz AI. Your inquiry has been securely received by our team.',
    image: '/og-default.png',
    noindex: true
  }
};

function setOrCreateMeta(attrName: 'name' | 'property', attrValue: string, content: string) {
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setOrCreateLink(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

export const SeoHead: React.FC<SeoHeadProps> = ({ currentPath }) => {
  useEffect(() => {
    const normalized = currentPath.split('?')[0].split('#')[0] || '/flaw';
    let meta = PAGE_METADATA[normalized];

    if (!meta) {
      if (normalized.startsWith('/share/') || normalized.startsWith('/flaw/share/')) {
        meta = {
          title: 'Stress-Tested Startup Validation Report | FLAWLESZ AI',
          description: 'Official startup idea viability breakdown, live market competitors, and structural flaw analysis on FLAWLESZ AI. Know Before You Build.',
          image: '/og-default.png',
          type: 'article',
        };
      } else {
        meta = PAGE_METADATA['/flaw'];
      }
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://flaw.app';
    const canonicalUrl = `${origin}${normalized}`;
    const imageUrl = meta.image.startsWith('http') ? meta.image : `${origin}${meta.image}`;

    // 1. Document Title
    document.title = meta.title;

    // 2. Meta Description
    setOrCreateMeta('name', 'description', meta.description);

    // 3. OpenGraph Tags
    setOrCreateMeta('property', 'og:title', meta.title);
    setOrCreateMeta('property', 'og:description', meta.description);
    setOrCreateMeta('property', 'og:type', meta.type || 'website');
    setOrCreateMeta('property', 'og:url', canonicalUrl);
    setOrCreateMeta('property', 'og:image', imageUrl);
    setOrCreateMeta('property', 'og:site_name', 'Flawlesz AI');

    // 4. Twitter Card Tags (summary_large_image)
    setOrCreateMeta('name', 'twitter:card', 'summary_large_image');
    setOrCreateMeta('name', 'twitter:title', meta.title);
    setOrCreateMeta('name', 'twitter:description', meta.description);
    setOrCreateMeta('name', 'twitter:image', imageUrl);

    // 5. Canonical Link
    setOrCreateLink('canonical', canonicalUrl);

    // 6. Robots Tag (Strict noindex for /thank-you)
    let robotsEl = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (meta.noindex) {
      if (!robotsEl) {
        robotsEl = document.createElement('meta');
        robotsEl.name = 'robots';
        document.head.appendChild(robotsEl);
      }
      robotsEl.content = 'noindex, nofollow';
    } else {
      if (robotsEl) {
        robotsEl.content = 'index, follow';
      }
    }
  }, [currentPath]);

  return null;
};
