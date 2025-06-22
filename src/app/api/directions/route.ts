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
      const duration = response.data.routes[0].legs[0].duration.value;
      return NextResponse.json({ duration: Math.round(duration / 60) });
    } else {
      return NextResponse.json({ error: "No routes found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error fetching directions:", error);
    return NextResponse.json(
      { error: "Error fetching directions" },
      { status: 500 }
    );
  }
}
