import { NextResponse } from 'next/server';
import { oauth2Client } from '@/lib/google';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url as string);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Step 2: Validate state param
  if (!state) {
    return NextResponse.json({ error: 'Missing state parameter' }, { status: 400 });
  }

  // Optionally, you could check state against a server-side session store here
  // For SPA, the client will check it after redirect

  if (typeof code !== 'string') {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch Google user info
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const googleUser = await userInfoRes.json();
    if (!googleUser.id) {
      return NextResponse.json({ error: 'Failed to fetch Google user info', details: googleUser }, { status: 500 });
    }

    // Get current user from session (assume you have a way to get userId from cookie/session)
    // For demo, get userId from state param (set in /api/auth/google/url)
    let userId = searchParams.get('userId');
    if (!userId && state) {
      userId = state;
    }
    if (!userId) {
      return NextResponse.json({ error: 'No userId provided' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Firestore is not configured.' }, { status: 500 });
    }
    // Update user in Firestore with Google info and tokens
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      googleAccount: {
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresIn: tokens.expiry_date || null
      },
      // Set Google profile picture as default custom avatar if user doesn't have one
      customAvatar: {
        type: 'google',
        value: googleUser.picture
      }
    });

    // Redirect based on context or default to user dashboard
    const redirectUrl = new URL('/user', req.url);
    // Add success parameter and state for client-side validation
    redirectUrl.searchParams.set('google-connected', 'true');
    redirectUrl.searchParams.set('state', state);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return NextResponse.json({ error: 'Failed to authenticate with Google' }, { status: 500 });
  }
}
