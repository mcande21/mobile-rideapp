import { NextResponse } from 'next/server';
import { oauth2Client } from '@/lib/google';

const scopes = [
  'https://www.googleapis.com/auth/calendar', // Full calendar access
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url as string);
  const userId = searchParams.get('userId');
  const state = searchParams.get('state');
  let url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: state || undefined // Pass state if present
  });
  // No need to append state manually
  return NextResponse.json({ url });
}
