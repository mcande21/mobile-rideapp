import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALENDAR_REDIRECT_URI
);

export async function validateAndRefreshToken(accessToken: string, refreshToken?: string) {
  try {
    // Set the credentials
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Try to get user info to validate the token
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    await oauth2.userinfo.get();
    
    return { valid: true, accessToken };
  } catch (error) {
    console.log('Token validation failed, attempting refresh...');
    
    if (refreshToken) {
      try {
        // Try to refresh the token
        const { credentials } = await oauth2Client.refreshAccessToken();
        console.log('Token refreshed successfully');
        
        return { 
          valid: true, 
          accessToken: credentials.access_token,
          refreshToken: credentials.refresh_token,
          newTokens: true
        };
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return { valid: false, error: 'Token refresh failed' };
      }
    }
    
    return { valid: false, error: 'Invalid token and no refresh token available' };
  }
}
