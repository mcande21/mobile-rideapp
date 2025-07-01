#!/bin/bash

# Migration Helper Script for BFF API
# This script helps identify remaining fetch calls that should be migrated to BFF

echo "🔍 BFF Migration Helper - Finding remaining fetch calls..."
echo ""

echo "📋 Direct API fetch calls that need migration:"
echo "================================================"
grep -rn --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.next "fetch.*['\"]\/api\/" . | grep -v "\.md:" | grep -v scripts/

echo ""
echo "🔧 Files already updated with BFF imports:"
echo "=========================================="
grep -rn --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.next "from.*bff-api" .

echo ""
echo "✅ BFF API Endpoints Available:"
echo "=============================="
echo "• /api/bff/health - Health check"
echo "• /api/bff/directions - Get directions and travel time"  
echo "• /api/bff/places-autocomplete - Places autocomplete"
echo "• /api/bff/reschedule - Calculate reschedule fees"
echo "• /api/bff/flight - Get flight information"
echo "• /api/bff/google-calendar/auth-url - Google Calendar auth URL"
echo "• /api/bff/google-calendar/add-event - Add calendar events"
echo "• /api/bff/google-calendar/list-calendars - List calendars"

echo ""
echo "📖 Migration Pattern:"
echo "==================="
echo "OLD: const response = await fetch('/api/endpoint', {...})"
echo "NEW: const response = await bffApi.methodName({...})"
echo ""
echo "Example:"
echo "OLD: fetch('/api/directions', {method: 'POST', body: JSON.stringify(data)})"
echo "NEW: bffApi.getDirections(data)"

echo ""
echo "🧪 Test the BFF API:"
echo "==================="
echo "npm run test:bff"

echo ""
echo "📚 For more details, see BFF_README.md"
