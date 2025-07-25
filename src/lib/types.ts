export type RideStatus = "pending" | "accepted" | "cancelled" | "completed" | "denied";
export type UserRole = "user" | "driver";
export type TransportType = "flight" | "train" | "bus";
export type Direction = "arrival" | "departure";

export interface User {
  id: string; // Corresponds to Firebase Auth UID
  name: string;
  email?: string;
  avatarUrl?: string | null; // Allow null for Firestore compatibility
  role: UserRole;
  phoneNumber?: string | null;
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
  /**
   * The new extensible fee model. All fare-related fees are tracked here.
   * - base: the base fare
   * - driver_addon: any driver-initiated fare adjustment (default 0)
   * - reschedule: reschedule fee (default 0)
   * - day_of: day-of fee (default 0)
   * - [key: string]: extensible for future fees
   *
   * NOTE: There is no 'fare' property. Always use the sum of all values in 'fees' for the total fare.
   */
  fees: {
    base: number;
    driver_addon?: number; // default 0
    reschedule?: number;   // default 0
    day_of?: number;       // default 0
    [key: string]: number | undefined;
  };
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
  tripLabel?: "Outbound" | "Return"; // For transport hub round trips saved as separate rides
  linkedTripId?: string; // ID of the linked trip (outbound <-> return)
  stops?: string[]; // Optional: stops along the way
}

/**
 * Utility function to calculate the total fare from a Ride's fees object.
 * Always use this instead of referencing a 'fare' property.
 */
export function getTotalFare(fees: Ride["fees"]): number {
  return Object.values(fees).reduce((sum: number, v) => sum + (typeof v === 'number' ? v : 0), 0);
}

export interface TransportOptions {
  // Define properties for transport options if needed
}
