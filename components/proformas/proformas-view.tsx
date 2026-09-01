"use client";

import Link from "next/link";
import { PlusIcon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/format";
import { ProformasPdfButton } from "./proformas-pdf-button";
import { ProformasManager } from "./proformas-manager";
import type { Proforma, Client } from "@/lib/mock-data";
import type { CompanyAccount } from "@/lib/cuentas-actions";

interface ProformasViewProps {
  proformas: Proforma[];
  clients: Client[];
  accounts?: CompanyAccount[];
  admin: boolean;
}

export function ProformasView({
  proformas,
  clients,
  accounts = [],
  admin,
}: ProformasViewProps) {
  const pendientes = proformas.filter((p) => p.status !== "pagada");
  const pagadas = proformas.filter((p) => p.status === "pagada");

  const totalPendiente = pendientes.reduce((s, p) => s + Number(p.total), 0);
  const totalPagado = pagadas.reduce((s, p) => s + Number(p.total), 0);

  return (
    <div className="space-y-6">
      {/* Header fijo superior */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl tracking-tight">Proformas & Presupuestos</h1>
          <p className="text-xs text-hint mt-0.5">
            Cotizaciones preliminares y pagos en espera antes de facturar
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <ProformasPdfButton
            proformas={proformas}
            clients={clients}
            porCobrar={totalPendiente}
          />
          <Link
            href="/proformas/nueva"
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-95 transition-all"
          >
            <PlusIcon className="h-4 w-4" />
            <span>+ Nueva Proforma</span>
          </Link>
        </div>
      </header>

      {/* Tarjetas de Resumen de Totales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <p className="text-xs text-muted font-medium">Proformas en Espera / Por Cobrar</p>
          <p className="tnum mt-1 text-2xl font-bold text-pending">
            {formatMoney(totalPendiente)}
          </p>
          <p className="text-[11px] text-hint mt-0.5">
            {pendientes.length} proforma(s) pendiente(s) de aprobación/pago
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <p className="text-xs text-muted font-medium">Proformas Cobradas (Acreditadas / Facturadas)</p>
          <p className="tnum mt-1 text-2xl font-bold text-income">
            {formatMoney(totalPagado)}
          </p>
          <p className="text-[11px] text-hint mt-0.5">
            {pagadas.length} proforma(s) convertida(s) a facturas
          </p>
        </div>
      </div>

      {/* Gestor y Lista de Proformas */}
      <ProformasManager
        proformas={proformas}
        clients={clients}
        accounts={accounts}
        admin={admin}
      />
    </div>
  );
}
