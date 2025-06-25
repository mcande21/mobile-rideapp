import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { validateAndRefreshToken } from '@/lib/google-auth';

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALENDAR_REDIRECT_URI
);

export async function POST(request: NextRequest) {
  try {
    const { accessToken, refreshToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' }, 
        { status: 400 }
      );
    }

    // Validate and potentially refresh the token
    const tokenValidation = await validateAndRefreshToken(accessToken, refreshToken);
    
    if (!tokenValidation.valid) {
      return NextResponse.json(
        { error: 'Invalid or expired token', needsReauth: true }, 
        { status: 401 }
      );
    }

    // Set credentials for the OAuth2 client
    oauth2Client.setCredentials({
      access_token: tokenValidation.accessToken,
      refresh_token: refreshToken,
    });

    // Initialize Calendar API
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get the calendar list
    const response = await calendar.calendarList.list({
      minAccessRole: 'writer', // Only calendars the user can write to
    });

    const calendars = response.data.items?.map(cal => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description,
      primary: cal.primary,
      accessRole: cal.accessRole,
      backgroundColor: cal.backgroundColor,
      colorId: cal.colorId,
    })) || [];

    return NextResponse.json({
      success: true,
      calendars,
      // Return new tokens if they were refreshed
      ...(tokenValidation.newTokens && {
        newAccessToken: tokenValidation.accessToken,
        newRefreshToken: tokenValidation.refreshToken,
      }),
    });

  } catch (error) {
    console.error('Error fetching calendars:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant') || error.message.includes('401')) {
        return NextResponse.json(
          { error: 'Token expired', needsReauth: true }, 
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: error.message }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch calendars' }, 
      { status: 500 }
    );
  }
}
