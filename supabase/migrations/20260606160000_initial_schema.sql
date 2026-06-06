create extension if not exists btree_gist;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  customer_phone text not null check (customer_phone ~ '^[6-9][0-9]{9}$'),
  customer_email text,
  booking_date date not null,
  start_time time not null,
  duration_hours smallint not null check (duration_hours between 1 and 5),
  end_time time not null check (end_time > start_time),
  price_per_hour integer not null check (price_per_hour > 0),
  total_price integer not null check (total_price > 0),
  day_type text not null check (day_type in ('weekday', 'weekend')),
  status text not null default 'confirmed'
    check (status in ('confirmed', 'cancelled', 'pending')),
  source text not null default 'online'
    check (source in ('online', 'manual')),
  notes text check (char_length(notes) <= 200),
  booking_range tsrange generated always as (
    tsrange(booking_date + start_time, booking_date + end_time, '[)')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_no_confirmed_overlap
    exclude using gist (booking_range with &&)
    where (status = 'confirmed')
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique check (phone ~ '^[6-9][0-9]{9}$'),
  email text,
  type text check (type in ('turf', 'yoga', 'chess', 'cricket', 'multiple')),
  total_spent integer not null default 0,
  invoice_count integer not null default 0,
  booking_count integer not null default 0,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence public.invoice_number_seq start 1001;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null default (
    'INV-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0')
  ),
  contact_id uuid references public.contacts(id),
  customer_name text not null,
  customer_phone text not null check (customer_phone ~ '^[6-9][0-9]{9}$'),
  customer_email text,
  academy_type text not null check (academy_type in ('yoga', 'chess', 'cricket')),
  description text,
  amount integer not null check (amount > 0),
  status text not null default 'paid'
    check (status in ('paid', 'pending', 'cancelled')),
  invoice_date date not null default current_date,
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  reference_id uuid not null,
  reference_type text not null check (reference_type in ('booking', 'invoice')),
  customer_name text not null,
  customer_phone text,
  type text not null check (type in ('turf', 'yoga', 'chess', 'cricket')),
  amount integer not null check (amount > 0),
  status text not null default 'completed'
    check (status in ('completed', 'pending', 'refunded')),
  transaction_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reference_type, reference_id)
);

create table public.slots_config (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null,
  blocked_start time,
  blocked_end time,
  reason text,
  created_at timestamptz not null default now(),
  check (
    (blocked_start is null and blocked_end is null)
    or (blocked_start is not null and blocked_end is not null and blocked_end > blocked_start)
  )
);

create index bookings_date_status_idx on public.bookings (booking_date, status);
create index invoices_phone_idx on public.invoices (customer_phone);
create index transactions_date_type_idx on public.transactions (transaction_date, type);
create index slots_config_date_idx on public.slots_config (blocked_date);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.ensure_contact(
  contact_name text,
  contact_phone text,
  contact_email text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  contact_uuid uuid;
begin
  insert into contacts (name, phone, email, last_seen)
  values (contact_name, contact_phone, nullif(contact_email, ''), now())
  on conflict (phone) do update set
    name = excluded.name,
    email = coalesce(excluded.email, contacts.email),
    last_seen = now(),
    updated_at = now()
  returning id into contact_uuid;

  return contact_uuid;
end;
$$;

create or replace function public.refresh_contact_rollup(contact_phone text)
returns void language plpgsql security definer set search_path = public as $$
declare
  categories text[];
begin
  select array_agg(distinct category) into categories
  from (
    select 'turf'::text as category
    from bookings
    where customer_phone = contact_phone and status <> 'cancelled'
    union all
    select academy_type
    from invoices
    where customer_phone = contact_phone and status <> 'cancelled'
  ) activity;

  update contacts set
    total_spent =
      coalesce((
        select sum(total_price) from bookings
        where customer_phone = contact_phone and status = 'confirmed'
      ), 0)
      + coalesce((
        select sum(amount) from invoices
        where customer_phone = contact_phone and status = 'paid'
      ), 0),
    booking_count = (
      select count(*) from bookings
      where customer_phone = contact_phone and status <> 'cancelled'
    ),
    invoice_count = (
      select count(*) from invoices
      where customer_phone = contact_phone and status <> 'cancelled'
    ),
    type = case
      when coalesce(array_length(categories, 1), 0) = 0 then null
      when array_length(categories, 1) = 1 then categories[1]
      else 'multiple'
    end,
    updated_at = now()
  where phone = contact_phone;
end;
$$;

create or replace function public.sync_booking_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform ensure_contact(new.customer_name, new.customer_phone, new.customer_email);

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

create or replace function public.reject_blocked_booking()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'confirmed' and exists (
    select 1
    from slots_config
    where blocked_date = new.booking_date
      and (
        (blocked_start is null and blocked_end is null)
        or (
          blocked_start < new.end_time
          and blocked_end > new.start_time
        )
      )
  ) then
    raise exception 'Booking overlaps a blocked slot'
      using errcode = '23P01';
  end if;

  return new;
end;
$$;

create or replace function public.link_invoice_contact()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.contact_id := ensure_contact(new.customer_name, new.customer_phone, new.customer_email);
  return new;
end;
$$;

create or replace function public.sync_invoice_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
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

create trigger bookings_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

create trigger contacts_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

create trigger invoices_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create trigger transactions_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

create trigger booking_activity_trigger
after insert or update on public.bookings
for each row execute function public.sync_booking_activity();

create trigger reject_blocked_booking_trigger
before insert or update of booking_date, start_time, end_time, status on public.bookings
for each row execute function public.reject_blocked_booking();

create trigger invoice_contact_trigger
before insert or update of customer_name, customer_phone, customer_email on public.invoices
for each row execute function public.link_invoice_contact();

create trigger invoice_activity_trigger
after insert or update on public.invoices
for each row execute function public.sync_invoice_activity();

alter table public.bookings enable row level security;
alter table public.contacts enable row level security;
alter table public.invoices enable row level security;
alter table public.transactions enable row level security;
alter table public.slots_config enable row level security;

-- No anon/authenticated policies are created in the initial migration.
-- The app accesses operational data through validated server routes only.
