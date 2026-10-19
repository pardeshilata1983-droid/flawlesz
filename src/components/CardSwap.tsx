import React, {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState
} from 'react';
import gsap from 'gsap';
import './CardSwap.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = '', style, ...rest }) => {
  return (
    <div className={`card-content ${className}`} style={style} {...rest}>
      {children}
    </div>
  );
};
Card.displayName = 'Card';

export interface CardSwapProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  cardDistance?: number;
  verticalDistance?: number;
  delay?: number;
  pauseOnHover?: boolean;
  skewAmount?: number;
  easing?: 'linear' | 'elastic' | string;
  onCardClick?: (index: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const CardSwap: React.FC<CardSwapProps> = ({
  children,
  width = 380,
  height = 280,
  cardDistance = 50,
  verticalDistance = 60,
  delay = 4000,
  pauseOnHover = true,
  skewAmount = 4,
  easing = 'elastic',
  onCardClick,
  className = '',
  style
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const isPausedRef = useRef<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAnimatingRef = useRef<boolean>(false);

  const rawCards = Children.toArray(children).filter(isValidElement);
  const count = rawCards.length;

  // Order stores the logical indices of cards from front to back:
  // order[0] is current top/front card, order[count - 1] is the furthest back card
  const [order, setOrder] = useState<number[]>(() =>
    Array.from({ length: count }, (_, i) => i)
  );

  const getEase = () => {
    if (easing === 'elastic') {
      return 'elastic.out(1, 0.75)';
    }
    if (easing === 'linear') {
      return 'none';
    }
    return easing;
  };

  // Helper to compute target transform properties for position in stack (0 = top, 1 = behind, etc.)
  const getSlotStyles = (slotIndex: number) => {
    // 0 is frontmost, higher index is stacked further back & up/right
    const x = slotIndex * cardDistance;
    const y = -slotIndex * verticalDistance;
    const z = -slotIndex * 80;
    const scale = Math.max(0.75, 1 - slotIndex * 0.05);
    const skew = -skewAmount;
    const zIndex = count - slotIndex;
    const opacity = slotIndex >= 4 ? 0 : 1;

    return {
      x,
      y,
      z,
      scale,
      skewY: skew,
      zIndex,
      opacity
    };
  };

  // Initial layout positioning without animation
  useEffect(() => {
    order.forEach((cardIndex, slotIndex) => {
      const el = cardsRef.current[cardIndex];
      if (!el) return;

      const { x, y, z, scale, skewY, zIndex, opacity } = getSlotStyles(slotIndex);

      gsap.set(el, {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        xPercent: -50,
        yPercent: -50,
        x,
        y,
        z,
        scale,
        skewY,
        zIndex,
        opacity,
        transformOrigin: 'center center'
      });
    });
  }, [width, height, cardDistance, verticalDistance, skewAmount, count]);

  // Swap animation: front card drops down/flies forward, rest slide forward, front card returns to back
  const swapCards = () => {
    if (count <= 1 || isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    setOrder(prevOrder => {
      const frontCardIndex = prevOrder[0];
      const frontEl = cardsRef.current[frontCardIndex];
      const newOrder = [...prevOrder.slice(1), frontCardIndex];

      const tl = gsap.timeline({
        onComplete: () => {
          isAnimatingRef.current = false;
        }
      });

      const ease = getEase();

      if (frontEl) {
        // Step 1: Front card slides down and fades slightly forward
        tl.to(
          frontEl,
          {
            y: `+=${verticalDistance * 1.6 + 60}`,
            x: `-=${cardDistance * 0.5}`,
            z: 100,
            scale: 1.04,
            skewY: skewAmount,
            duration: 0.45,
            ease: 'power2.out'
          },
          0
        );

        // Change z-index so it goes behind other cards
        tl.set(frontEl, { zIndex: 1 }, 0.45);

        // Step 2: Front card moves up into the backmost slot
        const backSlot = getSlotStyles(count - 1);
        tl.to(
          frontEl,
          {
            x: backSlot.x,
            y: backSlot.y,
            z: backSlot.z,
            scale: backSlot.scale,
            skewY: backSlot.skewY,
            opacity: backSlot.opacity,
            duration: 0.75,
            ease
          },
          0.46
        );
      }

      // Simultaneously animate other cards advancing one step forward
      newOrder.slice(0, count - 1).forEach((cardIndex, newSlotIndex) => {
        const el = cardsRef.current[cardIndex];
        if (!el) return;

        const target = getSlotStyles(newSlotIndex);

        tl.to(
          el,
          {
            x: target.x,
            y: target.y,
            z: target.z,
            scale: target.scale,
            skewY: target.skewY,
            opacity: target.opacity,
            zIndex: target.zIndex,
            duration: 0.85,
            ease
          },
          0.2
        );
      });

      return newOrder;
    });
  };

  // Auto-cycle timer
  useEffect(() => {
    if (count <= 1) return;

    const scheduleNext = () => {
      timeoutRef.current = setTimeout(() => {
        if (!isPausedRef.current && !isAnimatingRef.current) {
          swapCards();
        }
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [delay, count, cardDistance, verticalDistance, skewAmount, easing]);

  const handleMouseEnter = () => {
    if (pauseOnHover) {
      isPausedRef.current = true;
    }
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) {
      isPausedRef.current = false;
    }
  };

  const handleCardClick = (cardIndex: number) => {
    if (onCardClick) {
      onCardClick(cardIndex);
    }
    // Clicking front card also triggers swap
    if (order[0] === cardIndex && !isAnimatingRef.current) {
      swapCards();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`card-swap-container ${className}`}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {rawCards.map((child, index) => {
        return (
          <div
            key={index}
            ref={(el) => {
              cardsRef.current[index] = el;
            }}
            className="card"
            onClick={() => handleCardClick(index)}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
};

export default CardSwap;
