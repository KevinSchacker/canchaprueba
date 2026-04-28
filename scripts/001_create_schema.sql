-- =========================================================
-- 001 - Schema base: deportes, perfiles, complejos, canchas
-- =========================================================
-- Disenado para escalar de padel a multiples deportes.
-- Incluye 3 roles: player (reserva), owner (gestiona canchas), admin.

-- Necesario para el constraint EXCLUDE anti doble-reserva (combina rangos de tiempo + UUID)
create extension if not exists btree_gist;

-- ---------- ENUMS ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('player', 'owner', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type public.booking_status as enum (
      'pending',     -- creada, esperando confirmacion del duenio o de la senia
      'confirmed',   -- confirmada
      'cancelled',   -- cancelada por jugador o duenio
      'completed',   -- ya se jugo
      'no_show'      -- el jugador no se presento
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum (
      'trial',
      'active',
      'past_due',
      'cancelled',
      'paused'
    );
  end if;
end$$;

-- ---------- SPORTS (extensible: padel, tenis, futbol5, basket...) ----------
create table if not exists public.sports (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- PROFILES (1 fila por usuario de auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'player',
  avatar_url text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);

-- ---------- VENUES (complejos deportivos del owner) ----------
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  address text not null,
  city text not null,
  province text not null default 'Misiones',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  phone text,
  cover_image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists venues_owner_idx on public.venues(owner_id);
create index if not exists venues_city_idx on public.venues(city);
create index if not exists venues_active_idx on public.venues(active);

-- ---------- COURTS (canchas individuales dentro de un venue) ----------
create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  sport_id uuid not null references public.sports(id) on delete restrict,
  name text not null,
  surface text,                       -- cesped sintetico, cemento, polvo de ladrillo...
  indoor boolean not null default false,
  has_lighting boolean not null default true,
  price_per_slot numeric(10, 2) not null,    -- precio por turno
  slot_duration_minutes int not null default 60 check (slot_duration_minutes > 0),
  deposit_percentage int not null default 30 check (deposit_percentage between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists courts_venue_idx on public.courts(venue_id);
create index if not exists courts_sport_idx on public.courts(sport_id);

-- ---------- COURT SCHEDULES (horarios semanales de apertura por cancha) ----------
-- day_of_week: 0=domingo, 1=lunes, ..., 6=sabado (compatible con date-fns getDay)
create table if not exists public.court_schedules (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  open_time time not null,
  close_time time not null,
  created_at timestamptz not null default now(),
  check (close_time > open_time)
);

create index if not exists court_schedules_court_idx on public.court_schedules(court_id);

-- ---------- BOOKINGS (reservas) ----------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id) on delete restrict,
  player_id uuid not null references public.profiles(id) on delete restrict,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status public.booking_status not null default 'pending',
  total_price numeric(10, 2) not null,
  deposit_amount numeric(10, 2) not null default 0,
  deposit_paid boolean not null default false,
  notes text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists bookings_court_time_idx on public.bookings(court_id, start_time);
create index if not exists bookings_player_idx on public.bookings(player_id);
create index if not exists bookings_status_idx on public.bookings(status);

-- HARD GUARANTEE: nunca puede haber dos reservas activas que se solapen en la misma cancha.
-- Esto es lo que hace que Postgres sea muy superior a Firebase para reservas.
alter table public.bookings drop constraint if exists bookings_no_overlap;
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    court_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  )
  where (status in ('pending', 'confirmed'));

-- ---------- OWNER SUBSCRIPTIONS (plan mensual del duenio) ----------
create table if not exists public.owner_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  status public.subscription_status not null default 'trial',
  plan text not null default 'basic',
  monthly_price numeric(10, 2) not null default 0,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  mp_preapproval_id text,             -- id de MercadoPago preapproval (cuando lo conectemos)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists owner_subs_status_idx on public.owner_subscriptions(status);

-- ---------- updated_at trigger helper ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists venues_set_updated_at on public.venues;
create trigger venues_set_updated_at before update on public.venues
  for each row execute function public.set_updated_at();

drop trigger if exists courts_set_updated_at on public.courts;
create trigger courts_set_updated_at before update on public.courts
  for each row execute function public.set_updated_at();

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

drop trigger if exists owner_subs_set_updated_at on public.owner_subscriptions;
create trigger owner_subs_set_updated_at before update on public.owner_subscriptions
  for each row execute function public.set_updated_at();
