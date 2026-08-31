export const dynamic = "force-dynamic";

import Link from "next/link";
import { PlusIcon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/format";
import { getInvoices, getClients, getPayments, isAdmin } from "@/lib/data";
import { getCompanyAccounts } from "@/lib/cuentas-actions";
import { CobrosPdfButton } from "@/components/cobros/cobros-pdf-button";
import { CobrosManager } from "@/components/cobros/cobros-manager";

const OPEN = ["pendiente", "parcial", "vencida"];

export default async function CobrosPage() {
  const [invoices, clients, payments, admin, accounts] = await Promise.all([
    getInvoices(),
    getClients(),
    getPayments(),
    isAdmin(),
    getCompanyAccounts(),
  ]);

  const porCobrar = invoices
    .filter((i) => OPEN.includes(i.status))
    .reduce((s, i) => s + i.total, 0);
  const vencidas = invoices.filter((i) => i.status === "vencida").length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl tracking-tight">Cobros & Facturas</h1>
          <p className="text-xs text-hint mt-0.5">
            Emisión de facturas, cuentas por cobrar e historial de pagos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CobrosPdfButton
            invoices={invoices}
            clients={clients}
            porCobrar={porCobrar}
            vencidas={vencidas}
          />
          <Link
            href="/cobros/nueva"
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-[0_6px_16px_rgba(59,91,219,0.35)] active:scale-95 hover:bg-accent/90 transition-all"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Nueva factura</span>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <p className="text-xs text-muted font-medium">Por cobrar</p>
          <p className="tnum mt-1 text-xl font-bold text-pending">
            {formatMoney(porCobrar)}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <p className="text-xs text-muted font-medium">Facturas vencidas</p>
          <p className="tnum mt-1 text-xl font-bold text-overdue">{vencidas}</p>
        </div>
      </div>

      <CobrosManager
        invoices={invoices}
        clients={clients}
        payments={payments}
        accounts={accounts}
        admin={admin}
      />
    </div>
  );
}
