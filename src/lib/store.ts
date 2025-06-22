
"use client";

import { create } from "zustand";
import type { Ride, User, TransportType, Direction, UserRole } from "./types";
import { auth, db, isConfigured } from "./firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  type User as FirebaseUser,
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
} from "firebase/firestore";
import { seedUsers } from "./mock-data";
import { getRideDetails } from "@/ai/flows/get-ride-details-flow";

interface RideState {
  rides: Ride[];
  currentUser: FirebaseUser | null;
  currentUserProfile: User | null;
  loading: boolean;
  initAuth: () => () => void;
  login: (email: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    password: string,
    phoneNumber: string,
    homeAddress?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  addRide: (
    pickup: string,
    dropoff: string,
    fare: number,
    details: {
      dateTime: string;
      transportType?: TransportType | "";
      transportNumber?: string;
      direction?: Direction;
    }
  ) => Promise<void>;
  acceptRide: (id: string) => Promise<void>;
  rejectRide: (id: string) => Promise<void>;
  cancelRide: (id: string) => Promise<void>;
  updateRideFare: (id: string, newFare: number) => Promise<void>;
  updateUserProfile: (data: {
    name: string;
    phoneNumber: string;
    homeAddress: string;
  }) => Promise<void>;
}

export const useRideStore = create<RideState>((set, get) => ({
  rides: [],
  currentUser: null,
  currentUserProfile: null,
  loading: true,
  initAuth: () => {
    if (!auth) {
      set({ loading: false });
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      set({ currentUser: user });
      if (user) {
        const userDocRef = doc(db!, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          set({
            currentUserProfile: { id: user.uid, ...userDoc.data() } as User,
          });
        } else {
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
  logout: async () => {
    if (!auth) throw new Error("Firebase not configured");
    await signOut(auth);
  },
  addRide: async (pickup, dropoff, fare, details) => {
    const { currentUserProfile } = get();
    if (!db || !currentUserProfile) throw new Error("User not signed in");

    const rideDetails = await getRideDetails({ pickup, dropoff });

    const userPayload = {
      id: currentUserProfile.id,
      name: currentUserProfile.name,
      avatarUrl: currentUserProfile.avatarUrl,
      role: currentUserProfile.role,
      phoneNumber: currentUserProfile.phoneNumber,
      ...(currentUserProfile.homeAddress && {
        homeAddress: currentUserProfile.homeAddress,
      }),
    };

    await addDoc(collection(db, "rides"), {
      pickup,
      dropoff,
      fare,
      status: "pending",
      user: userPayload,
      createdAt: serverTimestamp(),
      duration: rideDetails.duration,
      ...details,
    });
  },
  acceptRide: async (id: string) => {
    if (!db) throw new Error("Firebase not configured");
    const rideDocRef = doc(db, "rides", id);
    await updateDoc(rideDocRef, { status: "accepted" });
  },
  rejectRide: async (id: string) => {
    if (!db) throw new Error("Firebase not configured");
    const rideDocRef = doc(db, "rides", id);
    await deleteDoc(rideDocRef);
  },
  cancelRide: async (id: string) => {
    if (!db) throw new Error("Firebase not configured");
    const rideDocRef = doc(db, "rides", id);
    await updateDoc(rideDocRef, { status: "cancelled" });
  },
  updateRideFare: async (id: string, newFare: number) => {
    if (!db) throw new Error("Firebase not configured");
    const rideDocRef = doc(db, "rides", id);
    await updateDoc(rideDocRef, { fare: newFare });
  },
  updateUserProfile: async (data) => {
    const { currentUser, currentUserProfile } = get();
    if (!db || !currentUser) throw new Error("User not signed in");

    const userDocRef = doc(db, "users", currentUser.uid);
    await updateDoc(userDocRef, data);

    set({
      currentUserProfile: {
        ...currentUserProfile!,
        ...data,
      },
    });
  },
}));
