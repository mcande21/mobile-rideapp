import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Helper to check for driver role
const isDriver = async (uid: string): Promise<admin.firestore.DocumentData> => {
  const userDoc = await db.doc(`users/${uid}`).get();
  const user = userDoc.data();
  if (!user || user.role !== "driver") {
    throw new HttpsError("permission-denied", "User is not a driver.");
  }
  return user;
};

// Accept Ride
export const acceptRide = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Not signed in.");
  }

  const uid = request.auth.uid;
  const driver = await isDriver(uid);
  const rideId = request.data.rideId;

  await db.doc(`rides/${rideId}`).update({
    status: "accepted",
    driver: {
      id: uid,
      name: driver.name,
      avatarUrl: driver.avatarUrl,
      role: driver.role,
      venmoUsername: driver.venmoUsername,
      phoneNumber: driver.phoneNumber,
    },
    isRevised: false,
  });
  return {success: true};
});

// Reject Ride
export const rejectRide = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Not signed in.");
  }

  const uid = request.auth.uid;
  await isDriver(uid); // Ensures only drivers can reject
  const rideId = request.data.rideId;

  await db.doc(`rides/${rideId}`).update({status: "denied", driver: null});
  return {success: true};
});

// Cancel Ride (by User)
export const cancelRide = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Not signed in.");
  }

  const uid = request.auth.uid;
  const rideId = request.data.rideId;
  const rideRef = db.doc(`rides/${rideId}`);
  const rideDoc = await rideRef.get();

  if (!rideDoc.exists) {
    throw new HttpsError("not-found", "Ride not found.");
  }

  const ride = rideDoc.data()!;
  if (ride.user.id !== uid) {
    throw new HttpsError(
        "permission-denied",
        "You can only cancel your own rides.",
    );
  }

  const now = new Date();
  const rideDate = new Date(ride.dateTime);
  const diffHours = (rideDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isLateCancellation = diffHours <= 24 && diffHours > 0;

  await rideRef.update({
    status: "cancelled",
    cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    cancellationFeeApplied: isLateCancellation,
  });

  return {isLateCancellation};
});

// Cancel Ride by Driver (puts it back in pending)
export const cancelRideByDriver = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Not signed in.");
  }

  const uid = request.auth.uid;
  await isDriver(uid);
  const rideId = request.data.rideId;

  await db.doc(`rides/${rideId}`).update({status: "pending", driver: null});
  return {success: true};
});

// Complete Ride
export const completeRide = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Not signed in.");
  }

  const uid = request.auth.uid;
  const driver = await isDriver(uid);
  const rideId = request.data.rideId;
  const rideRef = db.doc(`rides/${rideId}`);
  const rideDoc = await rideRef.get();

  if (!rideDoc.exists) {
    throw new HttpsError("not-found", "Ride not found.");
  }

  const ride = rideDoc.data()!;
  if (ride.driver?.id !== driver.id) {
    throw new HttpsError(
        "permission-denied",
        "You are not the driver for this ride.",
    );
  }

  if (ride.status === "cancelled" && ride.cancellationFeeApplied) {
    await rideRef.delete();
    return {removed: true};
  }

  await rideRef.update({status: "completed"});
  return {removed: false};
});

// Update Ride Fare
export const updateRideFare = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Not signed in.");
  }

  const uid = request.auth.uid;
  await isDriver(uid);
  const {rideId, newFare} = request.data;

  if (typeof newFare !== "number" || newFare <= 0) {
    throw new HttpsError(
        "invalid-argument",
        "Fare must be a positive number.",
    );
  }

  await db.doc(`rides/${rideId}`).update({fare: newFare});
  return {success: true};
});

// Mark as Paid
export const markAsPaid = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Not signed in.");
  }

  const uid = request.auth.uid;
  // Only require that the user is a driver
  await isDriver(uid);
  const rideId = request.data.rideId;
  const rideRef = db.doc(`rides/${rideId}`);
  const rideDoc = await rideRef.get();

  if (!rideDoc.exists) {
    throw new HttpsError("not-found", "Ride not found.");
  }

  const ride = rideDoc.data();
  if (!ride) {
    throw new HttpsError("not-found", "Ride not found.");
  }

  await rideRef.update({isPaid: true});
  return {success: true};
});

// Add Comment
export const addComment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Not signed in.");
  }

  const uid = request.auth.uid;
  const {rideId, text} = request.data;
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new HttpsError(
        "invalid-argument",
        "Comment text cannot be empty.",
    );
  }

  const userDoc = await db.doc(`users/${uid}`).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }
  const user = userDoc.data()!;

  const rideRef = db.doc(`rides/${rideId}`);
  const comment = {
    id: `${uid}-${Date.now()}`,
    text,
    user: {
      id: uid,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    createdAt: new Date(),
  };

  await rideRef.update({
    comments: admin.firestore.FieldValue.arrayUnion(comment),
  });
  return {success: true};
});
