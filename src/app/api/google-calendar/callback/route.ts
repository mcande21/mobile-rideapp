import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALENDAR_REDIRECT_URI
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code not found' }, 
        { status: 400 }
      );
    }

    // Exchange the authorization code for access tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store the tokens (in a real app, you'd save these to your database)
    // For now, we'll return them to the client
    return NextResponse.json({
      success: true,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date
    });

  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return NextResponse.json(
      { error: 'Failed to exchange authorization code' }, 
      { status: 500 }
    );
  }
}
