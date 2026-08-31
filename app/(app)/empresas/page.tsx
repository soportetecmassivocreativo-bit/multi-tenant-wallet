import Link from "next/link";
import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";
import { BuildingIcon } from "@/components/ui/icons";
import { CompanyForm } from "@/components/empresas/company-form";
import { BcvRatesCard } from "@/components/empresas/bcv-rates-card";
import { TenantSwitcher } from "@/components/empresas/tenant-switcher";
import { getCompany, getBcvRates, isAdmin } from "@/lib/data";
import { getAllTenants, TENANT_COOKIE_NAME } from "@/lib/supabase/tenants-config";

export default async function EmpresasPage() {
  const [company, bcv, admin, headerList, cookieStore] = await Promise.all([
    getCompany(),
    getBcvRates(),
    isAdmin(),
    headers(),
    cookies(),
  ]);
  if (!company) notFound();

  const allTenants = getAllTenants();
  const activeTenantSlug =
    headerList.get("x-tenant-slug") ||
    cookieStore.get(TENANT_COOKIE_NAME)?.value ||
    "massivo";

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/mas" className="text-sm text-muted active:scale-95">
          ‹ Más
        </Link>
      </header>

      <section className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-accent-bg text-accent">
          <BuildingIcon className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-serif text-2xl leading-tight tracking-tight">
            {company.name}
          </h1>
          <p className="text-xs text-hint">Empresa emisora · Tenant: <span className="font-mono font-semibold text-foreground">{activeTenantSlug}</span></p>
        </div>
      </section>

      <CompanyForm company={company} canEdit={admin} />

      <BcvRatesCard initialBcv={bcv} />
    </div>
  );
}

