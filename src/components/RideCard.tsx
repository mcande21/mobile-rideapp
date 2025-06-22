import type { ReactNode } from "react";
import { MapPin, CircleDollarSign, Clock, User } from "lucide-react";
import Image from "next/image";
import type { Ride } from "@/lib/types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RideCardProps {
  ride: Ride;
  children?: ReactNode;
}

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
    <Card className="w-full transition-all hover:shadow-md">
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
      <CardContent className="space-y-4">
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
      </CardContent>
      {children && (
        <CardFooter className="flex justify-end gap-2">{children}</CardFooter>
      )}
    </Card>
  );
}
