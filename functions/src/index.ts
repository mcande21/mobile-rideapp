import {onCall, HttpsError} from "firebase-functions/v2/https";
import {FieldValue} from "firebase-admin/firestore";
import {createHash} from "crypto";
import { db } from "../../src/lib/firebase-admin"; // Correctly import from the shared module

// Helper to check for driver role
const isDriver = async (uid: string) => {
  const userDoc = await db.doc(`users/${uid}`).get();
  const user = userDoc.data();
  if (!user || user.role !== "driver") {
    throw new HttpsError("permission-denied", "User is not a driver.");
  }
  return user;
};

// Helper to hash a string with SHA-256
const hashSHA256 = (input: string): string => {
  return createHash("sha256").update(input).digest("hex");
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
      venmoUsername: driver.venmoUsername || "Alex-Meisler",
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
    cancelledAt: FieldValue.serverTimestamp(),
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
  const rideRef = db.doc(`rides/${rideId}`);
  const rideDoc = await rideRef.get();

  if (!rideDoc.exists) {
    throw new HttpsError("not-found", "Ride not found.");
  }

  const ride = rideDoc.data();
  if (!ride || !ride.driver || !ride.driver.id) {
    throw new HttpsError(
        "failed-precondition",
        "No driver assigned to this ride.",
    );
  }

  // Compare SHA-256 hashes
  const rideDriverHash = hashSHA256(ride.driver.id);
  const currentDriverHash = hashSHA256(uid);
  if (rideDriverHash !== currentDriverHash) {
    throw new HttpsError(
        "permission-denied",
        "You are not the assigned driver for this ride.",
    );
  }

  await rideRef.update({status: "pending", driver: null});
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

// Update Ride Fare (driver add-on only)
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

  const rideRef = db.doc(`rides/${rideId}`);
  const rideDoc = await rideRef.get();
  if (!rideDoc.exists) {
    throw new HttpsError("not-found", "Ride not found.");
  }
  const ride = rideDoc.data()!;
  if (!ride.fees || typeof ride.fees.base !== "number") {
    throw new HttpsError(
        "failed-precondition", "Ride fees are not set up correctly.",
    );
  }
  // Calculate driver add-on as the difference
  const currentTotal = Object.values(ride.fees)
      .reduce((s: number, v) => s + (typeof v === "number" ? v : 0), 0);
  const driverAddon = Number(
      (newFare - (currentTotal - (ride.fees.driver_addon || 0))).toFixed(2),
  );
  if (driverAddon < 0) {
    throw new HttpsError("invalid-argument",
        "Driver add-on cannot be negative.");
  }
  const updatedFees = {
    ...ride.fees,
    "driver_addon": driverAddon,
  };
  await rideRef.update({fees: updatedFees});
  return {success: true};
});

// Mark as Paid
export const markAsPaid = onCall(async (request) => {
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
        "Only the driver can mark a ride as paid.",
    );
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
    comments: FieldValue.arrayUnion(comment),
  });
  return {success: true};
});

// General Edit Ride
export const editRide = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Not signed in.");
  }

  const uid = request.auth.uid;
  const {rideId, updates} = request.data;
  if (!rideId || typeof updates !== "object" || Array.isArray(updates)) {
    throw new HttpsError("invalid-argument", "Invalid rideId or updates.");
  }

  const userDoc = await db.doc(`users/${uid}`).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }
  const user = userDoc.data()!;

  const rideRef = db.doc(`rides/${rideId}`);
  const rideDoc = await rideRef.get();
  if (!rideDoc.exists) {
    throw new HttpsError("not-found", "Ride not found.");
  }
  const ride = rideDoc.data()!;

  // Only drivers or the user who requested the ride can edit
  const isDriver = user.role === "driver";
  const isUser = ride.user?.id === uid;
  if (!isDriver && !isUser) {
    throw new HttpsError(
        "permission-denied",
        "Not allowed to edit this ride.",
    );
  }

  // If not a driver, block changes to any fees
  if (!isDriver && ("fees" in updates)) {
    throw new HttpsError(
        "permission-denied",
        "Only drivers can change fees.",
    );
  }
  // If driver, only allow updating driver_addon in fees
  if (isDriver && "fees" in updates) {
    const allowedKeys = ["driver_addon"];
    const updateFees = updates.fees || {};
    const newFees = {...ride.fees};
    for (const key of Object.keys(updateFees)) {
      if (!allowedKeys.includes(key)) {
        throw new HttpsError(
            "permission-denied",
            `Drivers can only update: ${allowedKeys.join(", ")}`,
        );
      }
      newFees[key] = Number(updateFees[key].toFixed(2));
    }
    updates.fees = newFees;
  }

  await rideRef.update(updates);
  return {success: true};
});

// Reschedule Ride (user can reschedule and fee is applied securely)
export const rescheduleRide = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Not signed in.");
  }
  const uid = request.auth.uid;
  const {rideId, newDateTime, rescheduleFee, newFare} = request.data;

  if (!rideId || !newDateTime || typeof newFare !== "number") {
    throw new HttpsError("invalid-argument", "Missing required fields.");
  }

  const rideRef = db.doc(`rides/${rideId}`);
  const rideDoc = await rideRef.get();
  if (!rideDoc.exists) throw new HttpsError("not-found", "Ride not found.");
  const ride = rideDoc.data();
  if (!ride || ride.user.id !== uid) {
    throw new HttpsError("permission-denied", "Not your ride.");
  }

  // Use the new fees object, fallback to old fare if needed
  let fees = ride.fees || {base: ride.fare || 0};
  // Update reschedule fee
  fees = {
    ...fees,
    reschedule: rescheduleFee || 0,
  };
  // Optionally, recalculate driver_addon or other fees if necessary
  const totalFare = Object.values(fees)
      .reduce((sum: number, v) => sum + (typeof v === "number" ? v : 0), 0);
  await rideRef.update({
    dateTime: newDateTime,
    fare: totalFare,
    fees: fees,
    status: "pending",
    isRevised: true,
  });
  return {success: true};
});
