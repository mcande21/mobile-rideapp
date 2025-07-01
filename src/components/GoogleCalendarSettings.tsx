import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, ChevronDown, Check, RefreshCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRideStore } from '@/lib/store';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { bffApi, BffApiService } from '@/lib/bff-api';

interface Calendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
}

export function GoogleCalendarSettings() {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);
  const { currentUserProfile, updateUserProfile } = useRideStore();
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const DEBOUNCE_MS = 1500;

  // Utility: sanitize calendar name/description
  function sanitizeText(text: string): string {
    if (!text) return "";
    // Remove control chars except common whitespace (tab, newline)
    let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
    // Remove invisible Unicode (zero-width, etc)
    sanitized = sanitized.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "");
    // Limit length for display
    if (sanitized.length > 100) sanitized = sanitized.slice(0, 100) + '…';
    return sanitized;
  }

  // Load current selection on mount
  useEffect(() => {
    if (currentUserProfile?.googleAccount?.selectedCalendarId) {
      setSelectedCalendar({
        id: currentUserProfile.googleAccount.selectedCalendarId,
        summary: currentUserProfile.googleAccount.selectedCalendarName || 'Selected Calendar',
        primary: currentUserProfile.googleAccount.selectedCalendarId === 'primary'
      });
    }
  }, [currentUserProfile]);

  const loadCalendars = async () => {
    if (!currentUserProfile?.googleAccount?.accessToken) return;
    const now = Date.now();
    if (now - lastRefresh < DEBOUNCE_MS) return; // Debounce
    setLastRefresh(now);
    setIsLoading(true);
    try {
      const response = await bffApi.listGoogleCalendars(currentUserProfile.id);

      if (response.success && response.data?.calendars) {
        setCalendars(response.data.calendars);
        
        // If no calendar is selected, default to primary
        if (!selectedCalendar) {
          const primaryCalendar = response.data.calendars.find((cal: Calendar) => cal.primary);
          if (primaryCalendar) {
            handleCalendarSelect(primaryCalendar);
          }
        }
      } else {
        // Handle authentication errors
        if (response.status === 401) {
          alert('Your Google Calendar access has expired. Please reconnect your Google account.');
        } else {
          console.error('Failed to load calendars:', response.error);
          alert('Failed to load calendars. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error loading calendars:', error);
      alert('Failed to load calendars. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalendarSelect = async (calendar: Calendar) => {
    setSelectedCalendar(calendar);
    
    // Update user profile with selected calendar directly in Firestore
    if (currentUserProfile && db) {
      try {
        const userRef = doc(db, 'users', currentUserProfile.id);
        await updateDoc(userRef, {
          'googleAccount.selectedCalendarId': calendar.id,
          'googleAccount.selectedCalendarName': calendar.summary,
        });
      } catch (error) {
        console.error('Error saving calendar selection:', error);
        alert('Failed to save calendar selection. Please try again.');
      }
    }
  };

  // Load calendars on mount if user has Google account
  useEffect(() => {
    if (currentUserProfile?.googleAccount?.accessToken && calendars.length === 0) {
      loadCalendars();
    }
  }, [currentUserProfile?.googleAccount?.accessToken]);

  if (!currentUserProfile?.googleAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            Connect your Google account to add ride events to your calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please connect your Google account first to configure calendar settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Settings
        </CardTitle>
        <CardDescription>
          Choose which calendar to use for your ride events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="font-medium">Selected Calendar:</span>
              {selectedCalendar ? (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  {selectedCalendar.backgroundColor && (
                    <div 
                      className="w-3 h-3 rounded-full border flex-shrink-0"
                      style={{ backgroundColor: selectedCalendar.backgroundColor }}
                    />
                  )}
                  <div>
                    <span className="text-sm font-medium">
                      {sanitizeText(selectedCalendar.summary)}
                    </span>
                    {selectedCalendar.primary && (
                      <span className="text-xs text-muted-foreground ml-2">(Primary)</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-2 border rounded-md bg-muted/50">
                  <span className="text-sm text-muted-foreground">None selected</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={loadCalendars}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              
              {calendars.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      Change Calendar
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 max-h-64 overflow-y-auto">
                  {calendars.map((calendar) => (
                    <DropdownMenuItem
                      key={calendar.id}
                      onClick={() => handleCalendarSelect(calendar)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {calendar.backgroundColor && (
                          <div 
                            className="w-3 h-3 rounded-full border flex-shrink-0"
                            style={{ backgroundColor: calendar.backgroundColor }}
                          />
                        )}
                        <div className="truncate">
                          <span className="block truncate">
                            {sanitizeText(calendar.summary)}
                          </span>
                          {calendar.primary && (
                            <span className="text-xs text-muted-foreground">(Primary)</span>
                          )}
                        </div>
                      </div>
                      {selectedCalendar?.id === calendar.id && (
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        
        {calendars.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">
            Click the refresh button to load your Google calendars.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
