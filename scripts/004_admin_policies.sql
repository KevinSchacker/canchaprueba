-- =============================================================================
-- Migración 004: Policies de admin
--
-- Permite al rol "admin" leer y gestionar todos los recursos relevantes.
-- Definimos una función helper is_admin() que evita recursión en las RLS de
-- profiles consultando profiles directamente (con security definer).
-- =============================================================================

-- Función helper: ¿el usuario actual es admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ============= PROFILES =============
drop policy if exists "Admins pueden ver todos los perfiles" on public.profiles;
create policy "Admins pueden ver todos los perfiles"
  on public.profiles for select
  to authenticated
  using ( public.is_admin() );

drop policy if exists "Admins pueden actualizar perfiles" on public.profiles;
create policy "Admins pueden actualizar perfiles"
  on public.profiles for update
  to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- ============= VENUES =============
drop policy if exists "Admins ven todos los complejos" on public.venues;
create policy "Admins ven todos los complejos"
  on public.venues for select
  to authenticated
  using ( public.is_admin() );

-- ============= COURTS =============
drop policy if exists "Admins ven todas las canchas" on public.courts;
create policy "Admins ven todas las canchas"
  on public.courts for select
  to authenticated
  using ( public.is_admin() );

-- ============= BOOKINGS =============
drop policy if exists "Admins ven todas las reservas" on public.bookings;
create policy "Admins ven todas las reservas"
  on public.bookings for select
  to authenticated
  using ( public.is_admin() );

-- ============= OWNER_SUBSCRIPTIONS =============
drop policy if exists "Admins gestionan todas las suscripciones - select" on public.owner_subscriptions;
create policy "Admins gestionan todas las suscripciones - select"
  on public.owner_subscriptions for select
  to authenticated
  using ( public.is_admin() );

drop policy if exists "Admins gestionan todas las suscripciones - insert" on public.owner_subscriptions;
create policy "Admins gestionan todas las suscripciones - insert"
  on public.owner_subscriptions for insert
  to authenticated
  with check ( public.is_admin() );

drop policy if exists "Admins gestionan todas las suscripciones - update" on public.owner_subscriptions;
create policy "Admins gestionan todas las suscripciones - update"
  on public.owner_subscriptions for update
  to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );
