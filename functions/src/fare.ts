export const airportAddresses = {
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
    "JFK International Air Terminal LLC, Terminal 4, Room 161.022, " +
    "Jamaica, NY 11430",
    "JetBlue Airways, Terminal 5, JFK International Airport, Jamaica, " +
    "NY 11430",
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
    "New York Stewart International Airport, 1180 1st St, New Windsor, " +
    "NY 12553",
    "1188 1st St, New Windsor, NY 12553",
    "1032 1st St, Building 112, New Windsor, NY 12553",
    "3 Express Dr, Newburgh, NY 12550",
  ],
  Westchester: [
    "Westchester County Airport (HPN), Airport Road, West Harrison, NY, USA",
    "Westchester County Airport",
    "Westchester County Airport, 240 Airport Rd, Suite 202, " +
    "White Plains, NY 10604",
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
    "LaGuardia Airport, Central Terminal B, Suite CB1L-008B, Flushing, " +
    "NY 11371",
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
 * Fetches directions and mileage from Google Maps API.
 * This function is designed to be run on the server.
 * @param {string} origin The starting point of the trip.
 * @param {string} destination The destination of the trip.
 * @param {Date} departureTime The requested time for the trip.
 * @param {string[]} [stops] An optional array of intermediate stops.
 * @return {Promise<{distance: {value: number}, duration: number}>} A promise
 * that resolves with the distance in miles and duration in minutes.
 */
async function getDirections(
    origin: string,
    destination: string,
    departureTime: Date,
    stops?: string[],
): Promise<{ distance: { value: number }, duration: number }> {
  const woodstockAddress = "69 Country Club Ln, Woodstock, NY 12498";

  if (origin === "__WOODSTOCK__") {
    origin = woodstockAddress;
  }
  if (destination === "__WOODSTOCK__") {
    destination = woodstockAddress;
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Routes API key not set.");
  }

  const intermediatesArr = (stops && stops.length > 0) ?
    stops.map((address: string) => ({address})) :
    undefined;

  const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
        },
        body: JSON.stringify({
          origin: {address: origin},
          destination: {address: destination},
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE_OPTIMAL",
          departureTime: departureTime,
          ...(intermediatesArr ? {intermediates: intermediatesArr} : {}),
        }),
      },
  );

  const data = await response.json();

  if (!response.ok || !data.routes || data.routes.length === 0) {
    console.error("Error fetching directions:", data);
    throw new Error(
        data.error?.message || "Failed to fetch directions: No routes found.",
    );
  }

  const route = data.routes[0];
  const miles = route.distanceMeters ? (route.distanceMeters / 1609.34) : 0;
  const durationSeconds = (typeof route.duration === "string") ?
    parseInt(route.duration.replace("s", ""), 10) :
    (route.duration?.seconds || 0);

  return {
    distance: {value: miles},
    duration: Math.round(durationSeconds / 60),
  };
}


/**
 * Calculates the fare for a trip based on pricing logic.
 * @param {string} pickupLocation The starting point of the trip.
 * @param {string} dropoffLocation The destination of the trip.
 * @param {Date} timeRequested The requested time for the trip.
 * @param {boolean} isRoundTrip Whether the trip is a round trip.
 * @param {string[]} [stops] An optional array of intermediate stops.
 * @return {Promise<number>} The calculated fare.
 */
export async function calculateTripFare(
    pickupLocation: string,
    dropoffLocation: string,
    timeRequested: Date,
    isRoundTrip: boolean,
    stops?: string[],
): Promise<number> {
  const directionsData = await getDirections(
      pickupLocation,
      dropoffLocation,
      timeRequested,
      stops,
  );

  const mileage = directionsData.distance.value;

  if (isRoundTrip) {
    return (2 * mileage) * 2.3;
  }

  const airportRates = {
    Newark: {base: 165, mileageMultiplier: 1.5},
    Laguardia: {base: 165, mileageMultiplier: 1.5},
    JFK: {base: 185, mileageMultiplier: 1.5},
    Albany: {base: 100, mileageMultiplier: 1.5},
    Stewart: {base: 100, mileageMultiplier: 1.5},
    Westchester: {base: 140, mileageMultiplier: 1.5},
  };

  /**
   * Helper to get distance in miles from Woodstock, NY.
   * @param {string} pickup The pickup location.
   * @param {Date} departureTime The requested time for the trip.
   * @return {Promise<number>} The distance in miles.
   */
  async function getDistanceFromWoodstock(
      pickup: string,
      departureTime: Date,
  ): Promise<number> {
    const data = await getDirections("__WOODSTOCK__", pickup, departureTime);
    if (!data.distance || typeof data.distance.value !== "number") {
      throw new Error("No Woodstock distance");
    }
    return data.distance.value;
  }

  const airportName = Object.keys(airportAddresses).find(
      (name) =>
        (airportAddresses[name as keyof typeof airportAddresses]
            .includes(pickupLocation)) ||
        (airportAddresses[name as keyof typeof airportAddresses]
            .includes(dropoffLocation)),
  );

  const stationName = Object.keys(trainStationAddresses).find(
      (name) =>
        (trainStationAddresses[name as keyof typeof trainStationAddresses]
            .includes(pickupLocation)) ||
        (trainStationAddresses[name as keyof typeof trainStationAddresses]
            .includes(dropoffLocation)),
  );

  let fare: number;
  if (airportName) {
    const rate = airportRates[airportName as keyof typeof airportRates];
    const base = rate.base;
    const multiplier = rate.mileageMultiplier;
    const airportAddrList =
      airportAddresses[airportName as keyof typeof airportAddresses];
    let nonAirportAddress = pickupLocation;
    if (airportAddrList.includes(pickupLocation)) {
      nonAirportAddress = dropoffLocation;
    }
    const woodstockDistMiles = await
    getDistanceFromWoodstock(nonAirportAddress, timeRequested);
    fare = base + (multiplier * woodstockDistMiles);
  } else if (stationName) {
    const multiplier = 1.75;
    fare = mileage * multiplier;
  } else if (mileage < 40) {
    const dropoffToWoodstockData = await getDirections(
        dropoffLocation, "__WOODSTOCK__", timeRequested,
    );
    if (!dropoffToWoodstockData.distance ||
      typeof dropoffToWoodstockData.distance.value !== "number") {
      throw new Error("No dropoff to Woodstock distance");
    }
    const dropoffToWoodstockMiles = dropoffToWoodstockData.distance.value;
    fare = (mileage + dropoffToWoodstockMiles) * 1.8;
  } else {
    fare = mileage * 2.3;
  }

  return fare;
}

/**
 * Detects if a location is a transport hub (airport, train station, etc.).
 * @param {string} location The location string to check.
 * @return {boolean} True if the location is a transport hub.
 */
export function isTransportLocation(location: string): boolean {
  if (!location) return false;

  const locationLower = location.toLowerCase();

  for (const [, addresses] of Object.entries(airportAddresses)) {
    if (addresses.some((address) =>
      locationLower.includes(address.toLowerCase()) ||
      address.toLowerCase().includes(locationLower),
    )) {
      return true;
    }
  }

  for (const [, addresses] of Object.entries(trainStationAddresses)) {
    if (addresses.some((address) =>
      locationLower.includes(address.toLowerCase()) ||
      address.toLowerCase().includes(locationLower),
    )) {
      return true;
    }
  }

  const transportKeywords = [
    "airport", "train station", "bus station", "railway", "depot",
    "terminal", "port", "transit", "metro", "subway", "station",
    "bus terminal", "transportation hub", "transit center",
  ];

  return transportKeywords.some((keyword) => locationLower.includes(keyword));
}

/**
 * Calculates fare for transport location round trips as two one-way trips.
 * @param {string} pickupLocation The starting point of the trip.
 * @param {string} dropoffLocation The destination of the trip.
 * @param {Date} outboundTime The requested time for the outbound trip.
 * @param {Date} returnTime The requested time for the return trip.
 * @param {string[]} [stops] An optional array of intermediate stops.
 * @return {Promise<{total: number, outbound: number, return: number}>} The
 * total, outbound, and return fares.
 */
export async function calculateTransportRoundTripFare(
    pickupLocation: string,
    dropoffLocation: string,
    outboundTime: Date,
    returnTime: Date,
    stops?: string[],
): Promise<{ total: number; outbound: number; return: number }> {
  const outboundFare = await calculateTripFare(
      pickupLocation, dropoffLocation, outboundTime, false, stops,
  );
  const returnFare = await calculateTripFare(
      dropoffLocation, pickupLocation, returnTime, false, stops,
  );
  return {
    total: outboundFare + returnFare,
    outbound: outboundFare,
    return: returnFare,
  };
}
