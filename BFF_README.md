# Backend for Frontend (BFF) API Implementation

This implementation provides a mobile-optimized Backend for Frontend pattern for your ride-sharing app. It's designed to work seamlessly across web, iOS, and Android platforms while maintaining security best practices.

## Architecture Overview

```
Mobile App (iOS/Android) ──┐
Web App                   ──┼── BFF API Layer ── Original API Routes ── External Services
Development Environment   ──┘
```

## Key Features

### 🚀 Mobile-First Design
- **Network Resilience**: Automatic retry logic with exponential backoff
- **Timeout Handling**: Mobile-appropriate timeout values (30s default)
- **Error Handling**: User-friendly error messages for common mobile scenarios
- **Rate Limiting**: Per-client rate limiting to prevent abuse

### 🔒 Security Enhancements
- **Request Validation**: Input validation on all endpoints
- **Rate Limiting**: Built-in protection against excessive requests
- **Environment Detection**: Different security policies for dev/prod
- **Error Sanitization**: Prevents sensitive information leakage

### 📱 Capacitor/Mobile Integration
- **Environment Detection**: Automatically detects Capacitor vs web environment
- **API Base URL**: Dynamic configuration based on deployment context
- **Device Information**: Optional device info collection for debugging
- **Network Status**: Online/offline detection (when Capacitor plugins available)

## File Structure

```
src/lib/
├── api-client.ts          # Core API client with retry logic and error handling
├── bff-api.ts            # BFF service layer with typed methods
├── mobile-config.ts      # Mobile-specific configuration and utilities
└── types.ts              # TypeScript definitions

src/app/api/bff/
├── route.ts              # Main BFF router (fallback/health)
├── health/route.ts       # Health check endpoint
├── directions/route.ts   # Directions API proxy
├── places-autocomplete/route.ts  # Places autocomplete proxy
├── reschedule/route.ts   # Reschedule fee calculation proxy
└── flight/route.ts       # Flight data proxy
```

## Usage Examples

### Basic API Calls

```typescript
import { bffApi } from '@/lib/bff-api';

// Get directions
const response = await bffApi.getDirections({
  origin: "123 Main St",
  destination: "456 Oak Ave",
  intermediates: ["789 Pine St"] // optional stops
});

if (response.success) {
  console.log('Duration:', response.data.durationMinutes);
} else {
  console.error('Error:', response.error);
}

// Places autocomplete
const places = await bffApi.getPlacesAutocomplete({
  input: "coffee shop"
});

// Flight data
const flight = await bffApi.getFlightData({
  flightNumber: "AA123"
});
```

### Error Handling

```typescript
import { BffApiService } from '@/lib/bff-api';

const response = await bffApi.getDirections(request);

if (!response.success) {
  // Get user-friendly error message
  const errorMessage = BffApiService.handleApiError(response);
  alert(errorMessage); // Shows mobile-appropriate error messages
}
```

### Health Check

```typescript
// Check API health
const health = await bffApi.healthCheck();
console.log('API Status:', health.data?.status);
```

## Environment Configuration

The system automatically configures itself based on the environment:

### Development
- API Base URL: `http://localhost:3000`
- Enhanced logging and error details
- Relaxed security policies

### Production Web
- API Base URL: Current domain origin
- Standard security policies
- Error message sanitization

### Production Mobile (Capacitor)
- API Base URL: From `NEXT_PUBLIC_API_BASE_URL` environment variable
- Enhanced security policies
- Mobile-specific optimizations

## Environment Variables

Add these to your `.env.local` file:

```bash
# Production API URL for mobile apps
NEXT_PUBLIC_API_BASE_URL=https://your-production-api.com

# Existing Google API key
NEXT_PUBLIC_GOOGLE_API_KEY=your_google_api_key

# Other existing environment variables...
```

## Mobile App Deployment

### Capacitor Configuration

Update your `capacitor.config.ts`:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ajsairportruns',
  appName: 'Utopia Rideshare',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    // For development, you can point to your local server:
    // url: 'http://192.168.1.100:3000',
    // cleartext: true
  },
  plugins: {
    // Your existing plugin configurations
  },
};

export default config;
```

### Building for Mobile

```bash
# Build the Next.js app
npm run build

# Sync with Capacitor
npx cap sync

# Run on iOS
npx cap run ios

# Run on Android
npx cap run android
```

## Migration Guide

Your existing code will continue to work, but you can gradually migrate to the BFF API:

### Before (Direct API calls)
```typescript
const response = await fetch('/api/directions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ origin, destination })
});
const data = await response.json();
```

### After (BFF API)
```typescript
const response = await bffApi.getDirections({ origin, destination });
if (response.success) {
  const data = response.data;
}
```

## Rate Limiting

The BFF API includes built-in rate limiting:

- **General endpoints**: 100 requests per minute per IP
- **Directions API**: 50 requests per minute per IP (more expensive)
- **Flight API**: 50 requests per minute per IP
- **Reschedule API**: 30 requests per minute per IP

Rate limits return HTTP 429 with appropriate error messages.

## Error Handling Best Practices

1. **Always check response.success** before using data
2. **Use BffApiService.handleApiError()** for user-friendly messages
3. **Implement proper loading states** for mobile UX
4. **Handle offline scenarios** gracefully

## Monitoring and Debugging

### Health Check
Monitor API health at `/api/bff/health`:

```json
{
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-01T12:00:00.000Z",
    "version": "1.0.0",
    "uptime": 3600,
    "mobile_optimized": true,
    "bff_enabled": true
  },
  "success": true
}
```

### Error Logging
Errors are automatically logged with device context for debugging:

```typescript
import { mobileErrorHandler } from '@/lib/mobile-config';

// Manually log errors with context
await mobileErrorHandler.logError(error, 'User Action Context');
```

## Future Enhancements

- **Offline Support**: Cache responses for offline functionality
- **Background Sync**: Queue requests when offline
- **Push Notifications**: Real-time updates for ride status
- **Analytics**: Track API usage and performance
- **A/B Testing**: Feature flags for mobile-specific features

## Security Considerations

- All endpoints validate input parameters
- Rate limiting prevents abuse
- Error messages don't leak sensitive information
- HTTPS enforced in production
- Request signing can be enabled for enhanced security

## Support

For issues or questions about the BFF implementation:

1. Check the health endpoint: `/api/bff/health`
2. Review error logs in the browser console (development)
3. Verify environment variables are properly set
4. Ensure your mobile app has network permissions
