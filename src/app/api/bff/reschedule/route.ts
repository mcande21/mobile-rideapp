/**
 * BFF Reschedule API Route
 * Handles reschedule fee calculations with mobile-optimized responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { wrapResponse, handleError, isRateLimited } from '../route';

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Get client identifier for rate limiting
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  
  // Apply rate limiting
  if (isRateLimited(`reschedule-${clientIp}`, 30, 60000)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded for reschedule API', success: false },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { pickupLocation, dropoffLocation, oldTime, newTime, mileageMeters } = body;

    // Validate required fields
    if (!pickupLocation || !dropoffLocation || !oldTime || !newTime) {
      return NextResponse.json(
        { error: 'All location and time fields are required', success: false },
        { status: 400 }
      );
    }

    // Import and call the existing reschedule route
    const rescheduleModule = await import('../../reschedule/route');
    
    // Create a new request to pass to the existing route
    const rescheduleReq = new NextRequest(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(body)
    });

    const response: NextResponse = await rescheduleModule.POST(rescheduleReq);
    
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
    return handleError(error, 'BFF Reschedule');
  }
}
