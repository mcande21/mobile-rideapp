'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function GoogleCalendarCallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      // Send error to parent window
      window.opener?.postMessage({
        type: 'GOOGLE_AUTH_ERROR',
        error: error
      }, window.location.origin);
      window.close();
      return;
    }

    if (code) {
      // Exchange code for token
      fetch('/api/google-calendar/callback?code=' + code)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // Send success to parent window
            window.opener?.postMessage({
              type: 'GOOGLE_AUTH_SUCCESS',
              accessToken: data.accessToken,
              refreshToken: data.refreshToken
            }, window.location.origin);
          } else {
            window.opener?.postMessage({
              type: 'GOOGLE_AUTH_ERROR',
              error: data.error
            }, window.location.origin);
          }
          window.close();
        })
        .catch(error => {
          window.opener?.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: error.message
          }, window.location.origin);
          window.close();
        });
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function GoogleCalendarCallback() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <GoogleCalendarCallbackContent />
    </Suspense>
  );
}
