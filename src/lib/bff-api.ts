/**
 * Backend for Frontend (BFF) API service layer
 * Centralizes all API calls with proper typing and error handling for mobile environments
 */

import { apiClient, type ApiResponse } from './api-client';
import type { Ride, User } from './types';

// Request/Response types for BFF endpoints
interface DirectionsRequest {
  origin: string;
  destination: string;
  departureTime?: string;
  intermediates?: string[];
}

interface DirectionsResponse {
  durationMinutes: number;
  distanceMeters: number;
  route?: any;
}

interface PlacesAutocompleteRequest {
  input: string;
  sessionToken?: string;
}

interface PlacesAutocompleteResponse {
  suggestions?: Array<{
    placePrediction: {
      text: { text: string; matches: any[] };
      placeId: string;
    };
  }>;
  predictions?: Array<{
    description: string;
    place_id: string;
    structured_formatting?: {
      main_text: string;
      secondary_text: string;
    };
  }>;
}

interface RescheduleRequest {
  pickupLocation: string;
  dropoffLocation: string;
  oldTime: string;
  newTime: string;
  mileageMeters: number;
}

interface RescheduleResponse {
  fee: number;
  explanation?: string;
}

interface FlightDataRequest {
  flightNumber: string;
}

interface FlightDataResponse {
  flight_status: string;
  departure: {
    airport: string;
    scheduled: string;
    actual?: string;
    timezone?: string;
  };
  arrival: {
    airport: string;
    scheduled: string;
    actual?: string;
    timezone?: string;
  };
}

interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
}

/**
 * BFF API Service - handles all backend communication
 */
export class BffApiService {
  
  /**
   * Get directions and travel time between locations
   */
  async getDirections(request: DirectionsRequest): Promise<ApiResponse<DirectionsResponse>> {
    return apiClient.post<DirectionsResponse>('/api/bff/directions', request);
  }

  /**
   * Get place autocomplete suggestions
   */
  async getPlacesAutocomplete(request: PlacesAutocompleteRequest): Promise<ApiResponse<PlacesAutocompleteResponse>> {
    const queryParams = new URLSearchParams({
      input: request.input,
      ...(request.sessionToken ? { sessionToken: request.sessionToken } : {})
    });
    return apiClient.get<PlacesAutocompleteResponse>(`/api/bff/places-autocomplete?${queryParams}`);
  }

  /**
   * Calculate reschedule fee
   */
  async calculateRescheduleFee(request: RescheduleRequest): Promise<ApiResponse<RescheduleResponse>> {
    return apiClient.post<RescheduleResponse>('/api/bff/reschedule', request);
  }

  /**
   * Get flight information
   */
  async getFlightData(request: FlightDataRequest): Promise<ApiResponse<FlightDataResponse>> {
    const queryParams = new URLSearchParams({
      flightNumber: request.flightNumber
    });
    return apiClient.get<FlightDataResponse>(`/api/bff/flight?${queryParams}`);
  }

  /**
   * Google Calendar integration methods
   */
  async getGoogleCalendarAuthUrl(userId: string, state?: string): Promise<ApiResponse<{ url: string }>> {
    const queryParams = new URLSearchParams({
      userId,
      ...(state ? { state } : {})
    });
    return apiClient.get<{ url: string }>(`/api/bff/google-calendar/auth-url?${queryParams}`);
  }

  async validateGoogleCalendarToken(userId: string): Promise<ApiResponse<{ valid: boolean }>> {
    return apiClient.post<{ valid: boolean }>('/api/bff/google-calendar/validate-token', { userId });
  }

  async listGoogleCalendars(userId: string): Promise<ApiResponse<{ calendars: any[] }>> {
    return apiClient.post<{ calendars: any[] }>('/api/bff/google-calendar/list-calendars', { userId });
  }

  async addGoogleCalendarEvent(eventData: any): Promise<ApiResponse<{ eventId: string; eventUrl: string; success: boolean }>> {
    return apiClient.post<{ eventId: string; eventUrl: string; success: boolean }>('/api/bff/google-calendar/add-event', eventData);
  }

  /**
   * User management methods
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<User>('/api/bff/user/current');
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    return apiClient.patch<User>(`/api/bff/user/${userId}`, updates);
  }

  /**
   * Ride management methods
   */
  async getRides(userId?: string): Promise<ApiResponse<Ride[]>> {
    const queryParams = userId ? new URLSearchParams({ userId }) : '';
    return apiClient.get<Ride[]>(`/api/bff/rides${queryParams ? `?${queryParams}` : ''}`);
  }

  async getRide(rideId: string): Promise<ApiResponse<Ride>> {
    return apiClient.get<Ride>(`/api/bff/rides/${rideId}`);
  }

  async createRide(ride: Omit<Ride, 'id' | 'createdAt'>): Promise<ApiResponse<Ride>> {
    return apiClient.post<Ride>('/api/bff/rides', ride);
  }

  async updateRide(rideId: string, updates: Partial<Ride>): Promise<ApiResponse<Ride>> {
    return apiClient.patch<Ride>(`/api/bff/rides/${rideId}`, updates);
  }

  async cancelRide(rideId: string, reason?: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.post<{ success: boolean }>(`/api/bff/rides/${rideId}/cancel`, { reason });
  }

  async markRideAsPaid(rideId: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.post<{ success: boolean }>(`/api/bff/rides/${rideId}/mark-paid`);
  }

  async addRideComment(rideId: string, comment: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.post<{ success: boolean }>(`/api/bff/rides/${rideId}/comments`, { comment });
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return apiClient.get<{ status: string; timestamp: string }>('/api/bff/health');
  }

  /**
   * Generic error handler for API responses
   */
  static handleApiError(response: ApiResponse<any>): string {
    if (response.success) return '';
    
    // Map common error scenarios for mobile users
    switch (response.status) {
      case 0:
        return 'Unable to connect. Please check your internet connection.';
      case 400:
        return response.error || 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please sign in again.';
      case 403:
        return 'Access denied. You do not have permission for this action.';
      case 404:
        return 'The requested resource was not found.';
      case 408:
        return 'Request timed out. Please try again.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return response.error || 'An unexpected error occurred. Please try again.';
    }
  }
}

// Create a singleton instance
export const bffApi = new BffApiService();

// Export types
export type {
  DirectionsRequest,
  DirectionsResponse,
  PlacesAutocompleteRequest,
  PlacesAutocompleteResponse,
  RescheduleRequest,
  RescheduleResponse,
  FlightDataRequest,
  FlightDataResponse,
  GoogleCalendarEvent
};
