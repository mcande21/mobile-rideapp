"use client";

import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noHeaderPaths = ['/'];

  return (
    <div className="flex flex-col h-full">
      {!noHeaderPaths.includes(pathname) && <Header />}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
