"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { CheckIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/format";
import {
  formatCurrency,
  toBolivars,
  CURRENCIES,
  type CurrencyCode,
  type RateRef,
} from "@/lib/currency";
import { computeInvoice, predictPaymentDays } from "@/lib/calc";
import { clients, products, getClient, bcvRates } from "@/lib/mock-data";

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

export default function NuevaFacturaPage() {
  const [clientId, setClientId] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [rateRef, setRateRef] = useState<RateRef>("USD");
  const [rate, setRate] = useState<number>(bcvRates.USD);
  const [lines, setLines] = useState<Line[]>([
    { id: nextId++, description: "Servicio de diseño", qty: 1, unitPrice: 350 },
  ]);
  const [taxRate, setTaxRate] = useState(0.16);
  const [discountPct, setDiscountPct] = useState(0);
  const [creditDays, setCreditDays] = useState(30);
  const [saved, setSaved] = useState(false);

  const client = getClient(clientId);
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
    const c = getClient(id);
    if (c) setCreditDays(c.termDays);
  }
  function onSelectRateRef(ref: RateRef) {
    setRateRef(ref);
    setRate(bcvRates[ref]);
  }

  if (saved) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-income/12 text-income">
          <CheckIcon className="h-8 w-8" />
        </div>
        <h1 className="mt-4 font-serif text-2xl">Factura creada</h1>
        <p className="mt-1 text-sm text-muted">
          {client?.name ?? "Cliente"} · vence {formatDate(result.dueDateISO)}
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

      {/* Líneas */}
      <section className="space-y-3">
        <label className="text-xs text-muted">Conceptos</label>
        {lines.map((l) => (
          <div key={l.id} className="rounded-2xl border border-line bg-card p-3">
            <input
              value={l.description}
              onChange={(e) => updateLine(l.id, { description: e.target.value })}
              placeholder="Descripción"
              className="w-full bg-transparent text-sm outline-none placeholder:text-hint"
            />
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-hint">Cant.</span>
                <input
                  type="number"
                  min={0}
                  value={l.qty}
                  onChange={(e) =>
                    updateLine(l.id, { qty: Number(e.target.value) || 0 })
                  }
                  className="w-14 rounded-lg border border-line bg-page px-2 py-1 text-sm outline-none focus:border-accent"
                />
              </div>
              <div className="flex flex-1 items-center gap-1">
                <span className="text-[11px] text-hint">
                  Precio {CURRENCIES[currency].symbol}
                </span>
                <input
                  type="number"
                  min={0}
                  value={l.unitPrice}
                  onChange={(e) =>
                    updateLine(l.id, { unitPrice: Number(e.target.value) || 0 })
                  }
                  className="w-full rounded-lg border border-line bg-page px-2 py-1 text-sm outline-none focus:border-accent"
                />
              </div>
              <button
                onClick={() => removeLine(l.id)}
                aria-label="Eliminar línea"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-hint active:scale-90"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => addProduct(p.name, p.price)}
              className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs text-muted active:scale-95"
            >
              <PlusIcon className="h-3 w-3" />
              {p.name}
            </button>
          ))}
        </div>
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
          <input
            type="number"
            min={0}
            max={100}
            value={discountPct}
            onChange={(e) => setDiscountPct(Number(e.target.value) || 0)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted">Crédito</label>
          <select
            value={creditDays}
            onChange={(e) => setCreditDays(Number(e.target.value))}
            className={inputClass}
          >
            {termOptions.map((t) => (
              <option key={t.days} value={t.days}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Conversión a Bolívares (BCV) */}
      {isForeign && (
        <section className="space-y-3 rounded-2xl border border-line bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="font-serif text-[15px]">Conversión a Bolívares</p>
            <span className="text-[11px] text-hint">
              BCV · {formatDate(bcvRates.date)}
            </span>
          </div>
          <div className="flex gap-2">
            {(["USD", "EUR"] as RateRef[]).map((ref) => (
              <button
                key={ref}
                onClick={() => onSelectRateRef(ref)}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm active:scale-[0.98] ${
                  rateRef === ref
                    ? "border-accent bg-accent-bg text-accent-text"
                    : "border-line text-muted"
                }`}
              >
                Tasa {CURRENCIES[ref].label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-xs text-muted">
              Bs por {CURRENCIES[rateRef].symbol}
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value) || 0)}
              className={inputClass}
            />
          </div>
        </section>
      )}

      {/* Totales */}
      <section className="rounded-2xl border border-line bg-card p-4">
        <Row
          label="Subtotal"
          value={formatCurrency(result.subtotal, currency)}
        />
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
          <span
            ref={totalRef}
            className="tnum inline-block text-2xl font-medium"
          >
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

        <div className="mt-3 space-y-1 text-xs text-muted">
          <p>
            Vence el{" "}
            <span className="font-medium text-ink">
              {formatDate(result.dueDateISO)}
            </span>
          </p>
          {predictedDays !== null && (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-soft px-2.5 py-1">
              🧠 Pago probable: ~{predictedDays} días (score {client!.score})
            </p>
          )}
        </div>
      </section>

      <button
        onClick={() => setSaved(true)}
        disabled={!clientId || result.total <= 0}
        className="w-full rounded-full bg-accent py-3.5 text-sm font-medium text-white shadow-[0_8px_20px_rgba(59,91,219,0.35)] transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
      >
        Crear factura · {formatCurrency(result.total, currency)}
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
