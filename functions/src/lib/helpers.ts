import { HttpsError } from "firebase-functions/v2/https";
import { db } from "./firebase";
import * as admin from "firebase-admin";
import { createHash } from "crypto";

// Helper to check for driver role
export const isDriver = async (
  uid: string
): Promise<admin.firestore.DocumentData> => {
  const userDoc = await db.doc(`users/${uid}`).get();
  const user = userDoc.data();
  if (!user || user.role !== "driver") {
    throw new HttpsError("permission-denied", "User is not a driver.");
  }
  return user;
};

// Helper to hash a string with SHA-256
export const hashSHA256 = (input: string): string => {
  return createHash("sha256").update(input).digest("hex");
};
