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
import { Input } from "./ui/input";

export function DriverDashboard() {
  const { rides, acceptRide, rejectRide, updateRideFare, cancelRideByDriver, completeRide, cleanupOldDeniedRides, currentUserProfile, updateUserProfile } =
    useRideStore();
  const { toast } = useToast();

  // Debug: Log currentUserProfile and role
  useEffect(() => {
    console.log("[DriverDashboard] currentUserProfile:", currentUserProfile);
    if (currentUserProfile) {
      console.log("[DriverDashboard] role:", currentUserProfile.role);
    }
  }, [currentUserProfile]);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
    // Cleanup old denied rides when component mounts
    cleanupOldDeniedRides().catch(console.error);
  }, [cleanupOldDeniedRides]);

  // Track loading state for each ride action to prevent duplicate submissions
  const [loadingRideId, setLoadingRideId] = useState<string | null>(null);

  // Venmo username modal state
  const [showVenmoModal, setShowVenmoModal] = useState(false);
  const [pendingAcceptId, setPendingAcceptId] = useState<string | null>(null);
  const [venmoInput, setVenmoInput] = useState("");
  const [venmoError, setVenmoError] = useState("");
  const [savingVenmo, setSavingVenmo] = useState(false);

  const handleAcceptRide = async (id: string) => {
    if (!currentUserProfile?.venmoUsername) {
      setPendingAcceptId(id);
      setShowVenmoModal(true);
      setVenmoInput("");
      setVenmoError("");
      return;
    }
    setLoadingRideId(id);
    try {
      await acceptRide(id);
      toast({
        title: "Ride Accepted!",
        description: "The ride has been added to your schedule.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Could not accept the ride.",
        variant: "destructive"
      });
    } finally {
      setLoadingRideId(null);
    }
  };

  // Save Venmo username and proceed to accept ride
  const handleSaveVenmoAndAccept = async () => {
    setVenmoError("");
    if (!venmoInput.trim()) {
      setVenmoError("Please enter your Venmo username.");
      return;
    }
    setSavingVenmo(true);
    try {
      // Ensure all required fields are present and not undefined
      await updateUserProfile({
        name: currentUserProfile?.name || "",
        phoneNumber: currentUserProfile?.phoneNumber || "",
        homeAddress: currentUserProfile?.homeAddress ?? "",
        venmoUsername: venmoInput.trim(),
        customAvatar: currentUserProfile?.customAvatar,
      });
      setShowVenmoModal(false);
      setSavingVenmo(false);
      if (pendingAcceptId) {
        setLoadingRideId(pendingAcceptId);
        await acceptRide(pendingAcceptId);
        toast({
          title: "Ride Accepted!",
          description: "The ride has been added to your schedule.",
        });
        setPendingAcceptId(null);
      }
    } catch (error) {
      setVenmoError("Failed to save Venmo username. Please try again.");
      setSavingVenmo(false);
    }
  };

  const handleRejectRide = async (id: string) => {
    setLoadingRideId(id);
    try {
      await rejectRide(id);
      toast({
        title: "Ride Rejected",
        description: "The ride request has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Could not reject the ride.",
        variant: "destructive"
      });
    } finally {
      setLoadingRideId(null);
    }
  };

  const handleCancelRide = async (id: string) => {
    setLoadingRideId(id);
    try {
      await cancelRideByDriver(id);
      toast({
        title: "Ride Cancelled",
        description: "The ride has been successfully cancelled.",
        variant: "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Could not cancel the ride.",
        variant: "destructive",
      });
    } finally {
      setLoadingRideId(null);
    }
  };

  const handleCompleteRide = async (id: string) => {
    setLoadingRideId(id);
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Could not complete the ride.",
        variant: "destructive",
      });
    } finally {
      setLoadingRideId(null);
    }
  };

  const handleUpdateFare = async (id: string, fare: number) => {
    setLoadingRideId(id);
    try {
      await updateRideFare(id, fare);
      toast({
        title: "Fare Updated!",
        description: "The ride fare has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Could not update the fare.",
        variant: "destructive",
      });
    } finally {
      setLoadingRideId(null);
    }
  };

  const newRequests = rides
    .filter((ride) => ride.status === "pending")
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  const acceptedRides = rides
    .filter((ride) => ride.status === "accepted")
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  const cancelledRidesWithFee = rides
    .filter((ride) => 
      ride.status === "cancelled" && ride.cancellationFeeApplied
    )
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  const completedRides = rides.filter((ride) => {
    if (ride.status !== "completed") return false;
    if (!ride.dateTime) return true;
    const rideDate = new Date(ride.dateTime);
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return rideDate >= oneWeekAgo;
  });

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      {/* Venmo Username Modal */}
      {showVenmoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2">Enter Your Venmo Username</h3>
            <p className="text-sm text-muted-foreground mb-4">You must provide a Venmo username before accepting rides. This will be visible to riders for payment.</p>
            <Input
              placeholder="Venmo username (without @)"
              value={venmoInput}
              onChange={e => setVenmoInput(e.target.value)}
              disabled={savingVenmo}
              className="mb-2"
            />
            {venmoError && <div className="text-xs text-red-500 mb-2">{venmoError}</div>}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowVenmoModal(false)} disabled={savingVenmo}>Cancel</Button>
              <Button onClick={handleSaveVenmoAndAccept} disabled={savingVenmo} className="bg-green-500 text-white">{savingVenmo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & Accept"}</Button>
            </div>
          </div>
        </div>
      )}

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
                  disabled={loadingRideId === ride.id}
                >
                  <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="sr-only">Reject</span>
                </Button>
                <Button
                  className="bg-green-500 hover:bg-green-600 text-white"
                  size="icon"
                  onClick={() => handleAcceptRide(ride.id)}
                  disabled={loadingRideId === ride.id}
                >
                  {loadingRideId === ride.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
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
                 <Button onClick={() => handleCompleteRide(ride.id)} className="ml-2" disabled={loadingRideId === ride.id}>
                  {loadingRideId === ride.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete Ride"}
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
                  disabled={loadingRideId === ride.id}
                >
                  {loadingRideId === ride.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete & Remove"}
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
