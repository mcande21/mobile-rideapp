"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
import { LogIn, AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const { login, currentUserProfile, loading, signInWithGoogle } = useRideStore();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [authAction, setAuthAction] = useState<"" | "email" | "google">("");

  useEffect(() => {
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAuthAction("email");
    try {
      await login(email, password);
    } catch (error: any) {
      setError("Invalid email or password. Please try again.");
      console.error(error);
      setAuthAction("");
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setAuthAction("google");
    try {
      await signInWithGoogle();
    } catch (error) {
      setError("An error occurred during Google sign-in.");
      console.error(error);
      setAuthAction("");
    }
  };

  if (!isConfigured) {
    return <FirebaseNotConfigured />;
  }

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
        <form onSubmit={handleSignIn}>
            <CardHeader className="text-center flex flex-col items-center">
            <Image
              src="/AJ_logo-03.png"
              alt="Utopia Rideshare Logo"
              width={140}
              height={100}
              className="rounded-full"
            />
            <CardTitle>Welcome to Utopia Rideshare</CardTitle>
            <CardDescription>
              Sign in to access your dashboard.
            </CardDescription>
            </CardHeader>
          <CardContent className="space-y-4">
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
                  <LogIn className="mr-2" />
                  Sign In
                </>
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
            <Button
              variant="outline"
              type="button"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={!!authAction}
            >
              {authAction === "google" ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Sign In with Google"
              )}
            </Button>
          </CardContent>
        </form>
        <CardFooter className="flex flex-col gap-4 items-center text-sm w-full">
           <div className="text-muted-foreground text-center">
              <p>
                Don't have an account?{' '}
                <Link href="/signup" className="underline text-primary hover:text-primary/80">
                  Sign Up
                </Link>
              </p>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
