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
  customAvatar?: {
    type: 'color' | 'preset' | 'google';
    value: string; // hex color, preset image name, or google picture URL
  };
  googleAccount?: {
    id: string;
    email: string;
    name: string;
    picture: string;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    selectedCalendarId?: string;
    selectedCalendarName?: string;
  };
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
  returnTime?: string; // Added for round trip return time (HH:mm)
  transportType?: TransportType;
  transportNumber?: string;
  direction?: Direction;
  duration: number; // Estimated duration in minutes
  isRoundTrip?: boolean;
  isPaid?: boolean;
  isRevised?: boolean;
  comments?: Comment[];
  cancelledAt?: any;
  cancellationFeeApplied?: boolean;
}

export interface TransportOptions {
  // Define properties for transport options if needed
}
