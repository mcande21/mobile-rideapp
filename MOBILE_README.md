# Mobile Development Setup (iOS & Android)

This project has been configured to work as a mobile app using Capacitor. You can now build and run the app on iOS and Android devices.

## Prerequisites

### For iOS Development
- **macOS** (required for iOS development)
- **Xcode** (latest version from App Store)
- **iOS Simulator** (comes with Xcode)
- **CocoaPods** (install with `sudo gem install cocoapods`)

### For Android Development
- **Android Studio** (download from [developer.android.com](https://developer.android.com/studio))
- **Android SDK** (installed via Android Studio)
- **Java JDK** (install OpenJDK 11 or higher)

## Available Scripts

### Building for Mobile
```bash
# Build the web app and sync with mobile platforms
npm run build:mobile

# Sync changes with mobile platforms (after making changes)
npm run cap:sync
```

### Running on Mobile

#### iOS
```bash
# Open iOS project in Xcode
npm run ios

# Run directly on iOS simulator/device
npm run cap:run:ios
```

#### Android
```bash
# Open Android project in Android Studio
npm run android

# Run directly on Android emulator/device
npm run cap:run:android
```

## Project Structure

```
mobile-rideappstudio/
├── android/                 # Android native project
├── ios/                     # iOS native project
├── out/                     # Built web assets for mobile
├── src/
│   ├── lib/
│   │   └── mobile-utils.ts  # Mobile utility functions
│   ├── components/
│   │   └── MobileLayout.tsx # Mobile-specific layout
│   └── styles/
│       └── mobile.css       # Mobile-specific styles
├── capacitor.config.ts      # Capacitor configuration
└── build-mobile.sh          # Mobile build script
```

## Mobile Features Included

### Core Capacitor Plugins
- **App**: App state management and lifecycle
- **Status Bar**: Control status bar appearance
- **Splash Screen**: Manage app launch screen
- **Device**: Get device information
- **Haptics**: Provide tactile feedback
- **Keyboard**: Handle virtual keyboard
- **Geolocation**: Access device location
- **Camera**: Take photos and videos
- **Filesystem**: File system access

### Mobile Utils
The `MobileUtils` class provides easy access to mobile features:

```typescript
import { MobileUtils } from '@/lib/mobile-utils';

// Check if running on native mobile
if (MobileUtils.isNative()) {
  // Mobile-specific code
}

// Get current location
const position = await MobileUtils.getCurrentPosition();

// Trigger haptic feedback
await MobileUtils.triggerHapticFeedback('medium');

// Get device info
const deviceInfo = await MobileUtils.getDeviceInfo();
```

## Development Workflow

1. **Make changes** to your React/Next.js code
2. **Build for mobile**: `npm run build:mobile`
3. **Open in IDE**: `npm run ios` or `npm run android`
4. **Run/Debug** in Xcode or Android Studio

## Important Notes

### API Routes
- API routes are temporarily disabled during mobile builds since Capacitor uses static export
- For mobile apps, consider using:
  - External APIs
  - Firebase Functions
  - Supabase Edge Functions
  - Or implement native networking

### Configuration
- App name: "Utopia Rideshare"
- Bundle ID: `com.ajsairportruns`
- Web directory: `out` (Next.js static export)

### Permissions
Mobile apps may require additional permissions for features like:
- Location access
- Camera access
- Storage access

These are configured in:
- iOS: `ios/App/App/Info.plist`
- Android: `android/app/src/main/AndroidManifest.xml`

## Troubleshooting

### Build Issues
- Ensure you've run `npm run build:mobile` before opening mobile projects
- Check that all dependencies are installed: `npm install`

### iOS Issues
- Make sure Xcode Command Line Tools are installed: `xcode-select --install`
- Update CocoaPods: `sudo gem install cocoapods`

### Android Issues
- Ensure Android SDK is properly configured
- Set ANDROID_HOME environment variable
- Install required SDK platforms in Android Studio

## Next Steps

1. **Customize app icon and splash screen**
2. **Configure app permissions** as needed
3. **Add native plugins** for additional functionality
4. **Test on real devices**
5. **Prepare for app store submission**

For more information, visit the [Capacitor Documentation](https://capacitorjs.com/docs).
