# I-Play Turf Booking

Next.js application for public turf bookings and private operations management.

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase project URL, anon key, and server-only service-role key.
3. Apply `supabase/migrations/20260606160000_initial_schema.sql` to Supabase.
4. Run `npm install`, then `npm run dev`.

Without Supabase environment variables, the public page runs in availability
demo mode and booking submissions remain disabled. The admin panel requires a
live Supabase connection and never displays sample operational records.

## Commands

- `npm run dev` starts the local app.
- `npm run lint` runs ESLint.
- `npm test` runs pricing and slot-logic tests.
- `npm run build` verifies the production build.

## Security

- The Supabase service-role key is server-only.
- Row-level security is enabled with no direct client data policies.
- Confirmed booking overlaps are rejected by a PostgreSQL exclusion constraint.
- Live admin customer and revenue APIs are restricted to localhost until
  Supabase Auth is connected.
