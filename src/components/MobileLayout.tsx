'use client';

import { useEffect, useState } from 'react';
import { MobileUtils } from '@/lib/mobile-utils';

interface MobileLayoutProps {
  children: React.ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const [isNative, setIsNative] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  useEffect(() => {
    const checkPlatform = async () => {
      const native = MobileUtils.isNative();
      setIsNative(native);
      
      if (native) {
        const info = await MobileUtils.getDeviceInfo();
        setDeviceInfo(info);
      }
    };

    checkPlatform();
  }, []);

  return (
    <div className={`min-h-screen ${isNative ? 'mobile-app' : 'web-app'}`}>
      {/* Status bar spacer for iOS */}
      {isNative && deviceInfo?.platform === 'ios' && (
        <div className="h-11 bg-black" />
      )}
      
      <main className="flex-1">
        {children}
      </main>
      
      {/* Safe area bottom spacer for mobile */}
      {isNative && (
        <div className="h-8" />
      )}
    </div>
  );
}
