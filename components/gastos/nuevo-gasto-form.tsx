"use client";

import { useState, useTransition } from "react";
import { PlusIcon, ArrowPathIcon } from "@/components/ui/icons";
import { MoneyInput } from "@/components/ui/money-input";
import { createExpense } from "@/lib/mutations";
import { formatDate } from "@/lib/format";
import {
  formatCurrency,
  toBolivars,
  CURRENCIES,
  type CurrencyCode,
  type RateRef,
} from "@/lib/currency";
import { syncBcvRates, saveManualBcvRates } from "@/lib/bcv-actions";
import type { CompanyAccount } from "@/lib/cuentas-actions";
import { getPaymentMethodsForAccount } from "@/lib/cuentas-helpers";

const termOptions = [
  { label: "Contado", days: 0 },
  { label: "15 días", days: 15 },
  { label: "30 días", days: 30 },
  { label: "60 días", days: 60 },
];

const inputClass =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm outline-none focus:border-accent";

interface ExpenseLine {
  id: number;
  description: string;
  qty: number;
  unitPrice: number;
}

interface NuevoGastoFormProps {
  accounts?: CompanyAccount[];
  bcv?: { usd: number; eur: number; date: string };
  onClose?: () => void;
}

export function NuevoGastoForm({ accounts = [], bcv, onClose }: NuevoGastoFormProps) {
  const safeBcv = {
    usd: bcv?.usd ?? 798.326,
    eur: bcv?.eur ?? 926.5531,
    date: bcv?.date ?? new Date().toISOString().slice(0, 10),
  };
  const [currentBcv, setCurrentBcv] = useState(safeBcv);
  const [projectTitle, setProjectTitle] = useState("");
  const [note, setNote] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Operaciones");
  const [lines, setLines] = useState<ExpenseLine[]>([
    { id: 1, description: "", qty: 1, unitPrice: 0 },
  ]);
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [rateRef, setRateRef] = useState<RateRef>("USD");
  const [rateMode, setRateMode] = useState<"usd" | "eur" | "manual">("usd");
  const [rate, setRate] = useState<number>(safeBcv.usd);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncPending, startSyncTransition] = useTransition();

  const [creditDays, setCreditDays] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts.find((a) => a.isDefault || a.currency === "USD")?.id || accounts[0]?.id || ""
  );
  const [paymentMethod, setPaymentMethod] = useState("Transferencia Bancaria");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function addLine() {
    setLines((prev) => [
      ...prev,
      { id: Date.now(), description: "", qty: 1, unitPrice: 0 },
    ]);
  }

  function removeLine(id: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }

  function updateLine(id: number, patch: Partial<ExpenseLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  const computedTotal = lines.reduce(
    (sum, l) => sum + (Number(l.qty) || 1) * (Number(l.unitPrice) || 0),
    0
  );
  const activeTotal = computedTotal > 0 ? computedTotal : amount;
  const hasValidLines = lines.some(
    (l) => l.description.trim().length > 0 && (Number(l.unitPrice) > 0 || Number(l.qty) > 0)
  );
  const hasConcept = Boolean(projectTitle.trim() || hasValidLines || note.trim());
  const isSubmitDisabled = activeTotal <= 0 || !hasConcept || pending;

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const isCash = creditDays === 0;
  const isForeign = currency !== "VES";
  const vesEquivalent = isForeign ? toBolivars(activeTotal, rate) : null;

  function onCurrencyChange(c: CurrencyCode) {
    setCurrency(c);
    if (c === "EUR") {
      setRateRef("EUR");
      if (rateMode !== "manual") {
        setRateMode("eur");
        setRate(currentBcv.eur);
      }
    } else {
      setRateRef("USD");
      if (rateMode !== "manual") {
        setRateMode("usd");
        setRate(currentBcv.usd);
      }
    }
  }

  function onSelectRateRef(ref: RateRef) {
    setRateRef(ref);
    setRateMode(ref === "USD" ? "usd" : "eur");
    setRate(ref === "USD" ? currentBcv.usd : currentBcv.eur);
  }

  function onSelectManual() {
    setRateMode("manual");
  }

  function onRateValueChange(val: number) {
    setRate(val);
    setRateMode("manual");
  }

  function handleSync() {
    setSyncMsg(null);
    startSyncTransition(async () => {
      const res = await syncBcvRates();
      if (res.ok && res.data) {
        setCurrentBcv({
          usd: res.data.usd,
          eur: res.data.eur,
          date: res.data.date,
        });
        if (rateMode === "usd") setRate(res.data.usd);
        if (rateMode === "eur") setRate(res.data.eur);
        setSyncMsg(`Sincronizado (${res.data.source || "BCV"})`);
      } else {
        setSyncMsg("No se pudo sincronizar con BCV");
      }
      setTimeout(() => setSyncMsg(null), 4000);
    });
  }

  function handleSaveAsGlobalRate() {
    startSyncTransition(async () => {
      const isUsd = rateRef === "USD";
      const res = await saveManualBcvRates({
        usd: isUsd ? rate : currentBcv.usd,
        eur: !isUsd ? rate : currentBcv.eur,
        date: new Date().toISOString().slice(0, 10),
      });
      if (res.ok) {
        setSyncMsg("Tasa manual fijada en todo el sistema");
      }
      setTimeout(() => setSyncMsg(null), 4000);
    });
  }

  function submit() {
    const validLines = lines
      .map((l) => ({ ...l, description: l.description.trim() }))
      .filter((l) => l.description.length > 0 && (Number(l.unitPrice) > 0 || Number(l.qty) > 0));

    const totalToUse = computedTotal > 0 ? computedTotal : amount;
    if (totalToUse <= 0 || (!projectTitle.trim() && validLines.length === 0 && !note.trim())) {
      setError("Indica el concepto y al menos una partida con monto.");
      return;
    }
    setError(null);

    let fullNote = "";
    if (validLines.length > 0) {
      const itemsList = validLines
        .map((l, idx) => `• #${idx + 1} ${l.description} (${l.qty > 1 ? `${l.qty}x ` : ""}${formatCurrency(l.qty * l.unitPrice, currency)})`)
        .join("\n");

      if (projectTitle.trim()) {
        fullNote = `${projectTitle.trim()}\n${itemsList}`;
      } else {
        fullNote = itemsList;
      }
    } else {
      fullNote = projectTitle.trim() || note.trim();
    }

    if (description.trim()) {
      fullNote = `${fullNote}\nObs: ${description.trim()}`;
    }

    if (!isCash) {
      fullNote = `${fullNote} [A Crédito ${creditDays} días / Por Pagar]`;
    }

    start(async () => {
      const r = await createExpense({
        note: fullNote,
        category: category.trim() || "General",
        amount: totalToUse,
        currency,
        accountId: isCash ? (selectedAccountId || undefined) : undefined,
        accountName: isCash && selectedAccount ? selectedAccount.name : undefined,
        reference: isCash && reference.trim() ? reference.trim() : undefined,
        vesRate: isForeign ? rate : undefined,
        vesRateRef: isForeign ? (rateRef === "USD" ? "BCV USD" : "BCV EUR") : undefined,
      });

      if (r.ok) {
        setProjectTitle("");
        setNote("");
        setDescription("");
        setLines([{ id: Date.now(), description: "", qty: 1, unitPrice: 0 }]);
        setAmount(0);
        setReference("");
        setCreditDays(0);
        onClose?.();
      } else {
        setError(r.error ?? "No se pudo registrar el gasto.");
      }
    });
  }

  return (
    <section className="space-y-4 rounded-3xl border border-line bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <h3 className="font-serif text-lg font-bold text-foreground">
            Registrar Nuevo Gasto / Egreso
          </h3>
          <p className="text-xs text-hint">Asienta compras, pagos de servicios o gastos operativos</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted hover:text-foreground font-medium px-2 py-1 rounded-lg hover:bg-soft"
          >
            ✕ Cerrar
          </button>
        )}
      </div>

          {/* Fila 1: Categoría y Moneda */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted">Categoría / Tipo de Gasto</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                <option value="Operaciones">Operaciones</option>
                <option value="Servicios">Servicios Básicos</option>
                <option value="Viáticos">Viáticos / Transporte</option>
                <option value="Materiales">Materiales y Suministros</option>
                <option value="Marketing">Marketing y Publicidad</option>
                <option value="Honorarios">Honorarios Profesionales</option>
                <option value="General">General / Varios</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted">Moneda</label>
              <select
                value={currency}
                onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
                className={inputClass}
              >
                {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => (
                  <option key={c} value={c}>
                    {CURRENCIES[c].symbol} {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conversión a Bolívares (BCV / Manual) */}
          {isForeign && (
            <section className="space-y-3 rounded-2xl border border-line bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-serif text-[15px]">Conversión a Bolívares</p>
                  <p className="text-[11px] text-hint flex items-center gap-1.5 flex-wrap">
                    <span>
                      {rateMode === "manual"
                        ? "Tasa manual de contingencia"
                        : `BCV Oficial · Fecha Valor: ${formatDate(currentBcv?.date) || "Hoy"}`}
                    </span>
                    {syncMsg && (
                      <span className="rounded-md bg-income/15 px-1.5 py-0.5 text-[10px] font-semibold text-income">
                        ✓ {syncMsg}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-soft px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-line active:scale-95 disabled:opacity-50 transition-all border border-line"
                  title="Sincronizar tasa y fecha oficial del BCV en vivo"
                >
                  <ArrowPathIcon className={`h-3.5 w-3.5 ${syncPending ? "animate-spin text-accent" : ""}`} />
                  <span className="text-[11px]">{syncPending ? "Sincronizando…" : "Actualizar BCV"}</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => onSelectRateRef("USD")}
                  className={`rounded-xl border px-2 py-2 text-xs font-medium transition-all active:scale-[0.98] ${
                    rateMode === "usd"
                      ? "border-accent bg-accent-bg text-accent-text"
                      : "border-line text-muted hover:bg-soft"
                  }`}
                >
                  Tasa Dólar
                </button>

                <button
                  type="button"
                  onClick={() => onSelectRateRef("EUR")}
                  className={`rounded-xl border px-2 py-2 text-xs font-medium transition-all active:scale-[0.98] ${
                    rateMode === "eur"
                      ? "border-accent bg-accent-bg text-accent-text"
                      : "border-line text-muted hover:bg-soft"
                  }`}
                >
                  Tasa Euro
                </button>

                <button
                  type="button"
                  onClick={onSelectManual}
                  className={`rounded-xl border px-2 py-2 text-xs font-medium transition-all active:scale-[0.98] ${
                    rateMode === "manual"
                      ? "border-accent bg-accent-bg text-accent-text"
                      : "border-line text-muted hover:bg-soft"
                  }`}
                >
                  Tasa Manual
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="whitespace-nowrap text-xs text-muted">
                  Bs por {CURRENCIES[rateRef].symbol}
                </span>
                <MoneyInput
                  value={rate}
                  onValueChange={onRateValueChange}
                  className={inputClass}
                />
              </div>

              {rateMode === "manual" && (
                <div className="flex items-center justify-between rounded-xl bg-accent-bg/40 p-2.5 text-xs text-muted">
                  <span>Personalizada para este gasto</span>
                  <button
                    type="button"
                    onClick={handleSaveAsGlobalRate}
                    disabled={syncPending}
                    className="font-medium text-accent hover:underline disabled:opacity-50"
                  >
                    Fijar como tasa general
                  </button>
                </div>
              )}

              {syncMsg && (
                <p className="text-[11px] text-income animate-fade-in">
                  ✓ {syncMsg}
                </p>
              )}
            </section>
          )}

          {/* Fila 2: Concepto General & Desglose Modular del Gasto */}
          <div className="space-y-4">
            {/* Concepto General */}
            <div className="rounded-2xl border border-line bg-card p-4 shadow-sm space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-hint">
                Concepto General del Gasto / Proyecto
              </label>
              <input
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Ej: Proyecto Oslo - Servidores e Infraestructura / Gastos Operativos de Oficina"
                className="w-full rounded-xl border border-line bg-card px-3.5 py-2 text-sm font-medium outline-none focus:border-accent"
                autoFocus
              />
              <p className="text-[11px] text-muted">
                Título o concepto macro del egreso que encabezará el comprobante y los reportes.
              </p>
            </div>

            {/* Desglose Modular de Partidas */}
            <div className="rounded-2xl border border-line bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-hint">
                    Desglose Modular / Partidas del Gasto
                  </h4>
                  <p className="text-[11px] text-muted">
                    Detalla cada partida, insumo o servicio con su cantidad y costo unitario.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addLine}
                  className="inline-flex items-center gap-1 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent hover:bg-accent/20 transition-all"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  <span>+ Agregar Partida</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {lines.map((l, idx) => (
                  <div
                    key={l.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-xl border border-line/60 bg-soft/20 p-2.5"
                  >
                    <div className="w-full sm:flex-1">
                      <input
                        value={l.description}
                        onChange={(e) => updateLine(l.id, { description: e.target.value })}
                        placeholder={`Partida o ítem #${idx + 1} (ej. Servidor EC2, Combustible, etc.)...`}
                        className="w-full rounded-lg border border-line bg-card px-3 py-1.5 text-xs outline-none focus:border-accent"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="w-16">
                        <input
                          type="number"
                          min="1"
                          placeholder="Cant."
                          value={l.qty}
                          onChange={(e) => updateLine(l.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-full rounded-lg border border-line bg-card px-2 py-1.5 text-xs font-mono text-center outline-none focus:border-accent"
                        />
                      </div>
                      <div className="w-24">
                        <MoneyInput
                          value={l.unitPrice}
                          onValueChange={(v) => updateLine(l.id, { unitPrice: v })}
                          placeholder="Precio"
                          className="w-full rounded-lg border border-line bg-card px-2 py-1.5 text-xs font-mono text-right outline-none focus:border-accent"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(l.id)}
                        disabled={lines.length === 1}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-hint hover:text-overdue hover:bg-overdue/10 disabled:opacity-30 transition-all"
                        title="Eliminar partida"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Calculado y Conversión */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-line/60">
                <div className="text-xs text-muted">
                  Total del Gasto:{" "}
                  <strong className="font-mono text-accent text-sm ml-1">
                    {formatCurrency(activeTotal, currency)}
                  </strong>
                </div>
                {vesEquivalent !== null && activeTotal > 0 && (
                  <p className="text-[11px] text-muted font-mono">
                    ≈ {formatCurrency(vesEquivalent, "VES")} (Tasa {rate})
                  </p>
                )}
              </div>
            </div>

            {/* Detalle Adicional / Proveedor */}
            <div className="rounded-2xl border border-line bg-card p-4 shadow-sm space-y-1">
              <label className="block text-xs font-semibold text-muted">
                Observaciones / Proveedor (Opcional)
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Factura Nº 4920 / Proveedor Inversiones Caracas"
                className="w-full rounded-xl border border-line bg-card px-3.5 py-2 text-xs outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Fila 3: Condición de Crédito */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground">Condición de Crédito</label>
            <select
              value={creditDays}
              onChange={(e) => setCreditDays(Number(e.target.value))}
              className={`${inputClass} font-semibold text-accent`}
            >
              {termOptions.map((t) => (
                <option key={t.days} value={t.days}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Fila 4: Panel Condicional (Contado vs Crédito) */}
          {isCash ? (
            <section className="rounded-2xl border border-accent/20 bg-accent-bg/30 p-4 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <p className="font-serif text-sm font-bold text-foreground">
                  Débito de Fondos (Pago de Contado)
                </p>
                <span className="text-[11px] font-bold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full">
                  Contado Inmediato
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-hint">Cuenta de Origen (Débito) *</label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedAccountId(newId);
                      const acc = accounts.find((a) => a.id === newId);
                      const methods = getPaymentMethodsForAccount(acc);
                      if (!methods.includes(paymentMethod)) {
                        setPaymentMethod(methods[0] || "Transferencia Bancaria");
                      }
                      if (acc && (acc.currency === "USD" || acc.currency === "VES" || acc.currency === "EUR")) {
                        setCurrency(acc.currency);
                      }
                    }}
                    className={inputClass}
                  >
                    {accounts.length === 0 ? (
                      <option value="">Cuenta Principal</option>
                    ) : (
                      accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.currency}) {a.bankName ? `· ${a.bankName}` : ""}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-hint">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className={inputClass}
                  >
                    {getPaymentMethodsForAccount(accounts.find((a) => a.id === selectedAccountId)).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-hint">Referencia (Opcional)</label>
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="Ej: 83920194"
                    value={reference}
                    onChange={(e) => setReference(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    className={`${inputClass} font-mono`}
                  />
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-line bg-soft/50 p-3.5 text-xs text-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in duration-200">
              <div>
                <p className="font-semibold text-foreground">Gasto registrado a Crédito ({creditDays} días)</p>
                <p className="text-[11px] text-hint">No se debita de ninguna cuenta inmediatamente. Quedará registrado como <strong>Por Pagar</strong>.</p>
              </div>
              <span className="rounded-full bg-pending/10 px-2.5 py-1 text-[11px] font-semibold text-pending self-start sm:self-auto">
                Por Pagar
              </span>
            </section>
          )}

          {error && (
            <p className="rounded-xl bg-overdue/10 px-3 py-2 text-xs text-overdue font-medium">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-muted hover:bg-soft"
              >
                Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={isSubmitDisabled}
              className="rounded-xl bg-accent px-6 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {pending ? "Registrando…" : "Registrar Gasto"}
            </button>
          </div>
        </section>
  );
}


