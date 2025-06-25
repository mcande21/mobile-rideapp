import { NextRequest, NextResponse } from 'next/server';
import { validateAndRefreshToken } from '@/lib/google-auth';

export async function POST(request: NextRequest) {
  try {
    const { accessToken, refreshToken } = await request.json();
    
    const result = await validateAndRefreshToken(accessToken, refreshToken);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate token' }, 
      { status: 500 }
    );
  }
}
