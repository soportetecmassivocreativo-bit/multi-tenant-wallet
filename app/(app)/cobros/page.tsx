import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import { StatusBadge } from "@/components/cobros/status-badge";
import { DeleteButton } from "@/components/ui/delete-button";
import { PlusIcon } from "@/components/ui/icons";
import { deleteInvoice } from "@/lib/mutations";
import { formatMoney, formatDate } from "@/lib/format";
import { getInvoices, getClients, isAdmin } from "@/lib/data";

const OPEN = ["pendiente", "parcial", "vencida"];

export default async function CobrosPage() {
  const [invoices, clients, admin] = await Promise.all([
    getInvoices(),
    getClients(),
    isAdmin(),
  ]);
  const clientName = (id: string) =>
    clients.find((c) => c.id === id)?.name ?? "—";

  const porCobrar = invoices
    .filter((i) => OPEN.includes(i.status))
    .reduce((s, i) => s + i.total, 0);
  const vencidas = invoices.filter((i) => i.status === "vencida").length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl tracking-tight">Cobros</h1>
        <Link
          href="/cobros/nueva"
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-[0_6px_16px_rgba(59,91,219,0.35)] active:scale-95"
        >
          <PlusIcon className="h-4 w-4" />
          Nueva factura
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-soft p-4">
          <p className="text-xs text-muted">Por cobrar</p>
          <p className="tnum mt-1 text-lg font-medium text-pending">
            {formatMoney(porCobrar)}
          </p>
        </div>
        <div className="rounded-2xl bg-soft p-4">
          <p className="text-xs text-muted">Vencidas</p>
          <p className="tnum mt-1 text-lg font-medium text-overdue">{vencidas}</p>
        </div>
      </div>

      <section>
        <h2 className="mb-1 font-serif text-[15px]">Facturas</h2>
        <Reveal>
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center gap-3 border-t border-line py-3"
            >
              <Link
                href={`/cobros/${inv.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 active:scale-[0.99]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium">
                      #{inv.number}
                    </span>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="truncate text-[11px] text-hint">
                    {clientName(inv.clientId)} · vence {formatDate(inv.dueDate)}
                  </p>
                </div>
                <span className="tnum text-sm font-medium">
                  {formatMoney(inv.total)}
                </span>
              </Link>
              {admin && (
                <DeleteButton
                  action={deleteInvoice.bind(null, inv.id)}
                  ariaLabel={`Eliminar factura #${inv.number}`}
                />
              )}
            </div>
          ))}
        </Reveal>
      </section>
    </div>
  );
}
