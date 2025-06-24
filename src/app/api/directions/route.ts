import { NextResponse } from "next/server";
import { decryptWoodstockAddress } from "../../../../src/lib/woodstock-crypto";

export async function POST(req: Request) {
  let { origin, destination, departureTime } = await req.json();

  // Decrypt Woodstock address if token is used
  const ENCRYPTED_WOODSTOCK_ADDRESS = process.env.ENCRYPTED_WOODSTOCK_ADDRESS;
  if (!ENCRYPTED_WOODSTOCK_ADDRESS) {
    return NextResponse.json({ error: "Woodstock address not set." }, { status: 500 });
  }
  if (origin === "__WOODSTOCK__") {
    origin = decryptWoodstockAddress(ENCRYPTED_WOODSTOCK_ADDRESS);
  }
  if (destination === "__WOODSTOCK__") {
    destination = decryptWoodstockAddress(ENCRYPTED_WOODSTOCK_ADDRESS);
  }

  if (!origin || !destination) {
    return NextResponse.json(
      { error: "Origin and destination are required" },
      { status: 400 }
    );
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Routes API key not set." }, { status: 500 });
    }
    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters"
        },
        body: JSON.stringify({
          origin: { address: origin },
          destination: { address: destination },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE_OPTIMAL",
          departureTime: departureTime ? departureTime : undefined
        })
      }
    );
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      // Format duration as hours and minutes
      let durationText = null;
      let totalMinutes = null;
      // Handle duration as string (e.g., "6953s")
      if (route.duration) {
        let seconds = null;
        if (typeof route.duration === "string" && route.duration.endsWith("s")) {
          seconds = parseInt(route.duration.replace("s", ""), 10);
        } else if (typeof route.duration === "object" && route.duration.seconds) {
          seconds = route.duration.seconds;
        }
        if (seconds !== null && !isNaN(seconds)) {
          totalMinutes = Math.round(seconds / 60);
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          if (hours > 0) {
            durationText = `${hours} hr${hours > 1 ? 's' : ''} ${minutes} min`;
          } else {
            durationText = `${minutes} min`;
          }
        }
      }
      // Convert distance to miles (rounded to 1 decimal)
      const miles = route.distanceMeters ? (route.distanceMeters / 1609.34) : null;
      // Prepare raw values for display
      let rawDuration = null;
      let rawDistance = null;
      if (route.duration) {
        if (typeof route.duration === "string" && route.duration.endsWith("s")) {
          rawDuration = route.duration;
        } else if (typeof route.duration === "object" && route.duration.seconds) {
          rawDuration = `${route.duration.seconds}s`;
        }
      }
      if (route.distanceMeters) {
        rawDistance = `${route.distanceMeters} meters`;
      }
      return NextResponse.json({
        duration: durationText,
        distance: miles !== null ? { value: miles, text: `${miles.toFixed(1)} mi` } : null,
        polyline: route.polyline?.encodedPolyline || null,
        raw: {
          duration: rawDuration,
          distance: rawDistance
        }
      });
    } else {
      return NextResponse.json({ error: "No routes found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error fetching routes from Google Routes API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching routes." },
      { status: 500 }
    );
  }
}
