-- ============================================================================
-- M-Wallet — Ajustes: registro empresa/invitado, borrado de facturas, empresa
-- Ejecuta en: Supabase → SQL Editor → New query → Run.
-- ============================================================================

-- ---------- (3) Datos extra de la empresa (para la factura/PDF) ----------
alter table public.companies add column if not exists address text default '';
alter table public.companies add column if not exists phone text default '';
alter table public.companies add column if not exists email text default '';
alter table public.companies add column if not exists logo_url text default '';

-- ---------- (2) Al borrar una factura, borrar sus pagos (y limpiar huérfanos)
alter table public.payments drop constraint if exists payments_invoice_id_fkey;
alter table public.payments
  add constraint payments_invoice_id_fkey
  foreign key (invoice_id) references public.invoices(id) on delete cascade;

-- Limpia pagos que quedaron sin factura (saldo fantasma de facturas ya borradas).
delete from public.payments where invoice_id is null;

-- ---------- (1) Registro: empresa nueva o usuario invitado ----------
-- Si hay invitación pendiente para el correo → une a esa empresa con su rol.
-- Si el usuario eligió "invitado" y no hay invitación → error (no crea empresa).
-- Si eligió "empresa" (por defecto) → crea su empresa como admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  invite public.invitations%rowtype;
  new_company uuid;
  mode text;
begin
  mode := coalesce(new.raw_user_meta_data->>'mode', 'empresa');

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

  elsif mode = 'invited' then
    raise exception 'No hay una invitación pendiente para %', new.email;

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
