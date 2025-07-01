/**
 * BFF API Test Script
 * Use this to test the BFF endpoints are working correctly
 */

// Load environment variables
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Set defaults if not loaded
if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:9002';
}

import { bffApi, BffApiService } from '../src/lib/bff-api';

async function testBffEndpoints() {
  console.log('🚀 Testing BFF API endpoints...\n');
  
  // Check if the server is running
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  console.log(`📡 API Base URL: ${baseUrl}\n`);

  // Test health check
  console.log('1. Testing health check...');
  try {
    const health = await bffApi.healthCheck();
    if (health.success && health.data) {
      console.log('✅ Health check passed');
      console.log('   Status:', health.data.status);
      // Use type assertion since health endpoint returns more fields than typed
      const healthData = health.data as any;
      console.log('   Version:', healthData.version);
      console.log('   Environment:', healthData.environment);
    } else {
      console.log('❌ Health check failed:', health.error);
    }
  } catch (error) {
    console.log('❌ Health check error:', error);
  }

  // Test places autocomplete
  console.log('\n2. Testing places autocomplete...');
  try {
    const places = await bffApi.getPlacesAutocomplete({
      input: 'coffee shop'
    });
    if (places.success && places.data) {
      console.log('✅ Places autocomplete passed');
      const suggestions = places.data.suggestions || places.data.predictions;
      console.log('   Suggestions count:', suggestions?.length || 0);
    } else {
      console.log('❌ Places autocomplete failed:', places.error);
    }
  } catch (error) {
    console.log('❌ Places autocomplete error:', error);
  }

  // Test directions (requires valid addresses)
  console.log('\n3. Testing directions...');
  try {
    const directions = await bffApi.getDirections({
      origin: 'New York, NY',
      destination: 'Boston, MA'
    });
    if (directions.success && directions.data) {
      console.log('✅ Directions passed');
      const duration = directions.data.durationMinutes;
      console.log('   Duration:', duration, 'minutes');
    } else {
      console.log('❌ Directions failed:', directions.error);
    }
  } catch (error) {
    console.log('❌ Directions error:', error);
  }

  // Test reschedule fee calculation
  console.log('\n4. Testing reschedule fee...');
  try {
    const reschedule = await bffApi.calculateRescheduleFee({
      pickupLocation: 'New York, NY',
      dropoffLocation: 'Boston, MA',
      oldTime: new Date().toISOString(),
      newTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
      mileageMeters: 300000 // roughly 300km
    });
    if (reschedule.success && reschedule.data) {
      console.log('✅ Reschedule fee passed');
      const fee = reschedule.data.fee;
      console.log('   Fee: $', fee);
    } else {
      console.log('❌ Reschedule fee failed:', reschedule.error);
    }
  } catch (error) {
    console.log('❌ Reschedule fee error:', error);
  }

  // Test flight data (if flight API is available)
  console.log('\n5. Testing flight data...');
  try {
    const flight = await bffApi.getFlightData({
      flightNumber: 'AA123'
    });
    if (flight.success && flight.data) {
      console.log('✅ Flight data passed');
      const status = flight.data.flight_status;
      console.log('   Status:', status);
    } else {
      console.log('❌ Flight data failed:', flight.error);
    }
  } catch (error) {
    console.log('❌ Flight data error:', error);
  }

  console.log('\n🏁 BFF API testing completed!');
}

// Error handling test
async function testErrorHandling() {
  console.log('\n🔧 Testing error handling...\n');

  // Test invalid input
  const invalidResponse = await bffApi.getDirections({
    origin: '', // Invalid empty origin
    destination: 'Boston, MA'
  });

  const errorMessage = BffApiService.handleApiError(invalidResponse);
  console.log('Error handling test:', errorMessage);
}

// Run tests if this file is executed directly
if (require.main === module) {
  testBffEndpoints()
    .then(() => testErrorHandling())
    .catch(console.error);
}

export { testBffEndpoints, testErrorHandling };
