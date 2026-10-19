import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkles, Search, AlertTriangle, RefreshCw } from 'lucide-react';
import './StressTestPipeline.css';

interface PipelineStep {
  number: string;
  category: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  description: string;
}

const STEPS: PipelineStep[] = [
  {
    number: 'STEP 01',
    category: 'INPUT',
    icon: Sparkles,
    title: 'Describe Your Idea',
    description:
      'Enter your concept in plain language — your target audience, value hypothesis, monetization, or draft problem statement.',
  },
  {
    number: 'STEP 02',
    category: 'DISCOVERY',
    icon: Search,
    title: 'Live Web Search',
    description:
      'Live web search surveys current competitors, incumbents, and stealth products with verifiable citation links.',
  },
  {
    number: 'STEP 03',
    category: 'DIAGNOSTICS',
    icon: AlertTriangle,
    title: 'Flaw Detection',
    description:
      'Identifies lethal unit economics, customer acquisition bottlenecks, regulatory hazards, and lack of true defensive moats.',
  },
  {
    number: 'STEP 04',
    category: 'SYNTHESIS',
    icon: RefreshCw,
    title: 'Refined Idea',
    description:
      'Synthesizes actionable pivots and hardened counter-proposals that dodge fatal traps while preserving your core ambition.',
  },
];

export const StressTestPipeline: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [activeSteps, setActiveSteps] = useState<boolean[]>([false, false, false, false]);
  const [pulsingSteps, setPulsingSteps] = useState<boolean[]>([false, false, false, false]);

  const [lineCoords, setLineCoords] = useState<{
    startX: number;
    startY: number;
    length: number;
    ready: boolean;
  }>({
    startX: 0,
    startY: 0,
    length: 0,
    ready: false,
  });

  const stepFractionsRef = useRef<number[]>([0, 0.333, 0.667, 1]);
  const prevActiveRef = useRef<boolean[]>([false, false, false, false]);
  const isFirstMountRef = useRef<boolean>(true);

  // Measure coordinates and calculate progress directly on scroll/resize
  const updatePipeline = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const icons = iconRefs.current;
    if (!icons[0] || !icons[3]) return;

    const containerRect = container.getBoundingClientRect();
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);

    const r0 = icons[0].getBoundingClientRect();
    const r1 = icons[1]?.getBoundingClientRect();
    const r2 = icons[2]?.getBoundingClientRect();
    const r3 = icons[3].getBoundingClientRect();

    let computedProgress = 0;
    let newFractions = [0, 0.333, 0.667, 1];

    if (mobile) {
      // Mobile: Vertical pipeline
      const startY = r0.top + r0.height / 2 - containerRect.top;
      const endY = r3.top + r3.height / 2 - containerRect.top;
      const length = Math.max(1, endY - startY);
      const centerX = r0.left + r0.width / 2 - containerRect.left;

      if (r1 && r2) {
        newFractions = [
          0,
          (r1.top + r1.height / 2 - containerRect.top - startY) / length,
          (r2.top + r2.height / 2 - containerRect.top - startY) / length,
          1,
        ];
      }
      stepFractionsRef.current = newFractions;

      setLineCoords({
        startX: centerX,
        startY,
        length,
        ready: true,
      });

      // Calculate scroll progress for mobile:
      // Line reaches each step's icon exactly when that icon reaches viewport center (~54%)
      const triggerY = window.innerHeight * 0.54;
      const icon0CenterY = r0.top + r0.height / 2;
      const icon3CenterY = r3.top + r3.height / 2;
      const totalSpan = icon3CenterY - icon0CenterY;

      if (totalSpan > 0) {
        computedProgress = (triggerY - icon0CenterY) / totalSpan;
      }
    } else {
      // Desktop: Horizontal pipeline
      const startX = r0.left + r0.width / 2 - containerRect.left;
      const endX = r3.left + r3.width / 2 - containerRect.left;
      const length = Math.max(1, endX - startX);
      const centerY = r0.top + r0.height / 2 - containerRect.top;

      if (r1 && r2) {
        newFractions = [
          0,
          (r1.left + r1.width / 2 - containerRect.left - startX) / length,
          (r2.left + r2.width / 2 - containerRect.left - startX) / length,
          1,
        ];
      }
      stepFractionsRef.current = newFractions;

      setLineCoords({
        startX,
        startY: centerY,
        length,
        ready: true,
      });

      // Calculate scroll progress for desktop:
      // Pipeline row scrolls through the viewport from ~76% down to ~32%
      const rowY = r0.top + r0.height / 2;
      const enterY = window.innerHeight * 0.76;
      const exitY = window.innerHeight * 0.32;
      const travelDistance = enterY - exitY;

      if (travelDistance > 0) {
        computedProgress = (enterY - rowY) / travelDistance;
      }
    }

    const clampedProgress = Math.min(1, Math.max(0, computedProgress));
    setProgress(clampedProgress);

    // Determine active steps based on progress reaching each step's icon fraction
    const fractions = stepFractionsRef.current;
    const newActive = [
      clampedProgress >= 0.01,
      clampedProgress >= (fractions[1] || 0.333) - 0.02,
      clampedProgress >= (fractions[2] || 0.667) - 0.02,
      clampedProgress >= 0.98,
    ];

    // Check for newly activated steps to trigger pulse animation
    if (!isFirstMountRef.current) {
      newActive.forEach((isActive, idx) => {
        if (isActive && !prevActiveRef.current[idx]) {
          setPulsingSteps(prev => {
            const next = [...prev];
            next[idx] = true;
            return next;
          });
          setTimeout(() => {
            setPulsingSteps(prev => {
              const next = [...prev];
              next[idx] = false;
              return next;
            });
          }, 330);
        }
      });
    } else {
      isFirstMountRef.current = false;
    }

    prevActiveRef.current = newActive;
    setActiveSteps(newActive);
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScrollOrResize = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updatePipeline();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);

    // Initial measurement pass and a delayed check for font rendering
    updatePipeline();
    const timer = setTimeout(updatePipeline, 100);

    // Observe container size changes
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      observer = new ResizeObserver(() => {
        onScrollOrResize();
      });
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      clearTimeout(timer);
      if (observer) observer.disconnect();
    };
  }, [updatePipeline]);

  return (
    <div className="nk-pipeline-container" ref={containerRef}>
      {/* Connected Line (Gray base + Orange fill) */}
      {lineCoords.ready && (
        <div className="nk-pipeline-track" aria-hidden="true">
          {/* Base gray line */}
          <div
            className="nk-pipeline-base-line"
            style={
              isMobile
                ? {
                    left: `${lineCoords.startX}px`,
                    top: `${lineCoords.startY}px`,
                    width: '2px',
                    height: `${lineCoords.length}px`,
                    transform: 'translateX(-50%)',
                  }
                : {
                    left: `${lineCoords.startX}px`,
                    top: `${lineCoords.startY}px`,
                    width: `${lineCoords.length}px`,
                    height: '2px',
                    transform: 'translateY(-50%)',
                  }
            }
          />
          {/* Active orange-red progress line */}
          <div
            className="nk-pipeline-fill-line"
            style={
              isMobile
                ? {
                    left: `${lineCoords.startX}px`,
                    top: `${lineCoords.startY}px`,
                    width: '2px',
                    height: `${lineCoords.length * progress}px`,
                    transform: 'translateX(-50%)',
                  }
                : {
                    left: `${lineCoords.startX}px`,
                    top: `${lineCoords.startY}px`,
                    width: `${lineCoords.length * progress}px`,
                    height: '2px',
                    transform: 'translateY(-50%)',
                  }
            }
          />
        </div>
      )}

      {/* 4 Pipeline Steps */}
      <div className="nk-pipeline-grid">
        {STEPS.map((step, idx) => {
          const isActive = activeSteps[idx];
          const isPulsing = pulsingSteps[idx];
          const IconComponent = step.icon;

          return (
            <div
              key={step.number}
              className={`nk-pipeline-step ${isActive ? 'is-active' : ''}`}
            >
              {/* Step Icon on the line */}
              <div
                className="nk-pipeline-icon-wrapper"
                ref={el => {
                  iconRefs.current[idx] = el;
                }}
              >
                <div
                  className={`nk-pipeline-icon-circle ${
                    isActive ? 'is-active' : ''
                  } ${isPulsing ? 'pulse-unlock' : ''}`}
                >
                  <IconComponent size={19} strokeWidth={2} />
                </div>
              </div>

              {/* Step Content */}
              <div className="nk-pipeline-content">
                <div className="nk-pipeline-step-meta">
                  <span className="nk-pipeline-step-num">{step.number}</span>
                  <span className="nk-pipeline-step-tag">{step.category}</span>
                </div>
                <h3 className="nk-pipeline-step-title">{step.title}</h3>
                <p className="nk-pipeline-step-desc">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
