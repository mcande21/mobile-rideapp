export type RideStatus = 'pending' | 'accepted' | 'cancelled' | 'completed';
export type UserRole = 'user' | 'driver';

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  role: UserRole;
}

export interface Ride {
  id: string;
  pickup: string;
  dropoff: string;
  fare: number;
  status: RideStatus;
  user: User;
}
