/**
 * BFF Flight API Route
 * Handles flight data requests with mobile-optimized responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { wrapResponse, handleError, isRateLimited } from '../route';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const flightNumber = searchParams.get('flightNumber');
  
  // Get client identifier for rate limiting
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  
  // Apply rate limiting
  if (isRateLimited(`flight-${clientIp}`, 50, 60000)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded for flight API', success: false },
      { status: 429 }
    );
  }

  try {
    // Validate required fields
    if (!flightNumber || flightNumber.trim().length === 0) {
      return NextResponse.json(
        { error: 'Flight number parameter is required', success: false },
        { status: 400 }
      );
    }

    // Basic flight number validation
    if (!/^[A-Z]{2,3}\d{1,4}$/i.test(flightNumber.trim())) {
      return NextResponse.json(
        { error: 'Invalid flight number format', success: false },
        { status: 400 }
      );
    }

    // Import and call the existing flight route
    const flightModule = await import('../../flight/route');
    
    // Create a new request to pass to the existing route
    const flightReq = new NextRequest(
      new URL(`/api/flight?flightNumber=${encodeURIComponent(flightNumber)}`, req.url),
      {
        method: 'GET',
        headers: req.headers
      }
    );

    const response: NextResponse = await flightModule.GET(flightReq);
    
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
    return handleError(error, 'BFF Flight');
  }
}
