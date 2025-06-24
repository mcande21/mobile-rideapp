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

export default function ProfilePage() {
  const {
    currentUser,
    currentUserProfile,
    updateUserProfile,
    loading,
    linkWithGoogle,
  } = useRideStore();
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [venmoUsername, setVenmoUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    if (!loading && !currentUserProfile) {
      router.replace("/");
    }
    if (currentUserProfile) {
      setName(currentUserProfile.name);
      setPhoneNumber(currentUserProfile.phoneNumber || "");
      setHomeAddress(currentUserProfile.homeAddress || "");
      setVenmoUsername(currentUserProfile.venmoUsername || "");
    }
  }, [currentUserProfile, loading, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUserProfile({
        name,
        phoneNumber,
        homeAddress,
        venmoUsername,
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
    <div className="container mx-auto p-4 md:p-6 flex justify-center">
      <Card className="w-full max-w-lg mt-8">
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
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="123-456-7890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="home-address">Home Address (Optional)</Label>
              <Input
                id="home-address"
                type="text"
                placeholder="123 Main St, Anytown"
                value={homeAddress}
                onChange={(e) => setHomeAddress(e.target.value)}
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
          <CardFooter className="flex flex-col gap-2">
            <Button
              className="w-full"
              type="submit"
              disabled={isSaving || isLinking}
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
            <Button
              variant="outline"
              className="w-full"
              type="button"
              onClick={handleLinkGoogle}
              disabled={isSaving || isLinking}
            >
              {isLinking ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Sync to Google Calendar"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
