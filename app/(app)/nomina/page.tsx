import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import { ActionButton } from "@/components/ui/action-button";
import { formatMoney, formatDate } from "@/lib/format";
import { getEmployees, getPayrollPeriods } from "@/lib/data";
import { payPayroll } from "@/lib/accounting-actions";

export default async function NominaPage() {
  const [employees, periods] = await Promise.all([
    getEmployees(),
    getPayrollPeriods(),
  ]);

  const quincena = employees.reduce((s, e) => s + e.salary, 0);
  const pendiente = periods.find((p) => p.status === "pendiente");

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/mas" className="text-sm text-muted active:scale-95">
          ‹ Más
        </Link>
      </header>

      <div>
        <h1 className="font-serif text-2xl tracking-tight">Nómina</h1>
        <p className="mt-1 text-sm text-muted">Quincenal · 15 y último</p>
      </div>

      {/* Próximo período a pagar */}
      {pendiente && (
        <section className="rounded-2xl border border-line bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">Próxima nómina</p>
              <p className="font-serif text-lg">{pendiente.label}</p>
              <p className="text-[11px] text-hint">
                Pago el {formatDate(pendiente.payDate)}
              </p>
            </div>
            <p className="tnum text-2xl font-medium">
              {formatMoney(pendiente.total)}
            </p>
          </div>
          <ActionButton
            label={`Pagar nómina · ${formatMoney(pendiente.total)}`}
            doneLabel="Nómina pagada"
            action={payPayroll.bind(null, pendiente.id)}
            className="mt-4 w-full shadow-[0_8px_20px_rgba(59,91,219,0.35)]"
          />
        </section>
      )}

      {/* Períodos */}
      <section>
        <h2 className="mb-1 font-serif text-[15px]">Períodos</h2>
        {periods.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between border-t border-line py-2.5"
          >
            <div>
              <p className="text-[13px]">{p.label}</p>
              <p className="text-[11px] text-hint">
                Pago {formatDate(p.payDate)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  p.status === "pagada"
                    ? "bg-income/10 text-income"
                    : "bg-pending/10 text-pending"
                }`}
              >
                {p.status === "pagada" ? "Pagada" : "Pendiente"}
              </span>
              <span className="tnum text-sm font-medium">
                {formatMoney(p.total)}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* Empleados */}
      <section>
        <h2 className="mb-1 font-serif text-[15px]">
          Empleados · <span className="text-muted">{formatMoney(quincena)}/quincena</span>
        </h2>
        <Reveal>
          {employees.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 border-t border-line py-3"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-accent-bg font-serif text-accent-text">
                {e.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{e.name}</p>
                <p className="text-[11px] text-hint">{e.role}</p>
              </div>
              <span className="tnum text-sm font-medium">
                {formatMoney(e.salary)}
              </span>
            </div>
          ))}
        </Reveal>
      </section>
    </div>
  );
}
