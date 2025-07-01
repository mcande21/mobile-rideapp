/**
 * BFF Directions API Route
 * Handles directions requests with mobile-optimized responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { wrapResponse, handleError, isRateLimited } from '../route';

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Get client identifier for rate limiting
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  
  // Apply stricter rate limiting for directions API (it's expensive)
  if (isRateLimited(`directions-${clientIp}`, 50, 60000)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded for directions API', success: false },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { origin, destination, departureTime, intermediates } = body;

    // Validate required fields
    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Origin and destination are required', success: false },
        { status: 400 }
      );
    }

    // Import and call the existing directions route
    const directionsModule = await import('../../directions/route');
    
    // Create a new request to pass to the existing route
    const directionsReq = new NextRequest(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(body)
    });

    const response: NextResponse = await directionsModule.POST(directionsReq);
    
    // Parse the response to add BFF wrapper
    if (response.ok) {
      const data: any = await response.json();
      return wrapResponse(data);
    } else {
      const errorData: any = await response.json();
      return NextResponse.json(
        { ...errorData, success: false },
        { status: response.status }
      );
    }
  } catch (error) {
    return handleError(error, 'BFF Directions');
  }
}
