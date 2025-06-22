
import { useState, type ReactNode } from "react";
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
  SteeringWheel,
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

export function RideCard({
  ride,
  children,
  onUpdateFare,
  showPhoneNumber,
}: RideCardProps) {
  const [isEditingFare, setIsEditingFare] = useState(false);
  const [newFare, setNewFare] = useState(ride.fare);

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
                data-ai-hint="person face"
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
                  {ride.duration} min
                </span>
              </div>
            </div>
          )}
          {ride.transportType && ride.transportNumber && (
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
              <SteeringWheel className="h-5 w-5 text-muted-foreground" />
              <p className="font-semibold text-foreground">Your Driver</p>
            </div>
            <div className="flex items-center gap-3 pl-8">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={ride.driver.avatarUrl}
                  alt={ride.driver.name}
                  data-ai-hint="driver person"
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
