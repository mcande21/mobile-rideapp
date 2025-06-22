"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRideStore } from "@/lib/store";
import { isConfigured } from "@/lib/firebase";
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
import { Car, LogIn, AlertTriangle, Loader2, Database } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

function FirebaseNotConfigured() {
  return (
    <div className="flex items-center justify-center h-full bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive" />
            Firebase Not Configured
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>
              <p>
                Your Firebase environment variables are not set. Please create a
                `.env.local` file in the root of your project and add your
                Firebase project configuration.
              </p>
              <p className="mt-4 font-semibold">
                Please make sure you have replaced the placeholder values with your
                actual Firebase project keys.
              </p>
              <p className="mt-2 text-sm">
                You can get these values from your Firebase project settings.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  const { login, seedDatabase, currentUserProfile, loading } = useRideStore();
  const { toast } = useToast();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    if (!loading && currentUserProfile) {
      if (currentUserProfile.role === "driver") {
        router.replace("/driver");
      } else {
        router.replace("/user");
      }
    }
  }, [currentUserProfile, loading, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSigningIn(true);
    try {
      await login(email, password);
      // On success, the useEffect will trigger a redirect and this component will unmount.
      // No need to set isSigningIn back to false.
    } catch (err: any) {
      setError("Invalid email or password. Please try again.");
      console.error(err);
      setIsSigningIn(false); // Only set back to false on error.
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const result = await seedDatabase();
      toast({
        title: "Seeding Complete",
        description: result,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Seeding Failed",
        description: err.message || "Could not seed the database. Check your Firebase setup and browser console for more details.",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  if (!isConfigured) {
    return <FirebaseNotConfigured />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full bg-background p-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSignIn}>
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4">
              <Car className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle>Welcome to Ride Queue</CardTitle>
            <CardDescription>
              Sign in to access your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button className="w-full" type="submit" disabled={isSigningIn}>
              {isSigningIn ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <LogIn className="mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </CardContent>
        </form>
        <CardFooter className="flex flex-col gap-4 items-start text-sm">
          <Alert>
            <AlertTitle className="flex items-center gap-2"><Database/> First-time Setup</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                Click the button below to seed your database with sample users and rides.
              </p>
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleSeed}
                disabled={isSeeding}
              >
                {isSeeding ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Seed Database"
                )}
              </Button>
            </AlertDescription>
          </Alert>
          <div className="text-muted-foreground">
            <p>You can use these test accounts (password: `password123`):</p>
            <ul className="list-disc pl-5 mt-1">
              <li>User: `alice@example.com`</li>
              <li>Driver: `charlie@example.com`</li>
            </ul>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
