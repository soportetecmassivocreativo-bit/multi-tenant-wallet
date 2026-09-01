export const dynamic = "force-dynamic";

import Link from "next/link";
import { getClients, getProducts, getBcvRates } from "@/lib/data";
import { getCompanyAccounts } from "@/lib/cuentas-actions";
import { NuevaProformaForm } from "@/components/proformas/nueva-proforma-form";

export default async function NuevaProformaPage() {
  const [clients, products, bcv, accounts] = await Promise.all([
    getClients(),
    getProducts(),
    getBcvRates(),
    getCompanyAccounts(),
  ]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl tracking-tight">Nueva Proforma</h1>
          <p className="text-xs text-hint mt-0.5">
            Emisión de cotización preliminar para pagos en espera
          </p>
        </div>
        <Link
          href="/proformas"
          className="rounded-full border border-line bg-card px-4 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-soft transition-colors"
        >
          Volver a Proformas
        </Link>
      </header>

      <NuevaProformaForm
        clients={clients}
        products={products}
        bcv={bcv}
        accounts={accounts}
      />
    </div>
  );
}
