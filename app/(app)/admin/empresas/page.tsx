import Link from "next/link";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BuildingIcon } from "@/components/ui/icons";
import { TenantsMasterManager } from "@/components/admin/tenants-master-manager";
import { getAdminTenants } from "@/lib/tenant-admin-actions";
import { isAdmin } from "@/lib/data";
import { TENANT_COOKIE_NAME } from "@/lib/supabase/tenants-config";

export const dynamic = "force-dynamic";

export default async function AdminEmpresasPage() {
  const [authorized, tenants, headerList, cookieStore] = await Promise.all([
    isAdmin(),
    getAdminTenants(),
    headers(),
    cookies(),
  ]);

  if (!authorized) {
    redirect("/dashboard");
  }

  const activeTenantSlug =
    headerList.get("x-tenant-slug") ||
    cookieStore.get(TENANT_COOKIE_NAME)?.value ||
    "massivo";

  return (
    <div className="space-y-6">
      {/* Encabezado Superior */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-white shadow-md">
            <BuildingIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold tracking-tight">
                Panel Master Multi-Tenant
              </h1>
              <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold text-accent">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-hint mt-0.5">
              Gestión centralizada de empresas y bases de datos Supabase independientes
            </p>
          </div>
        </div>

        <Link
          href="/empresas"
          className="self-start sm:self-auto rounded-xl border border-line bg-card px-3.5 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-soft transition-all"
        >
          ‹ Ver Empresa Actual
        </Link>
      </header>

      {/* Métricas y Resumen Global */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <p className="text-xs text-muted">Empresas Registradas</p>
          <p className="tnum mt-1 text-2xl font-bold text-foreground">
            {tenants.length}
          </p>
          <p className="text-[11px] text-hint mt-0.5">Entornos independientes</p>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <p className="text-xs text-muted">Bases de Datos Supabase</p>
          <p className="tnum mt-1 text-2xl font-bold text-income">
            {new Set(tenants.map((t) => t.supabaseUrl)).size}
          </p>
          <p className="text-[11px] text-hint mt-0.5">Proyectos aislados</p>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <p className="text-xs text-muted">Entorno Activo en Sesión</p>
          <p className="font-mono mt-1 text-lg font-bold text-accent truncate">
            {activeTenantSlug}
          </p>
          <p className="text-[11px] text-hint mt-0.5">Scope de la sesión actual</p>
        </div>
      </div>

      {/* Gestor Interactivo de Empresas */}
      <TenantsMasterManager
        tenants={tenants}
        activeTenantSlug={activeTenantSlug}
      />
    </div>
  );
}
