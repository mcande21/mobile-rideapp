export type RideStatus = "pending" | "accepted" | "cancelled" | "completed";
export type UserRole = "user" | "driver";
export type TransportType = "flight" | "train" | "bus";
export type Direction = "arrival" | "departure";

export interface User {
  id: string; // Corresponds to Firebase Auth UID
  name: string;
  avatarUrl: string;
  role: UserRole;
  phoneNumber?: string;
  homeAddress?: string;
}

export interface Ride {
  id: string; // Firestore document ID
  pickup: string;
  dropoff: string;
  fare: number;
  status: RideStatus;
  user: User; // Denormalized user data
  driver?: User; // Denormalized driver data
  createdAt: any; // The time the request was made
  dateTime: string; // ISO string for the ride's scheduled date and time
  transportType?: TransportType;
  transportNumber?: string;
  direction?: Direction;
  duration: number; // Estimated duration in minutes
  isRoundTrip?: boolean;
}
