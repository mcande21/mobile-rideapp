"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRideStore } from '@/lib/store';
import { APIProvider } from "@vis.gl/react-google-maps";
import { UserDashboard } from "@/components/UserDashboard";
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { bffApi, BffApiService } from '@/lib/bff-api';

function UserPageContent() {
  const { currentUserProfile, loading, rides } = useRideStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Handle post-auth calendar action
  useEffect(() => {
    const googleConnected = searchParams.get('google-connected');
    
    if (googleConnected === 'true' && currentUserProfile?.googleAccount) {
      // Check for pending calendar action
      const pendingAction = localStorage.getItem('pending-calendar-action');
      
      if (pendingAction) {
        try {
          const context = JSON.parse(pendingAction);
          
          // Clear the pending action
          localStorage.removeItem('pending-calendar-action');
          
          // Find the ride and trigger calendar add
          if (context.action === 'add-to-calendar' && context.rideId) {
            const targetRide = rides.find(ride => ride.id === context.rideId);
            
            if (targetRide) {
              // Auto-add to calendar
              handleAutoCalendarAdd(targetRide);
            } else {
              toast({
                title: "Google Calendar Connected!",
                description: "You can now add rides to your calendar.",
              });
            }
          }
        } catch (error) {
          console.error('Error processing pending calendar action:', error);
          toast({
            title: "Google Calendar Connected!",
            description: "You can now add rides to your calendar.",
          });
        }
      } else {
        toast({
          title: "Google Calendar Connected!",
          description: "You can now add rides to your calendar.",
        });
      }
      
      // Clean up URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('google-connected');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams, currentUserProfile, rides, toast]);

  const handleAutoCalendarAdd = async (ride: any) => {
    if (!currentUserProfile?.googleAccount) return;
    
    try {
      const startDateTime = new Date(ride.dateTime);
      const endDateTime = new Date(startDateTime.getTime() + (ride.duration || 60) * 60000);
      
      const selectedCalendarId = currentUserProfile.googleAccount.selectedCalendarId || 'primary';

      const response = await bffApi.addGoogleCalendarEvent({
        accessToken: currentUserProfile.googleAccount.accessToken!,
        refreshToken: currentUserProfile.googleAccount.refreshToken!,
        calendarId: selectedCalendarId,
        summary: `Ride: ${ride.pickup} → ${ride.dropoff}`,
        description: `Ride with ${ride.driver?.name || 'Driver'}\n\nPickup: ${ride.pickup}\nDropoff: ${ride.dropoff}\nFare: $${Object.values(ride.fees ?? {}).reduce((sum: number, v) => sum + (typeof v === 'number' ? v : 0), 0).toFixed(2)}${ride.transportType ? `\nTransport: ${ride.transportType} ${ride.transportNumber || ''}` : ''}`,
        location: ride.pickup,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        attendees: ride.driver?.googleAccount?.email ? [ride.driver.googleAccount.email] : [],
        timeZone: 'America/New_York'
      });

      if (response.success && response.data?.success) {
        const calendarName = currentUserProfile.googleAccount.selectedCalendarName || 
                            'Google Calendar';
        
        toast({
          title: "Event Added!",
          description: `Your ride has been added to ${calendarName}`,
        });
      } else {
        throw new Error(response.error || 'Failed to add event');
      }
    } catch (error) {
      console.error('Error auto-adding to calendar:', error);
      toast({
        title: "Calendar Connected!",
        description: "Google Calendar connected successfully. You can now add rides manually.",
      });
    }
  };

  useEffect(() => {
    if (!loading) {
      if (!currentUserProfile) {
        router.replace('/');
      } else if (currentUserProfile.role !== 'user') {
        router.replace('/driver');
      }
    }
  }, [currentUserProfile, loading, router]);

  if (loading || !currentUserProfile || currentUserProfile.role !== 'user') {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_API_KEY!}>
      <UserDashboard />
    </APIProvider>
  );
}

export default function UserPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <UserPageContent />
    </Suspense>
  );
}
