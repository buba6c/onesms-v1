'use client';

import { useRef } from 'react';
import {
  motion,
  useInView,
  type Variant,
  type UseInViewOptions,
} from 'framer-motion';

type Direction = 'up' | 'down' | 'left' | 'right';

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: Direction;
  blur?: string;
  inView?: boolean;
  inViewMargin?: UseInViewOptions['margin'];
  once?: boolean;
}

const generateVariants = (
  direction: Direction,
  blur: string
): { hidden: Variant; visible: Variant } => {
  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
  const value = direction === 'right' || direction === 'down' ? -24 : 24;

  return {
    hidden: {
      filter: `blur(${blur})`,
      opacity: 0,
      [axis]: value,
    },
    visible: {
      filter: 'blur(0px)',
      opacity: 1,
      [axis]: 0,
    },
  };
};

/**
 * BlurFade — Scroll-triggered entrance animation with blur + directional movement.
 * Inspired by 21st.dev Scroll Animation component.
 *
 * @example
 * <BlurFade delay={0.2} direction="up">
 *   <h2>Heading</h2>
 * </BlurFade>
 */
export function BlurFade({
  children,
  className,
  delay = 0,
  duration = 0.5,
  direction = 'up',
  blur = '6px',
  inView = true,
  inViewMargin = '-80px',
  once = true,
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: inViewMargin });

  const shouldAnimate = !inView || isInView;
  const variants = generateVariants(direction, blur);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={shouldAnimate ? 'visible' : 'hidden'}
      variants={variants}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default BlurFade;
