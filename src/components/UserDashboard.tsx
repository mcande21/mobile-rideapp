"use client";

import { useState, useMemo, useEffect } from "react";
import { useRideStore } from "@/lib/store";
import { RideCard } from "./RideCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
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
import { Car, Loader2 } from "lucide-react";

export function UserDashboard() {
  const { rides, addRide, cancelRide, currentUser } = useRideStore();
  const { toast } = useToast();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const fare = useMemo(() => {
    if (pickup.length > 2 && dropoff.length > 2) {
      const calculatedFare = (pickup.length + dropoff.length) * 0.75 + 5;
      return Math.round(calculatedFare * 100) / 100;
    }
    return 0;
  }, [pickup, dropoff]);

  const handleRequestRide = (e: React.FormEvent) => {
    e.preventDefault();
    if (fare > 0) {
      setIsSubmitting(true);
      setTimeout(() => {
        addRide(pickup, dropoff, fare);
        toast({
          title: "Ride Requested!",
          description: "We are finding a driver for you.",
        });
        setPickup("");
        setDropoff("");
        setIsSubmitting(false);
      }, 1000);
    }
  };

  const handleCancelRide = (id: string) => {
    cancelRide(id);
    toast({
      title: "Ride Cancelled",
      description: "Your ride has been successfully cancelled.",
      variant: "destructive",
    });
  };

  const userRides = rides.filter((ride) => ride.user.id === currentUser?.id);
  const pendingRides = userRides.filter((ride) => ride.status === "pending");
  const scheduledRides = userRides.filter(
    (ride) => ride.status === "accepted"
  );

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Request a Ride</CardTitle>
            <CardDescription>
              Enter your pickup and drop-off locations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRequestRide} className="space-y-4">
              <Input
                placeholder="Pickup Location"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                required
              />
              <Input
                placeholder="Drop-off Location"
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
                required
              />
              {fare > 0 && (
                <div className="text-center text-2xl font-bold text-foreground py-2">
                  Estimated Fare: ${fare.toFixed(2)}
                </div>
              )}
              <Button
                type="submit"
                className="w-full transition-all"
                disabled={!fare || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Car className="mr-2" />
                    Request Ride
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Scheduled Rides</h2>
          {scheduledRides.length > 0 ? (
            <div className="space-y-4">
              {scheduledRides.map((ride) => (
                <RideCard key={ride.id} ride={ride}>
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
                          A cancellation fee may apply. This action cannot be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Ride</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleCancelRide(ride.id)}>
                          Confirm Cancellation
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </RideCard>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              You have no scheduled rides.
            </p>
          )}
        </div>
        <Separator />
        <div>
          <h2 className="text-2xl font-bold mb-4">Pending Requests</h2>
          {pendingRides.length > 0 ? (
            <div className="space-y-4">
              {pendingRides.map((ride) => (
                <RideCard key={ride.id} ride={ride} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              You have no pending ride requests.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
