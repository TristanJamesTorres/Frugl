import type { Variants } from 'motion/react';

export const ease = [0.22, 1, 0.36, 1] as const;
export const duration = { fast: 0.16, base: 0.26, slow: 0.36 } as const;
export const spring = { type: 'spring', stiffness: 380, damping: 30 } as const;

export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.base, ease } },
  exit: { opacity: 0, transition: { duration: duration.fast, ease } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.slow, ease } },
};

export const slideIn = (dir: 1 | -1): Variants => ({
  hidden: { opacity: 0, x: 16 * dir },
  visible: { opacity: 1, x: 0, transition: { duration: duration.slow, ease } },
  exit: (nextDirection: 1 | -1 = dir) => ({
    opacity: 0,
    x: -16 * nextDirection,
    transition: { duration: duration.fast, ease },
  }),
});

export const dropdown: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: duration.fast, ease } },
  exit: { opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12, ease } },
};

export const toast: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease } },
  exit: { opacity: 0, y: -8, transition: { duration: duration.fast, ease } },
};

export const banner: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.base, ease } },
  exit: { opacity: 0, y: -8, transition: { duration: duration.fast, ease } },
};

export const modalPanel: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: spring },
  exit: { opacity: 0, scale: 0.97, transition: { duration: duration.fast, ease } },
};

export const staggerContainer = (stagger = 0.06): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: 0.04 } },
});