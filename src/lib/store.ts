"use client";

import { create } from "zustand";
import type { Ride, User } from "./types";

const mockUsers: User[] = [
  { id: 'user-alice', name: 'Alice Johnson', avatarUrl: 'https://placehold.co/100x100.png', role: 'user' },
  { id: 'user-bob', name: 'Bob Williams', avatarUrl: 'https://placehold.co/100x100.png', role: 'user' },
  { id: 'driver-charlie', name: 'Charlie Brown (Driver)', avatarUrl: 'https://placehold.co/100x100.png', role: 'driver' },
  { id: 'driver-diana', name: 'Diana Miller (Driver)', avatarUrl: 'https://placehold.co/100x100.png', role: 'driver' },
];

const initialRides: Ride[] = [
  {
    id: "1",
    pickup: "123 Main St, Anytown, USA",
    dropoff: "456 Oak Ave, Anytown, USA",
    fare: 25.5,
    status: "pending",
    user: mockUsers[0],
  },
  {
    id: "2",
    pickup: "789 Pine Ln, Anytown, USA",
    dropoff: "101 Maple Dr, Anytown, USA",
    fare: 18.75,
    status: "pending",
    user: mockUsers[1],
  },
  {
    id: "3",
    pickup: "210 Elm St, Anytown, USA",
    dropoff: "321 Birch Rd, Anytown, USA",
    fare: 32.0,
    status: "accepted",
    user: mockUsers[0],
  },
];

interface RideState {
  rides: Ride[];
  users: User[];
  currentUser: User | null;
  addRide: (pickup: string, dropoff: string, fare: number) => void;
  acceptRide: (id: string) => void;
  rejectRide: (id: string) => void;
  cancelRide: (id: string) => void;
  login: (userId: string) => void;
  logout: () => void;
}

export const useRideStore = create<RideState>((set, get) => ({
  rides: initialRides,
  users: mockUsers,
  currentUser: null,
  login: (userId: string) => {
    const user = get().users.find((u) => u.id === userId);
    if (user) {
      set({ currentUser: user });
    }
  },
  logout: () => set({ currentUser: null }),
  addRide: (pickup, dropoff, fare) => {
    const currentUser = get().currentUser;
    if (!currentUser || currentUser.role !== "user") return;
    set((state) => ({
      rides: [
        ...state.rides,
        {
          id: new Date().toISOString(),
          pickup,
          dropoff,
          fare,
          status: "pending",
          user: currentUser,
        },
      ],
    }));
  },
  acceptRide: (id) =>
    set((state) => ({
      rides: state.rides.map((ride) =>
        ride.id === id ? { ...ride, status: "accepted" } : ride
      ),
    })),
  rejectRide: (id) =>
    set((state) => ({
      rides: state.rides.filter((ride) => ride.id !== id),
    })),
  cancelRide: (id) =>
    set((state) => ({
      rides: state.rides.map((ride) =>
        ride.id === id ? { ...ride, status: "cancelled" } : ride
      ),
    })),
}));
