# Sign-up Flow Test Guide

## Testing the Google Sign-up Flow

To test if the Google sign-up flow is working correctly, follow these steps:

### Expected Flow:
1. User visits `/signup`
2. User clicks "Sign Up with Google"
3. User completes Google authentication
4. User is redirected to `/complete-profile` with name pre-filled
5. User fills in phone number and optionally home address
6. User clicks "Save and Continue"
7. User is redirected to `/user` dashboard

### Debug Steps:

1. **Check Console Logs**: Open browser dev tools and monitor console for any errors during the Google sign-up process.

2. **Verify User Creation**: After Google sign-up, check if:
   - `currentUser` is set (Firebase Auth user)
   - `currentUserProfile` is set with name but no phone number
   - User is redirected to `/complete-profile`

3. **Check Profile Completion**: On the complete-profile page, verify:
   - Name field is pre-filled with Google display name
   - Phone number field is empty and required
   - Home address field is optional

4. **Verify Final Redirect**: After completing profile, check if:
   - User profile is updated with phone number
   - User is redirected to appropriate dashboard

### Common Issues Fixed:

1. **Race Condition**: Fixed timing issue where `onAuthStateChanged` might fire before user document is created
2. **Immediate State Update**: `signInWithGoogle` now immediately updates the store with new user profile
3. **Retry Mechanism**: Added retry logic in auth state listener to handle delayed document creation
4. **Proper Redirects**: Improved redirect logic to handle edge cases

### If Issues Persist:

1. Check Firebase console to see if user documents are being created properly
2. Verify that the user has the correct fields set (name, role, avatarUrl) but no phoneNumber
3. Check network tab for any failed API calls to Google or Firebase
