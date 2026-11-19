'use client';

import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'motion/react';
import { ease } from '@/lib/motion';

export default function PageTransition({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <m.div
      className='page-transition'
      initial={reduceMotion ? false : { opacity: 0.72, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.62, ease }}
    >
      {children}
    </m.div>
  );
}
