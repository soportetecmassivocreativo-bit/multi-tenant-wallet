import Link from "next/link";
import { cookies } from "next/headers";
import { getCurrentProfile, getBcvRates } from "@/lib/data";
import { getSystemConfig } from "@/lib/config-actions";
import { getAdminTenants } from "@/lib/tenant-admin-actions";
import { ConfiguracionTabs } from "@/components/configuracion/configuracion-tabs";
import { TenantConfigSelector } from "@/components/admin/tenant-config-selector";
import { SettingsIcon } from "@/components/ui/icons";

import { getCompanyAccounts } from "@/lib/cuentas-actions";

interface Props {
  searchParams: Promise<{ empresa?: string }>;
}

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage({ searchParams }: Props) {
  const { empresa } = await searchParams;
  const cookieStore = await cookies();
  const activeSlug = empresa || cookieStore.get("m_wallet_active_config_tenant")?.value || "massivo";

  const [profile, config, allTenants, accounts, bcv] = await Promise.all([
    getCurrentProfile(),
    getSystemConfig(activeSlug),
    getAdminTenants(),
    getCompanyAccounts(),
    getBcvRates(),
  ]);

  const canEdit =
    profile?.role === "admin" ||
    profile?.role === "ceo" ||
    profile?.role === "project_manager";

  const currentTenantObj = allTenants.find((t) => t.slug === activeSlug) || allTenants[0] || {
    name: "Massivo Creativo",
    slug: "massivo",
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/mas" className="text-sm text-muted active:scale-95">
          ‹ Más
        </Link>
      </header>

      <section className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-accent-bg text-accent font-serif text-2xl font-medium">
          <SettingsIcon className="h-8 w-8" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-serif text-2xl leading-tight tracking-tight">
            Configuración & Nomenclaturas
          </h1>
          <p className="text-xs text-hint">
            Personalizando parámetros y correlativos para:{" "}
            <strong className="text-foreground">{currentTenantObj.name}</strong>
          </p>
        </div>
      </section>

      {/* Selector interactivo de Empresa a Personalizar */}
      <TenantConfigSelector
        variant="page"
        activeSlug={activeSlug}
        initialTenants={allTenants}
      />

      <ConfiguracionTabs
        key={activeSlug}
        initialConfig={config}
        canEdit={canEdit}
        accounts={accounts}
        bcv={bcv}
      />
    </div>
  );
}
