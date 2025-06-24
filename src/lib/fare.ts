import type { Ride } from "./types";

// For now, this is a placeholder. In the future, you could calculate the fare
// based on distance, time, vehicle type, etc.
export function calculateFare(rideDetails: Partial<Ride>): number {
  return 25.00;
}

const airportAddresses = {
  JFK: [
    "John F. Kennedy International Airport, Jamaica, NY 11430",
    "John F. Kennedy International Airport (JFK), Queens, NY, USA",
    "John F. Kennedy International Airport",
    "JFK Terminal 1, Jamaica, NY 11430, USA",
    "JFK Terminal 2, Jamaica, NY 11430, USA",
    "JFK Terminal 3, Jamaica, NY 11430, USA",
    "JFK Terminal 4, Jamaica, NY 11430, USA",
    "JFK Terminal 5, Jamaica, NY 11430, USA",
    "JFK Terminal 6, Jamaica, NY 11430, USA",
    "JFK Terminal 7, Jamaica, NY 11430, USA",
    "JFK Terminal 8, Jamaica, NY 11430, USA",
    "318 Federal Cir, Queens, NY 11430, USA",
    "JFK Terminal 1, 500 Terminal Dr, Jamaica, NY 11430, USA",
    "JFK International Air Terminal LLC, Terminal 4, Room 161.022, Jamaica, NY 11430",
    "JetBlue Airways, Terminal 5, JFK International Airport, Jamaica, NY 11430",
    "JFK Expressway & South Cargo Road, Jamaica, NY 11430",
    "Building 14, Jamaica, NY 11430",
    "Building 77, JFK International Airport, Jamaica, NY 11430",
    "Cargo Area D, Old Rockaway Blvd, Jamaica, NY 11430",
    "Building 71, Cargo Area D, Old Rockaway Blvd, Jamaica, NY 11430",
    "Cargo Building 23, JFK International Airport, Jamaica, NY 11430",
    "Cargo Building 151, JFK International Airport, Jamaica, NY 11430",
    "Cargo Building 86, JFK International Airport, Jamaica, NY 11430",
  ],
  Newark: [
    "Newark Liberty International Airport",
    "Newark Liberty International Airport (EWR), Newark, NJ, USA",
    "Newark Liberty International Airport, 3 Brewster Rd, Newark, NJ 07114",
    "6 Earhart Dr, Newark, NJ 07114",
    "Building 344, Brewster Road, Newark, NJ 07114",
    "339-3 Brewster Rd, Newark, NJ 07114",
    "Located at Newark Liberty International Airport, Newark, NJ 07114",
  ],
  Albany: [
    "Albany International Airport",
    "Albany International Airport (ALB), Albany Shaker Road, Albany, NY, USA",
    "Albany International Airport, 737 Albany Shaker Rd, Albany, NY 12211",
    "737 Albany-Shaker Rd, Administration Bldg, Room 200, Albany, NY 12211",
    "16 Jetway Dr, Albany, NY 12211",
  ],
  Stewart: [
    "New York Stewart International Airport",
    "Stewart International Airport (SWF), 1st Street, New Windsor, NY, USA",
    "New York Stewart International Airport, 1180 1st St, New Windsor, NY 12553",
    "1188 1st St, New Windsor, NY 12553",
    "1032 1st St, Building 112, New Windsor, NY 12553",
    "3 Express Dr, Newburgh, NY 12550",
  ],
  Westchester: [
    "Westchester County Airport (HPN), Airport Road, West Harrison, NY, USA",
    "Westchester County Airport",
    "Westchester County Airport, 240 Airport Rd, Suite 202, White Plains, NY 10604",
    "County of Westchester, County Office Bldg, White Plains, NY 10604",
    "1 Loop Rd, White Plains, NY 10604",
  ],
  Laguardia: [
    "LaGuardia Airport (LGA), East Elmhurst, NY, USA",
    "LaGuardia Airport",
    "LaGuardia Airport, Queens, NY 11371",
    "Ditmars Blvd, East Elmhurst, NY 11369",
    "Hangar #7, Third Floor, Flushing, NY 11371",
    "Hangar 7, LaGuardia Airport, Flushing, NY 11371",
    "LaGuardia Airport, Central Terminal B, Suite CB1L-008B, Flushing, NY 11371",
  ],
};

const trainStationAddresses = {
  Rhinecliff: [
    "455 Rhinecliff Road, Rhinecliff, NY 12574",
    "Hutton & Charles St, Rhinecliff, NY 12574",
  ],
  Poughkeepsie: [
    "Poughkeepsie Train Station, Poughkeepsie, NY, USA",
    "Train station, Poughkeepsie, NY 12601, USA",
    "41 Main Street, Poughkeepsie, NY 12601",
    "32 N Water St, Poughkeepsie, NY 12601",
  ],
};

/**
 * Calculates the fare for a trip based on the pricing logic from ajsairportruns.com.
 *
 * @param pickupLocation The starting point of the trip.
 * @param dropoffLocation The destination of the trip.
 * @param timeRequested The requested time for the trip.
 * @param isRoundTrip Whether the trip is a round trip.
 * @returns The calculated fare.
 */
export async function calculateTripFare(
  pickupLocation: string,
  dropoffLocation: string,
  timeRequested: Date,
  isRoundTrip: boolean
): Promise<number> {
  // Fetch mileage from the directions API
  const directionsResponse = await fetch("/api/directions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      origin: pickupLocation,
      destination: dropoffLocation,
      departureTime: timeRequested.toISOString(), // Always send ISO 8601 string
    }),
  });

  if (!directionsResponse.ok) {
    let errorBody;
    try {
      errorBody = await directionsResponse.json();
    } catch (e) {
      errorBody = { error: "Failed to parse error response." };
    }
    console.error("Error fetching directions:", {
      status: directionsResponse.status,
      statusText: directionsResponse.statusText,
      body: errorBody,
    });
    throw new Error(
      `Failed to fetch directions: ${errorBody.error || "Unknown error"}`
    );
  }

  const directionsData = await directionsResponse.json();

  if (!directionsData.distance || typeof directionsData.distance.value !== "number") {
    throw new Error(
      "Could not calculate distance from directions API response."
    );
  }

  // Pricing logic from https://www.ajsairportruns.com/
  const airportRates = {
    Newark: { base: 165, mileageMultiplier: 1.5 },
    Laguardia: { base: 165, mileageMultiplier: 1.5 },
    JFK: { base: 185, mileageMultiplier: 1.5 },
    Albany: { base: 100, mileageMultiplier: 1.5 },
    Stewart: { base: 100, mileageMultiplier: 1.5 },
    Westchester: { base: 140, mileageMultiplier: 1.5 },
  };

  const trainStationRates = {
    Rhinecliff: { mileageMultiplier: 1.75 },
    Poughkeepsie: { mileageMultiplier: 1.75 },
  };

  // Helper to get distance in miles from Woodstock, NY to pickup location
  async function getDistanceFromWoodstock(pickup: string): Promise<number> {
    const res = await fetch("/api/directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin: "__WOODSTOCK__", destination: pickup }),
    });
    if (!res.ok) throw new Error("Failed to fetch Woodstock distance");
    const data = await res.json();
    if (!data.distance || typeof data.distance.value !== "number") throw new Error("No Woodstock distance");
    return data.distance.value; // in miles
  }

  let baseFare = 0;
  let mileageMultiplier: number;
  const mileage = directionsData.distance.value

  const lowerCaseDropoff = dropoffLocation.toLowerCase();
  const lowerCasePickup = pickupLocation.toLowerCase();

  const airportName = Object.keys(airportAddresses).find(
    (name) =>
      (airportAddresses[name as keyof typeof airportAddresses].includes(
        pickupLocation
      ) ||
        airportAddresses[name as keyof typeof airportAddresses].includes(
          dropoffLocation
        ))
  );

  const stationName = Object.keys(trainStationAddresses).find(
    (name) =>
      (trainStationAddresses[name as keyof typeof trainStationAddresses].includes(
        pickupLocation
      ) ||
        trainStationAddresses[name as keyof typeof trainStationAddresses].includes(
          dropoffLocation
        ))
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
    lowerCaseDropoff.includes("station") ||
    lowerCasePickup.includes("train station") ||
    lowerCasePickup.includes("station")
  ) {
    mileageMultiplier = 2;
  } else if (
    lowerCaseDropoff.includes("trailways") ||
    lowerCasePickup.includes("trailways")
  ) {
    mileageMultiplier = 2;
  } else if (mileage < 40) {
    mileageMultiplier = 1.8;
  } else {
    mileageMultiplier = 2.3;
  }

  // If it's a round trip, the mileage multiplier is always 2.3
  if (isRoundTrip) {
    mileageMultiplier = 2.3; 
    baseFare = 0
  }

  let fare: number;
  if (airportName) {
    // Airport ride: base + (multiplier * distance from Woodstock to pickup)
    const rate = airportRates[airportName as keyof typeof airportRates];
    const base = rate.base;
    const multiplier = rate.mileageMultiplier;
    const woodstockDistanceMeters = await getDistanceFromWoodstock(pickupLocation);
    const woodstockDistanceMiles = woodstockDistanceMeters / 1609.34;
    fare = base + (multiplier * woodstockDistanceMiles);
  } else if (stationName) {
    // Train station ride: total trip mileage * station multiplier
    const rate = trainStationRates[stationName as keyof typeof trainStationRates];
    const multiplier = rate.mileageMultiplier;
    fare = (mileage / 1609.34) * multiplier;
  } else if (mileage / 1609.34 < 40) {
    // Local ride: (pickup -> dropoff) + (dropoff -> Woodstock)
    const dropoffToWoodstockRes = await fetch("/api/directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin: dropoffLocation, destination: "__WOODSTOCK__" }),
    });
    if (!dropoffToWoodstockRes.ok) throw new Error("Failed to fetch dropoff to Woodstock distance");
    const dropoffToWoodstockData = await dropoffToWoodstockRes.json();
    if (!dropoffToWoodstockData.distance || typeof dropoffToWoodstockData.distance.value !== "number") throw new Error("No dropoff to Woodstock distance");
    const dropoffToWoodstockMiles = dropoffToWoodstockData.distance.value / 1609.34;
    fare = (mileage / 1609.34 + dropoffToWoodstockMiles) * 1.8;
  } else {
    // One-way non-local ride: 2.3 * total trip mileage
    fare = (mileage / 1609.34) * 2.3;
  }

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
