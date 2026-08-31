export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/cobros/status-badge";
import { formatMoney, formatDate } from "@/lib/format";
import { getClients, getInvoices } from "@/lib/data";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [clients, invoices] = await Promise.all([getClients(), getInvoices()]);
  const client = clients.find((c) => c.id === id);
  if (!client) notFound();

  const clientInvoices = invoices.filter((i) => i.clientId === id);
  const totalInvoiced = clientInvoices.reduce((s, i) => s + i.total, 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/clientes" className="text-sm text-muted active:scale-95">
          ‹ Clientes
        </Link>
        <span className="font-mono text-xs text-hint">{client.rif}</span>
      </header>

      <section>
        <h1 className="font-serif text-2xl tracking-tight">{client.name}</h1>
        <p className="mt-1 text-sm text-muted">{client.email}</p>
        <p className="text-xs text-hint">{client.phone}</p>
      </section>

      {/* KPIs del cliente */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-soft p-4">
          <p className="text-xs text-muted">Total facturado</p>
          <p className="tnum mt-1 text-lg font-medium">
            {formatMoney(totalInvoiced)}
          </p>
        </div>
        <div className="rounded-2xl bg-soft p-4">
          <p className="text-xs text-muted">Crédito</p>
          <p className="mt-1 text-lg font-medium">
            {client.termDays === 0 ? "Contado" : `${client.termDays} días`}
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-serif text-[15px]">Facturas</h2>
        {clientInvoices.length === 0 ? (
          <p className="py-6 text-center text-sm text-hint">Sin facturas aún.</p>
        ) : (
          clientInvoices.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center gap-3 border-t border-line py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium">#{inv.number}</span>
                  <StatusBadge status={inv.status} />
                </div>
                <p className="text-[11px] text-hint">
                  {formatDate(inv.date)}
                </p>
              </div>
              <span className="tnum text-sm font-medium">
                {formatMoney(inv.total)}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
