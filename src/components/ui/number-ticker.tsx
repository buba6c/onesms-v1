'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

interface NumberTickerProps {
  value: number;
  duration?: number;
  delay?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  once?: boolean;
}

/**
 * NumberTicker — Animated counter that counts up from 0 to `value` when scrolled into view.
 * Inspired by 21st.dev Animated Counter.
 *
 * @example
 * <NumberTicker value={500} suffix="+" className="text-4xl font-bold" />
 */
export function NumberTicker({
  value,
  duration = 1500,
  delay = 0,
  suffix = '',
  prefix = '',
  className = '',
  once = true,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once, margin: '-60px' });
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView) return;
    if (once && hasAnimated.current) return;

    hasAnimated.current = true;

    const startTime = performance.now() + delay;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      if (elapsed < 0) {
        animationFrame = requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * value);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isInView, value, duration, delay, once]);

  return (
    <span ref={ref} className={className}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}

export default NumberTicker;
