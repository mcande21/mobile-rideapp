import type { CapacitorConfig } from '@capacitor/cli';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Production-ready Capacitor configuration
 * - Only includes server config in development
 * - Uses environment variables for flexible configuration
 * - Includes proper app metadata and plugin configuration
 */
const config: CapacitorConfig = {
  appId: 'com.ajsairportruns',
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Utopia Rideshare',
  webDir: 'out',
  
  // Only include server config in development
  ...(isDevelopment && {
    server: {
      url: process.env.CAPACITOR_SERVER_URL || 'http://localhost:5000',
      cleartext: true,
      allowNavigation: [
        'http://localhost:*',
        'http://192.168.*.*:*',
        'https://*.firebaseapp.com',
        'https://*.web.app'
      ]
    }
  }),
  
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#ffffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true,
    },
    // Add more plugin configurations as needed
    StatusBar: {
      style: 'default',
      backgroundColor: '#ffffff',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
  
  // Production-specific configurations
  ...(process.env.NODE_ENV === 'production' && {
    android: {
      allowMixedContent: false,
      captureInput: true,
      webContentsDebuggingEnabled: false,
    },
    ios: {
      contentInset: 'automatic',
      scrollEnabled: true,
      allowsLinkPreview: false,
    },
  }),
};

export default config;
