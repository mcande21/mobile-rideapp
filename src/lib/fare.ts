import type { Ride } from "./types";

// For now, this is a placeholder. In the future, you could calculate the fare
// based on distance, time, vehicle type, etc.
export function calculateFare(rideDetails: Partial<Ride>): number {
  return 25.00;
}

/**
 * Calculates the fare for a trip based on the pricing logic from ajsairportruns.com.
 *
 * @param pickupLocation The starting point of the trip. (Currently unused)
 * @param dropoffLocation The destination of the trip. Used to determine ride type.
 * @param timeRequested The requested time for the trip.
 * @param mileage The total mileage of the trip.
 * @param isRoundTrip Whether the trip is a round trip.
 * @returns The calculated fare.
 */
export function calculateTripFare(
  pickupLocation: string,
  dropoffLocation: string,
  timeRequested: Date,
  mileage: number,
  isRoundTrip: boolean
): number {
  // Pricing logic from https://www.ajsairportruns.com/
  const airportRates = {
    Newark: { base: 165, mileageMultiplier: 1.5 },
    Albany: { base: 100, mileageMultiplier: 1.5 },
    Stewart: { base: 100, mileageMultiplier: 1.5 },
    Westchester: { base: 140, mileageMultiplier: 1.5 },
  };

  const trainStationRates = {
    Rhinecliff: { mileageMultiplier: 1.75 },
    Poughkeepsie: { mileageMultiplier: 1.75 },
  };

  let baseFare = 0;
  let mileageMultiplier: number;

  const lowerCaseDropoff = dropoffLocation.toLowerCase();
  const airportName = Object.keys(airportRates).find((name) =>
    lowerCaseDropoff.includes(name.toLowerCase())
  );
  const stationName = Object.keys(trainStationRates).find((name) =>
    lowerCaseDropoff.includes(name.toLowerCase())
  );

  if (airportName) {
    const rate = airportRates[airportName as keyof typeof airportRates];
    baseFare = rate.base;
    mileageMultiplier = rate.mileageMultiplier;
  } else if (stationName) {
    const rate =
      trainStationRates[stationName as keyof typeof trainStationRates];
    mileageMultiplier = rate.mileageMultiplier;
  } else if (
    lowerCaseDropoff.includes("train station") ||
    lowerCaseDropoff.includes("station")
  ) {
    mileageMultiplier = 2;
  } else if (lowerCaseDropoff.includes("trailways")) {
    mileageMultiplier = 2;
  } else if (mileage < 40) {
    mileageMultiplier = 1.8;
  } else {
    mileageMultiplier = 2.3;
  }

  // If it's a round trip, the mileage multiplier is always 2.3, overriding other mileage rates.
  if (isRoundTrip) {
    mileageMultiplier = 2.3;
  }

  let fare = mileage * mileageMultiplier + baseFare;

  // Calculate extra fees for same-day scheduling
  const now = new Date();
  // Check if the ride is requested for today
  if (
    now.getFullYear() === timeRequested.getFullYear() &&
    now.getMonth() === timeRequested.getMonth() &&
    now.getDate() === timeRequested.getDate()
  ) {
    const currentHour = now.getHours();
    if (currentHour >= 7 && currentHour < 19) {
      // Day of Scheduling 7AM-7PM: $20
      fare += 20;
    } else if (currentHour >= 19 || currentHour < 1) {
      // Day of Scheduling 7PM-1AM: $30
      fare += 30;
    }
  }

  return fare;
}
