/**
 * Mobile-first API client with Backend for Frontend pattern
 * Handles API calls with proper error handling, retry logic, and mobile network considerations
 */

import { getMobileConfig, mobileUtils, mobileErrorHandler } from './mobile-config';

interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  success: boolean;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retryAttempts?: number;
}

class MobileApiClient {
  private config: ApiConfig;
  private authToken: string | null = null;

  constructor(config: Partial<ApiConfig> = {}) {
    const mobileConfig = getMobileConfig();
    this.config = {
      baseUrl: mobileConfig.api.baseUrl,
      timeout: mobileConfig.api.timeout,
      retryAttempts: mobileConfig.api.retryAttempts,
      retryDelay: mobileConfig.api.retryDelay,
      ...config
    };
  }

  private getBaseUrl(): string {
    // For mobile apps, we need to detect the environment
    if (typeof window !== 'undefined') {
      // Check if running in Capacitor
      if ((window as any).Capacitor?.isNativePlatform()) {
        // For production mobile app, use your production API
        return process.env.NEXT_PUBLIC_API_BASE_URL || 'https://your-production-api.com';
      }
      // For web development
      return window.location.origin;
    }
    // For server-side rendering
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithTimeout(
    url: string, 
    options: RequestInit, 
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.config.timeout,
      retryAttempts = this.config.retryAttempts
    } = options;

    const url = `${this.config.baseUrl}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // Helps with CORS in some cases
    };

    // Add auth token if available
    if (this.authToken) {
      defaultHeaders['Authorization'] = `Bearer ${this.authToken}`;
    }

    const requestOptions: RequestInit = {
      method,
      headers: { ...defaultHeaders, ...headers },
      body: body ? JSON.stringify(body) : undefined,
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, requestOptions, timeout);
        
        // Handle different response types
        let data: any;
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        if (response.ok) {
          // Handle BFF response format unwrapping
          if (url.includes('/api/bff/') && data && typeof data === 'object' && 'data' in data && 'success' in data) {
            // This is a BFF response with wrapped data structure
            return {
              data: data.data, // Unwrap the actual data
              status: response.status,
              success: data.success
            };
          }
          
          return {
            data,
            status: response.status,
            success: true
          };
        } else {
          // Handle HTTP errors
          return {
            error: data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
            success: false
          };
        }
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          // Network error - could be offline
          if (attempt === retryAttempts) {
            return {
              error: 'Network error. Please check your connection.',
              status: 0,
              success: false
            };
          }
        } else if (error instanceof DOMException && error.name === 'AbortError') {
          // Timeout error
          if (attempt === retryAttempts) {
            return {
              error: 'Request timeout. Please try again.',
              status: 408,
              success: false
            };
          }
        } else {
          // Other errors - don't retry
          return {
            error: (error as Error).message || 'An unexpected error occurred',
            status: 500,
            success: false
          };
        }

        // Wait before retrying
        if (attempt < retryAttempts) {
          await this.sleep(this.config.retryDelay * attempt);
        }
      }
    }

    return {
      error: lastError?.message || 'Request failed after multiple attempts',
      status: 500,
      success: false
    };
  }

  // Public API methods
  async get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  async delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create a singleton instance
export const apiClient = new MobileApiClient();

// Export types for use in other files
export type { ApiResponse, RequestOptions };
