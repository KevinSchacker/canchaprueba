-- =========================================================
-- 002 - Trigger: crear profile automaticamente al registrar usuario
-- =========================================================
-- Lee user_metadata para sacar full_name, phone y role inicial.
-- Si el usuario se registra como 'owner', tambien le crea una suscripcion en trial de 14 dias.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  -- por defecto player; si vino role en metadata y es valido, lo respetamos
  v_role := coalesce(
    nullif(new.raw_user_meta_data ->> 'role', '')::public.user_role,
    'player'::public.user_role
  );

  -- ningun usuario puede auto-asignarse admin desde signup
  if v_role = 'admin' then
    v_role := 'player';
  end if;

  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    v_role
  )
  on conflict (id) do nothing;

  -- si es owner, le creamos una suscripcion en trial de 14 dias
  if v_role = 'owner' then
    insert into public.owner_subscriptions (
      owner_id, status, plan, monthly_price, trial_ends_at
    )
    values (
      new.id, 'trial', 'basic', 0, now() + interval '14 days'
    )
    on conflict (owner_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
