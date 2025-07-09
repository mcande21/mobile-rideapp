#!/bin/bash

# Build script for Capacitor mobile app
# Usage: ./build-mobile.sh [development|staging|production]

ENVIRONMENT=${1:-production}
echo "Building mobile app for $ENVIRONMENT environment..."

# Temporarily move API routes
if [ -d "src/app/api" ]; then
    echo "Moving API routes temporarily..."
    mv src/app/api ./api_temp
fi

# Set environment variables for mobile build
export CAPACITOR_BUILD=true
export NODE_ENV=$ENVIRONMENT

# Load environment-specific variables
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Loading production environment variables..."
    export $(grep -v '^#' .env.production | xargs)
elif [ "$ENVIRONMENT" = "staging" ]; then
    echo "Loading staging environment variables..."
    export $(grep -v '^#' .env.staging | xargs)
else
    echo "Loading development environment variables..."
    export $(grep -v '^#' .env.local | xargs)
fi

# Build the app
echo "Building Next.js app..."
next build

# Restore API routes
if [ -d "./api_temp" ]; then
    echo "Restoring API routes..."
    mv ./api_temp src/app/api
fi

# Sync with Capacitor
echo "Syncing with Capacitor..."
npx cap sync

echo "Mobile build complete for $ENVIRONMENT environment!"
echo "To run on iOS: npm run cap:run:ios"
echo "To run on Android: npm run cap:run:android"
