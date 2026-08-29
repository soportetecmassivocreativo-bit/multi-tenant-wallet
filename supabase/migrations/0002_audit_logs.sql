-- ============================================================================
-- Migración 0002: Tabla de Registro de Auditoría (Audit Logs)
-- ============================================================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  user_name text not null default 'Usuario',
  user_role text not null default 'admin',
  action text not null,        -- 'crear_factura', 'registrar_pago', 'anular_factura', 'crear_gasto', 'actualizar_tasa', 'cambio_clave', etc.
  entity_type text not null,   -- 'factura', 'pago', 'gasto', 'cliente', 'equipo', 'empresa', 'tasa', 'seguridad', 'nomina', 'servicio'
  entity_id text,
  description text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Habilitar RLS
alter table public.audit_logs enable row level security;

-- Política de lectura: los miembros de la empresa pueden ver sus logs
create policy audit_logs_read on public.audit_logs
  for select using (company_id = public.current_company_id());

-- Política de inserción: usuarios autenticados pueden registrar eventos en su empresa
create policy audit_logs_insert on public.audit_logs
  for insert with check (company_id = public.current_company_id());

-- Índices de búsqueda y orden
create index if not exists idx_audit_logs_company_created on public.audit_logs(company_id, created_at desc);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type);
