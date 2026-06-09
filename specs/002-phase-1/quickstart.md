# Phase 1: Quickstart

## Getting Started

1. **Setup Supabase**: Ensure you have the Supabase project credentials in your `.env` file (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
2. **Database Migrations**: Run the SQL scripts provided in `server/migrations/` to set up the tables and RLS policies.
3. **Seed Data**: Run the seed script in `server/seeds/` to populate the initial baseline content (20 stories, 10 games, etc.).
4. **Run App**: Start the React Native development server. The app will now fetch live data from Supabase.
