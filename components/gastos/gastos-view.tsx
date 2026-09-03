"use client";

import { useState } from "react";
import { PlusIcon } from "@/components/ui/icons";
import { GastosPdfButton } from "./gastos-pdf-button";
import { NuevoGastoForm } from "./nuevo-gasto-form";
import { GastosManager } from "./gastos-manager";
import { GastosEspecialesTab } from "./gastos-especiales-tab";
import { formatMoney } from "@/lib/format";
import type { Expense } from "@/lib/mock-data";
import type { CompanyAccount } from "@/lib/cuentas-actions";
import type { DeferredCharge, DeferredAbono } from "@/lib/gastos-especiales-actions";

interface GastosViewProps {
  expenses: Expense[];
  deferredCharges?: DeferredCharge[];
  deferredAbonos?: DeferredAbono[];
  admin: boolean;
  accounts: CompanyAccount[];
  bcv?: { usd: number; eur: number; date: string };
  totalPagado: number;
  totalPorPagar: number;
}

export function GastosView({
  expenses,
  deferredCharges = [],
  deferredAbonos = [],
  admin,
  accounts,
  bcv,
  totalPagado,
  totalPorPagar,
}: GastosViewProps) {
  const [activeTab, setActiveTab] = useState<"generales" | "especiales">("generales");
  const [openNew, setOpenNew] = useState(false);
  const totalGeneral = totalPagado + totalPorPagar;

  const pendingDeferredCount = deferredCharges.filter((c) => c.status === "pendiente").length;

  return (
    <div className="space-y-6">
      {/* Header fijo en la parte superior */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl tracking-tight">Gastos & Egresos</h1>
          <p className="text-xs text-hint mt-0.5">
            Registro, historial interno, comprobantes y consumos diferidos
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {activeTab === "generales" && (
            <>
              <GastosPdfButton expenses={expenses} total={totalGeneral} />
              <button
                type="button"
                onClick={() => setOpenNew((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-95 transition-all"
              >
                <PlusIcon className="h-4 w-4" />
                <span>{openNew ? "Cerrar Formulario" : "+ Nuevo Gasto"}</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Selector de Pestañas del Módulo */}
      <div className="flex items-center gap-2 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("generales")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === "generales"
              ? "bg-accent text-white shadow-sm"
              : "bg-card border border-line text-muted hover:text-foreground hover:bg-soft"
          }`}
        >
          <span>📑 Egresos & Gastos Generales</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
            activeTab === "generales" ? "bg-white/20 text-white" : "bg-soft text-muted"
          }`}>
            {expenses.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("especiales")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all relative ${
            activeTab === "especiales"
              ? "bg-accent text-white shadow-sm"
              : "bg-card border border-line text-muted hover:text-foreground hover:bg-soft"
          }`}
        >
          <span>💳 Gastos Especiales · Tarjeta JM</span>
          {pendingDeferredCount > 0 ? (
            <span className="rounded-full bg-pending text-neutral-900 px-2 py-0.5 text-[10px] font-bold">
              {pendingDeferredCount} pend.
            </span>
          ) : (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
              activeTab === "especiales" ? "bg-white/20 text-white" : "bg-soft text-muted"
            }`}>
              {deferredCharges.length}
            </span>
          )}
        </button>
      </div>

      {/* VISTA 1: GASTOS GENERALES */}
      {activeTab === "generales" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Formulario a todo el ancho */}
          {openNew && (
            <NuevoGastoForm
              accounts={accounts}
              bcv={bcv}
              onClose={() => setOpenNew(false)}
            />
          )}

          {/* Tarjetas de Resumen de Totales (Por Pagar vs Pagados) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
              <p className="text-xs text-muted font-medium">Gastos por pagar (Pendientes / Crédito)</p>
              <p className="tnum mt-1 text-2xl font-bold text-pending">
                {formatMoney(totalPorPagar)}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
              <p className="text-xs text-muted font-medium">Egresos pagados (Debitado)</p>
              <p className="tnum mt-1 text-2xl font-bold text-overdue">
                {formatMoney(totalPagado)}
              </p>
            </div>
          </div>

          {/* Historial y Gestor de Gastos */}
          <GastosManager expenses={expenses} accounts={accounts} admin={admin} />
        </div>
      )}

      {/* VISTA 2: GASTOS ESPECIALES · TARJETA JOSE MIGUEL */}
      {activeTab === "especiales" && (
        <GastosEspecialesTab
          charges={deferredCharges}
          abonos={deferredAbonos}
          accounts={accounts}
          bcv={bcv}
          admin={admin}
        />
      )}
    </div>
  );
}

