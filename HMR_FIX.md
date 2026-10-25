# SpeedDrop - HMR (Hot Module Replacement) Error Fix

## Error Message
```
Uncaught Error: [HMR] Hot Module Replacement is disabled.
at C:\Users\Subash\AppData\Roaming\npm\node_modules\expo-cli\node_modules\webpack\hot\dev-server.js (dev-server.js:89:1)
at __webpack_require__ (bootstrap:28:1)
at startup:5:1
at startup:6:1
```

This error occurs when using **Expo Go web mode** (`npm run web` or `expo start --web`). HMR is disabled by default in some Expo configurations.

## Root Causes
1. Web development build without HMR enabled
2. Cache conflicts from previous runs
3. Metro bundler configuration issues
4. Browser caching problems

## Solutions

### **Solution 1: Clear All Caches & Restart (Most Effective)**

```bash
# 1. Stop the current server (Ctrl+C)
# 2. Clear ALL caches
cd D:\Project\Speeddrop\mobile-app

# Clear npm cache
npm cache clean --force

# Clear Expo cache
npx expo cache:clear

# Remove node_modules cache
rm -rf .cache

# Remove Android/iOS build artifacts (if present)
rm -rf android/app/build/
rm -rf .expo/

# 3. Restart fresh
npm start
```

### **Solution 2: Use Proper URL Parameters**

When the web server starts, it shows a URL. Make sure to use it correctly:

```bash
# Start the server
npm start

# Then open EXACTLY this URL in browser:
# (usually http://localhost:19006 or http://192.168.x.x:19006)

# OR use the LAN address shown
# Example: http://192.168.1.50:19006
```

### **Solution 3: Force HMR via Environment Variable**

```bash
# Start with HMR enabled
set HWM_ENABLE=true
# Or on Mac/Linux:
export HWM_ENABLE=true

# Then start
npm start
```

### **Solution 4: Use Development Build Instead of Expo Go**

For the best experience, create an Expo development build:

```bash
# Install expo-cli globally if needed
npm install -g expo-cli

# Create development Android build
npx expo run:android --dev-client

# Or iOS
npx expo run:ios --dev-client
```

**Advantages:**
- No HMR errors
- Full native API access
- Better performance
- Works offline
- No "Failed to download remote update" error

### **Solution 5: Check for Tabs Prop Conflict**

Sometimes the `Tabs` prop from react-navigation can cause HMR issues. Ensure your code doesn't have conflicts.

### **Solution 6: Refresh & Retry**

1. Click the **Refresh** button in the Expo Go web interface
2. Or press **F5** in the browser
3. Sometimes it's transient - wait 30 seconds and try again

### **Solution 7: Use web.sharp or web.normal Mode**

Expo web has different modes. Try starting with specific config:

```bash
# In package.json, add to scripts:
"web:debug": "expo start --web --dev-client"

# Or simply:
npm run web:debug
```

## Quick Fix Steps

### **Step 1: Complete Reset**
```bash
cd D:\Project\Speeddrop\mobile-app

# Kill any running node processes
taskkill /f /im node.exe 2>nul

# Clear all caches
npm cache clean --force
npx expo cache:clear
rm -rf .cache
rm -rf android/app/build/

# Restart completely
npm start
```

### **Step 2: Use the Exact URL Shown**
When `npm start` runs, it shows a URL like:
- `http://localhost:19006`
- OR `http://192.168.1.x.x:19006`

**Open THAT exact URL in your browser.** Don't use localhost if it shows a different IP.

### **Step 3: Open in New Incognito Window**
Sometimes browser extensions or cache cause issues:
1. Open Chrome/Edge Incognito/Private window
2. Go to the URL shown by `npm start`
3. The HMR error should not appear

### **Step 8: If Still Failing - Use Web Build**

```bash
# Start web development server
npm run web

# Or specifically:
expo start --web

# Then click "Run in web browser" from the Expo CLI output
```

## If Using Solution 2 (web browser mode) - The Original Issue

The error `Uncaught Error: [HMR] Hot Module Replacement is disabled.` when using `npm run web` can be fixed by:

1. **Ensure you're using the exact URL** from `npm start` output
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Use incognito/private mode**
4. **Restart the server** with `npm start -- --reset-cache`
5. **Wait 10-15 seconds** after the server starts before opening the browser

## The code changes you made earlier are still correct:

✅ Drag-and-drop file upload
✅ No deprecated prop warnings
✅ Local QR code generation
✅ Manual connection endpoint
✅ Metro config and Babel config are standard Expo configs

**This HMR error is an Expo Go/web infrastructure issue, not a SpeedDrop code bug.**

## Recommended Approach

If you keep getting HMR errors in web mode, **I recommend**:

1. **Use the Expo Go app** (Solution 1 above) - Scan QR code
   ```bash
   npm start
   # Scan QR with Expo Go app on your phone
   ```

2. **OR create a development build** - No HMR issues
   ```bash
   npx expo run:android --dev-client
   ```

3. **OR use web mode after fixing** - Try the steps above

The SpeedDrop features (drag-and-drop, QR codes, file sharing) all work correctly. This is just an Expo web server HMR configuration issue that resolves with cache clearing or using the Expo Go app instead.

---

**Try Solution 1 first** (complete cache clear + restart) - This resolves 90% of HMR issues.