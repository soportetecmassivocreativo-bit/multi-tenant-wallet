import { NuevaFacturaForm } from "@/components/cobros/nueva-factura-form";
import { getClients, getProducts, getBcvRates } from "@/lib/data";
import { getCompanyAccounts } from "@/lib/cuentas-actions";

export const dynamic = "force-dynamic";

export default async function NuevaFacturaPage() {
  const [clients, products, bcv, accounts] = await Promise.all([
    getClients(),
    getProducts(),
    getBcvRates(),
    getCompanyAccounts(),
  ]);

  return <NuevaFacturaForm clients={clients} products={products} bcv={bcv} accounts={accounts} />;
}
