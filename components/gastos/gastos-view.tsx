"use client";

import { useState } from "react";
import { PlusIcon } from "@/components/ui/icons";
import { GastosPdfButton } from "./gastos-pdf-button";
import { NuevoGastoForm } from "./nuevo-gasto-form";
import { GastosManager } from "./gastos-manager";
import { formatMoney } from "@/lib/format";
import type { Expense } from "@/lib/mock-data";
import type { CompanyAccount } from "@/lib/cuentas-actions";

interface GastosViewProps {
  expenses: Expense[];
  admin: boolean;
  accounts: CompanyAccount[];
  total: number;
}

export function GastosView({ expenses, admin, accounts, total }: GastosViewProps) {
  const [openNew, setOpenNew] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header fijo en la parte superior ocupando el 100% de la fila */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl tracking-tight">Gastos & Egresos</h1>
          <p className="text-xs text-hint mt-0.5">
            Registro, historial interno y comprobantes en PDF
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <GastosPdfButton expenses={expenses} total={total} />
          <button
            type="button"
            onClick={() => setOpenNew((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-95 transition-all"
          >
            <PlusIcon className="h-4 w-4" />
            <span>{openNew ? "Cerrar Formulario" : "+ Nuevo Gasto"}</span>
          </button>
        </div>
      </header>

      {/* Formulario a todo el ancho debajo del encabezado */}
      {openNew && (
        <NuevoGastoForm
          accounts={accounts}
          onClose={() => setOpenNew(false)}
        />
      )}

      {/* Tarjeta de Resumen de Totales */}
      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <p className="text-xs text-muted">Total egresos registrados</p>
        <p className="tnum mt-1 text-2xl font-semibold text-overdue">
          {formatMoney(total)}
        </p>
      </div>

      {/* Historial y Gestor de Gastos */}
      <GastosManager expenses={expenses} accounts={accounts} admin={admin} />
    </div>
  );
}
