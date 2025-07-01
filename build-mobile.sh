#!/bin/bash

# Build script for Capacitor mobile app
echo "Building mobile app..."

# Temporarily move API routes
if [ -d "src/app/api" ]; then
    echo "Moving API routes temporarily..."
    mv src/app/api ./api_temp
fi

# Set environment variable for mobile build
export CAPACITOR_BUILD=true

# Build the app
next build

# Restore API routes
if [ -d "./api_temp" ]; then
    echo "Restoring API routes..."
    mv ./api_temp src/app/api
fi

# Sync with Capacitor
npx cap sync

echo "Mobile build complete!"
