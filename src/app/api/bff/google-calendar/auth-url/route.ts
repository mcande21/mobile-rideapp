/**
 * BFF Google Calendar Auth URL API Route
 * Handles Google Calendar authentication URL generation with mobile-optimized responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { wrapResponse, handleError, isRateLimited } from '../../route';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const state = searchParams.get('state');
  
  // Get client identifier for rate limiting
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  
  // Apply rate limiting
  if (isRateLimited(`google-auth-${clientIp}`, 20, 60000)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded for Google auth API', success: false },
      { status: 429 }
    );
  }

  try {
    // Validate required fields
    if (!userId || userId.trim().length === 0) {
      return NextResponse.json(
        { error: 'User ID parameter is required', success: false },
        { status: 400 }
      );
    }

    // Import and call the existing Google Calendar URL route
    const googleCalendarModule = await import('../../../google-calendar/url/route');
    
    // Create a new request to pass to the existing route
    const calendarReq = new NextRequest(
      new URL(`/api/google-calendar/url?userId=${encodeURIComponent(userId)}${state ? `&state=${encodeURIComponent(state)}` : ''}`, req.url),
      {
        method: 'GET',
        headers: req.headers
      }
    );

    const response: NextResponse = await googleCalendarModule.GET(calendarReq);
    
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
    return handleError(error, 'BFF Google Calendar Auth URL');
  }
}
