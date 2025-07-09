/**
 * Firebase-based BFF API service layer
 * Uses Firebase Functions and Firestore for backend operations
 */

import { httpsCallable } from 'firebase/functions';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { functions, db } from './firebase-config';
import type { ApiResponse } from './api-client';

// Types for Firebase operations
interface Ride {
  id?: string;
  userId: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupTime: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  fare?: number;
  driverId?: string;
  transportNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface User {
  id?: string;
  email: string;
  name: string;
  phone?: string;
  role: 'rider' | 'driver';
  createdAt?: string;
}

interface FareCalculation {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  totalFare: number;
  currency: 'USD';
}

class FirebaseBffApi {
  
  // === RIDE OPERATIONS ===
  
  async createRide(rideData: Omit<Ride, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Ride>> {
    try {
      const ridesRef = collection(db, 'rides');
      const docRef = await addDoc(ridesRef, {
        ...rideData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      const newRide = { id: docRef.id, ...rideData };
      return {
        data: newRide,
        status: 201,
        success: true
      };
    } catch (error) {
      return {
        error: `Failed to create ride: ${(error as Error).message}`,
        status: 500,
        success: false
      };
    }
  }

  async getRide(rideId: string): Promise<ApiResponse<Ride>> {
    try {
      const rideDoc = await getDoc(doc(db, 'rides', rideId));
      
      if (!rideDoc.exists()) {
        return {
          error: 'Ride not found',
          status: 404,
          success: false
        };
      }
      
      const ride = { id: rideDoc.id, ...rideDoc.data() } as Ride;
      return {
        data: ride,
        status: 200,
        success: true
      };
    } catch (error) {
      return {
        error: `Failed to get ride: ${(error as Error).message}`,
        status: 500,
        success: false
      };
    }
  }

  async getUserRides(userId: string): Promise<ApiResponse<Ride[]>> {
    try {
      const ridesQuery = query(
        collection(db, 'rides'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const querySnapshot = await getDocs(ridesQuery);
      const rides = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ride[];
      
      return {
        data: rides,
        status: 200,
        success: true
      };
    } catch (error) {
      return {
        error: `Failed to get user rides: ${(error as Error).message}`,
        status: 500,
        success: false
      };
    }
  }

  async updateRide(rideId: string, updates: Partial<Ride>): Promise<ApiResponse<Ride>> {
    try {
      const rideRef = doc(db, 'rides', rideId);
      await updateDoc(rideRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      
      const updatedRide = await getDoc(rideRef);
      const ride = { id: updatedRide.id, ...updatedRide.data() } as Ride;
      
      return {
        data: ride,
        status: 200,
        success: true
      };
    } catch (error) {
      return {
        error: `Failed to update ride: ${(error as Error).message}`,
        status: 500,
        success: false
      };
    }
  }

  // === FIREBASE FUNCTIONS ===

  async calculateFare(rideData: {
    pickupLocation: string;
    dropoffLocation: string;
    pickupTime: string;
  }): Promise<ApiResponse<FareCalculation>> {
    try {
      const calculateFareFunction = httpsCallable(functions, 'calculateFare');
      const result = await calculateFareFunction(rideData);
      
      return {
        data: result.data as FareCalculation,
        status: 200,
        success: true
      };
    } catch (error) {
      return {
        error: `Failed to calculate fare: ${(error as Error).message}`,
        status: 500,
        success: false
      };
    }
  }

  async acceptRide(rideId: string, driverId: string): Promise<ApiResponse<Ride>> {
    try {
      const acceptRideFunction = httpsCallable(functions, 'acceptRide');
      const result = await acceptRideFunction({ rideId, driverId });
      
      return {
        data: result.data as Ride,
        status: 200,
        success: true
      };
    } catch (error) {
      return {
        error: `Failed to accept ride: ${(error as Error).message}`,
        status: 500,
        success: false
      };
    }
  }

  async cancelRide(rideId: string, reason?: string): Promise<ApiResponse<Ride>> {
    try {
      const cancelRideFunction = httpsCallable(functions, 'cancelRide');
      const result = await cancelRideFunction({ rideId, reason });
      
      return {
        data: result.data as Ride,
        status: 200,
        success: true
      };
    } catch (error) {
      return {
        error: `Failed to cancel ride: ${(error as Error).message}`,
        status: 500,
        success: false
      };
    }
  }

  async completeRide(rideId: string): Promise<ApiResponse<Ride>> {
    try {
      const completeRideFunction = httpsCallable(functions, 'completeRide');
      const result = await completeRideFunction({ rideId });
      
      return {
        data: result.data as Ride,
        status: 200,
        success: true
      };
    } catch (error) {
      return {
        error: `Failed to complete ride: ${(error as Error).message}`,
        status: 500,
        success: false
      };
    }
  }

  async rescheduleRide(rideId: string, newPickupTime: string): Promise<ApiResponse<Ride>> {
    try {
      const rescheduleRideFunction = httpsCallable(functions, 'rescheduleRide');
      const result = await rescheduleRideFunction({ rideId, newPickupTime });
      
      return {
        data: result.data as Ride,
        status: 200,
        success: true
      };
    } catch (error) {
      return {
        error: `Failed to reschedule ride: ${(error as Error).message}`,
        status: 500,
        success: false
      };
    }
  }

  // === USER OPERATIONS ===

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<ApiResponse<User>> {
    try {
      const usersRef = collection(db, 'users');
      const docRef = await addDoc(usersRef, {
        ...userData,
        createdAt: new Date().toISOString()
      });
      
      const newUser = { id: docRef.id, ...userData };
      return {
        data: newUser,
        status: 201,
        success: true
      };
    } catch (error) {
      return {
        error: `Failed to create user: ${(error as Error).message}`,
        status: 500,
        success: false
      };
    }
  }

  async getUser(userId: string): Promise<ApiResponse<User>> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        return {
          error: 'User not found',
          status: 404,
          success: false
        };
      }
      
      const user = { id: userDoc.id, ...userDoc.data() } as User;
      return {
        data: user,
        status: 200,
        success: true
      };
    } catch (error) {
      return {
        error: `Failed to get user: ${(error as Error).message}`,
        status: 500,
        success: false
      };
    }
  }

  // === LEGACY API COMPATIBILITY ===
  // These methods maintain compatibility with your existing BFF API structure

  async getDirections(data: {
    origin: string;
    destination: string;
    intermediates?: string[];
  }): Promise<ApiResponse<{ durationMinutes: number; distanceMeters: number }>> {
    // This would call a Firebase function that handles Google Maps directions
    try {
      const directionsFunction = httpsCallable(functions, 'getDirections');
      const result = await directionsFunction(data);
      
      return {
        data: result.data as { durationMinutes: number; distanceMeters: number },
        status: 200,
        success: true
      };
    } catch (error) {
      return {
        error: `Failed to get directions: ${(error as Error).message}`,
        status: 500,
        success: false
      };
    }
  }

  async getPlacesAutocomplete(data: {
    input: string;
    sessionToken?: string;
  }): Promise<ApiResponse<{ suggestions: any[] }>> {
    // This would call a Firebase function that handles Google Places autocomplete
    try {
      const placesFunction = httpsCallable(functions, 'getPlacesAutocomplete');
      const result = await placesFunction(data);
      
      return {
        data: result.data as { suggestions: any[] },
        status: 200,
        success: true
      };
    } catch (error) {
      return {
        error: `Failed to get places autocomplete: ${(error as Error).message}`,
        status: 500,
        success: false
      };
    }
  }

  async calculateRescheduleFee(data: {
    pickupLocation: string;
    dropoffLocation: string;
    originalPickupTime: string;
    newPickupTime: string;
  }): Promise<ApiResponse<{ fee: number; reason: string }>> {
    // This would call a Firebase function that calculates reschedule fees
    try {
      const feeFunction = httpsCallable(functions, 'calculateRescheduleFee');
      const result = await feeFunction(data);
      
      return {
        data: result.data as { fee: number; reason: string },
        status: 200,
        success: true
      };
    } catch (error) {
      return {
        error: `Failed to calculate reschedule fee: ${(error as Error).message}`,
        status: 500,
        success: false
      };
    }
  }

  async getFlightData(data: {
    flightNumber: string;
  }): Promise<ApiResponse<{ flight_status: string; departure: any; arrival: any }>> {
    // This would call a Firebase function that handles flight data
    try {
      const flightFunction = httpsCallable(functions, 'getFlightData');
      const result = await flightFunction(data);
      
      return {
        data: result.data as { flight_status: string; departure: any; arrival: any },
        status: 200,
        success: true
      };
    } catch (error) {
      return {
        error: `Failed to get flight data: ${(error as Error).message}`,
        status: 500,
        success: false
      };
    }
  }
}

// Create and export a singleton instance
export const firebaseBffApi = new FirebaseBffApi();

// Export types for use in other files
export type { Ride, User, FareCalculation };
