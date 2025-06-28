// src/lib/firebase-admin.ts
import * as admin from "firebase-admin";

// Ensure the environment variables are set
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!privateKey || !clientEmail || !projectId) {
  throw new Error("Missing Firebase Admin SDK configuration. Check your environment variables.");
}

// Initialize the app if it's not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    databaseURL: `https://${projectId}.firebaseio.com`,
  });
}

export const auth = admin.auth();
export const db = admin.firestore();
