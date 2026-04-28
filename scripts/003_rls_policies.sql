-- =========================================================
-- 003 - Row Level Security para los 3 roles
-- =========================================================
-- player: ve canchas publicas, crea/cancela sus reservas
-- owner:  CRUD de sus venues/courts/schedules, ve reservas de sus canchas
-- admin:  ve y gestiona todo (suscripciones, etc.)

-- ---------- helper: es admin? ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- helper: rol del usuario actual ----------
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- =========================================================
-- SPORTS: lectura publica, escritura solo admin
-- =========================================================
alter table public.sports enable row level security;

drop policy if exists sports_select_all on public.sports;
create policy sports_select_all on public.sports
  for select using (true);

drop policy if exists sports_admin_write on public.sports;
create policy sports_admin_write on public.sports
  for all using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- PROFILES
-- =========================================================
alter table public.profiles enable row level security;

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- el INSERT lo hace el trigger handle_new_user con security definer, no hace falta policy de insert

-- =========================================================
-- VENUES
-- =========================================================
alter table public.venues enable row level security;

-- cualquier usuario autenticado puede ver venues activos (catalogo publico)
drop policy if exists venues_select_active on public.venues;
create policy venues_select_active on public.venues
  for select using (active = true or owner_id = auth.uid() or public.is_admin());

drop policy if exists venues_insert_owner on public.venues;
create policy venues_insert_owner on public.venues
  for insert with check (
    owner_id = auth.uid()
    and public.current_role() in ('owner', 'admin')
  );

drop policy if exists venues_update_owner on public.venues;
create policy venues_update_owner on public.venues
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists venues_delete_owner on public.venues;
create policy venues_delete_owner on public.venues
  for delete using (owner_id = auth.uid() or public.is_admin());

-- =========================================================
-- COURTS
-- =========================================================
alter table public.courts enable row level security;

drop policy if exists courts_select_all on public.courts;
create policy courts_select_all on public.courts
  for select using (
    active = true
    or exists (
      select 1 from public.venues v
      where v.id = courts.venue_id and (v.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists courts_owner_write on public.courts;
create policy courts_owner_write on public.courts
  for all using (
    exists (
      select 1 from public.venues v
      where v.id = courts.venue_id and (v.owner_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.venues v
      where v.id = courts.venue_id and (v.owner_id = auth.uid() or public.is_admin())
    )
  );

-- =========================================================
-- COURT SCHEDULES
-- =========================================================
alter table public.court_schedules enable row level security;

drop policy if exists court_schedules_select_all on public.court_schedules;
create policy court_schedules_select_all on public.court_schedules
  for select using (true);

drop policy if exists court_schedules_owner_write on public.court_schedules;
create policy court_schedules_owner_write on public.court_schedules
  for all using (
    exists (
      select 1 from public.courts c
      join public.venues v on v.id = c.venue_id
      where c.id = court_schedules.court_id
        and (v.owner_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.courts c
      join public.venues v on v.id = c.venue_id
      where c.id = court_schedules.court_id
        and (v.owner_id = auth.uid() or public.is_admin())
    )
  );

-- =========================================================
-- BOOKINGS
-- =========================================================
alter table public.bookings enable row level security;

-- el jugador ve sus reservas, el owner ve las de sus canchas, admin ve todo
drop policy if exists bookings_select_involved on public.bookings;
create policy bookings_select_involved on public.bookings
  for select using (
    player_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.courts c
      join public.venues v on v.id = c.venue_id
      where c.id = bookings.court_id and v.owner_id = auth.uid()
    )
  );

-- el jugador puede crear reservas a su nombre
drop policy if exists bookings_insert_player on public.bookings;
create policy bookings_insert_player on public.bookings
  for insert with check (player_id = auth.uid());

-- jugador (sus reservas) o owner (de su cancha) o admin pueden actualizar
drop policy if exists bookings_update_involved on public.bookings;
create policy bookings_update_involved on public.bookings
  for update using (
    player_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.courts c
      join public.venues v on v.id = c.venue_id
      where c.id = bookings.court_id and v.owner_id = auth.uid()
    )
  )
  with check (
    player_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.courts c
      join public.venues v on v.id = c.venue_id
      where c.id = bookings.court_id and v.owner_id = auth.uid()
    )
  );

-- =========================================================
-- OWNER SUBSCRIPTIONS
-- =========================================================
alter table public.owner_subscriptions enable row level security;

drop policy if exists owner_subs_select_self_or_admin on public.owner_subscriptions;
create policy owner_subs_select_self_or_admin on public.owner_subscriptions
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists owner_subs_admin_write on public.owner_subscriptions;
create policy owner_subs_admin_write on public.owner_subscriptions
  for all using (public.is_admin()) with check (public.is_admin());
