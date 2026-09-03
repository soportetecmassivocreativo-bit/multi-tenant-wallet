export const dynamic = "force-dynamic";

import { GastosView } from "@/components/gastos/gastos-view";
import { getExpenses, isAdmin, getBcvRates } from "@/lib/data";
import { getCompanyAccounts } from "@/lib/cuentas-actions";
import { getExpenseBreakdown } from "@/lib/cuentas-helpers";
import { getDeferredCharges, getDeferredAbonos } from "@/lib/gastos-especiales-actions";

export default async function GastosPage() {
  const [expenses, admin, accounts, bcv, deferredCharges, deferredAbonos] = await Promise.all([
    getExpenses(),
    isAdmin(),
    getCompanyAccounts(),
    getBcvRates(),
    getDeferredCharges(),
    getDeferredAbonos(),
  ]);

  const totalPagado = expenses.reduce((s, e) => s + getExpenseBreakdown(e).paidAmount, 0);
  const totalPorPagar = expenses.reduce((s, e) => s + getExpenseBreakdown(e).pendingAmount, 0);

  return (
    <GastosView
      expenses={expenses}
      deferredCharges={deferredCharges}
      deferredAbonos={deferredAbonos}
      admin={admin}
      accounts={accounts}
      bcv={bcv}
      totalPagado={totalPagado}
      totalPorPagar={totalPorPagar}
    />
  );
}

