import { useState, type ReactNode, useEffect } from "react";
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

export function RideCard({
  ride,
  children,
  onUpdateFare,
  showPhoneNumber,
}: RideCardProps) {
  const [isEditingFare, setIsEditingFare] = useState(false);
  const [newFare, setNewFare] = useState(ride.fare);
  const [flightData, setFlightData] = useState<FlightData | null>(null);
  const [isLoadingFlightData, setIsLoadingFlightData] = useState(false);
  const [showFlightDetails, setShowFlightDetails] = useState(false);

  const fetchFlightData = async () => {
    if (ride.transportType === "flight" && ride.transportNumber) {
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
  }, [ride.transportType, ride.transportNumber]);

  const handleSaveFare = () => {
    if (onUpdateFare) {
      onUpdateFare(ride.id, newFare);
      setIsEditingFare(false);
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
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage
                src={ride.user.avatarUrl}
                alt={ride.user.name}
              />
              <AvatarFallback>
                {ride.user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{ride.user.name}</CardTitle>
            </div>
          </div>
          <Badge variant={getStatusVariant(ride.status)} className="capitalize">
            {ride.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        <div className="flex items-start gap-3 text-sm">
          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <span className="font-semibold text-foreground">From:</span>
            <p className="text-muted-foreground">{ride.pickup}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <span className="font-semibold text-foreground">To:</span>
            <p className="text-muted-foreground">{ride.dropoff}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Fare:</span>
            {!isEditingFare ? (
              <>
                <span className="text-muted-foreground ml-2">
                  ${ride.fare.toFixed(2)}
                </span>
                {onUpdateFare && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => {
                      setNewFare(ride.fare);
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
                  onChange={(e) =>
                    setNewFare(parseFloat(e.target.value) || 0)
                  }
                  className="h-8 w-24"
                  step="0.01"
                  min="0"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={handleSaveFare}
                >
                  <Check className="h-4 w-4" />
                  <span className="sr-only">Save Fare</span>
                </Button>
              </div>
            )}
          </div>
        </div>
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
                  <span className="text-muted-foreground ml-2">
                    {format(new Date(ride.dateTime), "p")}
                  </span>
                </div>
              </div>
            </>
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
                  {formatDuration(ride.duration)}
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
                    disabled={isLoadingFlightData}
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
        {ride.driver && (
          <div className="border-t pt-4 mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <UserRound className="h-5 w-5 text-muted-foreground" />
              <p className="font-semibold text-foreground">Your Driver</p>
            </div>
            <div className="flex items-center gap-3 pl-8">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={ride.driver.avatarUrl}
                  alt={ride.driver.name}
                />
                <AvatarFallback>
                  {ride.driver.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
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
