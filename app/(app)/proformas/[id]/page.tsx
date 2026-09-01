export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/cobros/status-badge";
import { DeleteButton } from "@/components/ui/delete-button";
import { deleteProforma } from "@/lib/mutations";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { getProformaDetail, isAdmin } from "@/lib/data";
import { getCompanyAccounts } from "@/lib/cuentas-actions";
import { ProformasManager } from "@/components/proformas/proformas-manager";

export default async function ProformaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [prof, admin, accounts] = await Promise.all([
    getProformaDetail(id),
    isAdmin(),
    getCompanyAccounts(),
  ]);
  if (!prof) notFound();

  const isForeign = prof.currency !== "VES";
  const isPaid = prof.status === "pagada";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="flex items-center justify-between">
        <Link href="/proformas" className="text-sm text-muted active:scale-95">
          ‹ Proformas
        </Link>
        <div className="flex items-center gap-3">
          <a
            href={`/proforma/${prof.id}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-accent active:scale-95 hover:bg-soft"
          >
            Ver PDF
          </a>
          {admin && (
            <DeleteButton
              action={deleteProforma.bind(null, prof.id)}
              ariaLabel={`Eliminar proforma #${prof.number}`}
            />
          )}
        </div>
      </header>

      <section>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-2xl tracking-tight">
                Proforma #{prof.number}
              </h1>
              {prof.code && (
                <span className="rounded-full bg-soft font-mono px-2.5 py-1 text-xs font-bold text-accent">
                  {prof.code}
                </span>
              )}
            </div>
            <p className="text-sm text-muted mt-0.5">{prof.clientName}</p>
          </div>
          <StatusBadge status={prof.status as any} />
        </div>
        <p className="mt-1 text-xs text-hint">
          Emitida {formatDate(prof.date)}
          {prof.validUntil && ` · Válida hasta: ${formatDate(prof.validUntil)}`}
        </p>
      </section>

      {/* Conceptos + totales */}
      <section className="rounded-2xl border border-line bg-card p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-hint mb-3">
          Conceptos Cotizados
        </h3>
        {prof.items.length === 0 ? (
          <p className="text-sm text-hint">Sin conceptos.</p>
        ) : (
          prof.items.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between py-1.5 text-sm border-b border-line/40 last:border-0"
            >
              <span className="min-w-0 flex-1 truncate">
                {it.qty} × {it.description}
              </span>
              <span className="tnum ml-3 font-medium">
                {formatCurrency(it.qty * it.unitPrice, prof.currency)}
              </span>
            </div>
          ))
        )}

        <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
          <Row label="Subtotal" value={formatCurrency(prof.subtotal, prof.currency)} />
          {prof.discount > 0 && (
            <Row
              label="Descuento"
              value={`− ${formatCurrency(prof.discount, prof.currency)}`}
            />
          )}
          {prof.tax > 0 && (
            <Row
              label="IVA"
              value={`+ ${formatCurrency(prof.tax, prof.currency)}`}
            />
          )}
          <Row
            label="Total Proforma"
            value={formatCurrency(prof.total, prof.currency)}
            strong
          />
          {isForeign && prof.vesTotal && (
            <Row
              label={`Equivalente en Bs. (Tasa ${prof.vesRateRef || "BCV"})`}
              value={formatCurrency(prof.vesTotal, "VES")}
              hint
            />
          )}
        </div>

        {prof.notes && (
          <div className="mt-4 rounded-xl bg-soft/40 p-3 border border-line/60">
            <p className="text-[11px] font-bold text-muted uppercase">Condiciones & Notas:</p>
            <p className="text-xs text-foreground mt-1">{prof.notes}</p>
          </div>
        )}
      </section>

      {/* Acciones de Cobro y Factura */}
      <section className="rounded-2xl border border-line bg-card p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-hint">
          Estado & Disposición de Fondos
        </h3>

        {isPaid ? (
          <div className="rounded-xl bg-income/10 border border-income/20 p-4 text-xs font-medium text-income flex items-center justify-between">
            <div>
              <p className="font-bold">✓ Proforma Cobrada y Acreditada</p>
              <p className="text-[11px] text-muted mt-0.5">
                Esta proforma ya fue pagada y convertida en factura oficial.
              </p>
            </div>
            {prof.invoiceId && (
              <Link
                href={`/cobros/${prof.invoiceId}`}
                className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-accent/90"
              >
                Ver Factura Generada
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted">
              Esta proforma se encuentra en espera de pago. Al recibir el comprobante del cliente, puedes proceder al cobro para acreditar el dinero en las cuentas de la empresa y emitir la factura legal.
            </p>
            <ProformasManager
              proformas={[
                {
                  id: prof.id,
                  number: String(prof.number),
                  code: prof.code,
                  clientId: prof.clientId,
                  date: prof.date,
                  total: prof.total,
                  currency: prof.currency,
                  status: prof.status,
                  notes: prof.notes,
                },
              ]}
              clients={[{ id: prof.clientId, name: prof.clientName, rif: "", score: 100, termDays: 0, balance: 0 }]}
              accounts={accounts}
              admin={admin}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  hint,
}: {
  label: string;
  value: string;
  strong?: boolean;
  hint?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        strong ? "text-base font-bold text-foreground" : ""
      } ${hint ? "text-xs text-hint" : ""}`}
    >
      <span>{label}</span>
      <span className="tnum font-mono">{value}</span>
    </div>
  );
}
