import { useState, type ReactNode, useEffect, useMemo } from "react";
import {
  MapPin,
  CircleDollarSign,
  CalendarDays,
  Clock,
  Plane,
  Train,
  Bus,
  Timer,
  Edit,
  Check,
  Phone,
  UserRound,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Undo2,
  MessageSquare,
} from "lucide-react";
import type { Ride, TransportType } from "@/lib/types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useRideStore } from "@/lib/store";
import { Textarea } from "./ui/textarea";
import { getAvatarUrl, getAvatarBackgroundColor, getUserInitials } from "@/lib/utils";
import { GoogleCalendarButton } from "./GoogleCalendarButton";

interface FlightData {
  flight_status: string;
  departure: {
    airport: string;
    scheduled: string;
    actual?: string;
    timezone?: string;
  };
  arrival: {
    airport: string;
    scheduled: string;
    actual?: string;
    timezone?: string;
  };
}

interface RideCardProps {
  ride: Ride;
  children?: ReactNode;
  onUpdateFare?: (rideId: string, fare: number) => void;
  showPhoneNumber?: boolean;
}

const TransportIcon = ({ type }: { type: TransportType | undefined }) => {
  const className = "h-5 w-5 text-muted-foreground";
  if (type === "flight") return <Plane className={className} />;
  if (type === "train") return <Train className={className} />;
  if (type === "bus") return <Bus className={className} />;
  return null;
};

const formatDuration = (minutes: number) => {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (remainingMinutes > 0) {
    parts.push(`${remainingMinutes}m`);
  }
  return parts.join(" ");
};

const formatTimeToAMPM = (isoString: string | undefined) => {
  if (!isoString) return "N/A";
  const timePart = isoString.match(/T(\d{2}:\d{2})/)?.[1];
  if (!timePart) return "N/A";

  let [hours, minutes] = timePart.split(":");
  let h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h ? h : 12; // the hour '0' should be '12'
  return `${h}:${minutes} ${ampm}`;
};

// Utility: sanitize comment input
function sanitizeComment(text: string): string {
  // Remove control chars except common whitespace (tab, newline)
  let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
  // Remove invisible Unicode (zero-width, etc)
  sanitized = sanitized.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "");
  // Limit length
  if (sanitized.length > 500) sanitized = sanitized.slice(0, 500);
  return sanitized;
}

export function RideCard({
  ride,
  children,
  onUpdateFare,
  showPhoneNumber,
}: RideCardProps) {
  const { markAsPaid, currentUserProfile, addComment } = useRideStore();
  const [isEditingFare, setIsEditingFare] = useState(false);
  const [newFare, setNewFare] = useState(
    ride.fees && typeof ride.fees.base === 'number' ? parseFloat(ride.fees.base.toFixed(2)) : 0
  );
  const [fareError, setFareError] = useState<string>("");
  const [isUpdatingFare, setIsUpdatingFare] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string>("");
  const [venmoLoading, setVenmoLoading] = useState(false);
  const [rescheduleFee, setRescheduleFee] = useState<number | null>(null);
  const [dayOfFee, setDayOfFee] = useState<number | null>(null);
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);
  const [flightData, setFlightData] = useState<FlightData | null>(null);
  const [isLoadingFlightData, setIsLoadingFlightData] = useState(false);
  const [showFlightDetails, setShowFlightDetails] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  // Error and loading state for comment posting and fare update
  const [isSavingFare, setIsSavingFare] = useState(false);

  const isUserRide = currentUserProfile?.id === ride.user.id;
  const isDriver = currentUserProfile?.id === ride.driver?.id;

  // Venmo button: always visible to user (rider)
  const showVenmoButton = isUserRide && !ride.isPaid;
  // Mark as Paid button: only visible to driver
  const showMarkAsPaidButton = isDriver && !ride.isPaid;

  const handlePayWithVenmo = async () => {
    setVenmoLoading(true);
    try {
      const venmoUsername = ride.driver?.venmoUsername || "Alex-Meisler";
      const note = `${ride.user?.name || "User"}: From ${ride.pickup || "?"} To ${ride.dropoff || "?"} On ${ride.dateTime ? format(new Date(ride.dateTime), "MMM d, yyyy") : "?"}`;
      // Use total fare from fees if available, else fallback to 0
      let totalFare = 0;
      if (ride.fees) {
        totalFare = Object.values(ride.fees).reduce((sum: number, v) => sum + (typeof v === 'number' ? v : 0), 0);
      }
      const venmoUrl = `https://venmo.com/u/${venmoUsername}?txn=pay&amount=${totalFare.toFixed(2)}&note=${encodeURIComponent(note)}`;
      window.open(venmoUrl, "_blank");
      // Do NOT mark as paid here
    } catch (error) {
      alert("Failed to open Venmo. Please try again.");
    } finally {
      setVenmoLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      await markAsPaid(ride.id);
    } catch (error) {
      alert("Failed to mark as paid. Please try again.");
    }
  };

  const fetchFlightData = async () => {
    if (ride.transportType === "flight" && ride.transportNumber && ride.status === "accepted") {
      setIsLoadingFlightData(true);
      try {
        const response = await fetch(
          `/api/flight?flightNumber=${ride.transportNumber}`
        );
        if (response.ok) {
          const data = await response.json();
          setFlightData(data);
        } else {
          console.error("Failed to fetch flight data");
        }
      } catch (error) {
        console.error("Error fetching flight data:", error);
      } finally {
        setIsLoadingFlightData(false);
      }
    }
  };

  useEffect(() => {
    fetchFlightData();
  }, [ride.transportType, ride.transportNumber, ride.status]);

  // Helper: calculate day-of-scheduling fee (client-side, matches fare.ts logic)
  const getDayOfSchedulingFee = (rideDate: string) => {
    const now = new Date();
    const rideTime = new Date(rideDate);
    if (
      now.getFullYear() === rideTime.getFullYear() &&
      now.getMonth() === rideTime.getMonth() &&
      now.getDate() === rideTime.getDate()
    ) {
      const currentHour = now.getHours();
      if (currentHour >= 7 && currentHour < 19) return 20;
      if (currentHour >= 19 || currentHour < 1) return 30;
    }
    return 0;
  };

  // Fetch reschedule fee when editing fare
  useEffect(() => {
    if (isEditingFare) {
      // Only fetch if editing and ride has been scheduled before
      fetch("/api/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupLocation: ride.pickup,
          dropoffLocation: ride.dropoff,
          oldTime: ride.dateTime,
          newTime: ride.dateTime, // For now, assume same time; update as needed
          mileageMeters: ride.duration ? ride.duration * 1609.34 / 60 : 0, // rough estimate
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setRescheduleFee(data.fee || 0);
          setShowFeeBreakdown(true);
        })
        .catch(() => {
          setRescheduleFee(null);
        });
      setDayOfFee(getDayOfSchedulingFee(ride.dateTime));
    } else {
      setShowFeeBreakdown(false);
    }
  }, [isEditingFare, ride.pickup, ride.dropoff, ride.dateTime, ride.duration]);

  // Show fee breakdown after editing
  const handleSaveFare = async () => {
    setFareError("");
    if (isUpdatingFare) return;
    if (!newFare || isNaN(newFare) || newFare <= 0) {
      setFareError("Fare must be a positive number.");
      return;
    }
    if (onUpdateFare) {
      setIsUpdatingFare(true);
      try {
        await onUpdateFare(ride.id, newFare);
        setIsEditingFare(false);
        setShowFeeBreakdown(true);
        setDayOfFee(getDayOfSchedulingFee(ride.dateTime));
      } catch (error) {
        setFareError("Failed to update fare. Please try again.");
      } finally {
        setIsUpdatingFare(false);
      }
    }
  };

  const handleAddComment = async () => {
    setCommentError("");
    if (isPostingComment) return;
    let sanitized = sanitizeComment(commentText);
    if (sanitized.trim() === "" || !currentUserProfile) {
      setCommentError("Comment cannot be empty or contain only invalid characters.");
      return;
    }
    setIsPostingComment(true);
    try {
      await addComment(ride.id, sanitized, {
        id: currentUserProfile.id,
        name: currentUserProfile.name,
        avatarUrl: currentUserProfile.avatarUrl,
      });
      setCommentText("");
      setShowComments(true);
    } catch (error) {
      setCommentError("Failed to add comment. Please try again.");
    } finally {
      setIsPostingComment(false);
    }
  };

  const getStatusVariant = (status: Ride["status"]) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "accepted":
        return "default";
      case "cancelled":
        return "destructive";
      case "completed":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Card className="w-full transition-all hover:shadow-md flex flex-col">
      <CardHeader>
        {/* Fine print for cancelled rides with fee applied */}
        {ride.status === "cancelled" && ride.cancellationFeeApplied && (
          <div className="text-xs text-red-600 font-semibold mb-2">
            Rides cancelled within 24 hours of scheduled time are subject to full price charge
          </div>
        )}
        <div className="flex justify-between items-start mb-2">
           <div className="flex items-center gap-2">
            {ride.status === "cancelled" && ride.cancellationFeeApplied && <Badge variant="destructive">CANCELLED</Badge>}
            {ride.isRevised && <Badge variant="destructive">REVISED</Badge>}
            {ride.isRoundTrip && <Badge variant="destructive">ROUND TRIP</Badge>}
           </div>
        </div>

        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3">
              <Avatar>
                {getAvatarUrl(ride.user) && (
                  <AvatarImage
                    src={getAvatarUrl(ride.user)}
                    alt={ride.user.name}
                  />
                )}
                <AvatarFallback 
                  style={{ backgroundColor: getAvatarBackgroundColor(ride.user) }}
                  className="text-white font-semibold relative overflow-hidden"
                >
                  {ride.user.customAvatar?.type === 'preset' ? (
                    <img 
                      src={`/patterns/${ride.user.customAvatar.value}.svg`}
                      alt="Avatar"
                      className="w-5 h-5 object-contain"
                    />
                  ) : (
                    getUserInitials(ride.user.name)
                  )}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-lg">{ride.user.name}</CardTitle>
            </div>
            {/* Move Mark as Paid button here, only for driver and not paid */}
            {showMarkAsPaidButton && (
              <Button
                onClick={handleMarkAsPaid}
                className="bg-green-500 hover:bg-green-600 text-white h-8 mt-2 w-fit"
                disabled={ride.isPaid}
              >
                Mark as Paid
              </Button>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {showVenmoButton && (
                <Button
                  onClick={handlePayWithVenmo}
                  className="bg-blue-500 hover:bg-blue-600 text-white h-8"
                  disabled={venmoLoading}
                >
                  {venmoLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    "Pay with Venmo"
                  )}
                </Button>
              )}
              {ride.isPaid && (
                <Badge className="bg-green-500 hover:bg-green-600">PAID</Badge>
              )}
              {ride.tripLabel && (
                <Badge 
                  variant="outline" 
                  className="bg-purple-50 text-purple-700 border-purple-200"
                >
                  {ride.tripLabel}
                </Badge>
              )}
              <Badge variant={getStatusVariant(ride.status)} className="capitalize">
                {ride.status}
              </Badge>
            </div>
            {ride.status === "accepted" && (
              <GoogleCalendarButton ride={ride} />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        {/* Pickup, Stops, Dropoff */}
        <div className="flex flex-col gap-0.5 text-sm">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <span className="font-semibold text-foreground">From:</span>
              <span className="text-muted-foreground ml-1">{ride.pickup}</span>
            </div>
          </div>
          {ride.stops && ride.stops.length > 0 && (
            <div className="flex flex-col items-start ml-8 mt-0.5">
              {ride.stops.map((stop, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="mx-1 text-lg leading-none text-muted-foreground" style={{fontWeight: 'bold', lineHeight: '1'}}>&#8942;</span>
                  <span className="text-xs">{stop}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-start gap-3 mt-0.5">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 invisible" />
            <div>
              <span className="font-semibold text-foreground">To:</span>
              <span className="text-muted-foreground ml-1">{ride.dropoff}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Fare:</span>
            {!isEditingFare ? (
              <>
                <span className="text-muted-foreground ml-2">
                  {ride.fees ? (
                    (() => {
                      // Always show total as sum of all fees, to two decimals
                      const total = Object.values(ride.fees).reduce((sum: number, v) => sum + (typeof v === 'number' ? v : 0), 0);
                      return `$${total.toFixed(2)}`;
                    })()
                  ) : (
                    `$--`
                  )}
                </span>
                {onUpdateFare && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => {
                      setNewFare(ride.fees && typeof ride.fees.base === 'number' ? parseFloat(ride.fees.base.toFixed(2)) : 0);
                      setIsEditingFare(true);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                    <span className="sr-only">Edit Fare</span>
                  </Button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground ml-2">$</span>
                <Input
                  type="number"
                  value={newFare}
                  onChange={(e) => setNewFare(parseFloat(parseFloat(e.target.value).toFixed(2)) || 0)}
                  className="h-8 w-24"
                  step="0.01"
                  min="0"
                  disabled={isUpdatingFare}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={handleSaveFare}
                  disabled={isUpdatingFare}
                >
                  {isUpdatingFare ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span className="sr-only">Save Fare</span>
                </Button>
                {fareError && (
                  <span className="text-xs text-red-500 ml-2">{fareError}</span>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Fee breakdown fine print */}
        {ride.fees && (
          <div className="text-xs text-muted-foreground mt-1 ml-8">
            <div>Fare breakdown:</div>
            <ul className="list-disc ml-4">
              <li>Base fare: ${ride.fees.base?.toFixed(2) ?? "--"}</li>
              {ride.fees.reschedule && ride.fees.reschedule > 0 && (
                <li>Reschedule fee: ${ride.fees.reschedule.toFixed(2)}</li>
              )}
              {ride.fees.day_of && ride.fees.day_of > 0 && (
                <li>Day-of-scheduling fee: ${ride.fees.day_of.toFixed(2)}</li>
              )}
              {ride.fees.driver_addon && ride.fees.driver_addon > 0 && (
                <li>Driver add-on: ${ride.fees.driver_addon.toFixed(2)}</li>
              )}
              {/* Show any future/unknown fees */}
              {Object.entries(ride.fees).map(([key, value]) => (
                ["base", "reschedule", "day_of", "driver_addon"].includes(key) || !value || value <= 0 ? null : (
                  <li key={key}>{key.replace(/_/g, ' ')}: ${value.toFixed(2)}</li>
                )
              ))}
              <li className="font-semibold">Total: {Object.values(ride.fees).reduce((sum: number, v) => sum + (typeof v === 'number' ? v : 0), 0).toFixed(2)}</li>
            </ul>
          </div>
        )}
        <div className="border-t pt-4 mt-4 space-y-4">
          {ride.dateTime && (
            <>
              <div className="flex items-center gap-3 text-sm">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <div>
                  <span className="font-semibold text-foreground">Date:</span>
                  <span className="text-muted-foreground ml-2">
                    {format(new Date(ride.dateTime), "PPP")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <span className="font-semibold text-foreground">Time:</span>
                  <span className={`text-muted-foreground ml-2`}>
                    {format(new Date(ride.dateTime), "p")}
                  </span>
                </div>
              </div>
            </>
          )}
          {ride.returnDateTime && (
            <>
              <div className="flex items-center gap-3 text-sm">
                <Undo2 className="h-5 w-5 text-muted-foreground" />
                 <div>
                  <span className="font-semibold text-foreground">Return:</span>
                  <span className="text-muted-foreground ml-2">
                    {format(new Date(ride.returnDateTime), "PPP, p")}
                  </span>
                </div>
              </div>
            </>
          )}
          {ride.isRoundTrip && ride.returnTime && (
            <div className="flex items-center gap-3 text-sm">
              <Undo2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <span className="font-semibold text-foreground">Return Time:</span>
                <span className="text-muted-foreground ml-2">{formatTimeToAMPM(`1970-01-01T${ride.returnTime}`)}</span>
              </div>
            </div>
          )}
          {ride.user.phoneNumber && showPhoneNumber && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <span className="font-semibold text-foreground">Phone:</span>
                <span className="text-muted-foreground ml-2">
                  {ride.user.phoneNumber}
                </span>
              </div>
            </div>
          )}
          {ride.duration && (
            <div className="flex items-center gap-3 text-sm">
              <Timer className="h-5 w-5 text-muted-foreground" />
              <div>
                <span className="font-semibold text-foreground">
                  Est. Duration:
                </span>
                <span className="text-muted-foreground ml-2">
                  {ride.stops && ride.stops.length > 0
                    ? formatDuration(ride.duration)
                    : ride.isRoundTrip
                      ? `${formatDuration(ride.duration)} / ${formatDuration(ride.duration)}`
                      : formatDuration(ride.duration)
                  }
                </span>
              </div>
            </div>
          )}
          {ride.transportType === "flight" && ride.transportNumber && (
            <div className="border-t pt-4 mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3 text-sm">
                  <TransportIcon type={ride.transportType} />
                  <div>
                    <span className="font-semibold text-foreground capitalize">
                      {ride.transportType}:
                    </span>
                    <p className="text-muted-foreground">
                      {ride.transportNumber} (
                      <span className="capitalize">{ride.direction}</span>)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={fetchFlightData}
                    disabled={isLoadingFlightData || ride.status !== "accepted"}
                    className="h-8 w-8"
                  >
                    {isLoadingFlightData ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="sr-only">Refresh flight data</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowFlightDetails(!showFlightDetails)}
                    className="h-8 w-8"
                  >
                    {showFlightDetails ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <span className="sr-only">Toggle flight details</span>
                  </Button>
                </div>
              </div>
              {showFlightDetails && flightData && (
                <div className="pl-8 space-y-2 text-xs text-muted-foreground">
                  <p>Status: {flightData.flight_status}</p>
                  {ride.direction === "departure" && (
                    <p>
                      Departure: {flightData.departure.airport} - Scheduled:{" "}
                      {formatTimeToAMPM(flightData.departure.scheduled)} - Actual:{" "}
                      {formatTimeToAMPM(flightData.departure.actual)}
                    </p>
                  )}
                  {ride.direction === "arrival" && (
                    <p>
                      Arrival: {flightData.arrival.airport} - Scheduled:{" "}
                      {formatTimeToAMPM(flightData.arrival.scheduled)} - Actual:{" "}
                      {formatTimeToAMPM(flightData.arrival.actual)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          {ride.transportType !== "flight" &&
            ride.transportType &&
            ride.transportNumber && (
              <div className="flex items-start gap-3 text-sm">
                <TransportIcon type={ride.transportType} />
                <div>
                  <span className="font-semibold text-foreground capitalize">
                    {ride.transportType}:
                  </span>
                  <p className="text-muted-foreground">
                    {ride.transportNumber} (
                    <span className="capitalize">{ride.direction}</span>)
                  </p>
                </div>
              </div>
            )}
        </div>
        {ride.comments && ride.comments.length > 0 && (
          <div className="border-t pt-4 mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <p className="font-semibold text-foreground">Comments</p>
            </div>
            <div className="space-y-2 pl-8">
              {ride.comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-2 text-sm">
                  <Avatar className="h-6 w-6">
                    {comment.user.avatarUrl ? (
                      <AvatarImage src={comment.user.avatarUrl} alt={comment.user.name} />
                    ) : null}
                    <AvatarFallback 
                      className="text-xs font-semibold bg-muted"
                    >
                      {getUserInitials(comment.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-semibold">{comment.user.name}</span>
                    <p className="text-muted-foreground">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Only show add comment section if ride is not completed */}
        {ride.status !== "completed" && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <p className="font-semibold text-foreground">Add a comment</p>
            </div>
            <div className="pl-8 pt-2 space-y-2">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Type your comment here..."
                disabled={isPostingComment}
              />
              <Button onClick={handleAddComment} size="sm" disabled={isPostingComment}>
                {isPostingComment ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Post Comment"}
              </Button>
              {commentError && <div className="text-xs text-red-500">{commentError}</div>}
            </div>
          </div>
        )}

        {ride.driver && (
          <div className="border-t pt-4 mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <UserRound className="h-5 w-5 text-muted-foreground" />
              <p className="font-semibold text-foreground">Your Driver</p>
            </div>
            <div className="flex items-center gap-3 pl-8">
              <Avatar className="h-9 w-9">
                {ride.driver && getAvatarUrl(ride.driver) ? (
                  <AvatarImage
                    src={getAvatarUrl(ride.driver)}
                    alt={ride.driver.name}
                  />
                ) : null}
                <AvatarFallback
                  style={{ backgroundColor: ride.driver ? getAvatarBackgroundColor(ride.driver) : undefined }}
                  className="text-white font-semibold relative overflow-hidden"
                >
                  {ride.driver && ride.driver.customAvatar?.type === 'preset' ? (
                    <img 
                      src={getAvatarUrl(ride.driver)}
                      alt="Avatar"
                      className="w-5 h-5 object-contain"
                    />
                  ) : (
                    ride.driver ? getUserInitials(ride.driver.name) : "?"
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{ride.driver.name}</p>
                {ride.driver.phoneNumber && (
                  <p className="text-muted-foreground text-sm">
                    {ride.driver.phoneNumber}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      {children && (
        <CardFooter className="flex justify-end gap-2">{children}</CardFooter>
      )}
    </Card>
  );
}
