alter table public.bookings
  drop constraint if exists bookings_duration_hours_check;

alter table public.bookings
  alter column duration_hours type numeric(3,1) using duration_hours::numeric;

alter table public.bookings
  add constraint bookings_duration_hours_check
    check (
      duration_hours between 0.5 and 5
      and mod(duration_hours * 2, 1) = 0
    ),
  add column if not exists payment_mode text not null default 'cash'
    check (payment_mode in ('cash', 'upi'));

alter table public.invoices
  add column if not exists payment_mode text not null default 'cash'
    check (payment_mode in ('cash', 'upi'));

alter table public.transactions
  add column if not exists payment_mode text not null default 'cash'
    check (payment_mode in ('cash', 'upi'));

create index if not exists transactions_payment_mode_date_idx
  on public.transactions (payment_mode, transaction_date);

create or replace function public.sync_booking_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform ensure_contact(new.customer_name, new.customer_phone, new.customer_email);

  update contacts
  set client_type = coalesce(client_type, 'turf')
  where phone = new.customer_phone;

  insert into transactions (
    reference_id, reference_type, customer_name, customer_phone,
    type, amount, payment_mode, status, transaction_date
  ) values (
    new.id, 'booking', new.customer_name, new.customer_phone,
    'turf', new.total_price, new.payment_mode,
    case
      when new.status = 'confirmed' then 'completed'
      when new.status = 'cancelled' then 'refunded'
      else 'pending'
    end,
    new.booking_date
  )
  on conflict (reference_type, reference_id) do update set
    customer_name = excluded.customer_name,
    customer_phone = excluded.customer_phone,
    amount = excluded.amount,
    payment_mode = excluded.payment_mode,
    status = excluded.status,
    transaction_date = excluded.transaction_date,
    updated_at = now();

  perform refresh_contact_rollup(new.customer_phone);
  return new;
end;
$$;

create or replace function public.sync_invoice_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update contacts
  set
    client_type = new.academy_type,
    program_slug = coalesce(new.program_slug, contacts.program_slug),
    member_status = case when new.status = 'paid' then 'active' else member_status end
  where phone = new.customer_phone;

  insert into transactions (
    reference_id, reference_type, customer_name, customer_phone,
    type, amount, payment_mode, status, transaction_date
  ) values (
    new.id, 'invoice', new.customer_name, new.customer_phone,
    new.academy_type, new.amount, new.payment_mode,
    case
      when new.status = 'paid' then 'completed'
      when new.status = 'cancelled' then 'refunded'
      else 'pending'
    end,
    new.invoice_date
  )
  on conflict (reference_type, reference_id) do update set
    customer_name = excluded.customer_name,
    customer_phone = excluded.customer_phone,
    type = excluded.type,
    amount = excluded.amount,
    payment_mode = excluded.payment_mode,
    status = excluded.status,
    transaction_date = excluded.transaction_date,
    updated_at = now();

  perform refresh_contact_rollup(new.customer_phone);
  return new;
end;
$$;
