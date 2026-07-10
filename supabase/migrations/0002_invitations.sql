-- ============================================================================
-- M-Wallet — Invitaciones y roles (contador)
-- Ejecuta este archivo en: Supabase → SQL Editor → New query → Run.
-- (Necesario para que la invitación del contador funcione.)
-- ============================================================================

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role text not null default 'contador',      -- contador | admin
  status text not null default 'pendiente',    -- pendiente | aceptada
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.invitations enable row level security;

drop policy if exists invitations_rw on public.invitations;
create policy invitations_rw on public.invitations
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- Permitir que los miembros de una misma empresa se vean entre sí.
drop policy if exists profiles_read_company on public.profiles;
create policy profiles_read_company on public.profiles
  for select using (company_id = public.current_company_id());

-- Al registrarse: si hay una invitación pendiente para su correo, unir a esa
-- empresa con el rol invitado; si no, crear su propia empresa (como admin).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  invite public.invitations%rowtype;
  new_company uuid;
begin
  select * into invite
  from public.invitations
  where lower(email) = lower(new.email) and status = 'pendiente'
  order by created_at desc
  limit 1;

  if invite.id is not null then
    insert into public.profiles (id, company_id, full_name, role)
    values (
      new.id, invite.company_id,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      invite.role
    );
    update public.invitations set status = 'aceptada' where id = invite.id;
  else
    insert into public.companies (name, rif)
    values (
      coalesce(nullif(new.raw_user_meta_data->>'company_name', ''), 'Mi empresa'),
      coalesce(new.raw_user_meta_data->>'rif', '')
    )
    returning id into new_company;

    insert into public.profiles (id, company_id, full_name, role)
    values (
      new.id, new_company,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      'admin'
    );
  end if;

  return new;
end $$;
