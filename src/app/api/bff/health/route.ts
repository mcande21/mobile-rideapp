/**
 * BFF Health Check API Route
 * Provides health status for mobile app monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { wrapResponse } from '../route';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
      uptime: process.uptime(),
      services: {
        database: 'connected', // You can add actual health checks here
        external_apis: 'operational',
        cache: 'available'
      },
      mobile_optimized: true,
      bff_enabled: true
    };

    return wrapResponse(healthData);
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    );
  }
}
