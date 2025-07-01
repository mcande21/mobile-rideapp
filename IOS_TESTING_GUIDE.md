# iOS Mobile Testing Guide for BFF API

## 🍎 iOS Testing Checklist

After opening the project in Xcode, follow these steps to test the BFF API functionality:

### 1. **Run on iOS Simulator**
1. In Xcode, select a simulator (iPhone 15 or newer recommended)
2. Click the ▶️ Play button to build and run
3. Wait for the app to launch on the simulator

### 2. **Test BFF API Endpoints**

#### **Health Check Test**
- Open the app and check if it loads without errors
- Check browser dev tools (if testing on web) or Xcode console for any API errors

#### **Places Autocomplete Test**
- Navigate to any screen with location input
- Start typing in location fields (pickup/dropoff)
- Verify autocomplete suggestions appear
- **Expected**: Should see place suggestions from Google Places API

#### **Directions Test**
- Enter origin and destination addresses
- Submit the form to get directions
- **Expected**: Should see travel time and distance calculations

#### **Reschedule Fee Test**
- Navigate to a ride that can be rescheduled
- Try to reschedule the ride
- **Expected**: Should see calculated reschedule fees

#### **Flight Data Test**
- Look for any flight-related features
- Enter a flight number (e.g., "AA123")
- **Expected**: Should see flight status information

#### **Google Calendar Integration Test**
- Navigate to calendar settings or integration
- Try to connect Google Calendar
- **Expected**: Should redirect to Google OAuth or show calendar options

### 3. **Network Configuration for iOS Testing**

#### **For Simulator Testing (localhost)**
- Make sure your dev server is running: `npm run dev`
- The simulator should be able to reach `http://localhost:9002`
- Check `src/lib/mobile-config.ts` - it should detect Capacitor and use the correct URL

#### **For Device Testing (requires production URL)**
- You'll need to update `.env.local` with a publicly accessible URL
- Or use ngrok to tunnel localhost: `ngrok http 9002`
- Update `NEXT_PUBLIC_API_BASE_URL` to the ngrok URL

### 4. **Debug Tools**

#### **Xcode Console**
- Open View → Debug Area → Console in Xcode
- Look for any JavaScript errors or network failures
- Look for BFF API calls and responses

#### **Safari Web Inspector** (for simulator)
1. Enable Web Inspector: Safari → Preferences → Advanced → Show Develop menu
2. In Safari: Develop → Simulator → [Your App]
3. Check Network tab for API calls
4. Check Console for JavaScript errors

### 5. **Expected API Behavior on Mobile**

✅ **What Should Work:**
- All API calls go through `/api/bff/*` endpoints
- Automatic retry on network failures
- Proper error handling for mobile networks
- Response unwrapping handled by BFF API client

✅ **BFF Advantages on Mobile:**
- Single API endpoint to manage
- Built-in rate limiting
- Mobile-optimized timeouts (30s)
- Consistent error handling
- Better security (API keys hidden)

### 6. **Common Issues & Solutions**

| Issue | Solution |
|-------|----------|
| "Failed to fetch" errors | Check if dev server is running on port 9002 |
| "Network error" | Verify simulator can reach localhost, or use device with ngrok |
| Data showing as "undefined" | Check BFF response format in Network tab |
| Google APIs not working | Verify API keys in `.env.local` |
| Calendar redirect fails | Update `GOOGLE_REDIRECT_URL` for mobile testing |

### 7. **Performance Testing**

- Test on slower network conditions (Xcode → Network Conditioner)
- Verify retry logic works with poor connectivity
- Check app behavior when completely offline

### 8. **Security Testing**

- Verify no direct API calls bypass the BFF layer
- Check that API keys are not exposed in client code
- Confirm all external API calls are proxied through BFF

## 🚀 Next Steps After iOS Testing

1. **Fix any issues found during testing**
2. **Update production configuration** when ready to deploy
3. **Add push notifications** for ride updates
4. **Implement offline support** for core features
5. **Add background sync** for when app returns online

## 📝 Testing Notes

Use this space to document any issues found during iOS testing:

- [ ] Health check works
- [ ] Places autocomplete works  
- [ ] Directions calculation works
- [ ] Reschedule fee calculation works
- [ ] Flight data retrieval works
- [ ] Google Calendar integration works
- [ ] Error handling works properly
- [ ] Performance is acceptable
- [ ] No console errors
