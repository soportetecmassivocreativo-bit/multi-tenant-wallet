import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import { ActionButton } from "@/components/ui/action-button";
import { formatMoney, formatDate } from "@/lib/format";
import { getServices } from "@/lib/data";
import { payService } from "@/lib/accounting-actions";

export default async function ServiciosPage() {
  const services = await getServices();

  const mensual = services.reduce(
    (s, x) => s + (x.cycle === "anual" ? x.amount / 12 : x.amount),
    0,
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/mas" className="text-sm text-muted active:scale-95">
          ‹ Más
        </Link>
      </header>

      <div>
        <h1 className="font-serif text-2xl tracking-tight">Servicios</h1>
        <p className="mt-1 text-sm text-muted">
          Suscripciones y pagos recurrentes
        </p>
      </div>

      <div className="rounded-2xl bg-soft p-4">
        <p className="text-xs text-muted">Costo mensual estimado</p>
        <p className="tnum mt-1 text-2xl font-medium text-overdue">
          {formatMoney(mensual)}
        </p>
        <p className="mt-1 text-[11px] text-hint">
          {services.length} servicios · contabilizados como egresos
        </p>
      </div>

      <Reveal className="space-y-2.5">
        {services.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-soft font-serif text-sm">
              {s.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] text-muted">
                  {s.cycle}
                </span>
              </div>
              <p className="text-[11px] text-hint">
                {s.category} · próximo {formatDate(s.nextChargeDate)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="tnum text-sm font-medium">
                {formatMoney(s.amount)}
              </span>
              <ActionButton
                label="Pagar"
                doneLabel="Pagado"
                action={payService.bind(null, s.id)}
                className="px-4"
              />
            </div>
          </div>
        ))}
      </Reveal>
    </div>
  );
}
