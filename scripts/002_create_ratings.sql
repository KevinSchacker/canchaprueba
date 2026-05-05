-- =========================================================
-- 002 - Sistema de calificaciones (Reviews)
-- =========================================================

-- Tabla de calificaciones de reservas
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_type text not null check (reviewee_type in ('court', 'player')),
  court_id uuid references public.courts(id) on delete cascade,
  player_id uuid references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique(booking_id, reviewer_id)
);

create index if not exists reviews_court_idx on public.reviews(court_id);
create index if not exists reviews_player_idx on public.reviews(player_id);
