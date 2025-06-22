"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRideStore } from '@/lib/store';
import { UserDashboard } from "@/components/UserDashboard";
import { Loader2 } from 'lucide-react';

export default function UserPage() {
  const { currentUser } = useRideStore();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) {
      router.replace('/');
    } else if (currentUser.role !== 'user') {
      router.replace('/driver');
    }
  }, [currentUser, router]);

  if (!currentUser || currentUser.role !== 'user') {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return <UserDashboard />;
}
