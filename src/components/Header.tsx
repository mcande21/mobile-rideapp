"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Car, LogOut, User, Calendar, Check } from "lucide-react";
import { useRideStore } from "@/lib/store";
import { getAvatarUrl, getAvatarBackgroundColor, getUserInitials } from "@/lib/utils";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const { currentUserProfile, logout } = useRideStore();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const handleSyncGoogleCalendar = async () => {
    try {
      if (!currentUserProfile?.id) {
        toast({
          title: "Error",
          description: "No user ID found.",
          variant: "destructive",
        });
        return;
      }

      // If already connected, show a different message
      if (currentUserProfile?.googleAccount) {
        toast({
          title: "Already Connected",
          description: "Your Google Calendar is already synced. Rides will be automatically added to your calendar.",
        });
        return;
      }

      const response = await fetch(
        `/api/auth/google/url?userId=${currentUserProfile.id}`
      );
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error fetching Google Auth URL:", error);
      toast({
        title: "Error",
        description: "Could not link your Google account. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="border-b bg-gradient-to-r from-card to-card/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link
          href={
            currentUserProfile
              ? currentUserProfile.role === "driver"
                ? "/driver"
                : "/user"
              : "/"
          }
          className="flex items-center gap-3 hover:opacity-80 transition-opacity duration-200"
        >
          <div className="p-2.5 bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-lg ring-2 ring-primary/20">
            <Car className="h-6 w-6 text-primary-foreground drop-shadow-sm" />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Ride Queue</h1>
        </Link>
        {currentUserProfile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-12 w-12 rounded-full p-0 ring-2 ring-transparent hover:ring-2 hover:ring-primary/20 transition-all duration-200 hover:scale-105"
              >
                <Avatar className="h-10 w-10 ring-2 ring-background shadow-lg">
                  <AvatarImage
                    src={getAvatarUrl(currentUserProfile)}
                    alt={currentUserProfile.name}
                  />
                  <AvatarFallback 
                    style={{ backgroundColor: getAvatarBackgroundColor(currentUserProfile) }}
                    className="text-white font-semibold relative overflow-hidden border-2 border-white/20"
                  >
                    {currentUserProfile.customAvatar?.type === 'preset' ? (
                      <img 
                        src={`/patterns/${currentUserProfile.customAvatar.value}.svg`}
                        alt="Avatar"
                        className="w-6 h-6 object-contain drop-shadow-sm"
                      />
                    ) : (
                      getUserInitials(currentUserProfile.name)
                    )}
                  </AvatarFallback>
                </Avatar>
                {/* Online status indicator with role-specific color */}
                <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-background shadow-sm animate-pulse ${
                  currentUserProfile.role === 'driver' ? 'bg-blue-500' : 'bg-green-500'
                }`}></div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {currentUserProfile.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground capitalize">
                    {currentUserProfile.role}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleSyncGoogleCalendar}
                className={currentUserProfile?.googleAccount ? "text-green-600 dark:text-green-400" : ""}
              >
                {currentUserProfile?.googleAccount ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Calendar className="mr-2 h-4 w-4" />
                )}
                <span>
                  {currentUserProfile?.googleAccount 
                    ? "Synced with Google Calendar" 
                    : "Sync to Google Calendar"
                  }
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
