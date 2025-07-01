/**
 * Backend for Frontend (BFF) - Main route handler
 * Centralizes and proxies all API calls with proper error handling and security
 */

import { NextRequest, NextResponse } from 'next/server';

// Import existing route handlers to proxy through BFF
async function proxyToExistingRoute(
  req: NextRequest,
  routePath: string,
  method: string = 'POST'
): Promise<NextResponse> {
  try {
    // Create a new request to proxy to existing routes
    const url = new URL(routePath, req.url);
    const proxyReq = new Request(url, {
      method,
      headers: req.headers,
      body: method !== 'GET' ? await req.text() : undefined,
    });

    // Dynamically import and call the appropriate route handler
    let routeHandler;
    
    switch (routePath) {
      case '/api/directions':
        const directionsModule = await import('../directions/route');
        routeHandler = directionsModule.POST;
        break;
      case '/api/places-autocomplete':
        const placesModule = await import('../places-autocomplete/route');
        routeHandler = placesModule.GET;
        break;
      case '/api/reschedule':
        const rescheduleModule = await import('../reschedule/route');
        routeHandler = rescheduleModule.POST;
        break;
      case '/api/flight':
        const flightModule = await import('../flight/route');
        routeHandler = flightModule.GET;
        break;
      default:
        return NextResponse.json(
          { error: 'Route not found', success: false },
          { status: 404 }
        );
    }

    if (!routeHandler) {
      return NextResponse.json(
        { error: 'Route handler not found', success: false },
        { status: 404 }
      );
    }

    return await routeHandler(proxyReq);
  } catch (error) {
    console.error('BFF Proxy Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        success: false,
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

// Helper function to add BFF response wrapper
function wrapResponse(data: any, success: boolean = true, status: number = 200) {
  return NextResponse.json(
    {
      data,
      success,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' ? { environment: 'development' } : {})
    },
    { 
      status,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-BFF-Version': '1.0.0',
      }
    }
  );
}

// Helper function to handle errors consistently
function handleError(error: unknown, context: string = 'Unknown') {
  console.error(`BFF Error in ${context}:`, error);
  
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  
  return NextResponse.json(
    {
      error: errorMessage,
      success: false,
      context,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' ? { 
        stack: error instanceof Error ? error.stack : undefined 
      } : {})
    },
    { status: 500 }
  );
}

// Rate limiting helper (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(identifier: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const clientData = rateLimitMap.get(identifier);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  if (clientData.count >= limit) {
    return true;
  }
  
  clientData.count++;
  return false;
}

// Main BFF route handlers
export async function GET(req: NextRequest) {
  const { searchParams, pathname } = new URL(req.url);
  
  // Extract the BFF route path
  const bffPath = pathname.replace('/api/bff', '');
  
  // Get client identifier for rate limiting
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  
  // Apply rate limiting
  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', success: false },
      { status: 429 }
    );
  }
  
  try {
    switch (bffPath) {
      case '/health':
        return wrapResponse({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        });
        
      case '/places-autocomplete':
        const input = searchParams.get('input');
        if (!input) {
          return NextResponse.json(
            { error: 'Input parameter is required', success: false },
            { status: 400 }
          );
        }
        
        // Create a new request for the places API
        const placesReq = new NextRequest(
          new URL(`/api/places-autocomplete?input=${encodeURIComponent(input)}`, req.url),
          { method: 'GET', headers: req.headers }
        );
        
        return await proxyToExistingRoute(placesReq, '/api/places-autocomplete', 'GET');
        
      case '/flight':
        const flightNumber = searchParams.get('flightNumber');
        if (!flightNumber) {
          return NextResponse.json(
            { error: 'Flight number parameter is required', success: false },
            { status: 400 }
          );
        }
        
        const flightReq = new NextRequest(
          new URL(`/api/flight?flightNumber=${encodeURIComponent(flightNumber)}`, req.url),
          { method: 'GET', headers: req.headers }
        );
        
        return await proxyToExistingRoute(flightReq, '/api/flight', 'GET');
        
      default:
        return NextResponse.json(
          { error: `BFF route not found: ${bffPath}`, success: false },
          { status: 404 }
        );
    }
  } catch (error) {
    return handleError(error, `GET ${bffPath}`);
  }
}

export async function POST(req: NextRequest) {
  const { pathname } = new URL(req.url);
  
  // Extract the BFF route path
  const bffPath = pathname.replace('/api/bff', '');
  
  // Get client identifier for rate limiting
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  
  // Apply rate limiting
  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', success: false },
      { status: 429 }
    );
  }
  
  try {
    switch (bffPath) {
      case '/directions':
        return await proxyToExistingRoute(req, '/api/directions', 'POST');
        
      case '/reschedule':
        return await proxyToExistingRoute(req, '/api/reschedule', 'POST');
        
      // Google Calendar endpoints will be handled in separate files
      case '/google-calendar/validate-token':
      case '/google-calendar/list-calendars':
      case '/google-calendar/add-event':
        // These will be implemented in separate route files
        return NextResponse.json(
          { error: 'Google Calendar endpoints moved to dedicated routes', success: false },
          { status: 501 }
        );
        
      default:
        return NextResponse.json(
          { error: `BFF route not found: ${bffPath}`, success: false },
          { status: 404 }
        );
    }
  } catch (error) {
    return handleError(error, `POST ${bffPath}`);
  }
}

// Export utility functions for use in other BFF routes
export { wrapResponse, handleError, isRateLimited };
