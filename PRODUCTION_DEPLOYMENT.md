# Production Deployment Configuration

This document outlines the production-ready configuration for the Utopia Rideshare mobile app.

## Environment Configuration

### Development Environment (`.env.local`)
- Uses Firebase emulators for local development
- Connects to local development server
- Includes hardcoded IPs for development convenience

### Staging Environment (`.env.staging`)
- Uses production Firebase services
- Connects to staging API endpoints
- Includes staging-specific configurations

### Production Environment (`.env.production`)
- Uses production Firebase services
- Connects to production API endpoints
- Optimized for App Store deployment

## Required Environment Variables

### Firebase Configuration
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### API Configuration
```bash
NEXT_PUBLIC_API_URL=https://your-production-api.com
NEXT_PUBLIC_DEV_API_URL=http://localhost:5001
NEXT_PUBLIC_STAGING_API_URL=https://staging-api.com
```

### App Configuration
```bash
NEXT_PUBLIC_APP_NAME=Utopia Rideshare
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_GOOGLE_API_KEY=your-google-maps-key
```

## Build Commands

### Development Build
```bash
npm run build:mobile:dev
```

### Staging Build
```bash
npm run build:mobile:staging
```

### Production Build
```bash
npm run build:mobile:production
```

## Deployment Checklist

### Pre-deployment
- [ ] Update app version in environment files
- [ ] Verify all production API endpoints are accessible
- [ ] Test Firebase configuration in production
- [ ] Verify Google Maps API key is valid for production
- [ ] Check app icons and splash screens are updated

### iOS App Store Deployment
- [ ] Run `npm run build:mobile:production`
- [ ] Open iOS project: `npm run ios`
- [ ] Set release configuration in Xcode
- [ ] Update app version and build number
- [ ] Test on physical device
- [ ] Submit to App Store Connect

### Android Play Store Deployment
- [ ] Run `npm run build:mobile:production`
- [ ] Open Android project: `npm run android`
- [ ] Set release configuration in Android Studio
- [ ] Update app version and build number
- [ ] Generate signed APK/AAB
- [ ] Test on physical device
- [ ] Submit to Google Play Console

## Security Considerations

### Production Features
- Certificate pinning (enabled in production)
- Request signing (enabled in staging/production)
- Secure storage for sensitive data
- Network security configurations

### Environment-Specific Security
- **Development**: Emulators, relaxed security
- **Staging**: Production security with staging endpoints
- **Production**: Full security features enabled

## Troubleshooting

### Common Issues
1. **Firebase connection fails**: Check environment variables
2. **API endpoints unreachable**: Verify network configuration
3. **Build fails**: Check Node.js version and dependencies
4. **Emulators not connecting**: Verify emulator host configuration

### Development vs Production
- Development uses localhost/network IPs
- Production uses production domains
- Emulators are disabled in production builds

## Network Configuration

### Development
- Uses local network IP for device testing
- Connects to Firebase emulators
- Allows cleartext traffic

### Production
- Uses HTTPS endpoints only
- Connects to production Firebase
- Enforces secure connections

## Monitoring and Logging

### Error Tracking
- Production errors should be sent to error tracking service
- Development errors logged to console
- Device information included in error reports

### Performance Monitoring
- Firebase Performance Monitoring enabled
- Network request timing tracked
- App startup time monitored
