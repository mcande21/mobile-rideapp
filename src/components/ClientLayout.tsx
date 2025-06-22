"use client";

import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { useRideStore } from '@/lib/store';
import { useEffect } from 'react';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noHeaderPaths = ['/'];
  const { initAuth } = useRideStore();

  useEffect(() => {
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
