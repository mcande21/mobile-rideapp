/**
 * BFF Places Autocomplete API Route
 * Handles places autocomplete requests with mobile-optimized responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { wrapResponse, handleError, isRateLimited } from '../route';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const input = searchParams.get('input');
  
  // Get client identifier for rate limiting
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  
  // Apply rate limiting
  if (isRateLimited(`places-${clientIp}`, 100, 60000)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded for places API', success: false },
      { status: 429 }
    );
  }

  try {
    // Validate required fields
    if (!input || input.trim().length === 0) {
      return NextResponse.json(
        { error: 'Input parameter is required', success: false },
        { status: 400 }
      );
    }

    // Minimum input length to avoid too many API calls
    if (input.trim().length < 3) {
      return wrapResponse({ predictions: [] });
    }

    // Import and call the existing places route
    const placesModule = await import('../../places-autocomplete/route');
    
    // Create a new request to pass to the existing route
    const placesReq = new NextRequest(
      new URL(`/api/places-autocomplete?input=${encodeURIComponent(input)}`, req.url),
      {
        method: 'GET',
        headers: req.headers
      }
    );

    const response: NextResponse = await placesModule.GET(placesReq);
    
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
    return handleError(error, 'BFF Places Autocomplete');
  }
}
