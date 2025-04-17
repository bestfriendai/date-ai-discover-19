#!/bin/bash

# Apply migrations to Supabase project
echo "Applying migrations to Supabase project..."

# Run migrations
npx supabase db push

echo "Migrations applied successfully!"
