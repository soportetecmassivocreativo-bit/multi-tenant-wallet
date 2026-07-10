import { NuevoGastoForm } from "@/components/gastos/nuevo-gasto-form";
import { DeleteButton } from "@/components/ui/delete-button";
import { deleteExpense } from "@/lib/mutations";
import { formatMoney, formatDate } from "@/lib/format";
import { getExpenses, isAdmin } from "@/lib/data";

export default async function GastosPage() {
  const [expenses, admin] = await Promise.all([getExpenses(), isAdmin()]);
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl tracking-tight">Gastos</h1>
        <NuevoGastoForm />
      </header>

      <div className="rounded-2xl bg-soft p-4">
        <p className="text-xs text-muted">Total registrado</p>
        <p className="tnum mt-1 text-2xl font-medium text-overdue">
          {formatMoney(total)}
        </p>
      </div>

      <section>
        {expenses.length === 0 ? (
          <p className="py-8 text-center text-sm text-hint">
            Aún no hay gastos. Registra el primero.
          </p>
        ) : (
          expenses.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 border-t border-line py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px]">{e.note}</p>
                <p className="text-[11px] text-hint">
                  {e.category} · {formatDate(e.date)}
                </p>
              </div>
              <span className="tnum text-sm font-medium text-overdue">
                − {formatMoney(e.amount)}
              </span>
              {admin && (
                <DeleteButton
                  action={deleteExpense.bind(null, e.id)}
                  ariaLabel={`Eliminar ${e.note}`}
                />
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
