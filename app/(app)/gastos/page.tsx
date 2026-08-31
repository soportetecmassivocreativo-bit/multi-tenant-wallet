export const dynamic = "force-dynamic";

import { GastosView } from "@/components/gastos/gastos-view";
import { getExpenses, isAdmin } from "@/lib/data";
import { getCompanyAccounts } from "@/lib/cuentas-actions";
import { getExpenseBreakdown } from "@/lib/cuentas-helpers";

export default async function GastosPage() {
  const [expenses, admin, accounts] = await Promise.all([
    getExpenses(),
    isAdmin(),
    getCompanyAccounts(),
  ]);

  const totalPagado = expenses.reduce((s, e) => s + getExpenseBreakdown(e).paidAmount, 0);
  const totalPorPagar = expenses.reduce((s, e) => s + getExpenseBreakdown(e).pendingAmount, 0);

  return (
    <GastosView
      expenses={expenses}
      admin={admin}
      accounts={accounts}
      totalPagado={totalPagado}
      totalPorPagar={totalPorPagar}
    />
  );
}
