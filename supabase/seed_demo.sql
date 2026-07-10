-- ============================================================================
-- M-Wallet — Datos de ejemplo (OPCIONAL)
-- Ejecútalo DESPUÉS de registrarte en la app.
-- Uso:  select public.seed_demo('tu-correo@ejemplo.com');
-- ============================================================================

create or replace function public.seed_demo(user_email text)
returns text language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select p.company_id into cid
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email = user_email;

  if cid is null then
    return 'No se encontró empresa para ' || user_email;
  end if;

  insert into public.clients (company_id, name, rif, score, term_days) values
    (cid, 'Ferretería Peña', 'J-45678901-2', 92, 30),
    (cid, 'Distribuidora Sol', 'J-11223344-5', 74, 15),
    (cid, 'Constructora RD', 'J-55010223-6', 61, 60);

  insert into public.products (company_id, name, price, currency) values
    (cid, 'Servicio de diseño', 350, 'USD'),
    (cid, 'Consultoría (hora)', 25, 'USD'),
    (cid, 'Mantenimiento mensual', 120, 'USD');

  insert into public.employees (company_id, full_name, role, salary, currency) values
    (cid, 'Ana Reyes', 'Diseñadora', 220, 'USD'),
    (cid, 'Luis Peña', 'Desarrollador', 300, 'USD'),
    (cid, 'María Gómez', 'Administración', 180, 'USD');

  insert into public.services (company_id, name, amount, currency, cycle, category, next_charge_date) values
    (cid, 'Claude', 20, 'USD', 'mensual', 'IA', current_date),
    (cid, 'Supabase', 25, 'USD', 'mensual', 'Backend', current_date),
    (cid, 'Vercel', 20, 'USD', 'mensual', 'Hosting', current_date);

  return 'Datos de ejemplo creados para ' || user_email;
end $$;
