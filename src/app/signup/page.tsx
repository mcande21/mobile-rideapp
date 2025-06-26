"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
import { UserPlus, Car, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Autocomplete } from "@/components/Autocomplete";
import { PhoneInput } from "@/components/PhoneInput";
import { isValidPhoneNumber } from "libphonenumber-js";

export default function SignUpPage() {
  const { signUp, signInWithGoogle, currentUserProfile, loading } = useRideStore();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [authAction, setAuthAction] = useState<"" | "email" | "google">("");

  useEffect(() => {
    // If user is logged in, redirect them based on their profile completeness
    if (!loading && currentUserProfile) {
      if (!currentUserProfile.phoneNumber) {
        router.replace("/complete-profile");
      } else if (currentUserProfile.role === "driver") {
        router.replace("/driver");
      } else {
        router.replace("/user");
      }
    }
  }, [currentUserProfile, loading, router]);

  const handleGoogleSignUp = async () => {
    setError(null);
    setAuthAction("google");
    try {
      // This will trigger the Google sign-in popup.
      // The signInWithGoogle function now immediately sets the user profile
      // which should trigger the redirect logic
      await signInWithGoogle();
      
      // Give a small delay to ensure state is updated
      setTimeout(() => {
        setAuthAction("");
      }, 100);
      
    } catch (err: any) {
      setError("An error occurred during Google sign-up. Please try again.");
      console.error(err);
      setAuthAction("");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    // Validate phone number
    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      setError("Please enter a valid phone number.");
      return;
    }
    
    setError(null);
    setAuthAction("email");
    try {
      await signUp(name, email, password, phoneNumber, homeAddress);
      // Email signup includes all required fields, so user should be redirected to main dashboard
      // The main page routing logic will handle the appropriate redirect
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already in use.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      console.error(err);
      setAuthAction("");
    }
  };

  if (loading || currentUserProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full bg-background p-4">
      <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4">
              <Car className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle>Create an Account</CardTitle>
            <CardDescription>
              Sign up with Google or use your email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignUp}
              disabled={!!authAction}
            >
              {authAction === "google" ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Sign Up with Google"
              )}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            <form onSubmit={handleSignUp} className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="email" className="after:content-['*'] after:text-red-500 after:ml-1">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                <Autocomplete
                  label="Home Address (Optional)"
                  placeholder="123 Main St, Anytown"
                  value={homeAddress}
                  onChange={(value) => setHomeAddress(value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="after:content-['*'] after:text-red-500 after:ml-1">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="after:content-['*'] after:text-red-500 after:ml-1">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button className="w-full" type="submit" disabled={!!authAction}>
                {authAction === "email" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <UserPlus className="mr-2" />
                    Sign Up with Email
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <p className="text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/"
              className="underline text-primary hover:text-primary/80"
            >
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
