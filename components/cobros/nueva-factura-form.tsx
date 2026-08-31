"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { CheckIcon, PlusIcon, TrashIcon, ArrowPathIcon } from "@/components/ui/icons";
import { MoneyInput } from "@/components/ui/money-input";
import { formatDate } from "@/lib/format";
import {
  formatCurrency,
  toBolivars,
  CURRENCIES,
  type CurrencyCode,
  type RateRef,
} from "@/lib/currency";
import { computeInvoice, predictPaymentDays } from "@/lib/calc";
import { createInvoice } from "@/lib/mutations";
import { syncBcvRates, saveManualBcvRates } from "@/lib/bcv-actions";
import type { Client, Product } from "@/lib/mock-data";
import type { CompanyAccount } from "@/lib/cuentas-actions";
import { getPaymentMethodsForAccount } from "@/lib/cuentas-helpers";

const TODAY = "2026-07-10";

const termOptions = [
  { label: "Contado", days: 0 },
  { label: "15 días", days: 15 },
  { label: "30 días", days: 30 },
  { label: "60 días", days: 60 },
];

interface Line {
  id: number;
  description: string;
  qty: number;
  unitPrice: number;
}

let nextId = 1;

const inputClass =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent";

export function NuevaFacturaForm({
  clients,
  products,
  bcv,
  accounts = [],
}: {
  clients: Client[];
  products: Product[];
  bcv: { usd: number; eur: number; date: string };
  accounts?: CompanyAccount[];
}) {
  const [currentBcv, setCurrentBcv] = useState(bcv);
  const [clientId, setClientId] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [rateRef, setRateRef] = useState<RateRef>("USD");
  const [rateMode, setRateMode] = useState<"usd" | "eur" | "manual">("usd");
  const [rate, setRate] = useState<number>(bcv.usd);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncPending, startSyncTransition] = useTransition();
  const [lines, setLines] = useState<Line[]>([
    { id: nextId++, description: "", qty: 1, unitPrice: 0 },
  ]);
  const [taxRate, setTaxRate] = useState(0.16);
  const [discountPct, setDiscountPct] = useState(0);
  const [creditDays, setCreditDays] = useState(0);
  const [accountId, setAccountId] = useState<string>(
    accounts.find((a) => a.isDefault || a.currency === "USD")?.id || accounts[0]?.id || ""
  );
  const [paymentMethod, setPaymentMethod] = useState("Transferencia Bancaria");
  const [paymentReference, setPaymentReference] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const client = clients.find((c) => c.id === clientId);
  const isForeign = currency !== "VES";

  const result = useMemo(
    () =>
      computeInvoice({
        lines,
        taxRate,
        discountPct: discountPct / 100,
        creditDays,
        issueDateISO: TODAY,
      }),
    [lines, taxRate, discountPct, creditDays],
  );

  const vesTotal = toBolivars(result.total, rate);
  const predictedDays = client
    ? predictPaymentDays(creditDays, client.score)
    : null;

  const totalRef = useRef<HTMLSpanElement>(null);
  useGSAP(
    () => {
      gsap.fromTo(
        totalRef.current,
        { scale: 1.06 },
        { scale: 1, duration: 0.3, ease: "power2.out" },
      );
    },
    { dependencies: [result.total, currency] },
  );

  function updateLine(id: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function removeLine(id: number) {
    setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.id !== id) : ls));
  }
  function addProduct(name: string, price: number) {
    setLines((ls) => [
      ...ls,
      { id: nextId++, description: name, qty: 1, unitPrice: price },
    ]);
  }
  function onSelectClient(id: string) {
    setClientId(id);
    const cl = clients.find((c) => c.id === id);
    if (cl && cl.termDays !== undefined) {
      setCreditDays(cl.termDays);
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
    setError(null);
    const selectedAcc = accounts.find((a) => a.id === accountId);

    startSaving(async () => {
      const r = await createInvoice({
        clientId,
        currency,
        lines: lines.map(({ description, qty, unitPrice }) => ({
          description,
          qty,
          unitPrice,
        })),
        taxRate,
        discountPct,
        creditDays,
        rateRef,
        rate,
        accountId: creditDays === 0 ? accountId : undefined,
        accountName: creditDays === 0 && selectedAcc ? selectedAcc.name : undefined,
        paymentMethod: creditDays === 0 ? paymentMethod : undefined,
        paymentReference: creditDays === 0 ? paymentReference : undefined,
      });
      if (r.ok) setSaved(true);
      else setError(r.error ?? "No se pudo crear la factura.");
    });
  }

  if (saved) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-income/12 text-income">
          <CheckIcon className="h-8 w-8" />
        </div>
        <h1 className="mt-4 font-serif text-2xl">Factura creada</h1>
        <p className="mt-1 text-sm text-muted">
          {client?.name ?? "Cliente"}
        </p>
        <p className="tnum mt-3 text-3xl font-medium">
          {formatCurrency(result.total, currency)}
        </p>
        {isForeign && (
          <p className="tnum mt-1 text-sm text-muted">
            ≈ {formatCurrency(vesTotal, "VES")} · tasa {CURRENCIES[rateRef].label}
          </p>
        )}
        <div className="mt-8 flex gap-3">
          <button
            onClick={() => {
              setSaved(false);
              setLines([{ id: nextId++, description: "", qty: 1, unitPrice: 0 }]);
              setClientId("");
            }}
            className="rounded-full border border-line px-5 py-2.5 text-sm font-medium active:scale-95"
          >
            Otra factura
          </button>
          <Link
            href="/cobros"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white active:scale-95"
          >
            Ver cobros
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl tracking-tight">Nueva factura</h1>
        <Link href="/cobros" className="text-sm text-muted active:scale-95">
          Cancelar
        </Link>
      </header>

      {/* Cliente + Moneda */}
      <section className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="text-[11px] text-muted">Cliente</label>
          <select
            value={clientId}
            onChange={(e) => onSelectClient(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted">Moneda</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            className={inputClass}
          >
            {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => (
              <option key={c} value={c}>
                {CURRENCIES[c].symbol} {c}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Conceptos y Líneas de Facturación */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-foreground">
            Descripción / Concepto del Cobro o Factura *
          </label>
          <span className="text-[10px] text-hint font-medium">Define los ítems y servicios a facturar</span>
        </div>
        {lines.map((l) => (
          <div key={l.id} className="rounded-2xl border border-line bg-card p-4 shadow-sm space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted mb-1">
                Concepto / Detalle del Ítem *
              </label>
              <input
                value={l.description}
                onChange={(e) => updateLine(l.id, { description: e.target.value })}
                placeholder="Escribe aquí el concepto o servicio (Ej: Consultoría mensual, diseño, materiales...)"
                className="w-full rounded-xl border border-line bg-soft px-3.5 py-2.5 text-sm font-medium outline-none focus:border-accent focus:bg-card focus:ring-1 focus:ring-accent transition-all"
                autoFocus={l.id === 1}
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-hint">Cant.</span>
                <MoneyInput
                  value={l.qty}
                  onValueChange={(n) => updateLine(l.id, { qty: n })}
                  className="w-14 rounded-lg border border-line bg-page px-2 py-1 text-sm outline-none focus:border-accent"
                />
              </div>
              <div className="flex flex-1 items-center gap-1">
                <span className="text-[11px] text-hint">
                  Precio {CURRENCIES[currency].symbol}
                </span>
                <MoneyInput
                  value={l.unitPrice}
                  onValueChange={(n) => updateLine(l.id, { unitPrice: n })}
                  className="w-full rounded-lg border border-line bg-page px-2 py-1 text-sm outline-none focus:border-accent"
                />
              </div>
              <button
                onClick={() => removeLine(l.id)}
                aria-label="Eliminar línea"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-hint hover:text-overdue hover:bg-overdue/10 active:scale-90 transition-all"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {products.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => addProduct(p.name, p.price)}
                className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs text-muted active:scale-95 hover:border-accent hover:text-accent transition-all"
              >
                <PlusIcon className="h-3 w-3" />
                {p.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Impuesto / descuento / crédito */}
      <section className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] text-muted">IVA</label>
          <select
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value))}
            className={inputClass}
          >
            <option value={0.16}>16%</option>
            <option value={0.08}>8%</option>
            <option value={0}>Exento</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted">Descuento %</label>
          <MoneyInput
            value={discountPct}
            onValueChange={setDiscountPct}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted font-semibold text-foreground">Condición de Crédito</label>
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
      </section>

      {/* Selector condicional: Cuenta de Acreditación si es de Contado, o Aviso de Crédito */}
      {creditDays === 0 ? (
        <section className="rounded-2xl border border-accent/20 bg-accent-bg/30 p-4 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <p className="font-serif text-sm font-bold text-foreground">
              Acreditación de Fondos (Pago de Contado)
            </p>
            <span className="text-[11px] font-bold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full">
              Contado Inmediato
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-hint">Cuenta de Destino *</label>
              <select
                value={accountId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setAccountId(newId);
                  const acc = accounts.find((a) => a.id === newId);
                  const methods = getPaymentMethodsForAccount(acc);
                  if (!methods.includes(paymentMethod)) {
                    setPaymentMethod(methods[0] || "Transferencia Bancaria");
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
                {getPaymentMethodsForAccount(accounts.find((a) => a.id === accountId)).map((m) => (
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
                placeholder="Ej: 84920194"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value.replace(/\D/g, "").slice(0, 8))}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-line bg-soft/50 p-3.5 text-xs text-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in duration-200">
          <div>
            <p className="font-semibold text-foreground">Factura emitida a Crédito ({creditDays} días)</p>
            <p className="text-[11px] text-hint">No se solicita cuenta inmediata. Quedará registrada como <strong>Pendiente de Cobro</strong>.</p>
          </div>
          <span className="rounded-full bg-pending/10 px-2.5 py-1 text-[11px] font-semibold text-pending self-start sm:self-auto">
            Abono registrable luego
          </span>
        </section>
      )}

      {/* Conversión a Bolívares (BCV / Manual) */}
      {isForeign && (
        <section className="space-y-3 rounded-2xl border border-line bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-serif text-[15px]">Conversión a Bolívares</p>
              <p className="text-[11px] text-hint flex items-center gap-1.5 flex-wrap">
                <span>
                  {rateMode === "manual"
                    ? "Tasa manual de contingencia"
                    : `BCV Oficial · Fecha Valor: ${formatDate(currentBcv.date)}`}
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
              <span>Personalizada para este cobro</span>
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

      {/* Totales */}
      <section className="rounded-2xl border border-line bg-card p-4">
        <Row label="Subtotal" value={formatCurrency(result.subtotal, currency)} />
        {result.discount > 0 && (
          <Row
            label={`Descuento (${discountPct}%)`}
            value={`− ${formatCurrency(result.discount, currency)}`}
            tone="text-income"
          />
        )}
        <Row
          label={`IVA (${Math.round(taxRate * 100)}%)`}
          value={formatCurrency(result.tax, currency)}
        />
        <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
          <span className="font-serif text-[15px]">Total</span>
          <span ref={totalRef} className="tnum inline-block text-2xl font-medium">
            {formatCurrency(result.total, currency)}
          </span>
        </div>

        {isForeign && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-accent-bg px-3 py-2.5">
            <span className="text-xs text-accent-text">
              ≈ Bolívares · tasa {CURRENCIES[rateRef].label}
            </span>
            <span className="tnum text-sm font-medium text-accent-text">
              {formatCurrency(vesTotal, "VES")}
            </span>
          </div>
        )}

        {predictedDays !== null && (
          <div className="mt-3 text-xs text-muted">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-soft px-2.5 py-1">
              🧠 Pago probable: ~{predictedDays} días (score {client!.score})
            </p>
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={!clientId || result.total <= 0 || saving}
        className="w-full rounded-full bg-accent py-3.5 text-sm font-medium text-white shadow-[0_8px_20px_rgba(59,91,219,0.35)] transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
      >
        {saving ? "Creando…" : `Crear factura · ${formatCurrency(result.total, currency)}`}
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted">{label}</span>
      <span className={`tnum ${tone ?? ""}`}>{value}</span>
    </div>
  );
}
