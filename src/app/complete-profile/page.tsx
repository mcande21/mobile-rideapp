"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRideStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Autocomplete } from "@/components/Autocomplete";
import { PhoneInput } from "@/components/PhoneInput";
import { isValidPhoneNumber } from "libphonenumber-js";

export default function CompleteProfilePage() {
  const { currentUser, currentUserProfile, updateUserProfile, loading } = useRideStore();
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // If the profile is already complete, or there's no user, redirect.
    if (!loading && currentUserProfile) {
      if (currentUserProfile.phoneNumber) {
        router.replace(currentUserProfile.role === "driver" ? "/driver" : "/user");
      }
    } else if (!loading && !currentUserProfile && currentUser) {
      // If we have a currentUser but no profile, redirect to main page
      // This handles edge cases where auth state is inconsistent
      router.replace("/");
    }
  }, [currentUserProfile, currentUser, loading, router]);

  useEffect(() => {
    // Pre-fill form fields if they exist in the profile
    if (currentUserProfile) {
      if (currentUserProfile.name) {
        setName(currentUserProfile.name);
      }
      if (currentUserProfile.homeAddress) {
        setHomeAddress(currentUserProfile.homeAddress);
      }
    }
  }, [currentUserProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!currentUserProfile?.id) {
      setError("User ID is missing. Please try again.");
      setIsSubmitting(false);
      return;
    }

    // Validate name
    if (!name || name.trim().length < 2) {
      setError("Please enter your full name.");
      setIsSubmitting(false);
      return;
    }
    // Validate phone number
    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      setError("Please enter a valid phone number.");
      setIsSubmitting(false);
      return;
    }

    try {
      await updateUserProfile({
        name: name || currentUserProfile.name,
        phoneNumber,
        homeAddress,
      });
      // The redirect will be handled by the useEffect hook
    } catch (err) {
      setError("Failed to update profile. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
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
    <div className="flex items-center justify-center h-full bg-background p-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              Welcome! Please review your information and add a few more details to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="after:content-['*'] after:text-red-500 after:ml-1">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={currentUser?.email || ""}
                disabled
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
              <Autocomplete
                label="Home Address (Optional)"
                placeholder="123 Main St, Anytown"
                value={homeAddress}
                onChange={(value) => setHomeAddress(value)}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Save className="mr-2" />
                  Save and Continue
                </>
              )}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
