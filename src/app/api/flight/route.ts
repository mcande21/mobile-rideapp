import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const flightNumber = searchParams.get("flightNumber");

  if (!flightNumber) {
    return NextResponse.json(
      { error: "Flight number is required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.AVIATION_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Aviation API key is not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${flightNumber}`
    );
    const data = await response.json();

    if (data.data && data.data.length > 0) {
      const flight = data.data[0];
      const relevantData = {
        flight_status: flight.flight_status,
        departure: {
          airport: flight.departure.airport,
          scheduled: flight.departure.scheduled,
          actual: flight.departure.actual,
          timezone: flight.departure.timezone,
        },
        arrival: {
          airport: flight.arrival.airport,
          scheduled: flight.arrival.scheduled,
          actual: flight.arrival.actual,
          timezone: flight.arrival.timezone,
        },
      };
      return NextResponse.json(relevantData);
    } else {
      return NextResponse.json({ error: "Flight not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error fetching flight data:", error);
    return NextResponse.json(
      { error: "Failed to fetch flight data" },
      { status: 500 }
    );
  }
}
