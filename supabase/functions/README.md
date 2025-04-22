# Supabase Edge Functions

This directory contains the Edge Functions for the DateAI application.

## Functions

- `search-events`: Searches for events from various sources
- `generate-itinerary`: Generates an AI-powered itinerary based on user preferences
- `scheduled-reminders`: Sends reminders for upcoming events and itineraries

## Setting up Scheduled Reminders

The `scheduled-reminders` function needs to be set up as a cron job to run regularly. Follow these steps:

1. Deploy the function to Supabase:
   ```bash
   supabase functions deploy scheduled-reminders
   ```

2. Set up a cron job to run the function every hour:
   ```bash
   curl -X POST "https://api.supabase.com/v1/projects/{PROJECT_ID}/cron-jobs" \
     -H "Authorization: Bearer {SERVICE_ROLE_KEY}" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Send Event Reminders",
       "schedule": "0 * * * *",
       "command": "curl -X POST https://{PROJECT_REF}.functions.supabase.co/scheduled-reminders -H \"Authorization: Bearer {ANON_KEY}\""
     }'
   ```

   Replace:
   - `{PROJECT_ID}` with your Supabase project ID
   - `{SERVICE_ROLE_KEY}` with your Supabase service role key
   - `{PROJECT_REF}` with your Supabase project reference
   - `{ANON_KEY}` with your Supabase anon key

3. Verify the cron job is set up correctly:
   ```bash
   curl -X GET "https://api.supabase.com/v1/projects/{PROJECT_ID}/cron-jobs" \
     -H "Authorization: Bearer {SERVICE_ROLE_KEY}"
   ```

## Testing Reminders

You can manually trigger the reminders function for testing:

```bash
curl -X POST "https://{PROJECT_REF}.functions.supabase.co/scheduled-reminders" \
  -H "Authorization: Bearer {ANON_KEY}"
```
