import type { Transition, Variants } from 'framer-motion';
import type { Direction } from '@/i18n/config';

/**
 * Snappy, zero-overshoot spring tuned for high-density enterprise telemetry UI.
 */
export const TELEMETRY_SPRING: Transition = {
  type: 'spring',
  stiffness: 440,
  damping: 34,
  mass: 0.8,
};

export const SMOOTH_EASE: Transition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1],
};

export const STAGGER_CONTAINER: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

export const TELEMETRY_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SMOOTH_EASE,
  },
};

/**
 * Direction-aware slide-in offset for drawers & multi-step wizards.
 * In LTR, end-anchored drawers enter from +X (right).
 * In RTL, end-anchored drawers enter from -X (left).
 */
export function getDrawerSlideOffset(dir: Direction): number {
  return dir === 'rtl' ? -48 : 48;
}

export function getStepSlideOffset(dir: Direction, stepDelta: number): number {
  const directionalMultiplier = dir === 'rtl' ? -1 : 1;
  return stepDelta * 32 * directionalMultiplier;
}