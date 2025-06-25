import { useEffect, useState } from 'react';

interface UseGoogleAuthProps {
  onTokenReceived: (token: string) => void;
}

export function useGoogleAuth({ onTokenReceived }: UseGoogleAuthProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const authenticate = async () => {
    setIsAuthenticating(true);
    
    try {
      // Get the authorization URL
      const authResponse = await fetch('/api/google-calendar/auth');
      const { authUrl } = await authResponse.json();
      
      // Open the authorization URL in a popup
      const popup = window.open(
        authUrl,
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // Listen for messages from the popup
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          onTokenReceived(event.data.accessToken);
          popup?.close();
          window.removeEventListener('message', handleMessage);
          setIsAuthenticating(false);
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          console.error('Authentication error:', event.data.error);
          popup?.close();
          window.removeEventListener('message', handleMessage);
          setIsAuthenticating(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setIsAuthenticating(false);
        }
      }, 1000);

    } catch (error) {
      console.error('Error during authentication:', error);
      setIsAuthenticating(false);
    }
  };

  return {
    authenticate,
    isAuthenticating
  };
}
