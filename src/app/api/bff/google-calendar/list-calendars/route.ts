/**
 * BFF Google Calendar List Calendars API Route
 * Handles Google Calendar list retrieval with mobile-optimized responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { wrapResponse, handleError, isRateLimited } from '../../route';

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Get client identifier for rate limiting
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  
  // Apply rate limiting
  if (isRateLimited(`google-calendar-list-${clientIp}`, 50, 60000)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded for Google Calendar list API', success: false },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    
    // Basic validation
    if (!body.userId) {
      return NextResponse.json(
        { error: 'User ID is required', success: false },
        { status: 400 }
      );
    }

    // Import and call the existing Google Calendar list-calendars route
    const listCalendarsModule = await import('../../../google-calendar/list-calendars/route');
    
    // Create a new request to pass to the existing route
    const listCalendarsReq = new NextRequest(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(body)
    });

    const response: NextResponse = await listCalendarsModule.POST(listCalendarsReq);
    
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
    return handleError(error, 'BFF Google Calendar List Calendars');
  }
}
