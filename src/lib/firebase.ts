import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
// Import storage emulator connection if needed in the future
// import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// A check to see if the user has provided their Firebase config and that they are not placeholder values.
const isConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes("YOUR_") &&
  !firebaseConfig.projectId.includes("your-")
);

const app = isConfigured && !getApps().length ? initializeApp(firebaseConfig) : (isConfigured ? getApp() : undefined);
const auth = app ? getAuth(app) : undefined;
const db = app ? getFirestore(app) : undefined;
const functions = app ? getFunctions(app) : undefined;
// const storage = app ? getStorage(app) : undefined;

// Connect to emulators if running locally
if (typeof window !== "undefined" && window.location.hostname === "localhost") {
  if (db) connectFirestoreEmulator(db, "localhost", 8080); // Firestore emulator
  if (functions) connectFunctionsEmulator(functions, "localhost", 5001); // Functions emulator
  if (auth) connectAuthEmulator(auth, "http://localhost:9099"); // Auth emulator
  // if (storage) connectStorageEmulator(storage, "localhost", 9199); // Storage emulator (uncomment if needed)
  // Hosting emulator runs on port 5000 (no client SDK connection needed)
}

export { app, auth, db, functions, isConfigured };
