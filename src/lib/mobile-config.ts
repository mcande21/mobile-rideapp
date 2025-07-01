/**
 * Mobile Configuration for BFF API
 * Environment-specific settings for mobile app deployment
 */

interface MobileConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  features: {
    offlineSupport: boolean;
    backgroundSync: boolean;
    pushNotifications: boolean;
  };
  security: {
    enableCertificatePinning: boolean;
    enableRequestSigning: boolean;
  };
}

/**
 * Get configuration based on environment
 */
export function getMobileConfig(): MobileConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
  
  // Base configuration
  const config: MobileConfig = {
    api: {
      baseUrl: '',
      timeout: 30000, // 30 seconds for mobile networks
      retryAttempts: 3,
      retryDelay: 1000,
    },
    features: {
      offlineSupport: isCapacitor,
      backgroundSync: isCapacitor,
      pushNotifications: isCapacitor,
    },
    security: {
      enableCertificatePinning: !isDevelopment && isCapacitor,
      enableRequestSigning: !isDevelopment,
    },
  };

  // Set API base URL based on environment
  if (typeof window !== 'undefined') {
    // Browser environment
    if (isCapacitor) {
      // For production mobile app
      config.api.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://your-production-api.com';
    } else {
      // For web development/production
      config.api.baseUrl = window.location.origin;
    }
  } else {
    // Node.js environment (like scripts)
    config.api.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:9002';
  }

  return config;
}

/**
 * Mobile-specific environment detection
 */
export const mobileUtils = {
  isCapacitor(): boolean {
    return typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
  },
  
  isIOS(): boolean {
    return this.isCapacitor() && (window as any).Capacitor?.getPlatform() === 'ios';
  },
  
  isAndroid(): boolean {
    return this.isCapacitor() && (window as any).Capacitor?.getPlatform() === 'android';
  },
  
  isWeb(): boolean {
    return !this.isCapacitor();
  },
  
  async isOnline(): Promise<boolean> {
    // For now, use browser API. Capacitor plugins can be added later when installed
    return navigator.onLine;
  },
  
  async getDeviceInfo(): Promise<{ platform: string; version: string; model?: string }> {
    if (this.isCapacitor()) {
      // Basic platform detection for now
      const platform = (window as any).Capacitor?.getPlatform() || 'unknown';
      return {
        platform,
        version: navigator.userAgent,
        model: 'mobile-device',
      };
    }
    
    return {
      platform: 'web',
      version: navigator.userAgent,
    };
  },
};

/**
 * Error handling for mobile environments
 */
export const mobileErrorHandler = {
  /**
   * Handle network errors specific to mobile environments
   */
  handleNetworkError(error: Error): string {
    if (error.message.includes('Failed to fetch')) {
      return 'Network connection failed. Please check your internet connection and try again.';
    }
    
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please check your connection and try again.';
    }
    
    if (error.message.includes('certificate') || error.message.includes('SSL')) {
      return 'Secure connection failed. Please check your network settings.';
    }
    
    return 'Network error occurred. Please try again.';
  },
  
  /**
   * Log errors with device context for debugging
   */
  async logError(error: Error, context: string): Promise<void> {
    const deviceInfo = await mobileUtils.getDeviceInfo();
    const isOnline = await mobileUtils.isOnline();
    
    const errorLog = {
      error: {
        message: error.message,
        stack: error.stack,
      },
      context,
      device: deviceInfo,
      online: isOnline,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };
    
    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.error('Mobile App Error:', errorLog);
    }
    
    // In production, you might want to send to a logging service
    // await sendToLoggingService(errorLog);
  },
};

export type { MobileConfig };
