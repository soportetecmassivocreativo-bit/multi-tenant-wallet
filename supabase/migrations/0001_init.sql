-- ============================================================================
-- M-Wallet — Esquema inicial (Supabase / Postgres)
-- Multi-empresa con RLS. Contabilidad: ingresos = payments, egresos = expenses.
-- Ejecuta este archivo en: Supabase → SQL Editor → New query → Run.
-- ============================================================================

-- ---------- Empresas y perfiles ----------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rif text default '',
  default_currency text not null default 'USD',
  default_tax_rate numeric not null default 0.16,
  next_invoice_number int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text default '',
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

-- Devuelve la empresa del usuario autenticado (para las políticas RLS).
create or replace function public.current_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid()
$$;

-- ---------- Clientes y productos ----------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  rif text default '',
  score int not null default 80,
  term_days int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  price numeric not null default 0,
  currency text not null default 'USD'
);

-- ---------- Facturas ----------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  number int not null,
  currency text not null default 'USD',
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  tax_rate numeric not null default 0.16,
  tax numeric not null default 0,
  total numeric not null default 0,
  ves_rate numeric,            -- tasa BCV aplicada
  ves_rate_ref text,           -- 'USD' | 'EUR'
  ves_total numeric,           -- total convertido a Bs
  status text not null default 'borrador',  -- borrador|pendiente|parcial|pagada|vencida
  issue_date date not null default current_date,
  due_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null default '',
  qty numeric not null default 1,
  unit_price numeric not null default 0
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  amount numeric not null default 0,
  currency text not null default 'USD',
  paid_on date not null default current_date,
  method text default 'transferencia'
);

-- ---------- Gastos (egresos: manual, nómina, servicio) ----------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  category text not null default 'General',
  note text not null default '',
  amount numeric not null default 0,
  currency text not null default 'USD',
  spent_on date not null default current_date,
  source text not null default 'manual',   -- manual|nomina|servicio
  ref_id uuid,                              -- período de nómina o servicio de origen
  created_at timestamptz not null default now()
);

-- ---------- Nómina ----------
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  role text default '',
  salary numeric not null default 0,        -- salario por período (quincenal)
  currency text not null default 'USD',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.payroll_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  label text not null,                      -- "1–15 jul", "16–31 jul"
  start_date date not null,
  end_date date not null,
  pay_date date not null,                   -- 15 y último de cada mes
  status text not null default 'pendiente', -- pendiente|pagada
  total numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.payroll_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_id uuid not null references public.payroll_periods(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  gross numeric not null default 0,
  deductions numeric not null default 0,
  net numeric not null default 0
);

-- ---------- Servicios recurrentes (Claude, Supabase, etc.) ----------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  amount numeric not null default 0,
  currency text not null default 'USD',
  cycle text not null default 'mensual',    -- mensual|anual
  category text not null default 'Software',
  next_charge_date date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Tasas BCV (global) ----------
create table if not exists public.bcv_rates (
  rate_date date primary key,
  usd numeric not null,
  eur numeric not null
);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.companies       enable row level security;
alter table public.profiles        enable row level security;
alter table public.clients         enable row level security;
alter table public.products        enable row level security;
alter table public.invoices        enable row level security;
alter table public.invoice_items   enable row level security;
alter table public.payments        enable row level security;
alter table public.expenses        enable row level security;
alter table public.employees       enable row level security;
alter table public.payroll_periods enable row level security;
alter table public.payroll_items   enable row level security;
alter table public.services        enable row level security;
alter table public.bcv_rates       enable row level security;

-- Empresas: el dueño ve/edita su propia empresa.
create policy company_rw on public.companies
  for all using (id = public.current_company_id())
  with check (id = public.current_company_id());

-- Perfiles: cada quien ve su propio perfil.
create policy profiles_rw on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Tablas por empresa: acceso si company_id coincide con la empresa del usuario.
do $$
declare t text;
begin
  foreach t in array array[
    'clients','products','invoices','invoice_items','payments',
    'expenses','employees','payroll_periods','payroll_items','services'
  ] loop
    execute format(
      'create policy %1$s_rw on public.%1$s for all
         using (company_id = public.current_company_id())
         with check (company_id = public.current_company_id());', t);
  end loop;
end $$;

-- Tasas BCV: lectura/escritura para cualquier usuario autenticado.
create policy bcv_read on public.bcv_rates
  for select using (auth.role() = 'authenticated');
create policy bcv_write on public.bcv_rates
  for insert with check (auth.role() = 'authenticated');
create policy bcv_update on public.bcv_rates
  for update using (auth.role() = 'authenticated');

-- ============================================================================
-- Trigger: al registrarse un usuario, crear su empresa y perfil.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare new_company uuid;
begin
  insert into public.companies (name, rif)
  values (
    coalesce(nullif(new.raw_user_meta_data->>'company_name',''), 'Mi empresa'),
    coalesce(new.raw_user_meta_data->>'rif','')
  )
  returning id into new_company;

  insert into public.profiles (id, company_id, full_name)
  values (new.id, new_company, coalesce(new.raw_user_meta_data->>'full_name',''));

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Semilla global: tasas BCV de ejemplo ----------
insert into public.bcv_rates (rate_date, usd, eur) values
  ('2026-07-10', 148.20, 161.35)
on conflict (rate_date) do nothing;
