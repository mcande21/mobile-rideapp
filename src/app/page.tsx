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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Car, LogIn } from "lucide-react";

export default function SignInPage() {
  const { users, login, currentUser } = useRideStore();
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'driver') {
        router.replace('/driver');
      } else {
        router.replace('/user');
      }
    }
  }, [currentUser, router]);

  const handleSignIn = () => {
    if (selectedUserId) {
      login(selectedUserId);
    }
  };

  return (
    <div className="flex items-center justify-center h-full bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4">
            <Car className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle>Welcome to Ride Queue</CardTitle>
          <CardDescription>
            Please select a user to sign in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-select">Select User</Label>
            <Select onValueChange={setSelectedUserId}>
              <SelectTrigger id="user-select">
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={handleSignIn}
            disabled={!selectedUserId}
          >
            <LogIn className="mr-2" />
            Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
