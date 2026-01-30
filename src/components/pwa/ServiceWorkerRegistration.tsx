'use client';

import { useEffect } from 'react';

const SW_UPDATE_INTERVAL = 60 * 60 * 1000; // 60 minutes

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV !== 'production'
    ) {
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Periodic update check
        setInterval(() => {
          registration.update();
        }, SW_UPDATE_INTERVAL);
      })
      .catch((error) => {
        console.error('SW registration failed:', error);
      });
  }, []);

  return null;
}
