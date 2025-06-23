import { Client } from "@googlemaps/google-maps-services-js";
import { NextResponse } from "next/server";

const client = new Client({});

export async function POST(req: Request) {
  const { origin, destination } = await req.json();

  if (!origin || !destination) {
    return NextResponse.json(
      { error: "Origin and destination are required" },
      { status: 400 }
    );
  }

  try {
    const response = await client.directions({
      params: {
        origin,
        destination,
        key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      },
    });

    if (response.data.routes.length > 0) {
      const leg = response.data.routes[0].legs[0];
      const duration = leg.duration.value; // in seconds
      const distance = leg.distance; // { text: '...', value: ... (in meters) }
      return NextResponse.json({
        duration: Math.round(duration / 60), // in minutes
        distance: distance,
      });
    } else {
      return NextResponse.json({ error: "No routes found" }, { status: 404 });
    }
  } catch (error: any) {
    // The Google Maps API will return a 404 if one of the addresses is not found.
    // We can catch this specific case and return a user-friendly error
    // without logging a scary error to the console.
    if (error?.response?.status === 404) {
      return NextResponse.json(
        { error: "Invalid address provided." },
        { status: 404 }
      );
    }
    // For all other errors, we'll still log them.
    console.error("Error fetching directions:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching directions." },
      { status: 500 }
    );
  }
}
