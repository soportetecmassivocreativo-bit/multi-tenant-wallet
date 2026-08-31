export const dynamic = "force-dynamic";

import { GastosView } from "@/components/gastos/gastos-view";
import { getExpenses, isAdmin } from "@/lib/data";
import { getCompanyAccounts } from "@/lib/cuentas-actions";

export default async function GastosPage() {
  const [expenses, admin, accounts] = await Promise.all([
    getExpenses(),
    isAdmin(),
    getCompanyAccounts(),
  ]);
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <GastosView
      expenses={expenses}
      admin={admin}
      accounts={accounts}
      total={total}
    />
  );
}
