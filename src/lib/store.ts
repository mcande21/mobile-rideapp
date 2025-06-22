"use client";

import { create } from "zustand";
import type { Ride, User } from "./types";
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
  orderBy
} from "firebase/firestore";
import { seedUsers } from "./mock-data";

interface RideState {
  rides: Ride[];
  currentUser: FirebaseUser | null;
  currentUserProfile: User | null;
  loading: boolean;
  initAuth: () => () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  addRide: (pickup: string, dropoff: string, fare: number) => Promise<void>;
  acceptRide: (id: string) => Promise<void>;
  rejectRide: (id: string) => Promise<void>;
  cancelRide: (id: string) => Promise<void>;
  seedDatabase: () => Promise<string>;
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
          set({ currentUserProfile: { id: user.uid, ...userDoc.data() } as User });
        } else {
          set({ currentUserProfile: null });
        }
        
        const ridesCollection = collection(db!, "rides");
        const q = query(ridesCollection, orderBy("createdAt", "desc"));
        const unsubRides = onSnapshot(q, (snapshot) => {
          const rides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride));
          set({ rides });
        });
        set({ loading: false });
        return unsubRides;

      } else {
        set({ currentUser: null, currentUserProfile: null, rides: [], loading: false });
      }
    });
    return unsubscribe;
  },
  login: async (email, password) => {
    if (!auth) throw new Error("Firebase not configured");
    await signInWithEmailAndPassword(auth, email, password);
  },
  logout: async () => {
    if (!auth) throw new Error("Firebase not configured");
    await signOut(auth);
  },
  addRide: async (pickup, dropoff, fare) => {
    const { currentUserProfile } = get();
    if (!db || !currentUserProfile) throw new Error("User not signed in");
    await addDoc(collection(db, "rides"), {
      pickup,
      dropoff,
      fare,
      status: "pending",
      user: currentUserProfile,
      createdAt: serverTimestamp(),
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
  seedDatabase: async () => {
    if (!isConfigured) {
      throw new Error("Firebase is not configured. Please add your Firebase project configuration to .env.local.");
    }
    if (!auth || !db) {
       throw new Error("Firebase auth or db object is not available. This is an initialization error.");
    }
    
    const usersCollection = collection(db, "users");
    const existingUsersSnapshot = await getDocs(usersCollection);
    if (!existingUsersSnapshot.empty) {
      return "Database has already been seeded.";
    }

    const batch = writeBatch(db);
    const createdUsers: User[] = [];

    for (const userData of seedUsers) {
      let uid: string | undefined;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        uid = userCredential.user.uid;
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          console.warn(`User ${userData.email} already exists in Auth. Signing in to get UID.`);
          const tempUser = await signInWithEmailAndPassword(auth, userData.email, userData.password);
          uid = tempUser.user.uid;
        } else {
          console.error("Error creating user during seeding:", error);
          throw new Error(`Failed to create user ${userData.email}. Firebase error: ${error.message} (Code: ${error.code}). Please check your Firebase project setup and .env.local file.`);
        }
      }

      if (!uid) throw new Error(`Failed to get UID for ${userData.email}`);
      
      const userProfile: User = {
        id: uid,
        name: userData.name,
        avatarUrl: userData.avatarUrl,
        role: userData.role,
      };
      createdUsers.push(userProfile);

      const userDocRef = doc(db, "users", uid);
      const { id, ...profileData } = userProfile;
      batch.set(userDocRef, profileData);
    }

    // Sign out to clean up auth state after seeding
    if (auth.currentUser) {
      await signOut(auth);
    }
    
    const alice = createdUsers.find(u => u.name === 'Alice Johnson')!;
    const bob = createdUsers.find(u => u.name === 'Bob Williams')!;

    const ridesData = [
      { pickup: "123 Main St, Anytown, USA", dropoff: "456 Oak Ave, Anytown, USA", fare: 25.5, status: "pending", user: alice },
      { pickup: "789 Pine Ln, Anytown, USA", dropoff: "101 Maple Dr, Anytown, USA", fare: 18.75, status: "pending", user: bob },
      { pickup: "210 Elm St, Anytown, USA", dropoff: "321 Birch Rd, Anytown, USA", fare: 32.0, status: "accepted", user: alice },
    ];

    for (const rideData of ridesData) {
        const rideDocRef = doc(collection(db, "rides"));
        batch.set(rideDocRef, { ...rideData, createdAt: serverTimestamp() });
    }
    
    await batch.commit();
    return "Database seeded successfully!";
  },
}));
