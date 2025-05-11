'use client';

import { useEffect } from 'react';
import { registerServiceWorker, setupPwaInstallPrompt } from '../app/pwa-register';

export default function PwaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker
    registerServiceWorker();
    
    // Setup PWA install prompt
    setupPwaInstallPrompt();
  }, []);

  return <>{children}</>;
} 