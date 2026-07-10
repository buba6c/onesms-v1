// @ts-nocheck
'use client';

import { useRef } from 'react';
import {
  motion,
  useInView,
} from 'framer-motion';

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  once?: boolean;
  inViewMargin?: string;
}

/**
 * StaggerContainer — Wrapper that animates its children with a staggered entrance.
 * Each direct child gets animated with a cascading delay.
 *
 * @example
 * <StaggerContainer staggerDelay={0.1} direction="up">
 *   <div>Card 1</div>
 *   <div>Card 2</div>
 *   <div>Card 3</div>
 * </StaggerContainer>
 */
export function StaggerContainer({
  children,
  className = '',
  staggerDelay = 0.1,
  duration = 0.5,
  direction = 'up',
  once = true,
  inViewMargin = '-60px',
}: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: inViewMargin as any });

  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
  const value = direction === 'right' || direction === 'down' ? -20 : 20;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      filter: 'blur(4px)',
      [axis]: value,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      [axis]: 0,
      transition: {
        duration,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={containerVariants}
      className={className}
    >
      {Array.isArray(children)
        ? children.map((child, index) => (
            <motion.div key={index} variants={itemVariants}>
              {child}
            </motion.div>
          ))
        : <motion.div variants={itemVariants}>{children}</motion.div>
      }
    </motion.div>
  );
}

export default StaggerContainer;
