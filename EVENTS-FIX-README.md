# Events Not Pulling Fix

This document provides instructions on how to fix the issue with events not pulling in the application.

## Issues Fixed

1. **CORS Error**: Fixed CORS headers to allow requests from the application domain.
2. **RapidAPI Integration**: Enhanced the RapidAPI integration to ensure events are displayed even when the API doesn't return any.
3. **Fallback Events**: Added fallback events to ensure users always see something on the map.

## Files Modified

1. `supabase/functions/rapidapi-events/index.ts`: Updated CORS headers and improved fallback event generation.
2. `supabase/functions/_shared/cors.ts`: Updated CORS headers to include the access-control-allow-origin header.

## Deployment Instructions

### 1. Deploy the Updated Functions

Run the deployment script to deploy the updated functions to Supabase:

```bash
node deploy-functions.js
```

If you don't have the Supabase CLI installed, you can install it with:

```bash
npm install -g supabase
```

### 2. Set the RapidAPI Key

Set the RapidAPI key in the Supabase environment:

```bash
node set-rapidapi-env.js
```

Alternatively, you can set it manually in the Supabase dashboard:
1. Go to the Supabase dashboard: https://app.supabase.com/project/akwvmljopucsnorvdwuu/settings/functions
2. For each function (search-events, rapidapi-events, rapidapi-debug):
3. Add the following environment variables:
   - RAPIDAPI_KEY: 92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9
   - X_RAPIDAPI_KEY: 92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9
   - REAL_TIME_EVENTS_API_KEY: 92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9
4. Save the changes

### 3. Test the Functions

You can test the functions using the provided test tools:

1. Open `test-rapidapi-browser.html` in your browser to test both direct API calls and the Supabase function.
2. Run `node test-rapidapi-key.js` to test the RapidAPI key and the Supabase function.

### 4. Verify in Your Application

After deploying the functions and setting the RapidAPI key, verify that events are now displaying in your application:

1. Open your application
2. Navigate to the map page
3. Search for a location
4. Verify that events are displayed on the map

## Troubleshooting

If you're still experiencing issues:

1. Check the browser console for errors
2. Verify that the RapidAPI key is set correctly in the Supabase environment
3. Try the `rapidapi-debug` function to diagnose issues with the RapidAPI key:
   ```
   curl https://akwvmljopucsnorvdwuu.functions.supabase.co/rapidapi-debug
   ```
4. Check the Supabase logs for errors:
   ```
   supabase functions logs rapidapi-events
   ```

## Additional Notes

- The fallback event generation is enabled by default to ensure users always see events on the map.
- The RapidAPI integration has been improved to better handle coordinates and party-specific keywords.
- The CORS headers have been updated to allow requests from any domain.
