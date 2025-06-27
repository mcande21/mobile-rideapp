// --- Imports ---
import { useState, useEffect } from "react";
import { useRideStore } from "@/lib/store";
import { RideCard } from "@/components/RideCard";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Label } from "./ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "./ui/select";
import { Switch } from "./ui/switch";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import {
  Car, Loader2, Calendar as CalendarIcon, Plane, Train, Bus, BadgeDollarSign, Edit, Save, Clock as ClockIcon
} from "lucide-react";
import type { Direction, TransportType, Ride } from "@/lib/types";
import { useForm } from "react-hook-form";
import { Autocomplete } from "./Autocomplete";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { calculateTripFare, isTransportLocation, calculateTransportRoundTripFare } from "@/lib/fare";
import { getTotalFare } from "../lib/types";

// --- Constants & Types ---
const rideFormSchema = z.object({
  pickup: z.string().min(1, "Pickup location is required"),
  dropoff: z.string().min(1, "Drop-off location is required"),
});
type RideFormData = z.infer<typeof rideFormSchema>;

// --- Main Component ---
export function UserDashboard() {
  // --- Store & State ---
  const { rides, addRide, cancelRide, updateRide, rescheduleRide, currentUserProfile, cleanupOldDeniedRides } = useRideStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // --- Form State ---
  const form = useForm<RideFormData>({ resolver: zodResolver(rideFormSchema), defaultValues: { pickup: "", dropoff: "" } });
  const editForm = useForm<RideFormData>({ resolver: zodResolver(rideFormSchema), defaultValues: { pickup: "", dropoff: "" } });

  // --- UI State ---
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);

  // --- Watchers ---
  const pickup = form.watch("pickup");
  const dropoff = form.watch("dropoff");
  const editPickup = editForm.watch("pickup");
  const editDropoff = editForm.watch("dropoff");

  // --- Ride Form State ---
  // New: error state for invalid date/time
  const [dateTimeError, setDateTimeError] = useState<string>("");
  const [editDateTimeError, setEditDateTimeError] = useState<string>("");

  // New: error state for directions API
  const [directionsError, setDirectionsError] = useState<string>("");

  // New ride form state
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [returnDate, setReturnDate] = useState<Date | undefined>();
  const [returnTime, setReturnTime] = useState("");
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [direction, setDirection] = useState<Direction>("departure");
  const [transportType, setTransportType] = useState<TransportType | "">("");
  const [transportNumber, setTransportNumber] = useState("");
  // For round trip transport details
  const [returnDirection, setReturnDirection] = useState<Direction>("departure");
  const [returnTransportType, setReturnTransportType] = useState<TransportType | "">("");
  const [returnTransportNumber, setReturnTransportNumber] = useState("");
  const [fare, setFare] = useState<number | null>(null);
  const [fareBreakdown, setFareBreakdown] = useState<{ outbound: number; return: number } | null>(null);
  const [isCalculatingFare, setIsCalculatingFare] = useState(false);

  // --- Stops Along the Way ---
  const [stops, setStops] = useState<string[]>([]);
  const handleAddStop = () => setStops([...stops, ""]);
  const handleRemoveStop = (idx: number) => setStops(stops.filter((_, i) => i !== idx));
  const handleStopChange = (idx: number, value: string) => {
    setStops(stops.map((stop, i) => (i === idx ? value : stop)));
  };

  // Auto-show transport section when transport locations are detected
  const shouldShowTransportSection = isTransportLocation(pickup) || isTransportLocation(dropoff);

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
    if (isRoundTrip) {
      if (shouldShowTransportSection) {
        // Enhanced validation for transport locations (requires separate dates)
        if (date && time && returnDate && returnTime) {
          const [h1, m1] = time.split(":").map(Number);
          const [h2, m2] = returnTime.split(":").map(Number);
          
          const departureDateTime = new Date(date);
          departureDateTime.setHours(h1, m1, 0, 0);
          
          const returnDateTime = new Date(returnDate);
          returnDateTime.setHours(h2, m2, 0, 0);
          
          // Check if return is after departure
          if (returnDateTime <= departureDateTime) {
            setReturnTimeError("Return date/time must be after departure date/time.");
          } else {
            setReturnTimeError("");
          }
        } else {
          setReturnTimeError("");
        }
      } else {
        // Simple validation for regular locations (same day, 10-hour limit)
        if (time && returnTime) {
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
      }
    } else {
      setReturnTimeError("");
    }
  }, [isRoundTrip, shouldShowTransportSection, date, time, returnDate, returnTime]);

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
    // Cleanup old denied rides when component mounts
    cleanupOldDeniedRides().catch(console.error);
  }, [cleanupOldDeniedRides]);

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

          // Check if this is a transport location round trip
          const isTransportTrip = isTransportLocation(pickup) || isTransportLocation(dropoff);
          
          if (isRoundTrip && isTransportTrip && returnDate && returnTime) {
            // For transport round trips, calculate as two separate one-way trips
            const [returnHours, returnMinutes] = returnTime.split(":").map(Number);
            const returnDateTime = new Date(returnDate);
            returnDateTime.setHours(returnHours, returnMinutes, 0, 0);
            
            const breakdown = await calculateTransportRoundTripFare(
              pickup,
              dropoff,
              combinedDateTime,
              returnDateTime,
              stops // Pass stops/intermediates
            );
            
            setFare(breakdown.total);
            setFareBreakdown({ outbound: breakdown.outbound, return: breakdown.return });
          } else {
            // Regular trip calculation
            const calculatedFare = await calculateTripFare(
              pickup,
              dropoff,
              combinedDateTime,
              isRoundTrip,
              stops // Pass stops/intermediates
            );
            setFare(calculatedFare);
            setFareBreakdown(null);
          }
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
          setFareBreakdown(null);
        } finally {
          setIsCalculatingFare(false);
        }
      } else {
        setFare(null);
        setFareBreakdown(null);
        setDirectionsError("");
      }
    };
    const handler = setTimeout(calculate, 500);
    return () => clearTimeout(handler);
  }, [pickup, dropoff, date, time, isRoundTrip, returnDate, returnTime, stops]);

  // Fare calculation for editing ride
  useEffect(() => {
    // Only recalculate fare if the current user is a driver
    if (!currentUserProfile || currentUserProfile.role !== 'driver') return;
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
            editIsRoundTrip,
            stops // Pass stops/intermediates for edit as well
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
  }, [editPickup, editDropoff, editDate, editTime, editIsRoundTrip, stops, currentUserProfile]);

  // --- Enhanced validation for stops and transport details ---
  function validateRideForm(values: RideFormData) {
    // Validate pickup/dropoff (already handled by zod)
    // Validate stops: no empty stops
    if (stops.some((stop) => !stop.trim())) {
      setDirectionsError("Stops cannot be empty. Please fill in or remove empty stops.");
      return false;
    }
    // Validate date/time
    if (!date || !time) {
      setDateTimeError("Please select a date and time.");
      return false;
    }
    // Round trip: validate return time/date
    if (isRoundTrip) {
      if (shouldShowTransportSection) {
        if (!returnDate || !returnTime) {
          setDateTimeError("Please select a return date and time.");
          return false;
        }
        // Return must be after departure
        const [h1, m1] = time.split(":").map(Number);
        const [h2, m2] = returnTime.split(":").map(Number);
        const departureDateTime = new Date(date);
        departureDateTime.setHours(h1, m1, 0, 0);
        const returnDateTime = new Date(returnDate);
        returnDateTime.setHours(h2, m2, 0, 0);
        if (returnDateTime <= departureDateTime) {
          setDateTimeError("Return date/time must be after departure.");
          return false;
        }
        // Transport details required if type selected
        if (transportType && (!transportNumber.trim() || !returnTransportNumber.trim())) {
          setDirectionsError("Please enter both outbound and return transport numbers.");
          return false;
        }
      } else {
        if (!returnTime) {
          setDateTimeError("Please select a return time.");
          return false;
        }
      }
    }
    setDateTimeError("");
    setDirectionsError("");
    return true;
  }

  const handleRequestRide = async (values: RideFormData) => {
    if (!validateRideForm(values)) return;
    if (date && time && fare !== null) {
      setIsSubmitting(true);
      try {
        const [hours, minutes] = time.split(":").map(Number);
        const combinedDateTime = new Date(date);
        combinedDateTime.setHours(hours, minutes, 0, 0);
        const dayFee = getDayOfSchedulingFee(combinedDateTime);
        
        // Check if this is a transport hub round trip (two separate bookings)
        const isTransportTrip = isTransportLocation(values.pickup) || isTransportLocation(values.dropoff);
        
        if (isRoundTrip && isTransportTrip && returnDate && returnTime && fareBreakdown) {
          // Create two separate ride bookings for transport hub round trips
          const [returnHours, returnMinutes] = returnTime.split(":").map(Number);
          const returnDateTime = new Date(returnDate);
          returnDateTime.setHours(returnHours, returnMinutes, 0, 0);
          const returnDayFee = getDayOfSchedulingFee(returnDateTime);
          
          // Outbound trip (pickup -> dropoff)
          await addRide(values.pickup, values.dropoff, fareBreakdown.outbound + dayFee, {
            dateTime: combinedDateTime.toISOString(),
            direction: "departure",
            isRoundTrip: false,
            transportType: transportType && transportNumber ? transportType : "",
            transportNumber: transportType && transportNumber ? transportNumber : "",
            tripLabel: "Outbound",
          }, stops);
          
          // Return trip (dropoff -> pickup) 
          await addRide(values.dropoff, values.pickup, fareBreakdown.return + returnDayFee, {
            dateTime: returnDateTime.toISOString(),
            direction: "arrival",
            isRoundTrip: false,
            transportType: transportType && returnTransportNumber ? transportType : "",
            transportNumber: transportType && returnTransportNumber ? returnTransportNumber : "",
            tripLabel: "Return",
          }, stops);
          
          toast({ 
            title: "Transport Trips Requested!", 
            description: "Two separate ride requests have been created - one outbound and one return trip." 
          });
        } else {
          // Regular single trip or non-transport round trip
          const totalFare = fare + dayFee;
          await addRide(values.pickup, values.dropoff, totalFare, {
            dateTime: combinedDateTime.toISOString(),
            direction: date && time ? direction : "departure",
            isRoundTrip,
            transportType: transportType && transportNumber ? transportType : "",
            transportNumber: transportType && transportNumber ? transportNumber : "",
            // Handle return time for regular round trips
            ...(isRoundTrip && !shouldShowTransportSection && returnTime ? { returnTime } : {}),
          }, stops);
          
          toast({ title: "Ride Requested!", description: "We are finding a driver for you." });
        }

        // Reset form
        form.reset();
        setDate(undefined); 
        setTime(""); 
        setReturnDate(undefined);
        setReturnTime(""); 
        setIsRoundTrip(false); 
        setDirection("departure"); 
        setTransportType(""); 
        setTransportNumber(""); 
        setReturnDirection("departure");
        setReturnTransportNumber("");
        setFare(null); 
        setFareBreakdown(null);
        setDayOfFee(0);
        setStops([]); // Reset stops
      } catch (error) {
        console.error("Error requesting ride:", error);
        toast({ title: "Error Requesting Ride", description: (typeof error === 'object' && error && 'message' in error) ? (error as any).message : "There was a problem submitting your request.", variant: "destructive" });
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
    setEditFare(getTotalFare(ride.fees));
    setIsEditDialogOpen(true);
  };

  // --- Enhanced validation for edit ride form ---
  function validateEditRideForm(values: RideFormData) {
    // Validate pickup/dropoff (already handled by zod)
    // Validate date/time
    if (!editDate || !editTime) {
      setEditDateTimeError("Please select a date and time.");
      return false;
    }
    // Round trip: validate return time
    if (editIsRoundTrip) {
      if (!editReturnTime) {
        setEditDateTimeError("Please select a return time.");
        return false;
      }
      // Return time must be within 10 hours of pickup
      const [h1, m1] = editTime.split(":").map(Number);
      const [h2, m2] = editReturnTime.split(":").map(Number);
      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff < 0) diff += 24 * 60; // handle overnight return
      if (diff > 600) {
        setEditDateTimeError("Return time must be within 10 hours of your pickup time.");
        return false;
      }
    }
    setEditDateTimeError("");
    return true;
  }

  // Reset edit dialog state on close
  useEffect(() => {
    if (!isEditDialogOpen) {
      setEditingRide(null);
      setEditDate(undefined);
      setEditTime("");
      setEditReturnTime("");
      setEditIsRoundTrip(false);
      setEditDirection("departure");
      setEditTransportType("");
      setEditTransportNumber("");
      setEditFare(null);
      setEditDateTimeError("");
      setEditDayOfFee(0);
      setRescheduleFee(0);
    }
  }, [isEditDialogOpen]);

  const handleUpdateRide = async (values: RideFormData) => {
    if (!validateEditRideForm(values)) return;
    if (editingRide && editDate && editTime && editFare !== null) {
      setIsSubmitting(true);
      try {
        // Combine date and time for newDateTime
        const [hours, minutes] = editTime.split(":").map(Number);
        const newDateTime = new Date(editDate);
        newDateTime.setHours(hours, minutes, 0, 0);

        // If a reschedule fee is required (e.g., rescheduleFee > 0)
        if (rescheduleFee > 0) {
          await rescheduleRide(
            editingRide.id,
            newDateTime.toISOString(),
            rescheduleFee,
            editFare + rescheduleFee // newFare = fare + fee
          );
          toast({ title: "Ride rescheduled with fee applied." });
        } else {
          // Only include fare if user is a driver
          const isDriver = currentUserProfile?.role === 'driver';
          await updateRide(
            editingRide.id,
            values.pickup,
            values.dropoff,
            isDriver ? editFare : getTotalFare(editingRide.fees),
            {
              dateTime: newDateTime.toISOString(),
              transportType: editTransportType,
              transportNumber: editTransportNumber,
              direction: editDirection,
              isRoundTrip: editIsRoundTrip,
              returnTime: editReturnTime,
            },
            stops
          );
          toast({ title: "Ride updated." });
        }
        setIsEditDialogOpen(false);
      } catch (error) {
        toast({ title: "Failed to update ride", description: String(error), variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCancelRide = async (id: string) => {
    try {
      const isLateCancellation = await cancelRide(id);
      
      if (isLateCancellation) {
        toast({ 
          title: "Ride Cancelled", 
          description: "Your ride has been cancelled. Rides cancelled within 24 hours are subject to a full price charge.", 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Ride Cancelled", 
          description: "Your ride has been successfully cancelled.", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not cancel the ride.", variant: "destructive" });
    }
  };
  
  // Defensive rendering for rides
  const userRides = rides.filter((ride) => ride.user?.id === currentUserProfile?.id);
  const pendingRides = userRides.filter((ride) => ride.status === "pending");
  const scheduledRides = userRides
    .filter((ride) => 
      ride.status === "accepted" || (ride.status === "cancelled" && ride.cancellationFeeApplied)
    )
    .sort((a, b) => new Date(a.dateTime || 0).getTime() - new Date(b.dateTime || 0).getTime());
  const completedRides = userRides.filter((ride) => {
    if (ride.status !== "completed") return false;
    if (!ride.dateTime) return true;
    const rideDate = new Date(ride.dateTime);
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    return rideDate >= twoWeeksAgo;
  });
  const deniedRides = userRides.filter((ride) => ride.status === "denied");

  // --- Render ---
  if (!isClient) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <div className="container mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 xl:col-span-2 flex justify-center"> {/* Let the card take up more columns and center on large screens */}
          <Card className="max-w-md min-w-0 flex-grow mx-auto lg:mx-0"> {/* Set max width smaller and min width to 0 */}
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Request a Ride</CardTitle>
              <CardDescription className="text-sm">Enter your pickup and drop-off locations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <form onSubmit={form.handleSubmit(handleRequestRide)} className="space-y-6">
                <div className="space-y-3">
                  <div className="w-full">
                    <Autocomplete control={form.control} name="pickup" label="Pickup Location" placeholder="e.g., 123 Main St" />
                  </div>
                  <div className="w-full">
                    <Autocomplete control={form.control} name="dropoff" label="Drop-off Location" placeholder="e.g., Anytown Airport" />
                  </div>
                </div>
                {/* Stops Along the Way */}
                <div className="space-y-2">
                  <Label>Stops Along the Way (optional)</Label>
                  <div className="flex flex-col gap-2">
                    {stops.map((stop, idx) => (
                      <div key={idx} className="flex gap-2 items-center w-full">
                        <div className="flex-1 min-w-0">
                          <div className="w-full">
                            <Autocomplete
                              value={stop}
                              onChange={value => handleStopChange(idx, value)}
                              name={`stop-${idx}`}
                              label={``}
                              placeholder={`Stop #${idx + 1}`}
                            />
                          </div>
                        </div>
                        <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveStop(idx)}>
                          &times;
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" onClick={handleAddStop} className="w-full sm:w-auto">
                    + Add Stop
                  </Button>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label htmlFor="date">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}> <CalendarIcon className="mr-2 h-4 w-4" />{date ? format(date, "PPP") : <span>Pick a date</span>}</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2 w-full md:w-40">
                    <Label htmlFor="time">Time</Label>
                    <div className="relative w-full">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <ClockIcon className="h-4 w-4" />
                      </span>
                      <Input
                        id="time"
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        required
                        className="w-full pl-8"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between pt-1 gap-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="round-trip" checked={isRoundTrip} onCheckedChange={setIsRoundTrip} />
                    <Label htmlFor="round-trip">Round Trip</Label>
                  </div>
                  {/* Simple Round Trip Return Time - Aligned to the right */}
                  {isRoundTrip && !shouldShowTransportSection && (
                    <div className="flex items-center space-x-1 ml-0 sm:ml-2 w-full sm:w-auto">
                      <Label htmlFor="simple-return-time" className="text-sm whitespace-nowrap">Return:</Label>
                      <Input
                        id="simple-return-time"
                        type="time"
                        value={returnTime}
                        onChange={e => setReturnTime(e.target.value)}
                        required
                        min={time}
                        className="w-full sm:w-28"
                      />
                    </div>
                  )}
                </div>
                {/* Simple Round Trip validation message */}
                {isRoundTrip && !shouldShowTransportSection && (
                  <div className={`text-xs ${returnTimeError ? "text-red-500" : "text-muted-foreground"}`}>
                    Return time must be within 10 hours of your initial time.
                  </div>
                )}
                {/* Enhanced Round Trip for Transport Locations */}
                {isRoundTrip && shouldShowTransportSection && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="return-date">Return Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button id="return-date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !returnDate && "text-muted-foreground")}> <CalendarIcon className="mr-2 h-4 w-4" />{returnDate ? format(returnDate, "MMM d") : <span>Date</span>}</Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={returnDate} onSelect={setReturnDate} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="return-time">Return Time</Label>
                        <Input 
                          id="return-time" 
                          type="time" 
                          value={returnTime} 
                          onChange={(e) => setReturnTime(e.target.value)} 
                          required 
                        />
                      </div>
                    </div>
                    {returnTimeError && (
                      <div className="text-xs text-red-500">
                        {returnTimeError}
                      </div>
                    )}
                  </div>
                )}

                {/* Transport Details Section - Shows automatically for transport locations */}
                {shouldShowTransportSection && (
                  <div className="space-y-2">
                    <Label>Transport Details</Label>
                    <div className="p-4 border rounded-lg space-y-4">
                      <Select onValueChange={(value) => setTransportType(value as TransportType)} value={transportType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select transport type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flight">
                            <span className="flex items-center gap-2"><Plane className="h-4 w-4" /> Flight</span>
                          </SelectItem>
                          <SelectItem value="train">
                            <span className="flex items-center gap-2"><Train className="h-4 w-4" /> Train</span>
                          </SelectItem>
                          <SelectItem value="bus">
                            <span className="flex items-center gap-2"><Bus className="h-4 w-4" /> Bus</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">
                            {date && time ? `${format(date, "PPP")}` : "Departure"}
                          </Label>
                          <div className="text-xs text-muted-foreground">
                            {isRoundTrip ? "Outbound" : "Transport Details"}
                          </div>
                        </div>
                        <Input 
                          placeholder={`e.g., ${transportType === 'flight' ? 'UA123' : transportType === 'train' ? 'Train 123' : transportType === 'bus' ? 'Bus 123' : 'Flight/Train/Bus Number'}`} 
                          value={transportNumber} 
                          onChange={(e) => setTransportNumber(e.target.value)} 
                        />
                      </div>

                      {/* Return Transport Details */}
                      {isRoundTrip && (
                        <div className="space-y-4 pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">
                              {returnDate && returnTime ? `${format(returnDate, "PPP")}` : "Arrival"}
                            </Label>
                            <div className="text-xs text-muted-foreground">
                              Return
                            </div>
                          </div>
                          <Input 
                            placeholder={`e.g., ${transportType === 'flight' ? 'UA456' : transportType === 'train' ? 'Train 456' : transportType === 'bus' ? 'Bus 456' : 'Return Flight/Train/Bus Number'}`} 
                            value={returnTransportNumber} 
                            onChange={(e) => setReturnTransportNumber(e.target.value)} 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="text-center text-xl font-bold text-foreground py-1 h-10 flex items-center justify-center gap-1">
                  <BadgeDollarSign /> Fare: {isCalculatingFare ? <Loader2 className="animate-spin" /> : fare !== null ? `$${(fare + dayOfFee).toFixed(2)}` : "--"}
                </div>
                {/* Always show fee breakdown for new ride */}
                <div className="text-xs text-muted-foreground text-center mb-1">
                  <div style={{ marginBottom: 2 }}>Fare breakdown:</div>
                  <ul className="list-disc ml-4 text-left inline-block">
                    {fareBreakdown ? (
                      <>
                        <li>Outbound trip: ${fareBreakdown.outbound.toFixed(2)}</li>
                        <li>Return trip: ${fareBreakdown.return.toFixed(2)}</li>
                        <li>Subtotal: ${fare?.toFixed(2) ?? "--"}</li>
                      </>
                    ) : (
                      <li>Base fare: ${fare?.toFixed(2) ?? "--"}</li>
                    )}
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
                <Button 
                  type="submit" 
                  className="w-full transition-all" 
                  disabled={
                    !date || 
                    !time || 
                    (isRoundTrip && shouldShowTransportSection && (!returnDate || !returnTime)) ||
                    (isRoundTrip && !shouldShowTransportSection && !returnTime) ||
                    isSubmitting || 
                    fare === null || 
                    !!dateTimeError || 
                    !!returnTimeError
                  }
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><Car className="mr-2" />Request Ride</>}
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
                    <Button variant="outline" size="icon" onClick={() => handleEditRide(ride)}><Edit className="h-4 w-4" /><span className="sr-only">Edit Ride</span></Button>
                    <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive">Cancel Ride</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle><AlertDialogDescription>Cancellations within 24 hours of ride will be charged full price of ride. (No cancellation fee if ride is cancelled with 24hrs notice)</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Keep Ride</AlertDialogCancel><AlertDialogAction onClick={() => handleCancelRide(ride.id)}>Confirm Cancellation</AlertDialogAction></AlertDialogFooter>
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
                    className="ml-2 w-24"
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
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Transport Details</Label>
                    <div className="text-xs text-muted-foreground">
                      {editDate && editTime ? `${format(editDate, "MMM d")} at ${editTime}` : "Departure"}
                    </div>
                  </div>
                  <Select onValueChange={(value) => setEditTransportType(value as TransportType)} value={editTransportType}>
                      <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                      <SelectContent><SelectItem value="flight"><span className="flex items-center gap-2"><Plane /> Flight</span></SelectItem><SelectItem value="train"><span className="flex items-center gap-2"><Train /> Train</span></SelectItem><SelectItem value="bus"><span className="flex items-center gap-2"><Bus /> Bus</span></SelectItem></SelectContent>
                  </Select>
                  {editTransportType && <Input placeholder={`e.g., UA123`} value={editTransportNumber} onChange={(e) => setEditTransportNumber(e.target.value)} />}
                </div>
            </div>
             <div className="text-center text-xl font-bold text-foreground py-1 h-10 flex items-center justify-center gap-1">
                <BadgeDollarSign /> Fare: ${editFare?.toFixed(2)}
              </div>
              {rescheduleFee > 0 && (
                <div className="text-center text-sm text-orange-600 font-semibold">
                  Reschedule Fee: ${rescheduleFee.toFixed(2)} (applied on save)
                  <br />
                  <span className="text-xs text-muted-foreground">New Total: ${(editFare! + rescheduleFee).toFixed(2)}</span>
                </div>
              )}
              {/* Always show fee breakdown for edit dialog */}
              <div className="text-xs text-muted-foreground text-center mb-2">
                <div>Fare breakdown:</div>
                <ul className="list-disc ml-4 text-left inline-block">
                  {editingRide && editingRide.fees && (
                    <>
                      <li>Base fare: ${editingRide.fees.base?.toFixed(2) ?? "--"}</li>
                      {editingRide.fees.reschedule && editingRide.fees.reschedule > 0 && (
                        <li>Reschedule fee: ${editingRide.fees.reschedule.toFixed(2)}</li>
                      )}
                      {editingRide.fees.day_of && editingRide.fees.day_of > 0 && (
                        <li>Day-of-scheduling fee: ${editingRide.fees.day_of.toFixed(2)}</li>
                      )}
                      {editingRide.fees.driver_addon && editingRide.fees.driver_addon > 0 && (
                        <li>Driver add-on: ${editingRide.fees.driver_addon.toFixed(2)}</li>
                      )}
                      {/* Show any future/unknown fees */}
                      {Object.entries(editingRide.fees).map(([key, value]) => (
                        ["base", "reschedule", "day_of", "driver_addon"].includes(key) || !value || value <= 0 ? null : (
                          <li key={key}>{key.replace(/_/g, ' ')}: ${value.toFixed(2)}</li>
                        )
                      ))}
                      <li className="font-semibold">Total: {editingRide && editingRide.fees ? Object.values(editingRide.fees).reduce((sum: number, v) => sum + (typeof v === 'number' ? v : 0), 0).toFixed(2) : "--"}</li>
                    </>
                  )}
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
