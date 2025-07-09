#!/bin/bash

# Start Firebase Emulators with proper environment configuration
echo "🔥 Starting Firebase Emulators for development..."

# Set environment variables for emulator mode
export FIRESTORE_EMULATOR_HOST=localhost:8080
export FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
export FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
export FUNCTIONS_EMULATOR_HOST=localhost:5001

# Clear any existing service account credentials to avoid production warnings
unset GOOGLE_APPLICATION_CREDENTIALS
unset FIREBASE_SERVICE_ACCOUNT_JSON

# Start emulators
echo "🚀 Starting Firebase emulators..."
echo "   - Auth: http://localhost:9099"
echo "   - Firestore: http://localhost:8080"
echo "   - Functions: http://localhost:5001"
echo "   - Storage: http://localhost:9199"
echo "   - Hosting: http://localhost:5000"
echo "   - UI: http://localhost:4000"
echo ""
echo "📱 Mobile app will connect to emulators automatically in development mode"
echo "🌐 Web app at: http://localhost:5000"
echo ""

# Start Firebase emulators
firebase emulators:start --project rideappstudio
