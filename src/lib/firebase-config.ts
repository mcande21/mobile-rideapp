/**
 * Production-Ready Firebase Configuration
 * Automatically detects environment and configures accordingly
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Production Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "rideappstudio.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "rideappstudio",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "rideappstudio.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "your-messaging-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "your-app-id"
};

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();

// Connect to emulators ONLY in development
if (isDevelopment && typeof window !== 'undefined') {
  // Get emulator host based on environment
  const getEmulatorHost = () => {
    // For mobile development, use network IP
    if (isCapacitor) {
      return process.env.NEXT_PUBLIC_EMULATOR_HOST || '192.168.1.240';
    }
    // For web development, use localhost
    return 'localhost';
  };

  const emulatorHost = getEmulatorHost();
  
  // Track if emulators are already connected
  let emulatorsConnected = false;
  
  try {
    if (!emulatorsConnected) {
      // Connect to Auth emulator
      connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
      
      // Connect to Firestore emulator
      connectFirestoreEmulator(db, emulatorHost, 8080);
      
      // Connect to Storage emulator
      connectStorageEmulator(storage, emulatorHost, 9199);
      
      // Connect to Functions emulator
      connectFunctionsEmulator(functions, emulatorHost, 5001);
      
      emulatorsConnected = true;
      
      console.log('🔥 Connected to Firebase emulators:', {
        environment: 'development',
        isCapacitor,
        auth: `http://${emulatorHost}:9099`,
        firestore: `http://${emulatorHost}:8080`,
        storage: `http://${emulatorHost}:9199`,
        functions: `http://${emulatorHost}:5001`
      });
    }
  } catch (error) {
    console.log('Firebase emulators already connected:', error);
  }
} else {
  console.log('🔥 Using production Firebase services:', {
    environment: process.env.NODE_ENV,
    isCapacitor,
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain
  });
}

export { auth, db, storage, functions };
export default app;
