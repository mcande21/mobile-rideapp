"use client";

import { create } from "zustand";
import type { Ride } from "./types";

const initialRides: Ride[] = [
  {
    id: "1",
    pickup: "123 Main St, Anytown, USA",
    dropoff: "456 Oak Ave, Anytown, USA",
    fare: 25.5,
    status: "pending",
    user: {
      name: "Alice Johnson",
      avatarUrl: "https://placehold.co/100x100.png",
    },
  },
  {
    id: "2",
    pickup: "789 Pine Ln, Anytown, USA",
    dropoff: "101 Maple Dr, Anytown, USA",
    fare: 18.75,
    status: "pending",
    user: {
      name: "Bob Williams",
      avatarUrl: "https://placehold.co/100x100.png",
    },
  },
  {
    id: "3",
    pickup: "210 Elm St, Anytown, USA",
    dropoff: "321 Birch Rd, Anytown, USA",
    fare: 32.0,
    status: "accepted",
    user: {
      name: "Charlie Brown",
      avatarUrl: "https://placehold.co/100x100.png",
    },
  },
];

interface RideState {
  rides: Ride[];
  addRide: (pickup: string, dropoff: string, fare: number) => void;
  acceptRide: (id: string) => void;
  rejectRide: (id: string) => void;
  cancelRide: (id: string) => void;
}

export const useRideStore = create<RideState>((set) => ({
  rides: initialRides,
  addRide: (pickup, dropoff, fare) =>
    set((state) => ({
      rides: [
        ...state.rides,
        {
          id: new Date().toISOString(),
          pickup,
          dropoff,
          fare,
          status: "pending",
          user: { name: "Current User", avatarUrl: "https://placehold.co/100x100.png" },
        },
      ],
    })),
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
