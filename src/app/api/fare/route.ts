// src/app/api/fare/route.ts
import { NextResponse } from "next/server";
import { 
  calculateTripFare, 
  isTransportLocation, 
  calculateTransportRoundTripFare 
} from "@/lib/fare";
import { auth } from "@/lib/firebase-admin"; // Using server-side admin SDK

// Helper to verify Firebase ID token
async function verifyToken(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (authorization?.startsWith("Bearer ")) {
    const idToken = authorization.split("Bearer ")[1];
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      console.error("Error verifying token:", error);
      return null;
    }
  }
  return null;
}

export async function POST(request: Request) {
  const decodedToken = await verifyToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      pickup, 
      dropoff, 
      date, 
      time, 
      isRoundTrip, 
      returnDate, 
      returnTime, 
      stops 
    } = body;

    // Basic validation
    if (!pickup || !dropoff || !date || !time) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [hours, minutes] = time.split(":").map(Number);
    const combinedDateTime = new Date(date);
    combinedDateTime.setHours(hours, minutes, 0, 0);

    const isTransportTrip = isTransportLocation(pickup) || isTransportLocation(dropoff);

    if (isRoundTrip && isTransportTrip && returnDate && returnTime) {
      const [returnHours, returnMinutes] = returnTime.split(":").map(Number);
      const returnDateTime = new Date(returnDate);
      returnDateTime.setHours(returnHours, returnMinutes, 0, 0);

      const breakdown = await calculateTransportRoundTripFare(
        pickup,
        dropoff,
        combinedDateTime,
        returnDateTime,
        stops
      );
      return NextResponse.json(breakdown);

    } else {
      const calculatedFare = await calculateTripFare(
        pickup,
        dropoff,
        combinedDateTime,
        isRoundTrip,
        stops
      );
      return NextResponse.json({ total: calculatedFare });
    }
  } catch (error: any) {
    console.error("Fare calculation error:", error);
    // Propagate specific errors to the client
    if (error.message.includes("No routes found")) {
      return NextResponse.json({ error: "No route could be found for the selected date and time. Please check your input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to calculate fare. Please try again." }, { status: 500 });
  }
}
