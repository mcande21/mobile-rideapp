import {onCall, HttpsError} from "firebase-functions/v2/https";
import {db} from "../lib/firebase";
import {isDriver} from "../lib/helpers";
import {
  calculateTripFare,
  isTransportLocation,
  calculateTransportRoundTripFare,
} from "../fare";
import {corsOptions} from "../config";

// Update Ride Fare (driver add-on only)
export const updateRideFare = onCall(corsOptions, async (request) => {
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
        "failed-precondition",
        "Ride fees are not set up correctly.",
    );
  }
  // Calculate driver add-on as the difference
  const currentTotal = Object.values(ride.fees).reduce(
      (s: number, v) => s + (typeof v === "number" ? v : 0),
      0,
  );
  const driverAddon = Number(
      (newFare - (currentTotal - (ride.fees.driver_addon || 0))).toFixed(2),
  );
  if (driverAddon < 0) {
    throw new HttpsError(
        "invalid-argument",
        "Driver add-on cannot be negative.",
    );
  }
  const updatedFees = {
    ...ride.fees,
    driver_addon: driverAddon,
  };
  await rideRef.update({fees: updatedFees});
  return {success: true};
});

// Calculate Fare
export const calculateFare = onCall(corsOptions, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Not signed in.");
  }

  try {
    const {
      pickup,
      dropoff,
      date,
      time,
      isRoundTrip,
      returnDate,
      returnTime,
      stops,
    } = request.data;

    // Basic validation
    if (!pickup || !dropoff || !date || !time) {
      throw new HttpsError("invalid-argument", "Missing required fields");
    }

    // --- TIMEZONE FIX ---
    // The client sends date and time in its local timezone. The server needs to
    // interpret this correctly. We construct the date string in ISO format
    // and create a Date object from it, which will be in UTC.
    const dateTimeString = `${date}T${time}:00`;
    const timeZone = "America/New_York";
    const combinedDateTime = new Date(
        new Date(dateTimeString).toLocaleString("en-US", {timeZone}),
    );

    // Validate that the constructed time is in the future.
    if (combinedDateTime.getTime() <= Date.now()) {
      throw new HttpsError(
          "invalid-argument",
          "The ride time must be in the future.",
      );
    }
    // --- END FIX ---

    const isTransportTrip =
      isTransportLocation(pickup) || isTransportLocation(dropoff);

    if (isRoundTrip && isTransportTrip && returnDate && returnTime) {
      // --- TIMEZONE FIX FOR RETURN TRIP ---
      const returnDateTimeString = `${returnDate}T${returnTime}:00`;
      const returnDateTime = new Date(
          new Date(returnDateTimeString).toLocaleString("en-US", {timeZone}),
      );

      if (returnDateTime.getTime() <= combinedDateTime.getTime()) {
        throw new HttpsError(
            "invalid-argument",
            "Return time must be after the departure time.",
        );
      }
      // --- END FIX ---

      const breakdown = await calculateTransportRoundTripFare(
          pickup,
          dropoff,
          combinedDateTime,
          returnDateTime,
          stops,
      );
      return {breakdown};
    } else {
      const calculatedFare = await calculateTripFare(
          pickup,
          dropoff,
          combinedDateTime,
          isRoundTrip,
          stops,
      );
      return {total: calculatedFare};
    }
  } catch (error: unknown) {
    console.error("Fare calculation error:", error);
    if (error instanceof Error && error.message.includes("No routes found")) {
      throw new HttpsError(
          "not-found",
          "No route could be found for the selected date and time.",
      );
    }
    throw new HttpsError(
        "internal",
        "Failed to calculate fare. Please try again.",
    );
  }
});
