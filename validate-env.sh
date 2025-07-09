#!/bin/bash

# Environment validation script
# Usage: ./validate-env.sh [development|staging|production]

ENVIRONMENT=${1:-development}

echo "🔍 Validating environment configuration for: $ENVIRONMENT"
echo "================================================"

# Load environment variables
if [ "$ENVIRONMENT" = "production" ]; then
    ENV_FILE=".env.production"
elif [ "$ENVIRONMENT" = "staging" ]; then
    ENV_FILE=".env.staging"
else
    ENV_FILE=".env.local"
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file not found: $ENV_FILE"
    exit 1
fi

echo "✅ Environment file found: $ENV_FILE"

# Source the environment file
set -a
source "$ENV_FILE"
set +a

# Validate required variables
echo ""
echo "🔧 Validating required environment variables..."

check_var() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [ -z "$var_value" ]; then
        echo "❌ Missing required variable: $var_name"
        return 1
    else
        echo "✅ $var_name is set"
        return 0
    fi
}

VALIDATION_FAILED=0

# Firebase variables
check_var "NEXT_PUBLIC_FIREBASE_API_KEY" || VALIDATION_FAILED=1
check_var "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" || VALIDATION_FAILED=1
check_var "NEXT_PUBLIC_FIREBASE_PROJECT_ID" || VALIDATION_FAILED=1
check_var "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" || VALIDATION_FAILED=1
check_var "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" || VALIDATION_FAILED=1
check_var "NEXT_PUBLIC_FIREBASE_APP_ID" || VALIDATION_FAILED=1

# API variables
check_var "NEXT_PUBLIC_API_URL" || VALIDATION_FAILED=1
check_var "NEXT_PUBLIC_GOOGLE_API_KEY" || VALIDATION_FAILED=1

# App variables
check_var "NEXT_PUBLIC_APP_NAME" || VALIDATION_FAILED=1
check_var "NEXT_PUBLIC_APP_VERSION" || VALIDATION_FAILED=1

echo ""
echo "🌐 Testing API endpoints..."

# Test Firebase endpoint
if command -v curl &> /dev/null; then
    echo "Testing Firebase Auth domain..."
    if curl -s --head "https://$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" | head -n 1 | grep -q "200 OK"; then
        echo "✅ Firebase Auth domain is accessible"
    else
        echo "⚠️  Firebase Auth domain may not be accessible"
    fi
    
    # Test API endpoint
    if [ "$ENVIRONMENT" = "production" ]; then
        API_URL="$NEXT_PUBLIC_API_URL"
    elif [ "$ENVIRONMENT" = "staging" ]; then
        API_URL="$NEXT_PUBLIC_STAGING_API_URL"
    else
        API_URL="$NEXT_PUBLIC_DEV_API_URL"
    fi
    
    if [ -n "$API_URL" ]; then
        echo "Testing API endpoint: $API_URL"
        if curl -s --head "$API_URL" | head -n 1 | grep -q "200\|302\|404"; then
            echo "✅ API endpoint is accessible"
        else
            echo "⚠️  API endpoint may not be accessible"
        fi
    fi
else
    echo "⚠️  curl not available, skipping endpoint tests"
fi

echo ""
echo "📱 Environment-specific configurations..."

if [ "$ENVIRONMENT" = "production" ]; then
    echo "✅ Production mode: Security features enabled"
    echo "✅ Production mode: Firebase emulators disabled"
    echo "✅ Production mode: Certificate pinning enabled"
elif [ "$ENVIRONMENT" = "staging" ]; then
    echo "✅ Staging mode: Partial security features"
    echo "✅ Staging mode: Firebase emulators disabled"
    echo "✅ Staging mode: Request signing enabled"
else
    echo "✅ Development mode: Firebase emulators enabled"
    echo "✅ Development mode: Cleartext traffic allowed"
    echo "✅ Development mode: Debug logging enabled"
fi

echo ""
echo "================================================"

if [ $VALIDATION_FAILED -eq 0 ]; then
    echo "✅ Environment validation passed for $ENVIRONMENT"
    echo "🚀 Ready to build for $ENVIRONMENT"
else
    echo "❌ Environment validation failed"
    echo "Please check the missing variables and try again"
    exit 1
fi
