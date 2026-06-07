# I-Play Turf Booking

Next.js application for public turf bookings and private operations management.

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase project URL, anon key, and server-only service-role key.
3. Apply the SQL files in `supabase/migrations/` to Supabase in filename order.
4. Run `npm install`, then `npm run dev`.

Without Supabase environment variables, the public page runs in availability
demo mode and booking submissions remain disabled. The admin panel requires a
live Supabase connection and never displays sample operational records.

## Commands

- `npm run dev` starts the local app.
- `npm run lint` runs ESLint.
- `npm test` runs pricing and slot-logic tests.
- `npm run build` verifies the production build.

Invoice records include Preview and PDF actions. PDF downloads are generated
from live Supabase invoice data as polished A4 documents suitable for sharing.

The admin CMS includes monthly cashflow, configured academy fee plans, a
filterable/exportable contact book, demo lead capture without payment, and a
full booking/invoice/transaction history for each contact. Apply
`supabase/migrations/20260607010000_academy_crm.sql` to store academy batches
and member statuses in dedicated Supabase columns. Until it is applied, the app
uses a compatibility format in contact notes so the contact-book workflow can
still be used.

Turf bookings support flexible 30-minute steps from 30 minutes to 5 hours.
Invoices, turf bookings, transactions, exports, and contact history track
payment mode as Cash or UPI. Apply
`supabase/migrations/20260607020000_payment_modes_flexible_bookings.sql` before
using fractional booking durations or payment-mode reporting.

The public booking flow shows the current and next calendar month with live
full/nearly-full date indicators, then refreshes availability after each saved
booking.

## Security

- The Supabase service-role key is server-only.
- Row-level security is enabled with no direct client data policies.
- Confirmed booking overlaps are rejected by a PostgreSQL exclusion constraint.
- Live admin customer and revenue APIs are restricted to localhost until
  Supabase Auth is connected.
