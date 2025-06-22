"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRideStore } from "@/lib/store";
import { DriverDashboard } from "@/components/DriverDashboard";
import { Loader2 } from "lucide-react";

export default function DriverPage() {
  const { currentUser } = useRideStore();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) {
      router.replace("/");
    } else if (currentUser.role !== "driver") {
      router.replace("/user");
    }
  }, [currentUser, router]);

  if (!currentUser || currentUser.role !== "driver") {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <DriverDashboard />;
}
