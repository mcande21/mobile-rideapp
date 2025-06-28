import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Check } from 'lucide-react';
import type { Ride } from '@/lib/types';
import { useRideStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

interface GoogleCalendarButtonProps {
  ride: Ride;
}

export function GoogleCalendarButton({ ride }: GoogleCalendarButtonProps) {
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [eventAdded, setEventAdded] = useState(false);
  const [addedToCalendar, setAddedToCalendar] = useState<string | null>(null);
  const { currentUserProfile } = useRideStore();
  const { toast } = useToast();

  // Check if user already has Google account connected
  useEffect(() => {
    if (currentUserProfile?.googleAccount?.accessToken) {
      setAccessToken(currentUserProfile.googleAccount.accessToken);
    }
  }, [currentUserProfile]);

  const authenticateUser = async () => {
    if (!currentUserProfile?.id) {
      toast({
        title: "Error",
        description: "Please make sure you're logged in before connecting Google Calendar.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Store context for post-auth calendar action
      const authContext = {
        action: 'add-to-calendar',
        rideId: ride.id,
        timestamp: Date.now()
      };
      localStorage.setItem('pending-calendar-action', JSON.stringify(authContext));
      
      // Use the unified Google auth flow - this will redirect the entire window
      const response = await fetch(
        `/api/google-calendar/url?userId=${currentUserProfile.id}`
      );
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error fetching Google Auth URL:", error);
      toast({
        title: "Error",
        description: "Could not connect to Google Calendar. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddToCalendar = async (token: string = accessToken!) => {
    setIsAddingEvent(true);
    console.log('Adding to calendar with token:', token ? `${token.substring(0, 20)}...` : 'null');
    
    try {
      const startDateTime = new Date(ride.dateTime);
      const endDateTime = new Date(startDateTime.getTime() + (ride.duration || 60) * 60000);

      // Use the calendar selected in user profile, or default to primary
      const selectedCalendarId = currentUserProfile?.googleAccount?.selectedCalendarId || 'primary';

      const eventData = {
        accessToken: token,
        refreshToken: currentUserProfile?.googleAccount?.refreshToken,
        calendarId: selectedCalendarId,
        summary: `Ride: ${ride.pickup} → ${ride.dropoff}`,
        description: `Ride with ${ride.driver?.name || 'Driver'}\n\nPickup: ${ride.pickup}\nDropoff: ${ride.dropoff}\nFare: $${Object.values(ride.fees ?? {}).reduce((sum: number, v) => sum + (typeof v === 'number' ? v : 0), 0).toFixed(2)}${ride.transportType ? `\nTransport: ${ride.transportType} ${ride.transportNumber || ''}` : ''}`,
        location: ride.pickup,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        attendees: ride.driver?.googleAccount?.email ? [ride.driver.googleAccount.email] : [],
        timeZone: 'America/New_York'
      };

      const response = await fetch('/api/google-calendar/add-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      const result = await response.json();

      if (result.success) {
        // Event added successfully - NO new window/tab opened
        setEventAdded(true);
        const calendarName = result.calendar?.summary || 
                            currentUserProfile?.googleAccount?.selectedCalendarName || 
                            'Google Calendar';
        setAddedToCalendar(calendarName);
        
        // Show success toast instead of alert
        toast({
          title: "Event Added!",
          description: `Ride event has been added to ${calendarName}`,
        });
      } else if (result.needsReauth) {
        // Token expired, need to re-authenticate
        setAccessToken(null);
        toast({
          title: "Authentication Required",
          description: "Your Google Calendar access has expired. Please reconnect.",
          variant: "destructive",
        });
      } else {
        throw new Error(result.error || 'Failed to add event');
      }
    } catch (error) {
      console.error('Error adding event to calendar:', error);
      
      // If token is expired, try to refresh or re-authenticate
      if (error instanceof Error && error.message.includes('401')) {
        setAccessToken(null);
        toast({
          title: "Authentication Required",
          description: "Your Google Calendar access has expired. Please reconnect.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add event to calendar. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsAddingEvent(false);
    }
  };

  const handleClick = () => {
    if (accessToken) {
      handleAddToCalendar();
    } else {
      authenticateUser();
    }
  };

  const isLoading = isAddingEvent;
  const hasGoogleAccount = !!currentUserProfile?.googleAccount;

  // If event was already added, show status
  if (eventAdded) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <Check className="h-4 w-4" />
        <span>Added to {addedToCalendar}</span>
      </div>
    );
  }

  // Default button for connection or adding to calendar
  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          {'Adding...'}
        </>
      ) : (
        <>
          <Calendar className="h-4 w-4" />
          {hasGoogleAccount ? 'Add to Calendar' : 'Connect Calendar'}
        </>
      )}
    </Button>
  );
}
