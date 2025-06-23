"use client";

import { useState, useEffect } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Switch } from "./ui/switch";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Car,
  Loader2,
  Calendar as CalendarIcon,
  Plane,
  Train,
  Bus,
  BadgeDollarSign,
} from "lucide-react";
import type { Direction, TransportType } from "@/lib/types";
import { useForm } from "react-hook-form";
import { Autocomplete } from "./Autocomplete";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { calculateTripFare } from "@/lib/fare";

const formSchema = z.object({
  pickup: z.string().min(1, "Pickup location is required"),
  dropoff: z.string().min(1, "Drop-off location is required"),
});

export function UserDashboard() {
  const { rides, addRide, cancelRide, currentUserProfile } = useRideStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pickup: "",
      dropoff: "",
    },
  });

  const pickup = form.watch("pickup");
  const dropoff = form.watch("dropoff");

  // Form state
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [direction, setDirection] = useState<Direction>("departure");
  const [transportType, setTransportType] = useState<TransportType | "">("");
  const [transportNumber, setTransportNumber] = useState("");
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [fare, setFare] = useState<number | null>(null);
  const [isCalculatingFare, setIsCalculatingFare] = useState(false);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const calculate = async () => {
      if (pickup && dropoff && date && time) {
        setIsCalculatingFare(true);
        try {
          const [hours, minutes] = time.split(":").map(Number);
          const combinedDateTime = new Date(date);
          combinedDateTime.setHours(hours, minutes, 0, 0);

          const calculatedFare = await calculateTripFare(
            pickup,
            dropoff,
            combinedDateTime,
            isRoundTrip
          );
          setFare(calculatedFare);
        } catch (error) {
          console.error("Error calculating fare:", error);
          setFare(null);
        } finally {
          setIsCalculatingFare(false);
        }
      } else {
        setFare(null);
      }
    };

    const handler = setTimeout(() => {
      calculate();
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [pickup, dropoff, date, time, isRoundTrip]);

  const handleRequestRide = async (values: z.infer<typeof formSchema>) => {
    if (date && time && fare !== null) {
      setIsSubmitting(true);
      try {
        const [hours, minutes] = time.split(":").map(Number);
        const combinedDateTime = new Date(date);
        combinedDateTime.setHours(hours, minutes, 0, 0);

        await addRide(values.pickup, values.dropoff, fare, {
          dateTime: combinedDateTime.toISOString(),
          direction,
          isRoundTrip,
          ...(transportType && { transportType }),
          ...(transportNumber && { transportNumber }),
        });

        toast({
          title: "Ride Requested!",
          description: "We are finding a driver for you.",
        });

        // Reset form
        form.reset();
        setDate(undefined);
        setTime("");
        setDirection("departure");
        setTransportType("");
        setTransportNumber("");
        setIsRoundTrip(false);
        setFare(null);
      } catch (error) {
        console.error("Error requesting ride:", error);
        toast({
          title: "Error Requesting Ride",
          description:
            "There was a problem submitting your request. Please check the console for more details.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCancelRide = async (id: string) => {
    try {
      await cancelRide(id);
      toast({
        title: "Ride Cancelled",
        description: "Your ride has been successfully cancelled.",
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

  const userRides = rides.filter(
    (ride) => ride.user.id === currentUserProfile?.id
  );
  const pendingRides = userRides.filter((ride) => ride.status === "pending");
  const scheduledRides = userRides.filter(
    (ride) => ride.status === "accepted"
  );
  const completedRides = userRides.filter(
    (ride) => ride.status === "completed"
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
            <form onSubmit={form.handleSubmit(handleRequestRide)} className="space-y-4">
              <Autocomplete
                control={form.control}
                name="pickup"
                label="Pickup Location"
                placeholder="e.g., 123 Main St"
              />
              <Autocomplete
                control={form.control}
                name="dropoff"
                label="Drop-off Location"
                placeholder="e.g., Anytown Airport"
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="round-trip"
                  checked={isRoundTrip}
                  onCheckedChange={setIsRoundTrip}
                />
                <Label htmlFor="round-trip">Same-Day Round-Trip</Label>
              </div>
              <div className="space-y-2">
                <Label>Transport Details (Optional)</Label>
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="space-y-2">
                    <Label>Direction</Label>
                    <RadioGroup
                      className="flex space-x-4"
                      onValueChange={(value) =>
                        setDirection(value as Direction)
                      }
                      value={direction}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="departure" id="departure" />
                        <Label htmlFor="departure" className="font-normal">
                          Departure
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="arrival" id="arrival" />
                        <Label htmlFor="arrival" className="font-normal">
                          Arrival
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transport-type">Transport Type</Label>
                    <Select
                      onValueChange={(value) =>
                        setTransportType(value as TransportType)
                      }
                      value={transportType}
                    >
                      <SelectTrigger id="transport-type">
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flight">
                          <span className="flex items-center gap-2">
                            <Plane /> Flight
                          </span>
                        </SelectItem>
                        <SelectItem value="train">
                          <span className="flex items-center gap-2">
                            <Train /> Train
                          </span>
                        </SelectItem>
                        <SelectItem value="bus">
                          <span className="flex items-center gap-2">
                            <Bus /> Bus
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {transportType && (
                    <div className="space-y-2">
                      <Label htmlFor="transport-number">
                        {transportType.charAt(0).toUpperCase() +
                          transportType.slice(1)}{" "}
                        Number
                      </Label>
                      <Input
                        id="transport-number"
                        placeholder="e.g., UA123"
                        value={transportNumber}
                        onChange={(e) => setTransportNumber(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center text-xl font-bold text-foreground py-2 h-12 flex items-center justify-center gap-2">
                <BadgeDollarSign /> Fare:{" "}
                {isCalculatingFare ? (
                  <Loader2 className="animate-spin" />
                ) : fare !== null ? (
                  `$${fare.toFixed(2)}`
                ) : (
                  "--"
                )}
              </div>

              <Button
                type="submit"
                className="w-full transition-all"
                disabled={!date || !time || isSubmitting || fare === null}
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
                        <AlertDialogAction
                          onClick={() => handleCancelRide(ride.id)}
                        >
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
        <Separator />
        <div>
          <h2 className="text-2xl font-bold mb-4">Completed Rides</h2>
          {completedRides.length > 0 ? (
            <div className="space-y-4">
              {completedRides.map((ride) => (
                <RideCard key={ride.id} ride={ride} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              You have no completed rides.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
