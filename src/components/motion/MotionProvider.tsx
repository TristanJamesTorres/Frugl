'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AnimatePresence, domAnimation, domMax, LazyMotion, MotionConfig } from 'motion/react';
import { BrandLoaderView } from '@/components/motion/BrandLoader';
import LoadingOverlayContext from './LoadingOverlayContext';

const motionFeatures = { ...domAnimation, layout: domMax.layout };
const MIN_LOADING_MS = 950;

export default function MotionProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(false);
  const loadingStartedAt = useRef<number | null>(null);
  const removalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startLoading = useCallback(() => {
    if (removalTimer.current) {
      clearTimeout(removalTimer.current);
      removalTimer.current = null;
    }
    if (loadingStartedAt.current === null) loadingStartedAt.current = Date.now();
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    if (removalTimer.current) clearTimeout(removalTimer.current);
    const elapsed = loadingStartedAt.current === null
      ? MIN_LOADING_MS
      : Date.now() - loadingStartedAt.current;
    const remaining = Math.max(0, MIN_LOADING_MS - elapsed);

    removalTimer.current = setTimeout(() => {
      setIsLoading(false);
      loadingStartedAt.current = null;
      removalTimer.current = null;
    }, remaining);
  }, []);

  const loadingControls = useMemo(
    () => ({ startLoading, stopLoading }),
    [startLoading, stopLoading]
  );

  useEffect(() => () => {
    if (removalTimer.current) clearTimeout(removalTimer.current);
  }, []);

  return (
    <LazyMotion features={motionFeatures} strict>
      <MotionConfig reducedMotion='user'>
        <LoadingOverlayContext.Provider value={loadingControls}>
          {children}
          <AnimatePresence>
            {isLoading && <BrandLoaderView key='brand-loader' />}
          </AnimatePresence>
        </LoadingOverlayContext.Provider>
      </MotionConfig>
    </LazyMotion>
  );
}