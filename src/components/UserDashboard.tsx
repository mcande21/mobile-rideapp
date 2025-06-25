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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { format, parseISO } from "date-fns";
import {
  Car,
  Loader2,
  Calendar as CalendarIcon,
  Plane,
  Train,
  Bus,
  BadgeDollarSign,
  Edit,
  Save,
} from "lucide-react";
import type { Direction, TransportType, Ride } from "@/lib/types";
import { useForm, Controller } from "react-hook-form";
import { Autocomplete } from "./Autocomplete";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { calculateTripFare } from "@/lib/fare";

const rideFormSchema = z.object({
  pickup: z.string().min(1, "Pickup location is required"),
  dropoff: z.string().min(1, "Drop-off location is required"),
});

type RideFormData = z.infer<typeof rideFormSchema>;

export function UserDashboard() {
  const { rides, addRide, cancelRide, updateRide, currentUserProfile } =
    useRideStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Edit state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);

  const form = useForm<RideFormData>({
    resolver: zodResolver(rideFormSchema),
    defaultValues: { pickup: "", dropoff: "" },
  });

  const editForm = useForm<RideFormData>({
    resolver: zodResolver(rideFormSchema),
    defaultValues: { pickup: "", dropoff: "" },
  });

  // --- Move these lines up so they're declared before any useEffect that uses them ---
  const pickup = form.watch("pickup");
  const dropoff = form.watch("dropoff");
  const editPickup = editForm.watch("pickup");
  const editDropoff = editForm.watch("dropoff");

  // New: error state for invalid date/time
  const [dateTimeError, setDateTimeError] = useState<string>("");
  const [editDateTimeError, setEditDateTimeError] = useState<string>("");

  // New: error state for directions API
  const [directionsError, setDirectionsError] = useState<string>("");

  // New ride form state
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [direction, setDirection] = useState<Direction>("departure");
  const [transportType, setTransportType] = useState<TransportType | "">("");
  const [transportNumber, setTransportNumber] = useState("");
  const [fare, setFare] = useState<number | null>(null);
  const [isCalculatingFare, setIsCalculatingFare] = useState(false);

  // Edit ride form state
  const [editDate, setEditDate] = useState<Date | undefined>();
  const [editTime, setEditTime] = useState("");
  const [editReturnTime, setEditReturnTime] = useState("");
  const [editIsRoundTrip, setEditIsRoundTrip] = useState(false);
  const [editDirection, setEditDirection] = useState<Direction>("departure");
  const [editTransportType, setEditTransportType] = useState<
    TransportType | ""
  >("");
  const [editTransportNumber, setEditTransportNumber] = useState("");
  const [editFare, setEditFare] = useState<number | null>(null);
  const [isCalculatingEditFare, setIsCalculatingEditFare] = useState(false);

  // Reschedule fee state for edit dialog
  const [rescheduleFee, setRescheduleFee] = useState<number>(0);

  // --- Return time validation for new ride form ---
  const [returnTimeError, setReturnTimeError] = useState<string>("");
  useEffect(() => {
    if (isRoundTrip && time && returnTime) {
      // Parse both times as today (date doesn't matter for diff)
      const [h1, m1] = time.split(":").map(Number);
      const [h2, m2] = returnTime.split(":").map(Number);
      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff < 0) diff += 24 * 60; // handle overnight return
      if (diff > 600) {
        setReturnTimeError("Return time must be within 10 hours of your initial time.");
      } else {
        setReturnTimeError("");
      }
    } else {
      setReturnTimeError("");
    }
  }, [isRoundTrip, time, returnTime]);

  // Helper: fetch reschedule fee from backend
  async function fetchRescheduleFee({
    pickupLocation,
    dropoffLocation,
    oldTime,
    newTime,
    mileageMeters,
  }: {
    pickupLocation: string;
    dropoffLocation: string;
    oldTime: string;
    newTime: string;
    mileageMeters: number;
  }) {
    try {
      const res = await fetch("/api/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupLocation,
          dropoffLocation,
          oldTime,
          newTime,
          mileageMeters,
        }),
      });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.fee || 0;
    } catch {
      return 0;
    }
  }

  // Update reschedule fee whenever edit dialog values change
  useEffect(() => {
    const updateRescheduleFee = async () => {
      if (editingRide && editPickup && editDropoff && editDate && editTime) {
        // Estimate mileage in meters (if available)
        // If you have mileage, use it; otherwise, use 0
        const mileageMeters = editingRide.duration ? editingRide.duration * 1609.34 / 60 : 0;
        const oldTime = editingRide.dateTime;
        const [hours, minutes] = editTime.split(":").map(Number);
        const newDate = new Date(editDate);
        newDate.setHours(hours, minutes, 0, 0);
        const newTime = newDate.toISOString();
        const fee = await fetchRescheduleFee({
          pickupLocation: editPickup,
          dropoffLocation: editDropoff,
          oldTime,
          newTime,
          mileageMeters,
        });
        setRescheduleFee(fee);
      } else {
        setRescheduleFee(0);
      }
    };
    updateRescheduleFee();
  }, [editingRide, editPickup, editDropoff, editDate, editTime]);

  // Helper: calculate day-of-scheduling fee for edit dialog
  function getEditDayOfSchedulingFee(rideDate: Date) {
    const now = new Date();
    if (
      now.getFullYear() === rideDate.getFullYear() &&
      now.getMonth() === rideDate.getMonth() &&
      now.getDate() === rideDate.getDate()
    ) {
      const scheduledHour = rideDate.getHours();
      if (scheduledHour >= 7 && scheduledHour < 19) return 20;
      if (scheduledHour >= 19 || scheduledHour < 2) return 30;
    }
    return 0;
  }
  const [editDayOfFee, setEditDayOfFee] = useState<number>(0);
  useEffect(() => {
    if (editDate && editTime) {
      const [hours, minutes] = editTime.split(":").map(Number);
      const combinedDateTime = new Date(editDate);
      combinedDateTime.setHours(hours, minutes, 0, 0);
      setEditDayOfFee(getEditDayOfSchedulingFee(combinedDateTime));
    } else {
      setEditDayOfFee(0);
    }
  }, [editDate, editTime]);

  // Helper: calculate day-of-scheduling fee (matches fare.ts logic, but uses scheduled ride time)
  function getDayOfSchedulingFee(rideDate: Date) {
    const now = new Date();
    if (
      now.getFullYear() === rideDate.getFullYear() &&
      now.getMonth() === rideDate.getMonth() &&
      now.getDate() === rideDate.getDate()
    ) {
      const scheduledHour = rideDate.getHours();
      if (scheduledHour >= 7 && scheduledHour < 19) return 20;
      // 7PM (19) to 1AM (1:59) should be $30
      if (scheduledHour >= 19 || scheduledHour < 2) return 30;
    }
    return 0;
  }

  const [dayOfFee, setDayOfFee] = useState<number>(0);

  // Update day-of-scheduling fee whenever date/time changes
  useEffect(() => {
    if (date && time) {
      const [hours, minutes] = time.split(":").map(Number);
      const combinedDateTime = new Date(date);
      combinedDateTime.setHours(hours, minutes, 0, 0);
      setDayOfFee(getDayOfSchedulingFee(combinedDateTime));
    } else {
      setDayOfFee(0);
    }
  }, [date, time]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fare calculation for new ride
  useEffect(() => {
    const calculate = async () => {
      setDirectionsError("");
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
        } catch (error: any) {
          if (
            error &&
            typeof error.message === "string" &&
            error.message.includes("No routes found")
          ) {
            setDirectionsError(
              "No route could be found for the selected date and time. Please check your input"
            );
          } else {
            setDirectionsError("Failed to calculate fare. Please try again.");
          }
          setFare(null);
        } finally {
          setIsCalculatingFare(false);
        }
      } else {
        setFare(null);
        setDirectionsError("");
      }
    };
    const handler = setTimeout(calculate, 500);
    return () => clearTimeout(handler);
  }, [pickup, dropoff, date, time, isRoundTrip]);

  // Fare calculation for editing ride
  useEffect(() => {
    const calculate = async () => {
      if (editPickup && editDropoff && editDate && editTime) {
        setIsCalculatingEditFare(true);
        try {
          const [hours, minutes] = editTime.split(":").map(Number);
          const combinedDateTime = new Date(editDate);
          combinedDateTime.setHours(hours, minutes, 0, 0);

          const calculatedFare = await calculateTripFare(
            editPickup,
            editDropoff,
            combinedDateTime,
            editIsRoundTrip
          );
          setEditFare(calculatedFare);
        } catch (error) {
          console.error("Error calculating edit fare:", error);
          setEditFare(null);
        } finally {
          setIsCalculatingEditFare(false);
        }
      } else {
        setEditFare(null);
      }
    };
    const handler = setTimeout(calculate, 500);
    return () => clearTimeout(handler);
  }, [editPickup, editDropoff, editDate, editTime, editIsRoundTrip]);

  const handleRequestRide = async (values: RideFormData) => {
    if (date && time && fare !== null) {
      setIsSubmitting(true);
      try {
        const [hours, minutes] = time.split(":").map(Number);
        const combinedDateTime = new Date(date);
        combinedDateTime.setHours(hours, minutes, 0, 0);
        const dayFee = getDayOfSchedulingFee(combinedDateTime);
        const totalFare = fare + dayFee;
        await addRide(values.pickup, values.dropoff, totalFare, {
          dateTime: combinedDateTime.toISOString(),
          direction,
          isRoundTrip,
          transportType: transportType && transportNumber ? transportType : "",
          transportNumber: transportType && transportNumber ? transportNumber : "",
          ...(isRoundTrip && returnTime ? { returnTime } : {}),
        });

        toast({ title: "Ride Requested!", description: "We are finding a driver for you." });
        form.reset();
        setDate(undefined); setTime(""); setReturnTime(""); setIsRoundTrip(false); setDirection("departure"); setTransportType(""); setTransportNumber(""); setFare(null); setDayOfFee(0);
      } catch (error) {
        console.error("Error requesting ride:", error);
        toast({ title: "Error Requesting Ride", description: "There was a problem submitting your request.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleEditRide = (ride: Ride) => {
    setEditingRide(ride);
    editForm.reset({ pickup: ride.pickup, dropoff: ride.dropoff });
    const rideDate = parseISO(ride.dateTime);
    setEditDate(rideDate);
    setEditTime(format(rideDate, "HH:mm"));
    setEditReturnTime(ride.returnTime || "");
    setEditIsRoundTrip(ride.isRoundTrip || false);
    setEditDirection(ride.direction || "departure");
    setEditTransportType(ride.transportType || "");
    setEditTransportNumber(ride.transportNumber || "");
    setEditFare(ride.fare);
    setIsEditDialogOpen(true);
  };

  const handleUpdateRide = async (values: RideFormData) => {
    if (editingRide && editDate && editTime && editFare !== null) {
      setIsSubmitting(true);
      try {
        const [hours, minutes] = editTime.split(":").map(Number);
        const combinedDateTime = new Date(editDate);
        combinedDateTime.setHours(hours, minutes, 0, 0);
        // Calculate the total adjusted fare (base + day-of + reschedule)
        const totalAdjustedFare = (editFare ?? 0) + (editDayOfFee ?? 0) + (rescheduleFee ?? 0);
        await updateRide(
          editingRide.id,
          values.pickup,
          values.dropoff,
          totalAdjustedFare,
          {
            dateTime: combinedDateTime.toISOString(),
            direction: editDirection,
            isRoundTrip: editIsRoundTrip,
            transportType: editTransportType && editTransportNumber ? editTransportType : "",
            transportNumber: editTransportType && editTransportNumber ? editTransportNumber : "",
            returnTime: editIsRoundTrip ? editReturnTime : undefined,
          }
        );

        toast({ title: "Ride Updated!", description: "Your ride has been sent for re-approval." });
        setIsEditDialogOpen(false);
        setEditingRide(null);
      } catch (error) {
        console.error("Error updating ride:", error);
        toast({ title: "Error Updating Ride", description: "There was a problem updating your request.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCancelRide = async (id: string, rideDateTime?: string) => {
    try {
      // Find the ride by id to get current values
      const ride = rides.find(r => r.id === id);
      if (!ride) throw new Error("Ride not found");
      if (rideDateTime) {
        const now = new Date();
        const rideDate = new Date(rideDateTime);
        const diffMs = rideDate.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours <= 24) {
          // Mark as cancelled, do not delete
          await updateRide(
            id,
            ride.pickup,
            ride.dropoff,
            ride.fare,
            {
              dateTime: ride.dateTime,
              transportType: ride.transportType || "",
              transportNumber: ride.transportNumber,
              direction: ride.direction,
              isRoundTrip: ride.isRoundTrip,
              returnTime: ride.isRoundTrip ? ride.returnTime : undefined,
            }
          );
          await cancelRide(id);
          toast({ title: "Ride Cancelled", description: "Your ride has been cancelled. Rides cancelled within 24 hours are subject to a full price charge.", variant: "destructive" });
          return;
        }
      }
      // Default: just mark as cancelled
      await cancelRide(id);
      toast({ title: "Ride Cancelled", description: "Your ride has been successfully cancelled.", variant: "destructive" });
    } catch (error) {
      toast({ title: "Error", description: "Could not cancel the ride.", variant: "destructive" });
    }
  };

  const userRides = rides.filter((ride) => ride.user.id === currentUserProfile?.id);
  const pendingRides = userRides.filter((ride) => ride.status === "pending");
  const scheduledRides = userRides.filter((ride) => ride.status === "accepted");
  const completedRides = userRides.filter((ride) => ride.status === "completed");
  const deniedRides = userRides.filter((ride) => ride.status === "denied");

  if (!isClient) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <div className="container mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Request a Ride</CardTitle>
              <CardDescription>Enter your pickup and drop-off locations.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(handleRequestRide)} className="space-y-4">
                <Autocomplete control={form.control} name="pickup" label="Pickup Location" placeholder="e.g., 123 Main St" />
                <Autocomplete control={form.control} name="dropoff" label="Drop-off Location" placeholder="e.g., Anytown Airport" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Popover><PopoverTrigger asChild><Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{date ? format(date, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus /></PopoverContent></Popover>
                  </div>
                  <div className="space-y-2"><Label htmlFor="time">Time</Label><Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required /></div>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch id="round-trip" checked={isRoundTrip} onCheckedChange={setIsRoundTrip} />
                  <Label htmlFor="round-trip">Round Trip</Label>
                    {isRoundTrip && (
                    <div className="space-y-2">
                      <Input
                      id="return-time"
                      type="time"
                      value={returnTime}
                      onChange={e => setReturnTime(e.target.value)}
                      required
                      min={time}
                      />
                    </div>
                    )}
                </div>
                {isRoundTrip && (
                  <div className={`text-xs mb-2 ${returnTimeError ? "text-red-500" : "text-muted-foreground"}`}>
                    Return time must be within 10 hours of your initial time.
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Transport Details (Optional)</Label>
                  <div className="p-4 border rounded-lg space-y-4">
                    <RadioGroup className="flex space-x-4" onValueChange={(value) => setDirection(value as Direction)} value={direction}>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="departure" id="departure" /><Label htmlFor="departure" className="font-normal">Departure</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="arrival" id="arrival" /><Label htmlFor="arrival" className="font-normal">Arrival</Label></div>
                    </RadioGroup>
                    <Select onValueChange={(value) => setTransportType(value as TransportType)} value={transportType}>
                      <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                      <SelectContent><SelectItem value="flight"><span className="flex items-center gap-2"><Plane /> Flight</span></SelectItem><SelectItem value="train"><span className="flex items-center gap-2"><Train /> Train</span></SelectItem><SelectItem value="bus"><span className="flex items-center gap-2"><Bus /> Bus</span></SelectItem></SelectContent>
                    </Select>
                    {transportType && <Input placeholder={`e.g., UA123`} value={transportNumber} onChange={(e) => setTransportNumber(e.target.value)} />}
                  </div>
                </div>
                <div className="text-center text-xl font-bold text-foreground py-1 h-10 flex items-center justify-center gap-1">
                  <BadgeDollarSign /> Fare: {isCalculatingFare ? <Loader2 className="animate-spin" /> : fare !== null ? `$${(fare + dayOfFee).toFixed(2)}` : "--"}
                </div>
                {/* Always show fee breakdown for new ride */}
                <div className="text-xs text-muted-foreground text-center mb-1">
                  <div style={{ marginBottom: 2 }}>Fare breakdown:</div>
                  <ul className="list-disc ml-4 text-left inline-block">
                    <li>Base fare: ${fare?.toFixed(2) ?? "--"}</li>
                    {dayOfFee > 0 && <li>Day-of-scheduling fee: ${dayOfFee}</li>}
                    <li className="font-semibold">Total: ${fare !== null ? (fare + dayOfFee).toFixed(2) : "--"}</li>
                  </ul>
                </div>
                {/* Error message for invalid date/time or directions */}
                {(dateTimeError || directionsError) ? (
                  <div className="text-xs text-red-500 text-center mb-1">
                    {dateTimeError || directionsError}
                  </div>
                ) : null}
                <Button type="submit" className="w-full transition-all" disabled={!date || !time || isSubmitting || fare === null || !!dateTimeError || !!returnTimeError}>{isSubmitting ? <Loader2 className="animate-spin" /> : <><Car className="mr-2" />Request Ride</>}</Button>
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
                    <Button variant="outline" size="icon" onClick={() => handleEditRide(ride)}><Edit className="h-4 w-4" /><span className="sr-only">Edit Ride</span></Button>
                    <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive">Cancel Ride</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle><AlertDialogDescription>A cancellation fee may apply. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Keep Ride</AlertDialogCancel><AlertDialogAction onClick={() => handleCancelRide(ride.id, ride.dateTime)}>Confirm Cancellation</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </RideCard>
                ))}
              </div>
            ) : <p className="text-muted-foreground">You have no scheduled rides.</p>}
          </div>
          <Separator />
          <div>
            <h2 className="text-2xl font-bold mb-4">Pending Requests</h2>
            {pendingRides.length > 0 ? (
              <div className="space-y-4">
                {pendingRides.map((ride) => (
                  <RideCard key={ride.id} ride={ride}>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Cancel Ride</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
                          <AlertDialogDescription>A cancellation fee may apply. This action cannot be undone.</AlertDialogDescription>
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
            ) : <p className="text-muted-foreground">You have no pending ride requests.</p>}
          </div>
          <Separator />
          <div>
            <h2 className="text-2xl font-bold mb-4">Completed Rides</h2>
            {completedRides.length > 0 ? (
              <div className="space-y-4">
                {completedRides.map((ride) => <RideCard key={ride.id} ride={ride} />)}
              </div>
            ) : <p className="text-muted-foreground">You have no past rides.</p>}
          </div>
           <Separator />
          <div>
            <h2 className="text-2xl font-bold mb-4">Denied Rides</h2>
            {deniedRides.length > 0 ? (
              <div className="space-y-4">
                {deniedRides.map((ride) => <RideCard key={ride.id} ride={ride} />)}
              </div>
            ) : <p className="text-muted-foreground">You have no denied rides.</p>}
          </div>
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Ride</DialogTitle>
            <DialogDescription>Make changes to your ride details here. Click save when you're done.</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleUpdateRide)} className="space-y-4">
            <Autocomplete control={editForm.control} name="pickup" label="Pickup Location" placeholder="e.g., 123 Main St" />
            <Autocomplete control={editForm.control} name="dropoff" label="Drop-off Location" placeholder="e.g., Anytown Airport" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date</Label>
                <Popover><PopoverTrigger asChild><Button id="edit-date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !editDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{editDate ? format(editDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={editDate} onSelect={setEditDate} initialFocus /></PopoverContent></Popover>
              </div>
              <div className="space-y-2"><Label htmlFor="edit-time">Time</Label><Input id="edit-time" type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} required /></div>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Switch id="edit-round-trip" checked={editIsRoundTrip} onCheckedChange={setEditIsRoundTrip} />
              <Label htmlFor="edit-round-trip">Round Trip</Label>
              {editIsRoundTrip && (
                <>
                  <Label htmlFor="edit-return-time" className="ml-4">Return Time</Label>
                  <Input
                    id="edit-return-time"
                    type="time"
                    className="ml-2 w-32"
                    value={editReturnTime}
                    onChange={e => setEditReturnTime(e.target.value)}
                    required
                    min={editTime}
                  />
                </>
              )}
            </div>
            {editIsRoundTrip && (
              <div className="text-xs text-muted-foreground mb-2">
                If round trip is selected, you must choose a return time within 10 hours of your pickup time.
              </div>
            )}
            <div className="space-y-2">
                <Label>Transport Details (Optional)</Label>
                <div className="p-4 border rounded-lg space-y-4">
                <RadioGroup className="flex space-x-4" onValueChange={(value) => setEditDirection(value as Direction)} value={editDirection}>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="departure" id="edit-departure" /><Label htmlFor="edit-departure" className="font-normal">Departure</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="arrival" id="edit-arrival" /><Label htmlFor="edit-arrival" className="font-normal">Arrival</Label></div>
                </RadioGroup>
                <Select onValueChange={(value) => setEditTransportType(value as TransportType)} value={editTransportType}>
                    <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                    <SelectContent><SelectItem value="flight"><span className="flex items-center gap-2"><Plane /> Flight</span></SelectItem><SelectItem value="train"><span className="flex items-center gap-2"><Train /> Train</span></SelectItem><SelectItem value="bus"><span className="flex items-center gap-2"><Bus /> Bus</span></SelectItem></SelectContent>
                </Select>
                {editTransportType && <Input placeholder={`e.g., UA123`} value={editTransportNumber} onChange={(e) => setEditTransportNumber(e.target.value)} />}
                </div>
            </div>
             <div className="text-center text-xl font-bold text-foreground py-1 h-10 flex items-center justify-center gap-1">
                <BadgeDollarSign /> Fare: {isCalculatingEditFare ? <Loader2 className="animate-spin" /> : editFare !== null ? `$${(editFare + editDayOfFee + rescheduleFee).toFixed(2)}` : "--"}
              </div>
              {/* Always show fee breakdown for edit dialog */}
              <div className="text-xs text-muted-foreground text-center mb-2">
                <div>Fare breakdown:</div>
                <ul className="list-disc ml-4 text-left inline-block">
                  <li>Base fare: ${editFare?.toFixed(2) ?? "--"}</li>
                  {editDayOfFee > 0 && <li>Day-of-scheduling fee: ${editDayOfFee}</li>}
                  {rescheduleFee > 0 && <li>Reschedule fee: ${rescheduleFee}</li>}
                  <li className="font-semibold">Total: {editFare !== null ? (editFare + editDayOfFee + rescheduleFee).toFixed(2) : "--"}</li>
                </ul>
              </div>
              {/* Error message for invalid date/time in edit dialog */}
              {editDateTimeError && (
                <div className="text-xs text-red-500 text-center mb-2">
                  {editDateTimeError}
                </div>
              )}
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting || editFare === null || !!editDateTimeError}>{isSubmitting ? <Loader2 className="animate-spin" /> : <><Save className="mr-2" />Save Changes</>}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
