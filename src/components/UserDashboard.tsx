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

  // New ride form state
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [returnDate, setReturnDate] = useState<Date | undefined>();
  const [returnTime, setReturnTime] = useState("");
  const [direction, setDirection] = useState<Direction>("departure");
  const [transportType, setTransportType] = useState<TransportType | "">("");
  const [transportNumber, setTransportNumber] = useState("");
  const [fare, setFare] = useState<number | null>(null);
  const [isCalculatingFare, setIsCalculatingFare] = useState(false);

  // Edit ride form state
  const [editDate, setEditDate] = useState<Date | undefined>();
  const [editTime, setEditTime] = useState("");
  const [editIsRoundTrip, setEditIsRoundTrip] = useState(false);
  const [editReturnDate, setEditReturnDate] = useState<Date | undefined>();
  const [editReturnTime, setEditReturnTime] = useState("");
  const [editDirection, setEditDirection] = useState<Direction>("departure");
  const [editTransportType, setEditTransportType] = useState<
    TransportType | ""
  >("");
  const [editTransportNumber, setEditTransportNumber] = useState("");
  const [editFare, setEditFare] = useState<number | null>(null);
  const [isCalculatingEditFare, setIsCalculatingEditFare] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const pickup = form.watch("pickup");
  const dropoff = form.watch("dropoff");

  const editPickup = editForm.watch("pickup");
  const editDropoff = editForm.watch("dropoff");

  // Fare calculation for new ride
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

        let returnDateTimeStr: string | undefined;
        if (isRoundTrip && returnDate && returnTime) {
          const [returnHours, returnMinutes] = returnTime.split(":").map(Number);
          const combinedReturnDateTime = new Date(returnDate);
          combinedReturnDateTime.setHours(returnHours, returnMinutes, 0, 0);
          returnDateTimeStr = combinedReturnDateTime.toISOString();
        }

        await addRide(values.pickup, values.dropoff, fare, {
          dateTime: combinedDateTime.toISOString(),
          direction,
          isRoundTrip,
          returnDateTime: returnDateTimeStr,
          transportType: transportType && transportNumber ? transportType : "",
          transportNumber: transportType && transportNumber ? transportNumber : "",
        });

        toast({ title: "Ride Requested!", description: "We are finding a driver for you." });
        form.reset();
        setDate(undefined); setTime(""); setIsRoundTrip(false); setReturnDate(undefined); setReturnTime(""); setDirection("departure"); setTransportType(""); setTransportNumber(""); setFare(null);
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
    setEditIsRoundTrip(ride.isRoundTrip || false);
    if (ride.isRoundTrip && ride.returnDateTime) {
      const returnDate = parseISO(ride.returnDateTime);
      setEditReturnDate(returnDate);
      setEditReturnTime(format(returnDate, "HH:mm"));
    } else {
      setEditReturnDate(undefined);
      setEditReturnTime("");
    }
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

        let returnDateTimeStr: string | undefined;
        if (editIsRoundTrip && editReturnDate && editReturnTime) {
          const [returnHours, returnMinutes] = editReturnTime.split(":").map(Number);
          const combinedReturnDateTime = new Date(editReturnDate);
          combinedReturnDateTime.setHours(returnHours, returnMinutes, 0, 0);
          returnDateTimeStr = combinedReturnDateTime.toISOString();
        }

        await updateRide(editingRide.id, values.pickup, values.dropoff, editFare, {
          dateTime: combinedDateTime.toISOString(),
          direction: editDirection,
          isRoundTrip: editIsRoundTrip,
          returnDateTime: returnDateTimeStr,
          transportType: editTransportType && editTransportNumber ? editTransportType : "",
          transportNumber: editTransportType && editTransportNumber ? editTransportNumber : "",
        });

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

  const handleCancelRide = async (id: string) => {
    try {
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
                <div className="flex items-center space-x-2 pt-2"><Switch id="round-trip" checked={isRoundTrip} onCheckedChange={setIsRoundTrip} /><Label htmlFor="round-trip">Round Trip</Label></div>
                {isRoundTrip && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="return-date">Return Date</Label><Popover><PopoverTrigger asChild><Button id="return-date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !returnDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{returnDate ? format(returnDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={returnDate} onSelect={setReturnDate} initialFocus /></PopoverContent></Popover></div>
                    <div className="space-y-2"><Label htmlFor="return-time">Return Time</Label><Input id="return-time" type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} required={isRoundTrip} /></div>
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
                <div className="text-center text-xl font-bold text-foreground py-2 h-12 flex items-center justify-center gap-2"><BadgeDollarSign /> Fare: {isCalculatingFare ? <Loader2 className="animate-spin" /> : fare !== null ? `$${fare.toFixed(2)}` : "--"}</div>
                <Button type="submit" className="w-full transition-all" disabled={!date || !time || isSubmitting || fare === null}>{isSubmitting ? <Loader2 className="animate-spin" /> : <><Car className="mr-2" />Request Ride</>}</Button>
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
                {pendingRides.map((ride) => <RideCard key={ride.id} ride={ride} />)}
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
            ) : <p className="text-muted-foreground">You have no completed rides.</p>}
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
            <div className="flex items-center space-x-2 pt-2"><Switch id="edit-round-trip" checked={editIsRoundTrip} onCheckedChange={setEditIsRoundTrip} /><Label htmlFor="edit-round-trip">Round Trip</Label></div>
            {editIsRoundTrip && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="edit-return-date">Return Date</Label><Popover><PopoverTrigger asChild><Button id="edit-return-date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !editReturnDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{editReturnDate ? format(editReturnDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={editReturnDate} onSelect={setEditReturnDate} initialFocus /></PopoverContent></Popover></div>
                <div className="space-y-2"><Label htmlFor="edit-return-time">Return Time</Label><Input id="edit-return-time" type="time" value={editReturnTime} onChange={(e) => setEditReturnTime(e.target.value)} required={editIsRoundTrip} /></div>
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
             <div className="text-center text-xl font-bold text-foreground py-2 h-12 flex items-center justify-center gap-2"><BadgeDollarSign /> Fare: {isCalculatingEditFare ? <Loader2 className="animate-spin" /> : editFare !== null ? `$${editFare.toFixed(2)}` : "--"}</div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting || editFare === null}>{isSubmitting ? <Loader2 className="animate-spin" /> : <><Save className="mr-2" />Save Changes</>}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
