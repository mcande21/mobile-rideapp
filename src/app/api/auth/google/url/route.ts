import { NextResponse } from 'next/server';
import { oauth2Client } from '@/lib/google';

const scopes = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url as string);
  const userId = searchParams.get('userId');
  let url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
  });
  // Append userId to the callback URL if present
  if (userId) {
    url += `&state=${encodeURIComponent(userId)}`;
  }
  return NextResponse.json({ url });
}
