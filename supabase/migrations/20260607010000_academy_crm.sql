create table if not exists public.academy_programs (
  slug text primary key,
  category text not null check (category in ('yoga', 'chess', 'cricket')),
  name text not null,
  schedule text not null,
  audience text not null,
  monthly_fee integer not null check (monthly_fee > 0),
  registration_fee integer not null default 0 check (registration_fee >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.academy_programs (
  slug, category, name, schedule, audience, monthly_fee, registration_fee
) values
  ('yoga_morning', 'yoga', 'Yoga Morning Batch', '8:00 AM - 9:15 AM', 'Open to all', 1200, 0),
  ('yoga_women_evening', 'yoga', 'Women''s Yoga Evening Batch', '5:00 PM - 6:00 PM', 'Women only', 1200, 0),
  ('chess_evening', 'chess', 'Chess Academy', '6:30 PM - 8:00 PM', 'Academy members', 1500, 0),
  ('cricket_evening', 'cricket', 'Cricket Academy', '6:30 PM - 8:00 PM', 'Academy members', 1500, 500)
on conflict (slug) do update set
  category = excluded.category,
  name = excluded.name,
  schedule = excluded.schedule,
  audience = excluded.audience,
  monthly_fee = excluded.monthly_fee,
  registration_fee = excluded.registration_fee,
  updated_at = now();

alter table public.contacts
  add column if not exists client_type text
    check (client_type in ('turf', 'yoga', 'chess', 'cricket')),
  add column if not exists program_slug text references public.academy_programs(slug),
  add column if not exists member_status text not null default 'active'
    check (member_status in ('demo', 'active', 'inactive'));

alter table public.invoices
  add column if not exists program_slug text references public.academy_programs(slug),
  add column if not exists fee_kind text not null default 'monthly'
    check (fee_kind in ('monthly', 'new_registration', 'other'));

update public.contacts
set client_type = type
where client_type is null and type in ('turf', 'yoga', 'chess', 'cricket');

update public.contacts
set
  program_slug = case substring(notes from '\[\[iplay-crm:v1;program=([a-z_]*);status=')
    when 'yoga_morning' then 'yoga_morning'
    when 'yoga_women_evening' then 'yoga_women_evening'
    when 'chess_evening' then 'chess_evening'
    when 'cricket_evening' then 'cricket_evening'
    else program_slug
  end,
  member_status = coalesce(
    substring(notes from ';status=(demo|active|inactive)\]\]'),
    member_status
  ),
  notes = regexp_replace(
    notes,
    '^\[\[iplay-crm:v1;program=[a-z_]*;status=(demo|active|inactive)\]\]\n?',
    ''
  )
where notes like '[[iplay-crm:v1;%';

create index if not exists contacts_client_type_status_idx
  on public.contacts (client_type, member_status);
create index if not exists contacts_program_slug_idx
  on public.contacts (program_slug);
create index if not exists invoices_program_slug_idx
  on public.invoices (program_slug);

create or replace function public.sync_booking_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform ensure_contact(new.customer_name, new.customer_phone, new.customer_email);

  update contacts
  set client_type = coalesce(client_type, 'turf')
  where phone = new.customer_phone;

  insert into transactions (
    reference_id, reference_type, customer_name, customer_phone,
    type, amount, status, transaction_date
  ) values (
    new.id, 'booking', new.customer_name, new.customer_phone,
    'turf', new.total_price,
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
    type, amount, status, transaction_date
  ) values (
    new.id, 'invoice', new.customer_name, new.customer_phone,
    new.academy_type, new.amount,
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
    status = excluded.status,
    transaction_date = excluded.transaction_date,
    updated_at = now();

  perform refresh_contact_rollup(new.customer_phone);
  return new;
end;
$$;

drop trigger if exists academy_programs_updated_at on public.academy_programs;
create trigger academy_programs_updated_at
before update on public.academy_programs
for each row execute function public.set_updated_at();

alter table public.academy_programs enable row level security;
