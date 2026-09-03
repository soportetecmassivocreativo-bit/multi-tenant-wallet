"use client";

import { useState, useTransition } from "react";
import { formatCurrency, type CurrencyCode } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import {
  type DeferredCharge,
  type DeferredAbono,
  addDeferredCharge,
  addDeferredAbono,
  settleDeferredCharge,
  deleteDeferredCharge,
  deleteDeferredAbono,
  updateDeferredCardLimit,
} from "@/lib/gastos-especiales-actions";
import type { CompanyAccount } from "@/lib/cuentas-actions";
import { PlusIcon, CheckIcon, TrashIcon, SearchIcon, EditIcon } from "@/components/ui/icons";
import { MoneyInput } from "@/components/ui/money-input";

interface GastosEspecialesTabProps {
  charges: DeferredCharge[];
  abonos?: DeferredAbono[];
  cardLimit?: number;
  accounts: CompanyAccount[];
  bcv?: { usd: number; eur: number; date: string };
  admin: boolean;
}

export function GastosEspecialesTab({
  charges,
  abonos = [],
  cardLimit = 539.12,
  accounts,
  bcv,
  admin,
}: GastosEspecialesTabProps) {
  const [subTab, setSubTab] = useState<"cargos" | "abonos">("cargos");
  const [search, setSearch] = useState("");
  const [openNewCharge, setOpenNewCharge] = useState(false);
  const [openNewAbono, setOpenNewAbono] = useState(false);
  const [openEditLimit, setOpenEditLimit] = useState(false);
  const [newLimitValue, setNewLimitValue] = useState(cardLimit);
  const [settlingCharge, setSettlingCharge] = useState<DeferredCharge | null>(null);

  // Form states para nuevo cargo
  const [chargeDesc, setChargeDesc] = useState("");
  const [chargeCat, setChargeCat] = useState("Servicios");
  const [chargeAmount, setChargeAmount] = useState(0);
  const [chargeCurrency, setChargeCurrency] = useState<CurrencyCode>("USD");
  const [chargeDate, setChargeDate] = useState(new Date().toISOString().slice(0, 10));
  const [chargeNotes, setChargeNotes] = useState("");
  const [chargeError, setChargeError] = useState("");

  // Form states para nuevo abono
  const [abonoDesc, setAbonoDesc] = useState("");
  const [abonoAmount, setAbonoAmount] = useState(0);
  const [abonoCurrency, setAbonoCurrency] = useState<CurrencyCode>("USD");
  const [abonoAccountId, setAbonoAccountId] = useState("");
  const [abonoDate, setAbonoDate] = useState(new Date().toISOString().slice(0, 10));
  const [abonoRef, setAbonoRef] = useState("");
  const [abonoNotes, setAbonoNotes] = useState("");
  const [abonoError, setAbonoError] = useState("");

  // Form states para liquidar
  const [settleAccountId, setSettleAccountId] = useState("");
  const [settleDate, setSettleDate] = useState(new Date().toISOString().slice(0, 10));
  const [settleRef, setSettleRef] = useState("");
  const [settleNotes, setSettleNotes] = useState("");
  const [settleError, setSettleError] = useState("");

  const [isPending, startTransition] = useTransition();

  // Filtrar cuentas para liquidar/abonar: excluir la tarjeta de Jose Miguel
  const liquidationAccounts = accounts.filter(
    (a) =>
      !a.name.toLowerCase().includes("jose miguel") &&
      !a.name.toLowerCase().includes("josé miguel") &&
      !a.name.toLowerCase().includes("tarjeta jm")
  );

  // Cálculos Financieros
  const totalCargosUSD = charges.reduce((s, c) => (c.currency === "USD" ? s + c.amount : s), 0);
  const totalAbonosUSD = abonos.reduce((s, a) => (a.currency === "USD" ? s + a.amount : s), 0);
  
  // Saldo Disponible Restante en la Tarjeta (Límite - Consumos)
  const saldoDisponibleTarjeta = Math.max(0, cardLimit - totalCargosUSD);

  // Saldo Neto Pendiente por Liquidar/Pagar a José Miguel (Consumos - Abonos)
  const saldoNetoPagar = Math.max(0, totalCargosUSD - totalAbonosUSD);

  // Filtrado de cargos
  const filteredCharges = charges.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.description.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      (c.code && c.code.toLowerCase().includes(q))
    );
  });

  // Filtrado de abonos
  const filteredAbonos = abonos.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.description.toLowerCase().includes(q) ||
      a.paidFrom.toLowerCase().includes(q) ||
      (a.reference && a.reference.toLowerCase().includes(q)) ||
      (a.code && a.code.toLowerCase().includes(q))
    );
  });

  function handleSaveLimit(e: React.FormEvent) {
    e.preventDefault();
    if (newLimitValue <= 0) return;
    startTransition(async () => {
      await updateDeferredCardLimit(newLimitValue);
      setOpenEditLimit(false);
    });
  }

  function handleCreateCharge(e: React.FormEvent) {
    e.preventDefault();
    if (!chargeDesc.trim() || chargeAmount <= 0) {
      setChargeError("Ingresa una descripción y monto válido.");
      return;
    }
    setChargeError("");

    startTransition(async () => {
      const res = await addDeferredCharge({
        description: chargeDesc,
        category: chargeCat,
        amount: chargeAmount,
        currency: chargeCurrency,
        chargedOn: chargeDate,
        notes: chargeNotes,
      });

      if (res.ok) {
        setOpenNewCharge(false);
        setChargeDesc("");
        setChargeAmount(0);
        setChargeNotes("");
      } else {
        setChargeError(res.error || "Error al registrar el consumo.");
      }
    });
  }

  function handleCreateAbono(e: React.FormEvent) {
    e.preventDefault();
    if (!abonoDesc.trim() || abonoAmount <= 0) {
      setAbonoError("Ingresa un concepto y monto válido.");
      return;
    }
    if (!abonoAccountId) {
      setAbonoError("Selecciona la cuenta de donde se debita el pago.");
      return;
    }
    const selectedAcc = liquidationAccounts.find((a) => a.id === abonoAccountId);
    if (!selectedAcc) {
      setAbonoError("Cuenta seleccionada inválida.");
      return;
    }
    setAbonoError("");

    startTransition(async () => {
      const res = await addDeferredAbono({
        description: abonoDesc,
        amount: abonoAmount,
        currency: abonoCurrency,
        accountId: selectedAcc.id,
        accountName: selectedAcc.name,
        paidOn: abonoDate,
        reference: abonoRef,
        notes: abonoNotes,
      });

      if (res.ok) {
        setOpenNewAbono(false);
        setAbonoDesc("");
        setAbonoAmount(0);
        setAbonoAccountId("");
        setAbonoRef("");
        setAbonoNotes("");
      } else {
        setAbonoError(res.error || "Error al registrar el abono.");
      }
    });
  }

  function handleSettleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settlingCharge) return;
    if (!settleAccountId) {
      setSettleError("Selecciona la cuenta desde donde se debita el pago.");
      return;
    }
    const selectedAcc = liquidationAccounts.find((a) => a.id === settleAccountId);
    if (!selectedAcc) {
      setSettleError("Cuenta no válida.");
      return;
    }
    setSettleError("");

    startTransition(async () => {
      const res = await settleDeferredCharge({
        chargeId: settlingCharge.id,
        accountId: selectedAcc.id,
        accountName: selectedAcc.name,
        paymentDate: settleDate,
        reference: settleRef,
        notes: settleNotes,
      });

      if (res.ok) {
        setSettlingCharge(null);
        setSettleAccountId("");
        setSettleRef("");
        setSettleNotes("");
      } else {
        setSettleError(res.error || "Error al liquidar el cargo.");
      }
    });
  }

  function handleDeleteCharge(id: string) {
    if (!confirm("¿Deseas eliminar este consumo de la tarjeta?")) return;
    startTransition(async () => {
      await deleteDeferredCharge(id);
    });
  }

  function handleDeleteAbono(id: string) {
    if (!confirm("¿Deseas eliminar este abono? También se removerá de los egresos generales.")) return;
    startTransition(async () => {
      await deleteDeferredAbono(id);
    });
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Banner Informativo y Botones de Acción */}
      <div className="rounded-2xl border border-line bg-soft/50 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center text-accent text-xl font-bold shadow-xs">
            💳
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-base font-bold text-foreground">
                Gastos Especiales · Tarjeta José Miguel
              </h3>
              <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold text-accent uppercase tracking-wider">
                Límite: {formatCurrency(cardLimit, "USD")}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Los consumos descuentan del límite disponible de la tarjeta. Los abonos y pagos bancarios descuentan la deuda neta y se registran en Gastos Generales.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => {
              setOpenNewCharge((v) => !v);
              setOpenNewAbono(false);
              setOpenEditLimit(false);
            }}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-soft active:scale-95 transition-all shadow-xs"
          >
            <PlusIcon className="h-3.5 w-3.5 text-accent" />
            <span>+ Consumo Tarjeta</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpenNewAbono((v) => !v);
              setOpenNewCharge(false);
              setOpenEditLimit(false);
            }}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-accent/90 active:scale-95 transition-all"
          >
            <CheckIcon className="h-3.5 w-3.5" />
            <span>+ Abonar a Deuda</span>
          </button>
        </div>
      </div>

      {/* Modal / Formulario para Editar Límite */}
      {openEditLimit && (
        <form
          onSubmit={handleSaveLimit}
          className="rounded-2xl border border-line bg-card p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-150"
        >
          <div>
            <p className="text-xs font-bold text-foreground">Ajustar Saldo / Límite de la Tarjeta</p>
            <p className="text-[11px] text-muted">Define el cupo total o saldo base asignado a la tarjeta de José Miguel.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <MoneyInput
              value={newLimitValue}
              onValueChange={setNewLimitValue}
              className="w-32 rounded-xl border border-line bg-soft px-3 py-1.5 text-xs outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-accent px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-accent/90 disabled:opacity-50"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setOpenEditLimit(false)}
              className="rounded-xl border border-line px-3 py-1.5 text-xs text-muted hover:bg-soft"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Cuadrícula de Tarjetas KPI de Balance de Tarjeta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Tarjeta 1: Límite / Saldo Base */}
        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm relative group">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted font-medium">Límite / Saldo Tarjeta</p>
            {admin && (
              <button
                type="button"
                onClick={() => setOpenEditLimit((v) => !v)}
                className="opacity-60 hover:opacity-100 p-1 text-hint hover:text-accent rounded transition-all"
                title="Editar límite de la tarjeta"
              >
                <EditIcon className="h-3 w-3" />
              </button>
            )}
          </div>
          <p className="tnum mt-1 text-xl sm:text-2xl font-bold text-foreground">
            {formatCurrency(cardLimit, "USD")}
          </p>
          <p className="text-[11px] text-hint mt-1">
            Cupo total asignado
          </p>
        </div>

        {/* Tarjeta 2: Consumos Acumulados */}
        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <p className="text-xs text-muted font-medium">Consumos en Tarjeta</p>
          <p className="tnum mt-1 text-xl sm:text-2xl font-bold text-overdue">
            {formatCurrency(totalCargosUSD, "USD")}
          </p>
          <p className="text-[11px] text-hint mt-1">
            {charges.length} cargo(s) en tarjeta
          </p>
        </div>

        {/* Tarjeta 3: Cupo / Saldo Disponible Restante */}
        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <p className="text-xs text-muted font-medium">Cupo Disponible Restante</p>
          <p className="tnum mt-1 text-xl sm:text-2xl font-bold text-accent">
            {formatCurrency(saldoDisponibleTarjeta, "USD")}
          </p>
          <p className="text-[11px] text-hint mt-1">
            Restante por consumir
          </p>
        </div>

        {/* Tarjeta 4: Deuda Total / Saldo Neto a Pagar */}
        <div className="rounded-2xl border border-pending/30 bg-pending/5 p-4 shadow-sm">
          <p className="text-xs text-pending font-bold">Saldo Neto a Pagar</p>
          <p className="tnum mt-1 text-xl sm:text-2xl font-bold text-pending">
            {formatCurrency(saldoNetoPagar, "USD")}
          </p>
          <p className="text-[11px] text-muted mt-1">
            {abonos.length > 0 ? `Descontado ${formatCurrency(totalAbonosUSD, "USD")} en abonos` : "Sin abonos aplicados"}
          </p>
        </div>
      </div>

      {/* FORMULARIO: REGISTRAR NUEVO CONSUMO EN TARJETA */}
      {openNewCharge && (
        <form
          onSubmit={handleCreateCharge}
          className="rounded-2xl border border-line bg-card p-5 shadow-md space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h4 className="font-serif text-sm font-bold text-foreground">
              Registrar Nuevo Consumo en Tarjeta JM
            </h4>
            <span className="text-[11px] text-muted">
              Descuenta del cupo disponible de la tarjeta sin debitar cuentas bancarias
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted mb-1">Descripción / Servicio *</label>
              <input
                type="text"
                required
                placeholder="Ej. Supabase, Claude, Hosting"
                value={chargeDesc}
                onChange={(e) => setChargeDesc(e.target.value)}
                className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Categoría</label>
              <input
                type="text"
                placeholder="Ej. Base de Datos, IA, Software"
                value={chargeCat}
                onChange={(e) => setChargeCat(e.target.value)}
                className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Monto del Cargo *</label>
              <MoneyInput
                value={chargeAmount}
                onValueChange={setChargeAmount}
                placeholder="0.00"
                className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Moneda</label>
              <select
                value={chargeCurrency}
                onChange={(e) => setChargeCurrency(e.target.value as CurrencyCode)}
                className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent"
              >
                <option value="USD">USD ($)</option>
                <option value="VES">VES (Bs.)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Fecha del Cargo en Tarjeta</label>
              <input
                type="date"
                required
                value={chargeDate}
                onChange={(e) => setChargeDate(e.target.value)}
                className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent"
              />
            </div>
          </div>

          {chargeError && (
            <p className="text-xs text-rose-500 font-medium">{chargeError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={() => setOpenNewCharge(false)}
              className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-muted hover:bg-soft"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-accent px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-accent/90 disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Guardar Consumo en Tarjeta"}
            </button>
          </div>
        </form>
      )}

      {/* FORMULARIO: REGISTRAR ABONO / PAGO A LA DEUDA */}
      {openNewAbono && (
        <form
          onSubmit={handleCreateAbono}
          className="rounded-2xl border border-accent/30 bg-card p-5 shadow-lg space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div>
              <h4 className="font-serif text-sm font-bold text-foreground">
                Registrar Abono / Pago Parcial a la Deuda
              </h4>
              <p className="text-[11px] text-muted">
                Descuenta el saldo neto a pagar y genera el egreso real en Gastos Generales.
              </p>
            </div>
            <span className="text-xs font-bold text-pending">
              Deuda Neta: {formatCurrency(saldoNetoPagar, "USD")}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted mb-1">Concepto del Abono / Pago *</label>
              <input
                type="text"
                required
                placeholder="Ej. Pago Albañil Jose Miguel Arias, Abono parcial tarjeta"
                value={abonoDesc}
                onChange={(e) => setAbonoDesc(e.target.value)}
                className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Monto Abonado *</label>
              <MoneyInput
                value={abonoAmount}
                onValueChange={setAbonoAmount}
                placeholder="0.00"
                className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Cuenta de Origen del Pago *</label>
              <select
                required
                value={abonoAccountId}
                onChange={(e) => setAbonoAccountId(e.target.value)}
                className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent font-medium"
              >
                <option value="">Selecciona cuenta pagadora...</option>
                {liquidationAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Fecha de Pago</label>
              <input
                type="date"
                required
                value={abonoDate}
                onChange={(e) => setAbonoDate(e.target.value)}
                className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Nº Referencia</label>
              <input
                type="text"
                placeholder="Ej. Ref: 67689643"
                value={abonoRef}
                onChange={(e) => setAbonoRef(e.target.value)}
                className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent"
              />
            </div>
          </div>

          {abonoError && (
            <p className="text-xs text-rose-500 font-medium">{abonoError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={() => setOpenNewAbono(false)}
              className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-muted hover:bg-soft"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-accent/90 disabled:opacity-50"
            >
              <CheckIcon className="h-3.5 w-3.5" />
              <span>{isPending ? "Abonando..." : "Confirmar & Registrar Abono"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Modal de Liquidación Individual */}
      {settlingCharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleSettleSubmit}
            className="w-full max-w-lg rounded-2xl border border-line bg-card p-5 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-serif text-base font-bold text-foreground">
                  Liquidar Cargo Específico
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Genera el egreso definitivo en el módulo de <strong>Gastos & Egresos</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettlingCharge(null)}
                className="rounded-lg p-1 text-muted hover:bg-soft"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl bg-soft/70 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">{settlingCharge.description}</p>
                <p className="text-[11px] text-muted">{settlingCharge.category} · Cargo: {formatDate(settlingCharge.chargedOn)}</p>
              </div>
              <p className="tnum text-base font-bold text-foreground">
                {formatCurrency(settlingCharge.amount, settlingCharge.currency)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Cuenta de Débito Bancario / Crypto *
              </label>
              <select
                required
                value={settleAccountId}
                onChange={(e) => setSettleAccountId(e.target.value)}
                className="w-full rounded-xl border border-line bg-soft px-3 py-2.5 text-xs outline-none focus:border-accent font-medium"
              >
                <option value="">Selecciona la cuenta pagadora...</option>
                {liquidationAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Fecha de Débito / Pago *</label>
                <input
                  type="date"
                  required
                  value={settleDate}
                  onChange={(e) => setSettleDate(e.target.value)}
                  className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs text-muted mb-1">Nº Referencia</label>
                <input
                  type="text"
                  placeholder="Ej. Ref: 00488974"
                  value={settleRef}
                  onChange={(e) => setSettleRef(e.target.value)}
                  className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent"
                />
              </div>
            </div>

            {settleError && (
              <p className="text-xs text-rose-500 font-medium">{settleError}</p>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setSettlingCharge(null)}
                className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-muted hover:bg-soft"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-accent/90 disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4" />
                <span>{isPending ? "Liquidando..." : "Confirmar & Crear Gasto"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pestañas Secundarias: Consumos en Tarjeta vs Abonos a la Deuda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl bg-soft p-1 border border-line text-xs">
          <button
            type="button"
            onClick={() => setSubTab("cargos")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              subTab === "cargos" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted hover:text-foreground"
            }`}
          >
            📋 Consumos en Tarjeta ({charges.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("abonos")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              subTab === "abonos" ? "bg-card text-income shadow-xs font-bold" : "text-muted hover:text-foreground"
            }`}
          >
            💸 Abonos & Pagos Realizados ({abonos.length})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Buscar por descripción, referencia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-line bg-card pl-9 pr-3 py-1.5 text-xs outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* SECCIÓN 1: LISTADO DE CONSUMOS EN TARJETA */}
      {subTab === "cargos" && (
        <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm">
          <div className="bg-soft/60 px-4 py-2.5 border-b border-line flex items-center justify-between text-xs font-medium text-muted">
            <span>Consumo / Servicio Diferido</span>
            <span>Monto del Cargo</span>
          </div>

          {filteredCharges.length === 0 ? (
            <div className="p-8 text-center text-xs text-hint">
              No hay consumos en tarjeta registrados.
            </div>
          ) : (
            <div className="divide-y divide-line">
              {filteredCharges.map((c) => {
                const isPaid = c.status === "pagado";
                return (
                  <div
                    key={c.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-soft/40 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isPaid ? "bg-income/10 text-income border border-income/20" : "bg-pending/10 text-pending border border-pending/20"
                        }`}
                      >
                        {isPaid ? "✓" : "💳"}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-foreground truncate">
                            {c.description}
                          </p>
                          {c.code && (
                            <span className="rounded-full bg-soft font-mono px-2 py-0.5 text-[10px] font-semibold text-muted">
                              {c.code}
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isPaid
                                ? "bg-income/10 text-income border border-income/20"
                                : "bg-pending/10 text-pending border border-pending/20"
                            }`}
                          >
                            {isPaid ? "Liquidado" : "Pendiente en Tarjeta"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-xs text-muted flex-wrap">
                          <span>{c.category}</span>
                          <span>·</span>
                          <span>Cargo en Tarjeta: {formatDate(c.chargedOn)}</span>
                          {isPaid && c.paidFrom && (
                            <>
                              <span>·</span>
                              <span className="text-income font-medium">
                                Debitado de {c.paidFrom} ({formatDate(c.paidOn || c.chargedOn)})
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
                      <span className="tnum text-sm sm:text-base font-bold text-foreground">
                        {formatCurrency(c.amount, c.currency)}
                      </span>

                      {!isPaid && (
                        <button
                          type="button"
                          onClick={() => {
                            setSettlingCharge(c);
                            setSettleAccountId("");
                            setSettleRef("");
                            setSettleNotes("");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-accent/90 active:scale-95 transition-all"
                        >
                          <CheckIcon className="h-3.5 w-3.5" />
                          <span>Liquidar</span>
                        </button>
                      )}

                      {admin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCharge(c.id)}
                          className="rounded-lg p-1.5 text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Eliminar consumo"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 2: LISTADO DE ABONOS Y PAGOS REALIZADOS */}
      {subTab === "abonos" && (
        <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm">
          <div className="bg-soft/60 px-4 py-2.5 border-b border-line flex items-center justify-between text-xs font-medium text-muted">
            <span>Abono / Pago Parcial Realizado</span>
            <span>Monto Abonado</span>
          </div>

          {filteredAbonos.length === 0 ? (
            <div className="p-8 text-center text-xs text-hint">
              No hay abonos registrados a la deuda de la tarjeta.
            </div>
          ) : (
            <div className="divide-y divide-line">
              {filteredAbonos.map((a) => (
                <div
                  key={a.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-soft/40 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-9 w-9 shrink-0 rounded-xl bg-income/10 text-income border border-income/20 flex items-center justify-center font-bold text-sm">
                      ✓
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-foreground truncate">
                          {a.description}
                        </p>
                        {a.code && (
                          <span className="rounded-full bg-soft font-mono px-2 py-0.5 text-[10px] font-semibold text-muted">
                            {a.code}
                          </span>
                        )}
                        <span className="rounded-full bg-income/10 text-income px-2 py-0.5 text-[10px] font-bold border border-income/20">
                          Abonado a Deuda
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-muted flex-wrap">
                        <span>Debitado de: <strong className="text-foreground">{a.paidFrom}</strong></span>
                        <span>·</span>
                        <span>Fecha: {formatDate(a.paidOn)}</span>
                        {a.reference && <span>· Ref: <strong>{a.reference}</strong></span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
                    <div className="text-right">
                      <span className="tnum text-sm sm:text-base font-bold text-income block">
                        − {formatCurrency(a.amount, a.currency)}
                      </span>
                      <span className="text-[10px] text-muted">Impacta Gastos Generales</span>
                    </div>

                    {admin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAbono(a.id)}
                        className="rounded-lg p-1.5 text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Eliminar abono"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
