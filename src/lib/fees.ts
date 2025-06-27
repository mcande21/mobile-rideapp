// src/lib/fees.ts
import { airportAddresses } from "@/lib/fare";

export function isAirportRide(pickup: string, dropoff: string): boolean {
  return Object.values(airportAddresses).some((list: string[]) => list.includes(pickup) || list.includes(dropoff));
}

export function isLocalRide(mileageMeters: number): boolean {
  // 1.61 meters per mile (matches your fare.ts logic)
  return (mileageMeters / 1.61) < 40;
}

/**
 * Calculates reschedule fee based on ride type and timing.
 * @param isAirport true if airport ride
 * @param isLocal true if local ride
 * @param rescheduleTime Date when reschedule is requested
 * @param rideTime Date of the ride
 * @returns fee in dollars
 */
export function calculateRescheduleFee({
  isAirport,
  isLocal,
  rescheduleTime,
  rideTime
}: {
  isAirport: boolean,
  isLocal: boolean,
  rescheduleTime: Date,
  rideTime: Date
}): number {
  const msIn24h = 24 * 60 * 60 * 1000;
  const diff = rideTime.getTime() - rescheduleTime.getTime();
  if (diff > 0 && diff <= msIn24h) {
    if (isAirport) return 20;
    if (isLocal) return 15;
  }
  return 0;
}
