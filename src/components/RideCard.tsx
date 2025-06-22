import type { ReactNode } from "react";
import {
  MapPin,
  CircleDollarSign,
  User,
  CalendarDays,
  Clock,
  Plane,
  Train,
  Bus,
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

interface RideCardProps {
  ride: Ride;
  children?: ReactNode;
}

const TransportIcon = ({ type }: { type: TransportType | undefined }) => {
  const className = "h-5 w-5 text-muted-foreground";
  if (type === "flight") return <Plane className={className} />;
  if (type === "train") return <Train className={className} />;
  if (type === "bus") return <Bus className={className} />;
  return null;
};

export function RideCard({ ride, children }: RideCardProps) {
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
          <div>
            <span className="font-semibold text-foreground">Fare:</span>
            <span className="text-muted-foreground ml-2">
              ${ride.fare.toFixed(2)}
            </span>
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
      </CardContent>
      {children && (
        <CardFooter className="flex justify-end gap-2">{children}</CardFooter>
      )}
    </Card>
  );
}
