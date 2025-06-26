"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRideStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Autocomplete } from "@/components/Autocomplete";
import { PhoneInput } from "@/components/PhoneInput";
import { AvatarSelector } from "@/components/AvatarSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoogleCalendarSettings } from "@/components/GoogleCalendarSettings";
import { isValidPhoneNumber } from "libphonenumber-js";

export default function ProfilePage() {
  const {
    currentUser,
    currentUserProfile,
    updateUserProfile,
    loading,
  } = useRideStore();
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [venmoUsername, setVenmoUsername] = useState("");
  const [customAvatar, setCustomAvatar] = useState<{ type: 'color' | 'preset' | 'google'; value: string } | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && !currentUserProfile) {
      router.replace("/");
    }
    if (currentUserProfile) {
      setName(currentUserProfile.name);
      setPhoneNumber(currentUserProfile.phoneNumber || "");
      setHomeAddress(currentUserProfile.homeAddress || "");
      setVenmoUsername(currentUserProfile.venmoUsername || "");
      setCustomAvatar(currentUserProfile.customAvatar);
    }
  }, [currentUserProfile, loading, router]);

  const handleSaveAvatar = async (avatarConfig: { type: 'color' | 'preset' | 'google'; value: string }) => {
    try {
      await updateUserProfile({
        name: currentUserProfile?.name || "",
        phoneNumber: currentUserProfile?.phoneNumber || "",
        homeAddress: currentUserProfile?.homeAddress || "",
        venmoUsername: currentUserProfile?.venmoUsername || "",
        customAvatar: avatarConfig,
      });
      
      // Update local state to reflect the saved changes
      setCustomAvatar(avatarConfig);
      
      toast({
        title: "Avatar Updated!",
        description: "Your avatar has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not save your avatar. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Validate name
    if (!name || name.trim().length < 2) {
      toast({
        title: "Invalid Name",
        description: "Please enter your full name (at least 2 characters).",
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }
    // Validate phone number
    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }

    try {
      await updateUserProfile({
        name,
        phoneNumber,
        homeAddress,
        venmoUsername,
        customAvatar,
      });
      toast({
        title: "Profile Updated",
        description: "Your information has been saved successfully.",
      });
      if (currentUserProfile?.role === "driver") {
        router.push("/driver");
      } else {
        router.push("/user");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not update your profile. Please try again.",
        variant: "destructive",
      });
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkGoogle = async () => {
    try {
      if (!currentUserProfile?.id) {
        toast({
          title: "Error",
          description: "No user ID found.",
          variant: "destructive",
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

  if (loading || !currentUserProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="mt-8">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile Info</TabsTrigger>
            <TabsTrigger value="avatar">Avatar & Appearance</TabsTrigger>
            <TabsTrigger value="calendar">Google Calendar</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <Card>
              <form onSubmit={handleSave}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User /> Edit Profile
                  </CardTitle>
                  <CardDescription>
                    Update your personal information here. Your email address cannot
                    be changed.
                  </CardDescription>
                </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={currentUser?.email || ""}
                disabled
                className="cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="after:content-['*'] after:text-red-500 after:ml-1">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <PhoneInput
              label="Phone Number"
              value={phoneNumber}
              onChange={(value) => setPhoneNumber(value || "")}
              placeholder="Enter your phone number"
              required
            />
            <div className="space-y-2">
              <Label htmlFor="home-address">Home Address (Optional)</Label>
              <Autocomplete
                control={null as any} // Not using react-hook-form, so pass dummy
                name="homeAddress"
                placeholder="123 Main St, Anytown"
                // Use value/onChange to sync with local state
                value={homeAddress}
                onChange={setHomeAddress}
              />
            </div>
            {currentUserProfile?.role === "driver" && (
              <div className="space-y-2">
                <Label htmlFor="venmo-username">Venmo Username</Label>
                <Input
                  id="venmo-username"
                  type="text"
                  placeholder="your-venmo-handle"
                  value={venmoUsername}
                  onChange={(e) => setVenmoUsername(e.target.value)}
                />
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Save className="mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </TabsContent>
    
    <TabsContent value="avatar">
      <AvatarSelector 
        user={currentUserProfile} 
        onSelect={(avatarConfig) => setCustomAvatar(avatarConfig)}
        onSave={handleSaveAvatar}
      />
    </TabsContent>
    
    <TabsContent value="calendar">
      <GoogleCalendarSettings />
    </TabsContent>
    
    </Tabs>
    </div>
    </div>
  );
}
