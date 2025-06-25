import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { validateAndRefreshToken } from '@/lib/google-auth';

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALENDAR_REDIRECT_URI
);

console.log('Environment variables check:');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Present' : 'Missing');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Present' : 'Missing');
console.log('GOOGLE_CALENDAR_REDIRECT_URI:', process.env.GOOGLE_CALENDAR_REDIRECT_URI);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      accessToken, 
      refreshToken,
      calendarId = 'primary', // Allow specifying which calendar to use
      summary, 
      description, 
      location, 
      startDateTime, 
      endDateTime, 
      attendees = [],
      timeZone = 'America/New_York'
    } = body;

    console.log('Received request with accessToken:', accessToken ? `${accessToken.substring(0, 20)}...` : 'null');
    console.log('Refresh token present:', !!refreshToken);

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' }, 
        { status: 400 }
      );
    }

    // Validate and potentially refresh the token
    const tokenValidation = await validateAndRefreshToken(accessToken, refreshToken);
    
    if (!tokenValidation.valid) {
      console.error('Token validation failed:', tokenValidation.error);
      return NextResponse.json(
        { error: 'Invalid or expired token', needsReauth: true }, 
        { status: 401 }
      );
    }

    // Use the validated (and potentially refreshed) token
    const validAccessToken = tokenValidation.accessToken;

    // Set credentials for the OAuth2 client
    oauth2Client.setCredentials({
      access_token: validAccessToken,
      refresh_token: refreshToken,
    });

    console.log('OAuth2 client credentials set with validated token');

    // Initialize Calendar API
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Create the event object
    const event = {
      summary,
      location,
      description,
      start: {
        dateTime: startDateTime,
        timeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone,
      },
      attendees: attendees.map((email: string) => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours before
          { method: 'popup', minutes: 30 }, // 30 minutes before
        ],
      },
    };

    // Insert the event
    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
      sendUpdates: 'all', // Send notifications to attendees
    });

    // Get calendar info to return to client
    let calendarInfo = null;
    try {
      const calendarResponse = await calendar.calendars.get({
        calendarId: calendarId
      });
      calendarInfo = {
        id: calendarResponse.data.id,
        summary: calendarResponse.data.summary,
        description: calendarResponse.data.description,
      };
    } catch (calError) {
      console.log('Could not fetch calendar info:', calError);
    }

    return NextResponse.json({
      success: true,
      event: response.data,
      eventLink: response.data.htmlLink,
      calendar: calendarInfo,
      // Return new tokens if they were refreshed
      ...(tokenValidation.newTokens && {
        newAccessToken: tokenValidation.accessToken,
        newRefreshToken: tokenValidation.refreshToken,
      }),
    });

  } catch (error) {
    console.error('Error creating calendar event:', error);
    
    if (error instanceof Error) {
      // Handle token expiration
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
      { error: 'Failed to create calendar event' }, 
      { status: 500 }
    );
  }
}
