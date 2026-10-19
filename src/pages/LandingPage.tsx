import React, { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import {
  Search,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Database,
  Users,
  Compass,
  Mic,
  Paperclip,
  Globe,
  Hammer,
  Code2,
  CheckCircle2,
  Layers,
  Bot
} from 'lucide-react';
import { BotAvatar, BotStatus } from '../components/BotAvatar.tsx';
import { TeammatesShowcase } from '../components/TeammatesShowcase.tsx';
import { BrandLogo } from '../components/BrandLogo.tsx';
import { FlawWordmark } from '../components/FlawWordmark.tsx';
import { LogoLoop, LogoItem } from '../components/LogoLoop.tsx';
import { CardSwap, Card } from '../components/CardSwap.tsx';
import { StressTestPipeline } from '../components/StressTestPipeline.tsx';
import { Footer } from '../components/Footer.tsx';
import { SkyGradient } from '../components/SkyGradient.tsx';
import { NewsletterBookshelf } from '../components/NewsletterBookshelf.tsx';
import {
  SiGooglecloud,
  SiYcombinator,
  SiProducthunt,
  SiGithub,
  SiStripe,
  SiIndiehackers,
  SiTechcrunch,
  SiReddit,
  SiVercel
} from 'react-icons/si';
import { useAuth } from '../context/AuthContext.tsx';
import { TierPricingSection } from '../components/TierPricingSection.tsx';
import './LandingPage.css';

const ECOSYSTEM_LOGOS: LogoItem[] = [
  {
    node: (
      <span className="nk-logo-node">
        <Globe size={18} />
        <span>Live Web</span>
      </span>
    ),
    title: 'Live Web Search',
    href: '#search'
  },
  {
    node: (
      <span className="nk-logo-node">
        <SiGooglecloud size={20} />
        <span>Cloud Platform</span>
      </span>
    ),
    title: 'Cloud Platform Infrastructure',
    href: 'https://cloud.google.com'
  },
  {
    node: (
      <span className="nk-logo-node">
        <SiYcombinator size={20} />
        <span>Y Combinator</span>
      </span>
    ),
    title: 'Y Combinator Companies',
    href: 'https://ycombinator.com'
  },
  {
    node: (
      <span className="nk-logo-node">
        <SiProducthunt size={20} />
        <span>Product Hunt</span>
      </span>
    ),
    title: 'Product Hunt Launch Radar',
    href: 'https://producthunt.com'
  },
  {
    node: (
      <span className="nk-logo-node">
        <SiGithub size={20} />
        <span>GitHub</span>
      </span>
    ),
    title: 'GitHub Repositories',
    href: 'https://github.com'
  },
  {
    node: (
      <span className="nk-logo-node">
        <SiStripe size={20} />
        <span>Stripe</span>
      </span>
    ),
    title: 'Stripe SaaS Benchmarks',
    href: 'https://stripe.com'
  },
  {
    node: (
      <span className="nk-logo-node">
        <SiIndiehackers size={20} />
        <span>Indie Hackers</span>
      </span>
    ),
    title: 'Indie Hackers Revenue Data',
    href: 'https://indiehackers.com'
  },
  {
    node: (
      <span className="nk-logo-node">
        <SiTechcrunch size={20} />
        <span>TechCrunch</span>
      </span>
    ),
    title: 'TechCrunch Market Signals',
    href: 'https://techcrunch.com'
  },
  {
    node: (
      <span className="nk-logo-node">
        <SiReddit size={20} />
        <span>Reddit</span>
      </span>
    ),
    title: 'Reddit Founder Sentiment',
    href: 'https://reddit.com'
  },
  {
    node: (
      <span className="nk-logo-node">
        <SiVercel size={20} />
        <span>Vercel</span>
      </span>
    ),
    title: 'Vercel Modern Stack',
    href: 'https://vercel.com'
  }
];

const TYPEWRITER_EXAMPLES = [
  'An AI copilot that audits smart contracts for security flaws before deployment...',
  'A decentralized marketplace where solar homeowners sell excess battery power...',
  'An autonomous mobile car wash service that cleans vehicles overnight...',
  'A micro-SaaS calculating real-time customer churn risk from Stripe telemetry...',
  'A subscription box delivering rare plant cuttings calibrated to room light sensors...'
];

interface LandingPageProps {
  onNavigate: (path: string, initialIdea?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [demoIdea, setDemoIdea] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [typewriterText, setTypewriterText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const heroRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Typewriter effect rotating through example startup ideas
  useEffect(() => {
    if (isFocused || demoIdea.length > 0) {
      return;
    }

    const currentFullText = TYPEWRITER_EXAMPLES[currentExampleIndex];
    let timeout: NodeJS.Timeout;

    if (!isDeleting) {
      if (typewriterText.length < currentFullText.length) {
        timeout = setTimeout(() => {
          setTypewriterText(currentFullText.slice(0, typewriterText.length + 1));
        }, 36);
      } else {
        // Pause at full sentence
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 2400);
      }
    } else {
      if (typewriterText.length > 0) {
        timeout = setTimeout(() => {
          setTypewriterText(currentFullText.slice(0, typewriterText.length - 1));
        }, 20);
      } else {
        setIsDeleting(false);
        setCurrentExampleIndex((prev) => (prev + 1) % TYPEWRITER_EXAMPLES.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [typewriterText, isDeleting, currentExampleIndex, isFocused, demoIdea]);

  // Auto-grow textarea up to ~6 lines (160px) then scroll
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 64), 160);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [demoIdea]);

  const handleDemoSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const idea = demoIdea.trim();
    if (user) {
      onNavigate('/flaw/submit', idea);
    } else {
      if (idea) {
        sessionStorage.setItem('flaw_pending_idea', idea);
      }
      onNavigate('/flaw/signup', idea);
    }
  };

  return (
    <div className="nk-landing">
      {/* ====================================================================
          Hero Section (Full viewport height with Live Sky canvas background)
          ==================================================================== */}
      <section ref={heroRef} className="nk-hero">
        {/* Live Sky canvas exported from FeralUI */}
        <div className="nk-video-wrapper">
          <SkyGradient className="w-full h-full" wind={0.4} warp={0.9} />
        </div>

        {/* Soft atmospheric overlay so text remains razor sharp */}
        <div className="nk-video-overlay" />

        {/* Hero Structured Content Container */}
        <div className="nk-hero-container">
          {/* Upper Tier: Headline */}
          <div className="nk-hero-header text-center flex flex-col items-center justify-center w-full">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="flex justify-center items-center"
            >
              <FlawWordmark
                variant="instrument"
                size="2xl"
                className="text-5xl sm:text-7xl md:text-8xl tracking-tight"
                style={{ fontSize: 'clamp(3.8rem, 11vw, 7.8rem)' }}
              />
            </motion.div>
          </div>

          {/* Lower Tier: Focal Point Idea Input Zone */}
          <div className="nk-hero-input-zone">
            {/* Centered Tags directly above the box (subtle, hidden on mobile) */}
            <motion.div
              className="hero-tags-row"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5, ease: 'easeOut' }}
            >
              <span className="hero-tag">Feasibility</span>
              <span className="hero-tag-separator">•</span>
              <span className="hero-tag">Market Fit</span>
              <span className="hero-tag-separator">•</span>
              <span className="hero-tag">Refined</span>
            </motion.div>

            {/* Glassmorphism Main Focal Point Box */}
            <motion.form
              className="hero-input"
              onSubmit={handleDemoSubmit}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6, ease: 'easeOut' }}
            >
              <textarea
                ref={textareaRef}
                id="hero-idea-textarea"
                className="hero-input-textarea"
                placeholder={
                  isFocused || demoIdea.length > 0
                    ? 'Describe your idea...'
                    : typewriterText
                    ? `e.g. ${typewriterText}`
                    : 'Describe your idea...'
                }
                value={demoIdea}
                onChange={(e) => setDemoIdea(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleDemoSubmit();
                  }
                }}
              />

              {/* Bottom Row inside Box */}
              <div className="hero-input-bottom-row">
                <div className="hero-input-actions-left">
                  <button
                    type="button"
                    className="hero-action-btn"
                    onClick={handleDemoSubmit}
                    title="Voice input"
                    aria-label="Voice input"
                  >
                    <Mic size={16} strokeWidth={1.8} />
                  </button>

                  <button
                    type="button"
                    className="hero-action-btn"
                    onClick={handleDemoSubmit}
                    title="Upload file"
                    aria-label="Upload file"
                  >
                    <Paperclip size={16} strokeWidth={1.8} />
                  </button>

                  {demoIdea.length > 0 && (
                    <span className="hero-char-count">{demoIdea.length} chars</span>
                  )}
                </div>

                <button
                  id="hero-find-flaws-btn"
                  type="submit"
                  className="hero-submit-btn"
                >
                  <span className="hero-submit-text">Find Flaws</span>
                  <ArrowRight size={16} strokeWidth={2.2} />
                </button>
              </div>
            </motion.form>

            {/* Subtext under box */}
            <motion.p
              className="hero-input-subtext"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.5 }}
            >
              Free to try. No card required.
            </motion.p>
          </div>
        </div>
      </section>

      {/* ====================================================================
          Ecosystem & Live Intelligence Ticker (LogoLoop from React Bits)
          ==================================================================== */}
      <section className="nk-ecosystem-strip" aria-label="Ecosystem data sources">
        <div className="nk-ecosystem-inner">
          <div className="nk-ecosystem-label">
            <span>GROUNDED BY LIVE DATA SOURCES & BENCHMARKS</span>
          </div>
          <LogoLoop
            logos={ECOSYSTEM_LOGOS}
            speed={48}
            direction="left"
            logoHeight={24}
            gap={44}
            hoverSpeed={14}
            scaleOnHover
            fadeOut
            fadeOutColor="#F4F8FC"
            ariaLabel="Data sources and startup ecosystems"
          />
        </div>
      </section>

      {/* ====================================================================
          Section 1: "How It Works" (4-Step Flow)
          ==================================================================== */}
      <section id="how-it-works" className="nk-section">
        <motion.div
          className="nk-section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="nk-section-badge">
            <Compass size={12} />
            <span>Methodology</span>
          </div>
          <h2 className="nk-section-title">How Flawlesz AI stress-tests your idea</h2>
          <p className="nk-section-subtitle">
            A continuous, automated pipeline that evaluates your raw concept against the live market in seconds.
          </p>
        </motion.div>

        <StressTestPipeline />
      </section>

      {/* ====================================================================
          Section 2: "Why Flawlesz AI" (3 Value-Proposition Callouts)
          ==================================================================== */}
      <section className="nk-section" style={{ paddingTop: 0 }}>
        <motion.div
          className="nk-section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="nk-section-badge">
            <ShieldAlert size={12} />
            <span>Advantages</span>
          </div>
          <h2 className="nk-section-title">Why builders validate with Flawlesz AI</h2>
          <p className="nk-section-subtitle">
            Most idea feedback is polite cheerleading. Flawlesz AI gives you the unflinching reality before you write code.
          </p>
        </motion.div>

        <motion.div
          className="nk-cardswap-wrapper"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <CardSwap
            width={380}
            height={280}
            cardDistance={50}
            verticalDistance={60}
            delay={4000}
            pauseOnHover={true}
            skewAmount={4}
            easing="elastic"
          >
            {/* Card 1 */}
            <Card>
              <div className="nk-why-icon-box">
                <Database size={20} strokeWidth={2} />
              </div>
              <h3 className="nk-why-title">Real data, not guesses</h3>
              <p className="nk-why-desc">
                Backed by live web search. Every identified competitor, failed predecessor, and market benchmark links directly to active web evidence.
              </p>
            </Card>

            {/* Card 2 */}
            <Card>
              <div className="nk-why-icon-box">
                <AlertTriangle size={20} strokeWidth={2} />
              </div>
              <h3 className="nk-why-title">Honest, not vague</h3>
              <p className="nk-why-desc">
                No generic bullet points like 'marketing will be hard.' Flawlesz AI pinpoints exact unit margins, prohibitive CAC ratios, and structural regulatory roadblocks.
              </p>
            </Card>

            {/* Card 3 */}
            <Card>
              <div className="nk-why-icon-box">
                <RefreshCw size={20} strokeWidth={2} />
              </div>
              <h3 className="nk-why-title">Refined, not rejected</h3>
              <p className="nk-why-desc">
                Flawlesz AI doesn't just say no. Every flaw found comes with a rewritten version of your idea designed to survive the exact risks identified.
              </p>
            </Card>

            {/* Card 4 */}
            <Card>
              <div className="nk-why-icon-box">
                <Users size={20} strokeWidth={2} />
              </div>
              <h3 className="nk-why-title">Built for everyone</h3>
              <p className="nk-why-desc">
                Startups, side projects, and home builds alike — Flawlesz AI treats every idea with the same rigor, whether it's a funding pitch or a weekend project.
              </p>
            </Card>
          </CardSwap>
        </motion.div>
      </section>

      {/* ====================================================================
          Section 2.5: AI Teammates
          ==================================================================== */}
      <section id="ai-teammates" className="nk-section" style={{ paddingTop: '24px', paddingBottom: '32px' }}>
        <motion.div
          className="nk-section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="nk-section-badge">
            <span className="font-mono text-xs font-semibold tracking-wider text-[#E8481C] uppercase">
              AI TEAMMATES
            </span>
          </div>
          <h2 className="nk-section-title">Meet your AI team</h2>
          <p className="nk-section-subtitle">
            Specialists that research, write, and plan your idea together.
          </p>
        </motion.div>

        {/* Clean, Large Showcase: One big orb, stacked copy, neighbors, dots */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <TeammatesShowcase onNavigate={onNavigate} />
        </div>
      </section>

      {/* ====================================================================
          Section 2.6: Founder Bookshelf Archive
          ==================================================================== */}
      <section className="nk-section" style={{ paddingTop: '16px', paddingBottom: '32px' }}>
        <motion.div
          className="nk-section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="nk-section-badge">
            <span className="font-mono text-xs font-semibold tracking-wider text-[#E8481C] uppercase">
              FOUNDER ARCHIVE
            </span>
          </div>
          <h2 className="nk-section-title">The Validation Library</h2>
          <p className="nk-section-subtitle">
            Explore interactive editions, startup handbooks, and playbooks curated for independent builders.
          </p>
        </motion.div>

        <div className="w-full mt-6">
          <NewsletterBookshelf />
        </div>
      </section>

      {/* ====================================================================
          Section 3: Four Billing Plans (Free, Pro, Ultra, Enterprise)
          ==================================================================== */}
      <TierPricingSection mode="section" onNavigate={onNavigate} />

      {/* ====================================================================
          Section 4: Final Call-To-Action (Pre-footer)
          ==================================================================== */}
      <section className="nk-cta-section">
        <motion.div
          className="nk-cta-container"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="nk-cta-title">
            Ready to test your concept against reality?
          </h2>
          <p className="nk-cta-subtitle">
            Find out where your idea breaks before spending months and capital building the wrong product.
          </p>

          <div className="nk-cta-actions">
            <button
              id="cta-bottom-primary"
              className="nk-btn-primary"
              onClick={() => onNavigate('/flaw/submit')}
            >
              <span>Find the Flaws</span>
              <ArrowRight size={14} strokeWidth={2} />
            </button>

            <button
              type="button"
              id="cta-bottom-gallery"
              onClick={() => onNavigate('/flaw/gallery')}
              className="nk-btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <span>Browse Public Gallery</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      </section>

      {/* ====================================================================
          Site Footer
          ==================================================================== */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
};
