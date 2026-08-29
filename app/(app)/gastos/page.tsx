import { NuevoGastoForm } from "@/components/gastos/nuevo-gasto-form";
import { GastosPdfButton } from "@/components/gastos/gastos-pdf-button";
import { GastosManager } from "@/components/gastos/gastos-manager";
import { formatMoney } from "@/lib/format";
import { getExpenses, isAdmin } from "@/lib/data";

export default async function GastosPage() {
  const [expenses, admin] = await Promise.all([getExpenses(), isAdmin()]);
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl tracking-tight">Gastos & Egresos</h1>
          <p className="text-xs text-hint mt-0.5">
            Registro, historial interno y comprobantes en PDF
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GastosPdfButton expenses={expenses} total={total} />
          <NuevoGastoForm />
        </div>
      </header>

      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <p className="text-xs text-muted">Total egresos registrados</p>
        <p className="tnum mt-1 text-2xl font-semibold text-overdue">
          {formatMoney(total)}
        </p>
      </div>

      <GastosManager expenses={expenses} admin={admin} />
    </div>
  );
}
