export const dynamic = "force-dynamic";

import { ProformasView } from "@/components/proformas/proformas-view";
import { getProformas, getClients, isAdmin, getBcvRates } from "@/lib/data";
import { getCompanyAccounts } from "@/lib/cuentas-actions";

export default async function ProformasPage() {
  const [proformas, clients, admin, accounts, bcv] = await Promise.all([
    getProformas(),
    getClients(),
    isAdmin(),
    getCompanyAccounts(),
    getBcvRates(),
  ]);

  return (
    <ProformasView
      proformas={proformas}
      clients={clients}
      accounts={accounts}
      bcv={bcv}
      admin={admin}
    />
  );
}
