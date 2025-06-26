"use client";

import { create } from "zustand";
import type { Ride, User, TransportType, Direction, UserRole, Comment } from "./types";
import { auth, db, isConfigured } from "./firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  type User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
} from "firebase/auth";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  getDocs,
  serverTimestamp,
  orderBy,
  setDoc,
  deleteField,
  arrayUnion,
} from "firebase/firestore";
import { seedUsers } from "./mock-data";

interface RideState {
  rides: Ride[];
  currentUser: FirebaseUser | null;
  currentUserProfile: User | null;
  loading: boolean;
  error: string | null;
  initAuth: () => (() => void) | void;
  login: (email: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    password: string,
    phoneNumber: string,
    homeAddress?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  linkWithGoogle: () => Promise<void>;
  updateUserProfile: (data: {
    name: string;
    phoneNumber: string;
    homeAddress: string;
    venmoUsername?: string;
    customAvatar?: { type: 'color' | 'preset' | 'google'; value: string };
  }) => Promise<void>;
  addRide: (
    pickup: string,
    dropoff: string,
    fare: number,
    details: {
      dateTime: string;
      transportType?: TransportType | "";
      transportNumber?: string;
      direction?: Direction;
      isRoundTrip?: boolean;
      returnTime?: string; // Optional for round trip
      tripLabel?: "Outbound" | "Return"; // For transport hub round trips
      linkedTripId?: string; // ID of linked trip
    }
  ) => Promise<void>;
  updateRide: (
    rideId: string,
    pickup: string,
    dropoff: string,
    fare: number,
    details: {
      dateTime: string;
      transportType?: TransportType | "";
      transportNumber?: string;
      direction?: Direction;
      isRoundTrip?: boolean;
      returnTime?: string; // Optional for round trip
    }
  ) => Promise<void>;
  acceptRide: (id: string) => Promise<void>;
  rejectRide: (id: string) => Promise<void>;
  cancelRide: (id: string) => Promise<boolean>;
  cancelRideByDriver: (id: string) => Promise<void>;
  completeRide: (id: string) => Promise<void>;
  updateRideFare: (id: string, newFare: number) => Promise<void>;
  markAsPaid: (id: string) => Promise<void>;
  addComment: (
    rideId: string,
    text: string,
    user: Pick<User, "id" | "name" | "avatarUrl">
  ) => Promise<void>;
  cleanupOldDeniedRides: () => Promise<void>;
}

export const useRideStore = create<RideState>((set, get) => ({
  rides: [],
  currentUser: null,
  currentUserProfile: null,
  loading: true,
  error: null,
  initAuth: () => {
    if (!auth) {
      set({ loading: false });
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      set({ currentUser: user });
      if (user) {
        // Try to get user document with retry mechanism for new users
        let userDoc;
        let retries = 3;
        const userDocRef = doc(db!, "users", user.uid);
        
        while (retries > 0) {
          userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            break;
          }
          
          // If document doesn't exist, wait a bit and retry
          // This handles the case where Google sign-up is still creating the document
          if (retries > 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          retries--;
        }
        
        if (userDoc && userDoc.exists()) {
          set({
            currentUserProfile: { id: user.uid, ...userDoc.data() } as User,
          });
        } else {
          // If user document still doesn't exist after retries, set to null
          // This will trigger the sign-in page logic
          set({ currentUserProfile: null });
        }

        const ridesCollection = collection(db!, "rides");
        const q = query(ridesCollection, orderBy("createdAt", "desc"));
        const unsubRides = onSnapshot(q, (snapshot) => {
          const rides = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as Ride)
          );
          set({ rides });
        });
        set({ loading: false });
        return unsubRides;
      } else {
        set({
          currentUser: null,
          currentUserProfile: null,
          rides: [],
          loading: false,
        });
      }
    });
    return unsubscribe;
  },
  login: async (email, password) => {
    if (!auth) throw new Error("Firebase not configured");
    await signInWithEmailAndPassword(auth, email, password);
  },
  signUp: async (name, email, password, phoneNumber, homeAddress) => {
    if (!auth || !db) throw new Error("Firebase not configured");
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      name,
      role: "user",
      avatarUrl: `https://placehold.co/100x100.png`,
      phoneNumber,
      ...(homeAddress && { homeAddress }),
    });
  },
  signInWithGoogle: async () => {
    if (!auth || !db) throw new Error("Firebase not configured");
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Create new user profile without phoneNumber so they're redirected to complete-profile
        const newUserData = {
          name: user.displayName || "New User",
          role: "user" as UserRole,
          avatarUrl: user.photoURL || `https://placehold.co/100x100.png`,
          // Deliberately omitting phoneNumber so the complete-profile flow triggers
        };
        
        await setDoc(userDocRef, newUserData);
        
        // Immediately set the user profile in the store to avoid race condition
        set({
          currentUserProfile: { id: user.uid, ...newUserData } as User,
        });
      }
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      throw error;
    }
  },
  linkWithGoogle: async () => {
    if (!auth || !db) throw new Error("Firebase not configured");
    const user = auth.currentUser;
    if (!user) throw new Error("User not logged in");
    const provider = new GoogleAuthProvider();
    try {
      await linkWithPopup(user, provider);
      // Re-fetch user profile to ensure it's up-to-date
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        set({
          currentUserProfile: { id: user.uid, ...userDoc.data() } as User,
        });
      }
    } catch (error) {
      console.error("Error linking Google account:", error);
      set({ error: "Failed to link with Google" });
      throw error;
    }
  },
  logout: async () => {
    if (!auth) throw new Error("Firebase not configured");
    await signOut(auth);
  },
  updateUserProfile: async (data) => {
    const { currentUser } = get();
    if (!db || !currentUser) throw new Error("User not logged in");
    const userDocRef = doc(db, "users", currentUser.uid);
    await updateDoc(userDocRef, data);
    // Fetch the updated profile and update the store
    const updatedDoc = await getDoc(userDocRef);
    if (updatedDoc.exists()) {
      const data = updatedDoc.data();
      set({
        currentUserProfile: {
          id: currentUser.uid,
          name: data.name || "",
          avatarUrl: data.avatarUrl || "",
          role: data.role || "user",
          phoneNumber: data.phoneNumber,
          homeAddress: data.homeAddress,
          venmoUsername: data.venmoUsername,
          customAvatar: data.customAvatar,
          googleAccount: data.googleAccount,
        },
      });
    }
  },
  addRide: async (
    pickup,
    dropoff,
    fare,
    details
  ) => {
    const { currentUserProfile } = get();
    if (!currentUserProfile || !db) return;

    try {
      const directionsResponse = await fetch("/api/directions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ origin: pickup, destination: dropoff }),
      });

      if (!directionsResponse.ok) {
        throw new Error("Failed to fetch directions");
      }
      const { durationMinutes } = await directionsResponse.json();

      const userPayload: Partial<User> = {
        id: currentUserProfile.id,
        name: currentUserProfile.name,
        avatarUrl: currentUserProfile.avatarUrl,
        role: currentUserProfile.role,
      };
      if (currentUserProfile.phoneNumber) {
        userPayload.phoneNumber = currentUserProfile.phoneNumber;
      }
      if (currentUserProfile.homeAddress) {
        userPayload.homeAddress = currentUserProfile.homeAddress;
      }

      const { transportType, linkedTripId, tripLabel, ...otherDetails } = details;

      const newRide: Omit<Ride, "id" | "user"> & { user: Partial<User> } = {
        user: userPayload,
        pickup,
        dropoff,
        fare,
        status: "pending",
        createdAt: serverTimestamp(),
        ...otherDetails,
        duration: durationMinutes || 60, // Fallback to 60 minutes
      };

      if (transportType) {
        (newRide as any).transportType = transportType;
      }

      if (linkedTripId) {
        (newRide as any).linkedTripId = linkedTripId;
      }

      if (tripLabel) {
        (newRide as any).tripLabel = tripLabel;
      }

      await addDoc(collection(db, "rides"), newRide);
    } catch (error) {
      console.error("Error adding ride:", error);
      throw error;
    }
  },
  updateRide: async (
    rideId,
    pickup,
    dropoff,
    fare,
    details
  ) => {
    if (!db) return;
    try {
      const directionsResponse = await fetch("/api/directions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ origin: pickup, destination: dropoff }),
      });

      if (!directionsResponse.ok) {
        throw new Error("Failed to fetch directions");
      }
      const { durationMinutes } = await directionsResponse.json();

      const rideRef = doc(db, "rides", rideId);
      // Accept returnTime as an extra property if present
      const updateData: any = {
        pickup,
        dropoff,
        fare,
        ...details,
        duration: durationMinutes || 60,
        status: "pending",
        driver: null,
        isRevised: true,
      };
      if (details.transportType) {
        updateData.transportType = details.transportType;
      } else {
        updateData.transportType = deleteField();
      }
      if (details.isRoundTrip && (details as any).returnTime) {
        updateData.returnTime = (details as any).returnTime;
      } else {
        updateData.returnTime = deleteField();
      }
      await updateDoc(rideRef, updateData);
    } catch (error) {
      console.error("Error updating ride:", error);
      throw error;
    }
  },
  acceptRide: async (id: string) => {
    const { currentUserProfile } = get();
    if (!db || !currentUserProfile || currentUserProfile.role !== "driver") {
      throw new Error("Driver not signed in or invalid permissions.");
    }
    const rideDocRef = doc(db, "rides", id);

    const driverPayload: Partial<User> = {
      id: currentUserProfile.id,
      name: currentUserProfile.name,
      avatarUrl: currentUserProfile.avatarUrl,
      role: currentUserProfile.role,
      venmoUsername: currentUserProfile.venmoUsername,
    };
    if (currentUserProfile.phoneNumber) {
      driverPayload.phoneNumber = currentUserProfile.phoneNumber;
    }

    await updateDoc(rideDocRef, {
      status: "accepted",
      driver: driverPayload,
      isRevised: false, // No longer needs 'revised' status
    });
  },
  rejectRide: async (id: string) => {
    if (!db) throw new Error("Firebase not configured");
    const rideDocRef = doc(db, "rides", id);
    await updateDoc(rideDocRef, { status: "denied", driver: null });
  },
  cancelRide: async (id: string): Promise<boolean> => {
    if (!db) throw new Error("Firebase not configured");
    const rideDocRef = doc(db, "rides", id);
    const rideDoc = await getDoc(rideDocRef);
    if (!rideDoc.exists()) {
      throw new Error("Ride not found");
    }
    const ride = rideDoc.data() as Ride;
    const now = new Date();
    const rideDate = new Date(ride.dateTime);
    const diffMs = rideDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    const isLateCancellation = diffHours <= 24 && diffHours > 0;

    await updateDoc(rideDocRef, {
      status: "cancelled",
      cancelledAt: serverTimestamp(),
      cancellationFeeApplied: isLateCancellation,
    });

    return isLateCancellation;
  },
  cancelRideByDriver: async (id: string) => {
    if (!db) return;
    const rideRef = doc(db, "rides", id);
    await updateDoc(rideRef, { status: "pending", driver: null });
  },

  completeRide: async (id: string) => {
    if (!db) throw new Error("Firebase not configured");
    const rideDocRef = doc(db, "rides", id);
    
    // Check if this is a cancelled ride with fee applied
    const rideDoc = await getDoc(rideDocRef);
    if (rideDoc.exists()) {
      const ride = rideDoc.data() as Ride;
      if (ride.status === "cancelled" && ride.cancellationFeeApplied) {
        // Delete the ride completely from the database
        await deleteDoc(rideDocRef);
        return;
      }
    }
    
    // For normal rides, just mark as completed
    await updateDoc(rideDocRef, { status: "completed" });
  },
  updateRideFare: async (id: string, newFare: number) => {
    if (!db) throw new Error("Firebase not configured");
    const rideDocRef = doc(db, "rides", id);
    await updateDoc(rideDocRef, { fare: newFare });
  },

  markAsPaid: async (id: string) => {
    if (!db) return;
    const rideRef = doc(db, "rides", id);
    await updateDoc(rideRef, { isPaid: true });
  },
  addComment: async (rideId, text, user) => {
    if (!db) throw new Error("Firebase not configured");
    const rideRef = doc(db, "rides", rideId);
    const newComment: Comment = {
      id: `${user.id}-${new Date().getTime()}`,
      text,
      user,
      createdAt: new Date(),
    };

    // Atomically add a new comment to the "comments" array field.
    await updateDoc(rideRef, {
      comments: arrayUnion(newComment),
    });
  },
  cleanupOldDeniedRides: async () => {
    if (!db) throw new Error("Firebase not configured");
    
    const now = new Date();
    const threeWeeksAgo = new Date(now.getTime() - (3 * 7 * 24 * 60 * 60 * 1000)); // 3 weeks in milliseconds
    
    const ridesCollection = collection(db, "rides");
    const q = query(ridesCollection);
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    let deletedCount = 0;
    
    snapshot.docs.forEach((docSnapshot) => {
      const ride = docSnapshot.data() as Ride;
      if (ride.status === "denied" && ride.createdAt) {
        // Handle both Firestore Timestamp and regular Date
        const createdDate = ride.createdAt.toDate ? ride.createdAt.toDate() : new Date(ride.createdAt);
        
        if (createdDate < threeWeeksAgo) {
          batch.delete(docSnapshot.ref);
          deletedCount++;
        }
      }
    });
    
    if (deletedCount > 0) {
      await batch.commit();
      console.log(`Cleaned up ${deletedCount} old denied rides`);
    }
  },
}));

if (isConfigured) {
  auth;
  db;
}
