export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/cobros/status-badge";
import { RegistrarPagoForm } from "@/components/cobros/registrar-pago-form";
import { DeleteButton } from "@/components/ui/delete-button";
import { deleteInvoice } from "@/lib/mutations";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { getInvoiceDetail, isAdmin } from "@/lib/data";
import { getCompanyAccounts } from "@/lib/cuentas-actions";
import type { InvoiceStatus } from "@/lib/mock-data";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [inv, admin, accounts] = await Promise.all([
    getInvoiceDetail(id),
    isAdmin(),
    getCompanyAccounts(),
  ]);
  if (!inv) notFound();

  const isForeign = inv.currency !== "VES";

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/cobros" className="text-sm text-muted active:scale-95">
          ‹ Cobros
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/factura/${inv.id}`}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-accent active:scale-95"
          >
            PDF
          </Link>
          {admin && (
            <DeleteButton
              action={deleteInvoice.bind(null, inv.id)}
              ariaLabel={`Eliminar factura #${inv.number}`}
            />
          )}
        </div>
      </header>

      <section>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl tracking-tight">
              Factura #{inv.number}
            </h1>
            <p className="text-sm text-muted">{inv.clientName}</p>
          </div>
          <StatusBadge status={inv.status as InvoiceStatus} />
        </div>
        <p className="mt-1 text-xs text-hint">
          Emitida {formatDate(inv.date)}
        </p>
      </section>

      {/* Conceptos + totales */}
      <section className="rounded-2xl border border-line bg-card p-4">
        {inv.items.length === 0 ? (
          <p className="text-sm text-hint">Sin conceptos.</p>
        ) : (
          inv.items.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between py-1 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">
                {it.qty} × {it.description}
              </span>
              <span className="tnum ml-3">
                {formatCurrency(it.qty * it.unitPrice, inv.currency)}
              </span>
            </div>
          ))
        )}

        <div className="mt-2 space-y-1 border-t border-line pt-2 text-sm">
          <Row label="Subtotal" value={formatCurrency(inv.subtotal, inv.currency)} />
          {inv.discount > 0 && (
            <Row
              label="Descuento"
              value={`− ${formatCurrency(inv.discount, inv.currency)}`}
            />
          )}
          <Row label="IVA" value={formatCurrency(inv.tax, inv.currency)} />
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
          <span className="font-serif text-[15px]">Total</span>
          <span className="tnum text-xl font-medium">
            {formatCurrency(inv.total, inv.currency)}
          </span>
        </div>
        {isForeign && inv.vesTotal != null && (
          <div className="mt-2 flex items-center justify-between rounded-xl bg-accent-bg px-3 py-2 text-accent-text">
            <span className="text-xs">≈ Bolívares (tasa {inv.vesRateRef})</span>
            <span className="tnum text-sm font-medium">
              {formatCurrency(inv.vesTotal, "VES")}
            </span>
          </div>
        )}
      </section>

      {/* Pagos */}
      <section>
        <h2 className="mb-1 font-serif text-[15px]">Pagos</h2>
        {inv.payments.length === 0 ? (
          <p className="py-3 text-sm text-hint">Sin pagos registrados.</p>
        ) : (
          inv.payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between border-t border-line py-2.5 text-sm"
            >
              <span className="text-muted">
                {formatDate(p.paidOn)} · {p.method}
              </span>
              <span className="tnum font-medium text-income">
                + {formatCurrency(p.amount, inv.currency)}
              </span>
            </div>
          ))
        )}
        <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-sm">
          <span className="text-muted">
            Pagado {formatCurrency(inv.paidTotal, inv.currency)}
          </span>
          <span className="tnum font-medium text-pending">
            Pendiente {formatCurrency(inv.balance, inv.currency)}
          </span>
        </div>
      </section>

      <RegistrarPagoForm
        invoiceId={inv.id}
        currency={inv.currency}
        balance={inv.balance}
        accounts={accounts}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="tnum">{value}</span>
    </div>
  );
}
