"use client";

import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { useRideStore } from '@/lib/store';
import { MobileUtils } from '@/lib/mobile-utils';
import { useEffect } from 'react';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noHeaderPaths = ['/'];
  const { initAuth } = useRideStore();

  useEffect(() => {
    // Initialize mobile app (handles splash screen hiding, status bar, etc.)
    MobileUtils.initializeApp();
    
    // Initialize authentication
    const unsubscribe = initAuth();
    return () => {
      if(unsubscribe) unsubscribe();
    }
  }, [initAuth]);

  return (
    <div className="flex flex-col h-full">
      {!noHeaderPaths.includes(pathname) && <Header />}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
