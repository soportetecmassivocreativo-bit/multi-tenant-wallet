"use client";

import { useState, useTransition } from "react";
import { formatCurrency, type CurrencyCode } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import {
  type DeferredCharge,
  addDeferredCharge,
  settleDeferredCharge,
  deleteDeferredCharge,
} from "@/lib/gastos-especiales-actions";
import type { CompanyAccount } from "@/lib/cuentas-actions";
import { PlusIcon, CheckIcon, TrashIcon, SearchIcon } from "@/components/ui/icons";
import { MoneyInput } from "@/components/ui/money-input";

interface GastosEspecialesTabProps {
  charges: DeferredCharge[];
  accounts: CompanyAccount[];
  bcv?: { usd: number; eur: number; date: string };
  admin: boolean;
}

export function GastosEspecialesTab({
  charges,
  accounts,
  bcv,
  admin,
}: GastosEspecialesTabProps) {
  const [filter, setFilter] = useState<"todos" | "pendientes" | "pagados">("todos");
  const [search, setSearch] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [settlingCharge, setSettlingCharge] = useState<DeferredCharge | null>(null);

  // Form states para nuevo cargo
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("Servicios");
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [chargedOn, setChargedOn] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Form states para liquidar
  const [settleAccountId, setSettleAccountId] = useState("");
  const [settleDate, setSettleDate] = useState(new Date().toISOString().slice(0, 10));
  const [settleRef, setSettleRef] = useState("");
  const [settleNotes, setSettleNotes] = useState("");
  const [settleError, setSettleError] = useState("");

  const [isPending, startTransition] = useTransition();

  // Filtrar cuentas para liquidar: excluir la tarjeta de Jose Miguel
  const liquidationAccounts = accounts.filter(
    (a) =>
      !a.name.toLowerCase().includes("jose miguel") &&
      !a.name.toLowerCase().includes("josé miguel") &&
      !a.name.toLowerCase().includes("tarjeta jm")
  );

  // Totales
  const pendingCharges = charges.filter((c) => c.status === "pendiente");
  const paidCharges = charges.filter((c) => c.status === "pagado");

  const totalPendingUSD = pendingCharges
    .filter((c) => c.currency === "USD")
    .reduce((s, c) => s + c.amount, 0);

  const totalPaidUSD = paidCharges
    .filter((c) => c.currency === "USD")
    .reduce((s, c) => s + c.amount, 0);

  // Filtrar lista
  const filtered = charges.filter((c) => {
    if (filter === "pendientes" && c.status !== "pendiente") return false;
    if (filter === "pagados" && c.status !== "pagado") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.code && c.code.toLowerCase().includes(q))
      );
    }
    return true;
  });

  function handleCreateCharge(e: React.FormEvent) {
    e.preventDefault();
    if (!desc.trim() || amount <= 0) {
      setErrorMsg("Ingresa una descripción y monto válido.");
      return;
    }
    setErrorMsg("");

    startTransition(async () => {
      const res = await addDeferredCharge({
        description: desc,
        category: cat,
        amount,
        currency,
        chargedOn,
        notes,
      });

      if (res.ok) {
        setOpenNew(false);
        setDesc("");
        setAmount(0);
        setNotes("");
      } else {
        setErrorMsg(res.error || "Error al guardar el cargo.");
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

  function handleDelete(id: string) {
    if (!confirm("¿Deseas eliminar este registro diferido?")) return;
    startTransition(async () => {
      await deleteDeferredCharge(id);
    });
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Banner Informativo de Tarjeta Post-Pago */}
      <div className="rounded-2xl border border-line bg-soft/50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center text-accent text-lg font-bold">
            💳
          </div>
          <div>
            <h3 className="font-serif text-sm font-bold text-foreground">
              Tarjeta Post-Pago · José Miguel
            </h3>
            <p className="text-xs text-muted">
              Los consumos registrados aquí <strong>NO</strong> se suman a los gastos generales hasta que sean liquidados desde Banesco o Binance.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpenNew((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-95 transition-all self-stretch sm:self-auto justify-center"
        >
          <PlusIcon className="h-4 w-4" />
          <span>{openNew ? "Cerrar Formulario" : "+ Cargo en Tarjeta JM"}</span>
        </button>
      </div>

      {/* Tarjetas KPI de Deuda y Liquidación */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <p className="text-xs text-muted font-medium">Deuda Pendiente (Por Liquidar)</p>
          <p className="tnum mt-1 text-2xl font-bold text-pending">
            {formatCurrency(totalPendingUSD, "USD")}
          </p>
          <p className="text-[11px] text-hint mt-1">
            {pendingCharges.length} consumo(s) diferido(s) en tarjeta
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <p className="text-xs text-muted font-medium">Liquidado en Gastos & Egresos</p>
          <p className="tnum mt-1 text-2xl font-bold text-income">
            {formatCurrency(totalPaidUSD, "USD")}
          </p>
          <p className="text-[11px] text-hint mt-1">
            {paidCharges.length} cargo(s) debitado(s) de bancos
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <p className="text-xs text-muted font-medium">Total Consumos Históricos</p>
          <p className="tnum mt-1 text-2xl font-bold text-foreground">
            {charges.length}
          </p>
          <p className="text-[11px] text-hint mt-1">
            Registro de auditoría permanente
          </p>
        </div>
      </div>

      {/* Formulario Nuevo Cargo */}
      {openNew && (
        <form
          onSubmit={handleCreateCharge}
          className="rounded-2xl border border-line bg-card p-5 shadow-md space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h4 className="font-serif text-sm font-bold text-foreground">
              Registrar Nuevo Consumo en Tarjeta JM
            </h4>
            <span className="text-[11px] text-muted">
              Se guardará en estado pendiente sin debitar bancos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted mb-1">Descripción / Concepto *</label>
              <input
                type="text"
                required
                placeholder="Ej. Supabase Pro, Claude AI, Servidor Cloud"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Categoría</label>
              <input
                type="text"
                placeholder="Ej. Base de Datos, IA, Software"
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Monto *</label>
              <MoneyInput
                value={amount}
                onValueChange={setAmount}
                placeholder="0.00"
                className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Moneda</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
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
                value={chargedOn}
                onChange={(e) => setChargedOn(e.target.value)}
                className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Notas u Observaciones (Opcional)</label>
            <input
              type="text"
              placeholder="Ej. Cargo de suscripción mensual"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-500 font-medium">{errorMsg}</p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={() => setOpenNew(false)}
              className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-muted hover:bg-soft"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-accent px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-accent/90 disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Guardar Cargo Diferido"}
            </button>
          </div>
        </form>
      )}

      {/* Modal de Liquidación */}
      {settlingCharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleSettleSubmit}
            className="w-full max-w-lg rounded-2xl border border-line bg-card p-5 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-serif text-base font-bold text-foreground">
                  Liquidar Cargo de Tarjeta JM
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Se creará el egreso definitivo en el módulo de <strong>Gastos & Egresos</strong>.
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

            {/* Resumen del Cargo */}
            <div className="rounded-xl bg-soft/70 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">{settlingCharge.description}</p>
                <p className="text-[11px] text-muted">{settlingCharge.category} · Cargo: {formatDate(settlingCharge.chargedOn)}</p>
              </div>
              <p className="tnum text-base font-bold text-foreground">
                {formatCurrency(settlingCharge.amount, settlingCharge.currency)}
              </p>
            </div>

            {/* Cuenta de Débito (Banesco, Binance, etc.) */}
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
                <label className="block text-xs text-muted mb-1">Nº de Referencia / Comprobante</label>
                <input
                  type="text"
                  placeholder="Ej. Ref: 00488974"
                  value={settleRef}
                  onChange={(e) => setSettleRef(e.target.value)}
                  className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Observaciones</label>
              <input
                type="text"
                placeholder="Ej. Pago de factura de tarjeta"
                value={settleNotes}
                onChange={(e) => setSettleNotes(e.target.value)}
                className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent"
              />
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

      {/* Controles de Filtro y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl bg-soft p-1 border border-line text-xs">
          <button
            type="button"
            onClick={() => setFilter("todos")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              filter === "todos" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted hover:text-foreground"
            }`}
          >
            Todos ({charges.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("pendientes")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              filter === "pendientes" ? "bg-card text-pending shadow-xs font-bold" : "text-muted hover:text-foreground"
            }`}
          >
            Pendientes ({pendingCharges.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("pagados")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              filter === "pagados" ? "bg-card text-income shadow-xs font-bold" : "text-muted hover:text-foreground"
            }`}
          >
            Liquidados ({paidCharges.length})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Buscar por servicio, categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-line bg-card pl-9 pr-3 py-1.5 text-xs outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Listado de Cargos */}
      <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-hint">
            No hay consumos diferidos en esta vista.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((c) => {
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
                        <span>Cargo Tarjeta: {formatDate(c.chargedOn)}</span>
                        {isPaid && c.paidFrom && (
                          <>
                            <span>·</span>
                            <span className="text-income font-medium">
                              Debitado de {c.paidFrom} ({formatDate(c.paidOn || c.chargedOn)})
                            </span>
                          </>
                        )}
                        {c.reference && <span>· Ref: {c.reference}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
                    <span className="tnum text-sm sm:text-base font-bold text-foreground">
                      {formatCurrency(c.amount, c.currency)}
                    </span>

                    {!isPaid ? (
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
                        <span>Liquidar Gasto</span>
                      </button>
                    ) : (
                      <span className="text-xs text-income font-semibold px-2 py-1 bg-income/10 rounded-lg">
                        En Gastos & Egresos
                      </span>
                    )}

                    {admin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="rounded-lg p-1.5 text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Eliminar cargo"
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
    </div>
  );
}
