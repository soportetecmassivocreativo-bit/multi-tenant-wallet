import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/cobros/status-badge";
import { ScoreChip } from "@/components/clientes/score-chip";
import { formatMoney, formatDate } from "@/lib/format";
import { getClient, getInvoices } from "@/lib/data";

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  const invoices = await getInvoices();
  const clientInvoices = invoices.filter((i) => i.clientId === id);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/clientes" className="text-sm text-muted active:scale-95">
          ‹ Clientes
        </Link>
      </header>

      <section className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-accent-bg font-serif text-2xl text-accent-text">
          {client.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <h1 className="font-serif text-2xl leading-tight tracking-tight">
            {client.name}
          </h1>
          <p className="text-xs text-hint">RIF {client.rif}</p>
          <div className="mt-1.5">
            <ScoreChip score={client.score} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-soft p-4">
          <p className="text-xs text-muted">Saldo pendiente</p>
          <p className="tnum mt-1 text-lg font-medium text-pending">
            {formatMoney(client.balance)}
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
                  Vence {formatDate(inv.dueDate)}
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
