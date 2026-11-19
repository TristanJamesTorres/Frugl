'use client';

import { createContext, useContext } from 'react';

type LoadingOverlayControls = {
  startLoading: () => void;
  stopLoading: () => void;
};

const LoadingOverlayContext = createContext<LoadingOverlayControls | null>(null);

export function useLoadingOverlayControls() {
  const controls = useContext(LoadingOverlayContext);
  if (!controls) throw new Error('LoadingOverlayContext is missing its provider.');
  return controls;
}

export default LoadingOverlayContext;
