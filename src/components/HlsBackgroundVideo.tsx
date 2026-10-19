import React, { useEffect, useRef, useState, useMemo } from 'react';
import Hls from 'hls.js';

export interface BackgroundVideoSource {
  src: string;
  poster?: string;
  label?: string;
}

export const DEFAULT_ROTATION_INTERVAL_HOURS = 6;

/**
 * Calculates deterministic active video index based on actual clock time (Unix epoch).
 * Divides real-world time into discrete buckets of `intervalHours`.
 * Reloading the page within the same window returns the exact same video.
 */
export function getActiveVideoIndex(
  count: number,
  intervalHours: number = DEFAULT_ROTATION_INTERVAL_HOURS,
  timestampMs: number = Date.now()
): number {
  if (count <= 1) return 0;
  const intervalMs = Math.max(0.01, intervalHours) * 3600 * 1000;
  const bucket = Math.floor(timestampMs / intervalMs);
  return ((bucket % count) + count) % count;
}

/**
 * Calculates milliseconds remaining until the current rotation bucket expires.
 */
export function getTimeUntilNextRotation(
  intervalHours: number = DEFAULT_ROTATION_INTERVAL_HOURS,
  timestampMs: number = Date.now()
): number {
  const intervalMs = Math.max(0.01, intervalHours) * 3600 * 1000;
  const currentBucketStart = Math.floor(timestampMs / intervalMs) * intervalMs;
  const nextBucketStart = currentBucketStart + intervalMs;
  return Math.max(0, nextBucketStart - timestampMs);
}

export interface HlsBackgroundVideoProps {
  src?: string;
  poster?: string;
  sources?: BackgroundVideoSource[];
  rotationIntervalHours?: number;
  isActive: boolean;
  isResultActive?: boolean;
}

export const HlsBackgroundVideo: React.FC<HlsBackgroundVideoProps> = ({
  src,
  poster,
  sources,
  rotationIntervalHours = DEFAULT_ROTATION_INTERVAL_HOURS,
  isActive,
  isResultActive = false,
}) => {
  // Normalize sources: either use the provided sources array or wrap single src/poster
  const sourceList: BackgroundVideoSource[] = useMemo(() => {
    if (sources && sources.length > 0) return sources;
    if (src) return [{ src, poster }];
    return [];
  }, [sources, src, poster]);

  // Determine active video index deterministically from clock time
  const [activeIndex, setActiveIndex] = useState<number>(() =>
    getActiveVideoIndex(sourceList.length, rotationIntervalHours)
  );

  // Track loaded readiness of each video source to avoid flashes
  const [readyMap, setReadyMap] = useState<Record<number, boolean>>({});

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const hlsInstancesRef = useRef<(Hls | null)[]>([]);

  // Initialize and attach video elements
  useEffect(() => {
    sourceList.forEach((source, idx) => {
      const video = videoRefs.current[idx];
      if (!video) return;

      const isHls = Boolean(source.src && (source.src.includes('.m3u8') || source.src.includes('application/vnd.apple.mpegurl')));

      video.defaultMuted = true;
      video.muted = true;
      video.playsInline = true;

      const markReady = () => {
        setReadyMap((prev) => (prev[idx] ? prev : { ...prev, [idx]: true }));
      };

      if (isHls && Hls.isSupported()) {
        try {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 30,
          });
          hls.loadSource(source.src);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, markReady);
          hlsInstancesRef.current[idx] = hls;
        } catch (err) {
          console.warn(`[VIDEO BG] HLS init error for source ${idx}:`, err);
        }
      } else {
        if (video.readyState >= 3) {
          markReady();
        } else {
          video.addEventListener('loadeddata', markReady, { once: true });
          video.addEventListener('canplay', markReady);
        }
      }
    });

    return () => {
      hlsInstancesRef.current.forEach((hls) => {
        if (hls) hls.destroy();
      });
      hlsInstancesRef.current = [];
    };
  }, [sourceList]);

  // In-session timer: automatically rotates to the next video when the clock bucket elapses
  useEffect(() => {
    if (sourceList.length <= 1) return;

    let rotationTimeoutId: ReturnType<typeof setTimeout>;
    let preloadTimeoutId: ReturnType<typeof setTimeout>;

    const scheduleNextRotation = () => {
      const msRemaining = getTimeUntilNextRotation(rotationIntervalHours);
      const minutesRemaining = (msRemaining / (1000 * 60)).toFixed(1);
      console.log(
        `[VIDEO ROTATION] Active index: ${activeIndex} (${sourceList[activeIndex]?.label || sourceList[activeIndex]?.src}). Next rotation in ${minutesRemaining} minutes.`
      );

      // Preload next video 45 seconds before the scheduled switch time
      const preloadLeadTimeMs = Math.min(45000, msRemaining - 1000);
      if (preloadLeadTimeMs > 0) {
        preloadTimeoutId = setTimeout(() => {
          const nextIdx = (activeIndex + 1) % sourceList.length;
          const nextVideo = videoRefs.current[nextIdx];
          if (nextVideo) {
            console.log(`[VIDEO ROTATION] Preloading next video stream in background: index ${nextIdx}`);
            nextVideo.preload = 'auto';
            nextVideo.load();
          }
        }, msRemaining - preloadLeadTimeMs);
      }

      // Schedule the actual crossfade switch
      rotationTimeoutId = setTimeout(() => {
        const nextIdx = (activeIndex + 1) % sourceList.length;
        console.log(`[VIDEO ROTATION] Interval expired. Crossfading from video ${activeIndex} -> ${nextIdx}`);

        const nextVideo = videoRefs.current[nextIdx];
        if (nextVideo && isActive) {
          nextVideo.muted = true;
          const p = nextVideo.play();
          if (p && p.catch) p.catch(() => {});
        }

        setActiveIndex(nextIdx);
        scheduleNextRotation();
      }, msRemaining);
    };

    scheduleNextRotation();

    // Verify clock synchronization if the user's computer resumes from sleep or tab refocuses
    const syncWithClock = () => {
      const expectedIndex = getActiveVideoIndex(sourceList.length, rotationIntervalHours);
      if (expectedIndex !== activeIndex) {
        console.log(`[VIDEO ROTATION] Tab resumed: updating active index from ${activeIndex} to ${expectedIndex}`);
        const expectedVideo = videoRefs.current[expectedIndex];
        if (expectedVideo && isActive) {
          expectedVideo.muted = true;
          const p = expectedVideo.play();
          if (p && p.catch) p.catch(() => {});
        }
        setActiveIndex(expectedIndex);
      }
    };

    document.addEventListener('visibilitychange', syncWithClock);
    window.addEventListener('focus', syncWithClock);

    return () => {
      clearTimeout(rotationTimeoutId);
      clearTimeout(preloadTimeoutId);
      document.removeEventListener('visibilitychange', syncWithClock);
      window.removeEventListener('focus', syncWithClock);
    };
  }, [sourceList, rotationIntervalHours, activeIndex, isActive]);

  // Handle active playback and resource conservation for inactive streams
  useEffect(() => {
    if (!isActive) {
      videoRefs.current.forEach((v) => {
        if (v && !v.paused) v.pause();
      });
      return;
    }

    // Play currently active video
    const activeVideo = videoRefs.current[activeIndex];
    if (activeVideo) {
      activeVideo.muted = true;
      const p = activeVideo.play();
      if (p && p.catch) p.catch(() => {});
    }

    // Allow 600ms for smooth crossfade, then pause other videos to save CPU & battery
    const pauseTimer = setTimeout(() => {
      sourceList.forEach((_, idx) => {
        if (idx !== activeIndex) {
          const inactiveVideo = videoRefs.current[idx];
          if (inactiveVideo && !inactiveVideo.paused) {
            inactiveVideo.pause();
          }
        }
      });
    }, 600);

    return () => clearTimeout(pauseTimer);
  }, [activeIndex, isActive, sourceList]);

  // Mobile / strict browser gesture unlock fallback
  useEffect(() => {
    if (!isActive) return;

    const unlockPlay = () => {
      const activeVideo = videoRefs.current[activeIndex];
      if (activeVideo && activeVideo.paused && isActive) {
        activeVideo.muted = true;
        const p = activeVideo.play();
        if (p && p.catch) {
          p.then(() => {
            setReadyMap((prev) => ({ ...prev, [activeIndex]: true }));
          }).catch(() => {});
        }
      }
    };

    window.addEventListener('touchstart', unlockPlay, { passive: true, once: true });
    window.addEventListener('pointerdown', unlockPlay, { passive: true, once: true });
    window.addEventListener('click', unlockPlay, { passive: true, once: true });

    return () => {
      window.removeEventListener('touchstart', unlockPlay);
      window.removeEventListener('pointerdown', unlockPlay);
      window.removeEventListener('click', unlockPlay);
    };
  }, [activeIndex, isActive]);

  return (
    <div
      id="hero-media-background"
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0d1117] transition-opacity duration-700 ease-in-out ${
        isActive ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Video layers with 300-500ms opacity crossfade */}
      {sourceList.map((source, idx) => {
        const isCurrent = idx === activeIndex;
        const isReady = Boolean(readyMap[idx]);

        return (
          <div
            key={source.src}
            className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ease-in-out ${
              isCurrent ? 'opacity-100 z-[2]' : 'opacity-0 z-[1]'
            }`}
          >
            {/* Matching poster fallback for instant paint (purely decorative ambient background) */}
            {source.poster && (
              <img
                src={source.poster}
                alt=""
                className={`turntable-media z-[1] select-none pointer-events-none transition-opacity duration-700 ${
                  isReady && isCurrent ? 'opacity-0' : 'opacity-100'
                }`}
              />
            )}

            {/* Video element: full 100% opacity, no washed-out filters or overlays */}
            <video
              ref={(el) => {
                videoRefs.current[idx] = el;
              }}
              src={source.src}
              poster={source.poster}
              autoPlay={isCurrent}
              loop
              muted
              playsInline
              preload="auto"
              className={`turntable-media z-[2] select-none pointer-events-none transition-opacity duration-500 ease-out ${
                isReady ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>
        );
      })}

      {/* Soft diffuser wash: ONLY active when viewing detailed validation results & follow-up chat */}
      {isResultActive && (
        <div className="absolute inset-0 z-[4] pointer-events-none bg-[#F5F4F0]/75 backdrop-blur-[1px] transition-opacity duration-500" />
      )}
    </div>
  );
};
