-- Asigna roles iniciales a usuarios ya registrados en auth.users.
-- IMPORTANTE: estos emails deben haberse registrado primero en /auth/sign-up,
-- si no, no van a existir en auth.users y este script no har\u00e1 nada.

-- ADMIN
update public.profiles p
set role = 'admin'::public.user_role
from auth.users u
where p.id = u.id
  and u.email = 'kevinschacker17@gmail.com';

-- OWNER
update public.profiles p
set role = 'owner'::public.user_role
from auth.users u
where p.id = u.id
  and u.email = 'kevin0917@live.com';

-- Verificaci\u00f3n
select u.email, p.role
from public.profiles p
join auth.users u on u.id = p.id
where u.email in ('kevinschacker17@gmail.com', 'kevin0917@live.com');
