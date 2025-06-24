import { NextResponse } from "next/server";
import { isAirportRide, isLocalRide, calculateRescheduleFee } from "../../../../src/lib/fees";

export async function POST(req: Request) {
  const { pickupLocation, dropoffLocation, oldTime, newTime, mileageMeters } = await req.json();

  // Detect ride type
  const airport = isAirportRide(pickupLocation, dropoffLocation);
  const local = isLocalRide(mileageMeters);

  // Calculate fee
  const fee = calculateRescheduleFee({
    isAirport: airport,
    isLocal: local,
    rescheduleTime: new Date(),
    rideTime: new Date(newTime)
  });

  return NextResponse.json({ fee });
}
