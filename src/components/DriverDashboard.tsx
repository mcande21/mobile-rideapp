"use client";

import { useEffect, useState } from "react";
import { useRideStore } from "@/lib/store";
import { RideCard } from "./RideCard";
import { Button } from "./ui/button";
import { Check, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "./ui/separator";

export function DriverDashboard() {
  const { rides, acceptRide, rejectRide, updateRideFare, cancelRideByDriver, completeRide } =
    useRideStore();
  const { toast } = useToast();
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAcceptRide = async (id: string) => {
    try {
      await acceptRide(id);
      toast({
        title: "Ride Accepted!",
        description: "The ride has been added to your schedule.",
      });
    } catch (error) {
       toast({
        title: "Error",
        description: "Could not accept the ride.",
        variant: "destructive"
      });
    }
  };

  const handleRejectRide = async (id: string) => {
    try {
      await rejectRide(id);
      toast({
        title: "Ride Rejected",
        description: "The ride request has been removed.",
      });
    } catch (error) {
       toast({
        title: "Error",
        description: "Could not reject the ride.",
        variant: "destructive"
      });
    }
  };

  const handleCancelRide = async (id: string) => {
    try {
      await cancelRideByDriver(id);
      toast({
        title: "Ride Cancelled",
        description: "The ride has been successfully cancelled.",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not cancel the ride.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteRide = async (id: string) => {
    try {
      // Check if this is a cancelled ride with fee applied
      const ride = rides.find(r => r.id === id);
      const isCancelledWithFee = ride?.status === "cancelled" && ride?.cancellationFeeApplied;
      
      await completeRide(id);
      
      if (isCancelledWithFee) {
        toast({
          title: "Ride Completed & Removed!",
          description: "The cancelled ride has been finalized and removed from the system.",
        });
      } else {
        toast({
          title: "Ride Completed!",
          description: "The ride has been marked as completed.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not complete the ride.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateFare = async (id: string, fare: number) => {
    try {
      await updateRideFare(id, fare);
      toast({
        title: "Fare Updated!",
        description: "The ride fare has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not update the fare.",
        variant: "destructive",
      });
    }
  };

  const newRequests = rides.filter((ride) => ride.status === "pending");
  const acceptedRides = rides
    .filter((ride) => ride.status === "accepted")
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  const cancelledRidesWithFee = rides
    .filter((ride) => 
      ride.status === "cancelled" && ride.cancellationFeeApplied
    )
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  const completedRides = rides.filter((ride) => ride.status === "completed");

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
              <RideCard
                key={ride.id}
                ride={ride}
                onUpdateFare={handleUpdateFare}
                showPhoneNumber={true}
              >
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
              <RideCard
                key={ride.id}
                ride={ride}
                onUpdateFare={handleUpdateFare}
                showPhoneNumber={true}
              >
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Cancel Ride</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you sure you want to cancel?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will notify the user that you have cancelled the
                        ride. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Ride</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleCancelRide(ride.id)}
                      >
                        Confirm Cancellation
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                 <Button onClick={() => handleCompleteRide(ride.id)} className="ml-2">
                  Complete Ride
                </Button>
              </RideCard>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">You have no accepted rides.</p>
        )}
      </div>

      <Separator />

      <div>
        <h2 className="text-3xl font-bold mb-4">Cancelled Rides (Fee Applied)</h2>
        <p className="text-muted-foreground mb-4">
          Rides cancelled within 24 hours. Complete these to finalize payment and remove from system.
        </p>
        {cancelledRidesWithFee.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cancelledRidesWithFee.map((ride) => (
              <RideCard
                key={ride.id}
                ride={ride}
                onUpdateFare={handleUpdateFare}
                showPhoneNumber={true}
              >
                <Button 
                  onClick={() => handleCompleteRide(ride.id)} 
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  Complete & Remove
                </Button>
              </RideCard>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No cancelled rides with fees.</p>
        )}
      </div>

      <Separator />

      <div>
        <h2 className="text-3xl font-bold mb-4">Completed Rides</h2>
        {completedRides.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedRides.map((ride) => (
              <RideCard
                key={ride.id}
                ride={ride}
                onUpdateFare={handleUpdateFare}
                showPhoneNumber={true}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">You have no completed rides.</p>
        )}
      </div>
    </div>
  );
}
