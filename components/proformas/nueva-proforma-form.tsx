"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
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
import { computeInvoice } from "@/lib/calc";
import { createProforma } from "@/lib/mutations";
import { syncBcvRates, saveManualBcvRates } from "@/lib/bcv-actions";
import type { Client, Product } from "@/lib/mock-data";

const termOptions = [
  { label: "15 días", days: 15 },
  { label: "30 días", days: 30 },
  { label: "45 días", days: 45 },
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

export function NuevaProformaForm({
  clients,
  products,
  bcv,
}: {
  clients: Client[];
  products: Product[];
  bcv: { usd: number; eur: number; date: string };
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
  const [validDays, setValidDays] = useState(15);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const client = clients.find((c) => c.id === clientId);
  const isForeign = currency !== "VES";

  async function handleSyncBcv() {
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
        setSyncMsg(`✓ Tasas sincronizadas: USD ${res.data.usd} · ${res.data.date}`);
      } else {
        setSyncMsg(`⚠ ${res.error || "No se pudo sincronizar automáticamente"}`);
      }
      setTimeout(() => setSyncMsg(null), 4000);
    });
  }

  function handleSaveManualRate(newRate: number) {
    setRate(newRate);
    saveManualBcvRates({
      usd: rateMode === "usd" || rateMode === "manual" ? newRate : currentBcv.usd,
      eur: rateMode === "eur" ? newRate : currentBcv.eur,
      date: new Date().toISOString().slice(0, 10),
    });
  }

  const computed = useMemo(
    () =>
      computeInvoice({
        lines,
        taxRate,
        discountPct: discountPct / 100,
        creditDays: validDays,
        issueDateISO: new Date().toISOString().slice(0, 10),
      }),
    [lines, taxRate, discountPct, validDays],
  );

  const vesTotal = isForeign ? toBolivars(computed.total, rate) : null;

  function updateLine(id: number, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  }

  function removeLine(id: number) {
    setLines((prev) =>
      prev.length > 1 ? prev.filter((l) => l.id !== id) : prev,
    );
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { id: nextId++, description: "", qty: 1, unitPrice: 0 },
    ]);
  }

  function addProductLine(productId: string) {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    setLines((prev) => [
      ...prev,
      {
        id: nextId++,
        description: prod.name,
        qty: 1,
        unitPrice: prod.price,
      },
    ]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      setError("Selecciona un cliente.");
      return;
    }
    const cleanLines = lines
      .map((l) => ({ ...l, description: l.description.trim() }))
      .filter((l) => l.description.length > 0);
    if (!cleanLines.length) {
      setError("Agrega al menos un concepto con descripción.");
      return;
    }

    setError(null);
    startSaving(async () => {
      const res = await createProforma({
        clientId,
        currency,
        lines: cleanLines,
        taxRate,
        discountPct,
        validDays,
        rateRef,
        rate,
        notes: notes.trim() || undefined,
      });
      if (res.ok) {
        setSaved(true);
        if (res.id) setSavedId(res.id);
      } else {
        setError(res.error ?? "No se pudo emitir la proforma.");
      }
    });
  }

  if (saved) {
    return (
      <div className="rounded-2xl border border-line bg-card p-8 text-center shadow-sm space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-income/10 text-income">
          <CheckIcon className="h-8 w-8" />
        </div>
        <h2 className="font-serif text-2xl font-bold">¡Proforma Emitida con Éxito!</h2>
        <p className="text-xs text-muted max-w-md mx-auto">
          La proforma ha sido guardada en estado preliminar (en espera de pago). Cuando el cliente confirme y pague, podrás marcarla como pagada y generar la factura definitiva con los fondos acreditados.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          {savedId && (
            <Link
              href={`/proformas/${savedId}`}
              className="rounded-full bg-accent px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-accent/90"
            >
              Ver Detalle de Proforma
            </Link>
          )}
          <Link
            href="/proformas"
            className="rounded-full border border-line bg-card px-5 py-2.5 text-xs font-medium text-foreground hover:bg-soft"
          >
            Ir a Proformas
          </Link>
          <button
            type="button"
            onClick={() => {
              setSaved(false);
              setSavedId(null);
              setLines([{ id: nextId++, description: "", qty: 1, unitPrice: 0 }]);
            }}
            className="rounded-full border border-line bg-card px-5 py-2.5 text-xs font-medium text-muted hover:text-foreground"
          >
            + Nueva Proforma
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-overdue/20 bg-overdue/10 p-3 text-xs font-medium text-overdue">
          {error}
        </div>
      )}

      {/* Cliente y Moneda */}
      <section className="rounded-2xl border border-line bg-card p-4 space-y-4 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-hint">
          Cliente & Moneda
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Cliente Destinatario
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecciona un cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.rif})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Moneda de la Proforma
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className={inputClass}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tasa BCV si aplica divisa extranjera */}
        {isForeign && (
          <div className="rounded-xl border border-line bg-soft/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Tasa Oficial BCV del Día
              </span>
              <button
                type="button"
                onClick={handleSyncBcv}
                disabled={syncPending}
                className="inline-flex items-center gap-1 rounded-lg bg-card border border-line px-2.5 py-1 text-[11px] font-semibold text-accent hover:bg-soft shadow-xs"
              >
                <ArrowPathIcon className={`h-3 w-3 ${syncPending ? "animate-spin" : ""}`} />
                <span>Actualizar BCV</span>
              </button>
            </div>
            {syncMsg && (
              <p className="text-[11px] text-accent font-medium">{syncMsg}</p>
            )}
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                value={rate}
                onChange={(e) => handleSaveManualRate(parseFloat(e.target.value) || 0)}
                className="w-32 rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-mono font-bold"
              />
              <span className="text-xs text-muted">
                Bs. por {currency} (Fecha oficial: {formatDate(currentBcv.date)})
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Conceptos / Ítems */}
      <section className="rounded-2xl border border-line bg-card p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-hint">
            Conceptos & Servicios a Cotizar
          </h3>
          {products.length > 0 && (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addProductLine(e.target.value);
                  e.target.value = "";
                }
              }}
              className="rounded-lg border border-line bg-card px-2.5 py-1 text-[11px] text-muted outline-none"
            >
              <option value="">+ Catálogo de productos...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatCurrency(p.price, "USD")})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-3">
          {lines.map((l, idx) => (
            <div
              key={l.id}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-xl border border-line/60 bg-soft/20 p-2.5"
            >
              <div className="w-full sm:flex-1">
                <input
                  type="text"
                  placeholder={`Concepto o descripción #${idx + 1}...`}
                  value={l.description}
                  onChange={(e) => updateLine(l.id, { description: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="w-20">
                  <input
                    type="number"
                    min="1"
                    placeholder="Cant."
                    value={l.qty}
                    onChange={(e) => updateLine(l.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                    className={inputClass}
                  />
                </div>
                <div className="w-28">
                  <MoneyInput
                    value={l.unitPrice}
                    onChange={(v) => updateLine(l.id, { unitPrice: v })}
                    placeholder="Precio"
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(l.id)}
                  disabled={lines.length === 1}
                  className="rounded-lg p-2 text-hint hover:text-overdue hover:bg-overdue/10 disabled:opacity-30"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-line px-3.5 py-2 text-xs font-semibold text-muted hover:text-accent hover:border-accent w-full justify-center"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Agregar otro concepto</span>
          </button>
        </div>
      </section>

      {/* Condiciones y Validez */}
      <section className="rounded-2xl border border-line bg-card p-4 space-y-4 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-hint">
          Condiciones Comerciales & Validez
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Validez de la Oferta
            </label>
            <select
              value={validDays}
              onChange={(e) => setValidDays(parseInt(e.target.value))}
              className={inputClass}
            >
              {termOptions.map((t) => (
                <option key={t.days} value={t.days}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Descuento (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={discountPct}
              onChange={(e) => setDiscountPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              IVA / Impuesto (%)
            </label>
            <select
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value))}
              className={inputClass}
            >
              <option value="0">0% (Exento)</option>
              <option value="0.08">8% (Reducido)</option>
              <option value="0.16">16% (General)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1">
            Notas / Términos de la Proforma (Opcional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Incluye instalación, soporte durante 30 días y garantía directa."
            className={inputClass}
          />
        </div>
      </section>

      {/* Resumen de Totales y Botón de Emisión */}
      <div className="rounded-2xl border border-line bg-card p-5 space-y-3 shadow-sm">
        <div className="flex justify-between text-xs text-muted">
          <span>Subtotal:</span>
          <span className="font-mono font-medium">{formatCurrency(computed.subtotal, currency)}</span>
        </div>
        {computed.discount > 0 && (
          <div className="flex justify-between text-xs text-income">
            <span>Descuento ({discountPct}%):</span>
            <span className="font-mono">− {formatCurrency(computed.discount, currency)}</span>
          </div>
        )}
        {computed.tax > 0 && (
          <div className="flex justify-between text-xs text-muted">
            <span>IVA ({(taxRate * 100).toFixed(0)}%):</span>
            <span className="font-mono">+{formatCurrency(computed.tax, currency)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-foreground">
          <span>Total Proforma:</span>
          <div className="text-right">
            <span className="font-mono text-accent">{formatCurrency(computed.total, currency)}</span>
            {vesTotal !== null && (
              <span className="block font-mono text-xs font-normal text-muted mt-0.5">
                ≈ {formatCurrency(vesTotal, "VES")} (Tasa BCV {rate})
              </span>
            )}
          </div>
        </div>

        <div className="pt-3">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {saving ? "Emitiendo Proforma..." : "Emitir Proforma Preliminar"}
          </button>
        </div>
      </div>
    </form>
  );
}
