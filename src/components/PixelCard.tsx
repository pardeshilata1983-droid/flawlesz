import React, { useEffect, useRef } from 'react';
import './PixelCard.css';

export interface PixelCardProps {
  variant?: 'default' | 'pink' | 'blue' | 'yellow' | string;
  gap?: number;
  speed?: number;
  colors?: string;
  noFocus?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

const VARIANTS: Record<string, { gap: number; speed: number; colors: string }> = {
  default: {
    gap: 6,
    speed: 35,
    colors: '#f8fafc,#f1f5f9,#cbd5e1'
  },
  pink: {
    gap: 6,
    speed: 35,
    colors: '#fdf2f8,#fbcfe8,#f472b6'
  },
  blue: {
    gap: 6,
    speed: 35,
    colors: '#eff6ff,#bfdbfe,#60a5fa'
  },
  yellow: {
    gap: 6,
    speed: 35,
    colors: '#fefce8,#fef08a,#facc15'
  }
};

class Pixel {
  width: number;
  height: number;
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  color: string;
  speed: number;
  size: number;
  sizeStep: number;
  minSize: number;
  maxSize: number;
  delay: number;
  counter: number;
  counterStep: number;
  isIdle: boolean;
  isReverse: boolean;
  isShimmer: boolean;

  constructor(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    speed: number,
    delay: number
  ) {
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = context;
    this.x = x;
    this.y = y;
    this.color = color;
    this.speed = this.getRandomValue(0.1, 0.9) * speed;
    this.size = 0;
    this.sizeStep = Math.random() * 0.4;
    this.minSize = 0.5;
    this.maxSize = this.getRandomValue(this.minSize, 2);
    this.delay = delay;
    this.counter = 0;
    this.counterStep = Math.random() * 4 + (this.width + this.height) * 0.01;
    this.isIdle = false;
    this.isReverse = false;
    this.isShimmer = false;
  }

  getRandomValue(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  draw() {
    const centerOffset = this.maxSize / 2 - this.size / 2;
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(
      this.x + centerOffset,
      this.y + centerOffset,
      this.size,
      this.size
    );
  }

  appear() {
    this.isIdle = false;
    if (this.counter <= this.delay) {
      this.counter += this.counterStep;
      return;
    }
    if (this.size >= this.maxSize) {
      this.isShimmer = true;
    }
    if (this.isShimmer) {
      this.shimmer();
    } else {
      this.size += this.sizeStep;
    }
    this.draw();
  }

  disappear() {
    this.isShimmer = false;
    this.counter = 0;
    if (this.size <= 0) {
      this.isIdle = true;
      return;
    }
    this.size -= 0.1;
    this.draw();
  }

  shimmer() {
    if (this.size >= this.maxSize) {
      this.isReverse = true;
    } else if (this.size <= this.minSize) {
      this.isReverse = false;
    }
    if (this.isReverse) {
      this.size -= this.speed;
    } else {
      this.size += this.speed;
    }
  }
}

export const PixelCard: React.FC<PixelCardProps> = ({
  variant = 'default',
  gap: customGap,
  speed: customSpeed,
  colors: customColors,
  noFocus = false,
  className = '',
  style,
  children
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const variantConfig = VARIANTS[variant] || VARIANTS.default;
  const gap = customGap ?? variantConfig.gap;
  const speed = customSpeed ?? variantConfig.speed;
  const colors = customColors ?? variantConfig.colors;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number | null = null;
    let pixels: Pixel[] = [];
    const colorArray = colors.split(',').map(c => c.trim());

    const getDistanceToCenter = (x: number, y: number, w: number, h: number) => {
      const dx = x - w / 2;
      const dy = y - h / 2;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const initPixels = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);

      if (width === 0 || height === 0) return;

      canvas.width = width;
      canvas.height = height;

      pixels = [];
      for (let x = 0; x < width; x += gap) {
        for (let y = 0; y < height; y += gap) {
          const color = colorArray[Math.floor(Math.random() * colorArray.length)];
          const delay = getDistanceToCenter(x, y, width, height);
          pixels.push(new Pixel(canvas, ctx, x, y, color, speed * 0.001, delay));
        }
      }
    };

    initPixels();

    const resizeObserver = new ResizeObserver(() => {
      initPixels();
    });
    resizeObserver.observe(container);

    let isHovered = false;

    const handleAnimation = (mode: 'appear' | 'disappear') => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      const step = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let allIdle = true;

        for (let i = 0; i < pixels.length; i++) {
          const pixel = pixels[i];
          if (mode === 'appear') {
            pixel.appear();
            allIdle = false;
          } else {
            pixel.disappear();
            if (!pixel.isIdle) {
              allIdle = false;
            }
          }
        }

        if (!allIdle) {
          animationFrameId = requestAnimationFrame(step);
        } else if (mode === 'disappear') {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      };

      animationFrameId = requestAnimationFrame(step);
    };

    const onMouseEnter = () => {
      isHovered = true;
      handleAnimation('appear');
    };

    const onMouseLeave = () => {
      isHovered = false;
      handleAnimation('disappear');
    };

    const onFocus = () => {
      if (!noFocus) {
        handleAnimation('appear');
      }
    };

    const onBlur = () => {
      if (!noFocus && !isHovered) {
        handleAnimation('disappear');
      }
    };

    container.addEventListener('mouseenter', onMouseEnter);
    container.addEventListener('mouseleave', onMouseLeave);
    if (!noFocus) {
      container.addEventListener('focusin', onFocus);
      container.addEventListener('focusout', onBlur);
    }

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      resizeObserver.disconnect();
      container.removeEventListener('mouseenter', onMouseEnter);
      container.removeEventListener('mouseleave', onMouseLeave);
      if (!noFocus) {
        container.removeEventListener('focusin', onFocus);
        container.removeEventListener('focusout', onBlur);
      }
    };
  }, [gap, speed, colors, noFocus]);

  return (
    <div
      ref={containerRef}
      className={`pixel-card ${className}`}
      style={style}
      tabIndex={noFocus ? undefined : 0}
    >
      <canvas ref={canvasRef} className="pixel-card__canvas" />
      <div className="pixel-card__content">{children}</div>
    </div>
  );
};

export default PixelCard;
