import {onCall, HttpsError} from "firebase-functions/v2/https";
import {FieldValue} from "firebase-admin/firestore";
import {db} from "../lib/firebase";
import {corsOptions} from "../config";

// Add Comment
export const addComment = onCall(corsOptions, async (request) => {
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
      avatarUrl: user.avatarUrl || null,
    },
    createdAt: new Date(),
  };

  await rideRef.update({
    comments: FieldValue.arrayUnion(comment),
  });
  return {success: true};
});
