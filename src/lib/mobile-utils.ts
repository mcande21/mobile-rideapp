// Mobile utilities for Capacitor
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Device } from '@capacitor/device';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Geolocation } from '@capacitor/geolocation';

export class MobileUtils {
  static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  static getPlatform(): string {
    return Capacitor.getPlatform();
  }

  static async initializeApp(): Promise<void> {
    if (!this.isNative()) {
      console.log('Running in web mode, skipping mobile initialization');
      return;
    }

    try {
      console.log('🚀 Initializing mobile app...');
      
      // Small delay to ensure app is fully loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Hide splash screen
      console.log('🎨 Hiding splash screen...');
      await SplashScreen.hide();

      // Set status bar style
      console.log('📱 Configuring status bar...');
      await StatusBar.setStyle({ style: Style.Light });
      
      // Set status bar background color (optional)
      await StatusBar.setBackgroundColor({ color: '#000000' });

      console.log('✅ Mobile app initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing mobile app:', error);
      // Even if there's an error, try to hide splash screen
      try {
        await SplashScreen.hide();
        console.log('🎨 Splash screen hidden after error');
      } catch (splashError) {
        console.error('❌ Failed to hide splash screen:', splashError);
      }
    }
  }

  static async getDeviceInfo(): Promise<any> {
    if (!this.isNative()) return null;
    
    try {
      const info = await Device.getInfo();
      return info;
    } catch (error) {
      console.error('Error getting device info:', error);
      return null;
    }
  }

  static async getCurrentPosition(): Promise<GeolocationPosition | null> {
    if (!this.isNative()) {
      // Fallback to web geolocation
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        
        navigator.geolocation.getCurrentPosition(
          position => resolve(position),
          error => reject(error)
        );
      });
    }

    try {
      const coordinates = await Geolocation.getCurrentPosition();
      return {
        coords: {
          latitude: coordinates.coords.latitude,
          longitude: coordinates.coords.longitude,
          accuracy: coordinates.coords.accuracy,
          altitude: coordinates.coords.altitude,
          altitudeAccuracy: coordinates.coords.altitudeAccuracy,
          heading: coordinates.coords.heading,
          speed: coordinates.coords.speed,
        },
        timestamp: coordinates.timestamp,
      } as GeolocationPosition;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  }

  static async triggerHapticFeedback(style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
    if (!this.isNative()) return;

    try {
      const impactStyle = style === 'light' ? ImpactStyle.Light : 
                         style === 'heavy' ? ImpactStyle.Heavy : 
                         ImpactStyle.Medium;
      
      await Haptics.impact({ style: impactStyle });
    } catch (error) {
      console.error('Error triggering haptic feedback:', error);
    }
  }

  static async exitApp(): Promise<void> {
    if (!this.isNative()) return;

    try {
      await App.exitApp();
    } catch (error) {
      console.error('Error exiting app:', error);
    }
  }

  // App state listeners
  static addAppStateListeners(): void {
    if (!this.isNative()) return;

    App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active:', isActive);
    });

    App.addListener('backButton', () => {
      console.log('Back button pressed');
      // Handle back button logic here
    });
  }

  static removeAppStateListeners(): void {
    if (!this.isNative()) return;

    App.removeAllListeners();
  }
}

// Auto-initialize on app load
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    MobileUtils.initializeApp();
    MobileUtils.addAppStateListeners();
  });
}
