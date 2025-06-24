export type RideStatus = "pending" | "accepted" | "cancelled" | "completed" | "denied";
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
  venmoUsername?: string;
}

export interface Comment {
  id: string;
  text: string;
  user: Pick<User, "id" | "name" | "avatarUrl">;
  createdAt: any;
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
  returnDateTime?: string;
  transportType?: TransportType;
  transportNumber?: string;
  direction?: Direction;
  duration: number; // Estimated duration in minutes
  isRoundTrip?: boolean;
  isPaid?: boolean;
  isRevised?: boolean;
  comments?: Comment[];
}

export interface TransportOptions {
  // Define properties for transport options if needed
}
