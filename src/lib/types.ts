export type RideStatus = 'pending' | 'accepted' | 'cancelled' | 'completed';

export interface Ride {
  id: string;
  pickup: string;
  dropoff: string;
  fare: number;
  status: RideStatus;
  user: {
    name: string;
    avatarUrl: string;
  };
}
