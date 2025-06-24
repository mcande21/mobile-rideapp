import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url as string);
  const input = searchParams.get("input");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

  if (!input) {
    return NextResponse.json({ error: "Missing input" }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json({ error: "API key not set" }, { status: 500 });
  }

  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "suggestions.placePrediction.text,suggestions.placePrediction.placeId"
    },
    body: JSON.stringify({ input })
  });

  const data = await response.json();
  return NextResponse.json(data);
}
