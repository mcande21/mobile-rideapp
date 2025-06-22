"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRideStore } from '@/lib/store';
import { APIProvider } from "@vis.gl/react-google-maps";
import { UserDashboard } from "@/components/UserDashboard";
import { Loader2 } from 'lucide-react';

export default function UserPage() {
  const { currentUserProfile, loading } = useRideStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!currentUserProfile) {
        router.replace('/');
      } else if (currentUserProfile.role !== 'user') {
        router.replace('/driver');
      }
    }
  }, [currentUserProfile, loading, router]);

  if (loading || !currentUserProfile || currentUserProfile.role !== 'user') {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <UserDashboard />
    </APIProvider>
  );
}
