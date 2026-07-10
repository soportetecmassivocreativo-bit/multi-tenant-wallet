import Link from "next/link";
import { notFound } from "next/navigation";
import { BuildingIcon } from "@/components/ui/icons";
import { CompanyForm } from "@/components/empresas/company-form";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { getCompany, getBcvRates, isAdmin } from "@/lib/data";

export default async function EmpresasPage() {
  const [company, bcv, admin] = await Promise.all([
    getCompany(),
    getBcvRates(),
    isAdmin(),
  ]);
  if (!company) notFound();

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
          <p className="text-xs text-hint">Empresa emisora</p>
        </div>
      </section>

      <CompanyForm company={company} canEdit={admin} />

      <section className="rounded-2xl bg-soft p-4">
        <p className="text-xs text-muted">Tasas BCV · {formatDate(bcv.date)}</p>
        <p className="mt-1 text-sm">
          Dólar{" "}
          <span className="tnum font-medium">
            {formatCurrency(bcv.usd, "VES")}
          </span>{" "}
          / $ · Euro{" "}
          <span className="tnum font-medium">
            {formatCurrency(bcv.eur, "VES")}
          </span>{" "}
          / €
        </p>
      </section>
    </div>
  );
}
