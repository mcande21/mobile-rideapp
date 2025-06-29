import {onCall, HttpsError} from "firebase-functions/v2/https";
import {db} from "../lib/firebase";
import {isDriver} from "../lib/helpers";
import {corsOptions} from "../config";

// Mark as Paid
export const markAsPaid = onCall(corsOptions, async (request) => {
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
