export const dynamic = "force-dynamic";

import Link from "next/link";
import { ReportePdfButton } from "@/components/reportes/reporte-pdf-button";
import { formatMoney } from "@/lib/format";
import { getReport } from "@/lib/data";

function Bar({
  label,
  amount,
  max,
  color,
}: {
  label: string;
  amount: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((amount / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className={`tnum font-medium ${color}`}>
          {formatMoney(amount)}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-soft">
        <div
          className={`h-full rounded-full ${color === "text-income" ? "bg-income" : "bg-overdue"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function ReportesPage() {
  const r = await getReport();
  const maxBar = Math.max(r.ingresos, r.egresos, 1);
  const maxCat = Math.max(...r.porCategoria.map((c) => c.amount), 1);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/mas" className="text-sm text-muted active:scale-95">
          ‹ Más
        </Link>
        <ReportePdfButton
          ingresos={r.ingresos}
          egresos={r.egresos}
          neto={r.neto}
          porCategoria={r.porCategoria}
        />
      </header>

      <div>
        <h1 className="font-serif text-2xl tracking-tight">Reportes</h1>
        <p className="mt-1 text-sm text-muted">
          Ingresos vs egresos · este mes
        </p>
      </div>

      {!r.hasData ? (
        <p className="py-10 text-center text-sm text-hint">
          Aún no hay datos este mes. Registra cobros y gastos para ver tu
          reporte.
        </p>
      ) : (
        <>
          <section className="rounded-2xl bg-soft p-4">
            <p className="text-xs text-muted">Resultado del mes</p>
            <p
              className={`tnum mt-1 text-3xl font-medium ${
                r.neto >= 0 ? "text-income" : "text-overdue"
              }`}
            >
              {formatMoney(r.neto)}
            </p>
            <p className="mt-1 text-[11px] text-hint">
              ingresos − egresos · montos en la moneda de trabajo (US$)
            </p>
          </section>

          <section className="space-y-3 rounded-2xl border border-line bg-card p-4">
            <Bar
              label="Ingresos"
              amount={r.ingresos}
              max={maxBar}
              color="text-income"
            />
            <Bar
              label="Egresos"
              amount={r.egresos}
              max={maxBar}
              color="text-overdue"
            />
          </section>

          <section>
            <h2 className="mb-2 font-serif text-[15px]">Egresos por categoría</h2>
            {r.porCategoria.length === 0 ? (
              <p className="py-4 text-center text-sm text-hint">
                Sin gastos este mes.
              </p>
            ) : (
              <div className="space-y-3">
                {r.porCategoria.map((c) => (
                  <div key={c.category}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{c.category}</span>
                      <span className="tnum font-medium">
                        {formatMoney(c.amount)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-soft">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{
                          width: `${Math.round((c.amount / maxCat) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
