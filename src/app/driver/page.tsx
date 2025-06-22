"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRideStore } from "@/lib/store";
import { DriverDashboard } from "@/components/DriverDashboard";
import { Loader2 } from "lucide-react";

export default function DriverPage() {
  const { currentUserProfile, loading } = useRideStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!currentUserProfile) {
        router.replace("/");
      } else if (currentUserProfile.role !== "driver") {
        router.replace("/user");
      }
    }
  }, [currentUserProfile, loading, router]);

  if (loading || !currentUserProfile || currentUserProfile.role !== "driver") {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <DriverDashboard />;
}
