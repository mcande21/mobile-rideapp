/**
 * Mobile Debug API Route
 * Quick endpoint to test BFF connectivity from mobile apps
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const debugData = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      baseUrl: req.nextUrl.origin,
      userAgent: req.headers.get('user-agent'),
      platform: req.headers.get('user-agent')?.includes('iPhone') ? 'iOS' :
                req.headers.get('user-agent')?.includes('Android') ? 'Android' : 'Web',
      bff_status: 'operational',
      available_endpoints: [
        '/api/bff/health',
        '/api/bff/places-autocomplete',
        '/api/bff/directions',
        '/api/bff/reschedule',
        '/api/bff/flight',
        '/api/bff/google-calendar/auth-url',
        '/api/bff/google-calendar/add-event',
        '/api/bff/google-calendar/list-calendars',
      ],
      mobile_optimized: true,
      capacitor_detected: req.headers.get('user-agent')?.includes('Capacitor'),
      next_recommendations: [
        'Test individual endpoints using /api/bff/* routes',
        'Check network connectivity on device',
        'Verify environment variables are loaded',
        'Test on iOS Simulator first, then device'
      ]
    };

    return NextResponse.json({
      data: debugData,
      success: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Debug test failed',
        success: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
