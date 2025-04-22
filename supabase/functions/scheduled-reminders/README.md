# Scheduled Reminders Function

This Edge Function is responsible for sending reminders for upcoming events and itineraries.

## How it works

1. The function calls two PostgreSQL functions:
   - `send_event_reminders()`: Sends reminders for events happening within the next 24 hours
   - `send_itinerary_reminders()`: Sends reminders for itineraries scheduled within the next 24 hours

2. These functions insert notifications into the `notifications` table, which users will see in their notification center.

## Deployment

Deploy this function to Supabase:

```bash
supabase functions deploy scheduled-reminders
```

## Setting up as a Cron Job

This function should be set up as a cron job to run regularly. See the main README in the `functions` directory for instructions on setting up the cron job.

## Testing

You can manually trigger the function for testing:

```bash
curl -X POST "https://{PROJECT_REF}.functions.supabase.co/scheduled-reminders" \
  -H "Authorization: Bearer {ANON_KEY}"
```

Replace:
- `{PROJECT_REF}` with your Supabase project reference
- `{ANON_KEY}` with your Supabase anon key

## Response Format

The function returns a JSON response with the following structure:

```json
{
  "success": true,
  "message": "Reminders processed successfully",
  "eventError": null,
  "itineraryError": null
}
```

If there are errors, the `eventError` and `itineraryError` fields will contain error messages.
