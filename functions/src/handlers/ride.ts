import {onCall, HttpsError} from "firebase-functions/v2/https";
import {FieldValue} from "firebase-admin/firestore";
import {db} from "../lib/firebase";
import {isDriver, hashSHA256} from "../lib/helpers";
import {corsOptions} from "../config";

// Accept Ride
export const acceptRide = onCall(corsOptions, async (request) => {
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
export const rejectRide = onCall(corsOptions, async (request) => {
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
export const cancelRide = onCall(corsOptions, async (request) => {
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
export const cancelRideByDriver = onCall(corsOptions, async (request) => {
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
export const completeRide = onCall(corsOptions, async (request) => {
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

// General Edit Ride
export const editRide = onCall(corsOptions, async (request) => {
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
  if (!isDriver && "fees" in updates) {
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

// Reschedule Ride
export const rescheduleRide = onCall(corsOptions, async (request) => {
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
  if (!rideDoc.exists) {
    throw new HttpsError("not-found", "Ride not found.");
  }
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
  const totalFare = Object.values(fees).reduce(
      (sum: number, v: unknown) => sum + (typeof v === "number" ? v : 0),
      0,
  );
  await rideRef.update({
    dateTime: newDateTime,
    fare: totalFare,
    fees: fees,
    status: "pending",
    isRevised: true,
  });
  return {success: true};
});
