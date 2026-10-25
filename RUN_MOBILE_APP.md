# SpeedDrop Mobile App - How to Run

## Prerequisites

1. **Node.js** installed (v14 or higher)
2. **Expo Go** app installed on your phone:
   - iOS: App Store → Search "Expo Go"
   - Android: Google Play Store → Search "Expo Go"
3. **Same Wi-Fi network** for phone and development computer

## Step-by-Step Instructions

### 1. Install Dependencies
```bash
cd D:\Project\Speeddrop\mobile-app
npm install
# OR
yarn install
```

### 2. Start the Development Server
```bash
npm start
# OR
yarn start
```

### 3. Choose How to Run

#### Option A: Expo Go App (Recommended)
1. The terminal will show a QR code
2. Open **Expo Go** on your phone
3. Scan the QR code displayed in the terminal
4. The app will load on your phone

#### Option B: Android Emulator
```bash
npm run android
# OR
expo run:android
```

#### Option C: iOS Simulator
```bash
npm run ios
# OR
expo run:ios
```

#### Option C: Web Browser
```bash
npm run web
# OR
expo start --web
```

## Port Configuration

If port 8081 is busy, use:
```bash
npm start -- --port 8082
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8081
npx kill-dev-server --port 8081

# Or start on different port
npx expo start --port 8082
```

### Metro Bundler Not Starting
```bash
# Clear cache and restart
npx expo start --clear

# Or reset
rm -rf mobile-app/node_modules/.cache
npm start
```

### Device Not Connecting
1. Ensure phone and computer are on **same Wi-Fi network**
2. Disable VPN if enabled
3. Firewall may need to allow connections on port 8081/8082

### Common Errors

#### "Unable to connect to development server"
- Check that both devices are on same network
- Restart the bundler: `Ctrl+C` then `npm start`

#### "Red screen of death" in Expo
- This is expected during development
- Check the terminal for specific error messages
- Common: missing dependencies, syntax errors

#### QR code not scanning
- Ensure good lighting
- Keep phone 20-30cm from screen
- Try web option: `npm run web`

## Development Workflow

1. **Start server**: `npm start`
2. **Scan QR code** with Expo Go app
3. **Make code changes** - they'll auto-reload
4. **Test file sharing** between devices
5. **Stop server**: `Ctrl+C`

## After First Run

Future runs will be faster:
```bash
# Just start - it remembers the QR code
npm start
```

Or to restart:
```bash
# Reset and start fresh
npx expo start --clear
```

## Project Structure

```
mobile-app/
├── android/        # Android native code
├── assets/         # Images and icons
├── backend/        # API server (separate)
├── src/            # React Native source code
├── node_modules/   # Dependencies
├── .env.example    # Environment variables
├── app.json        # Expo configuration
├── package.json    # Dependencies
└── tsconfig.json   # TypeScript config
```

## Key Files Modified (Recent Fixes)

- `App.tsx` - Fixed deprecated shadow props
- `theme.ts` - Added boxShadow fallbacks for web
- `ReceiverScreen.tsx` - Improved QR code error handling
- `server.ts` - Added /api/sharer/discover endpoint
- `FileSender.tsx` - Added drag-and-drop file upload

## Need Help?

Check the terminal for specific error messages, or:
1. `npm audit` - Check for vulnerabilities
2. `npx expo doctor` - Diagnose issues
3. Expo Docs: https://docs.expo.dev

---

**Ready to test!** Run `npm start` and scan the QR code with Expo Go on your phone.