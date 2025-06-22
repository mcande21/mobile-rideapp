export type RideStatus = 'pending' | 'accepted' | 'cancelled' | 'completed';
export type UserRole = 'user' | 'driver';

export interface User {
  id: string; // Corresponds to Firebase Auth UID
  name: string;
  avatarUrl: string;
  role: UserRole;
}

export interface Ride {
  id: string; // Firestore document ID
  pickup: string;
  dropoff: string;
  fare: number;
  status: RideStatus;
  user: User; // Denormalized user data
  createdAt: {
    seconds: number;
    nanoseconds: number;
  }
}
