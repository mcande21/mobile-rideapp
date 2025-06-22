"use client";

import { useEffect, useState } from "react";
import { useRideStore } from "@/lib/store";
import { RideCard } from "./RideCard";
import { Button } from "./ui/button";
import { Check, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "./ui/separator";

export function DriverDashboard() {
  const { rides, acceptRide, rejectRide } = useRideStore();
  const { toast } = useToast();
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAcceptRide = (id: string) => {
    acceptRide(id);
    toast({
      title: "Ride Accepted!",
      description: "The ride has been added to your schedule.",
    });
  };

  const handleRejectRide = (id: string) => {
    rejectRide(id);
    toast({
      title: "Ride Rejected",
      variant: "destructive",
    });
  };

  const newRequests = rides.filter((ride) => ride.status === "pending");
  const acceptedRides = rides.filter((ride) => ride.status === "accepted");

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-4">New Ride Requests</h2>
        {newRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {newRequests.map((ride) => (
              <RideCard key={ride.id} ride={ride}>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-red-50 hover:bg-red-100 dark:bg-red-900/50 dark:hover:bg-red-900"
                  onClick={() => handleRejectRide(ride.id)}
                >
                  <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="sr-only">Reject</span>
                </Button>
                <Button
                  className="bg-green-500 hover:bg-green-600 text-white"
                  size="icon"
                  onClick={() => handleAcceptRide(ride.id)}
                >
                  <Check className="h-4 w-4" />
                   <span className="sr-only">Accept</span>
                </Button>
              </RideCard>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No new ride requests available.</p>
        )}
      </div>

      <Separator />

      <div>
        <h2 className="text-3xl font-bold mb-4">Your Accepted Rides</h2>
        {acceptedRides.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {acceptedRides.map((ride) => (
              <RideCard key={ride.id} ride={ride} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">You have no accepted rides.</p>
        )}
      </div>
    </div>
  );
}
