'use client';

import { useEffect, useState } from 'react';
import { m, useReducedMotion } from 'motion/react';
import { Laptop } from '@/components/icons';
import { useLoadingOverlayControls } from './LoadingOverlayContext';

export function BrandLoaderView() {
  const reduceMotion = useReducedMotion();

  return (
    <m.div
      className='brand-loader'
      role='status'
      aria-label='Loading Frugl marketplace'
      aria-live='polite'
      initial={false}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        transition: reduceMotion ? { duration: 0 } : { duration: 0.52, ease: [0.4, 0, 1, 1] },
      }}
    >
      <div className='brand-loader-content'>
        <m.div
          className='brand-loader-icon'
          aria-hidden='true'
          initial={false}
          animate={reduceMotion ? { scale: 1 } : { scale: [1, 1.18, 1] }}
          transition={reduceMotion ? { duration: 0 } : { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Laptop size={56} />
        </m.div>
        <p className='brand-loader-wordmark'>Frugl</p>
        <p className='brand-loader-message'>Good finds take a moment.</p>
      </div>
    </m.div>
  );
}

export default function BrandLoader() {
  const { startLoading, stopLoading } = useLoadingOverlayControls();
  const [isManaged, setIsManaged] = useState(false);

  useEffect(() => {
    startLoading();
    const frame = window.requestAnimationFrame(() => setIsManaged(true));
    return () => {
      window.cancelAnimationFrame(frame);
      stopLoading();
    };
  }, [startLoading, stopLoading]);

  return isManaged ? null : <BrandLoaderView />;
}
