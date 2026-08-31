"use client";

import { useState, useTransition } from "react";
import { PlusIcon } from "@/components/ui/icons";
import { MoneyInput } from "@/components/ui/money-input";
import { createExpense } from "@/lib/mutations";
import type { CurrencyCode } from "@/lib/currency";
import type { CompanyAccount } from "@/lib/cuentas-actions";

const inputClass =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent";

interface NuevoGastoFormProps {
  accounts?: CompanyAccount[];
}

export function NuevoGastoForm({ accounts = [] }: NuevoGastoFormProps) {
  const [open, setOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<"contado" | "credito">("contado");
  const [note, setNote] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts[0]?.id || ""
  );
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    if (!note.trim() || amount <= 0) {
      setError("El concepto y el monto son obligatorios.");
      return;
    }
    setError(null);

    const isCash = paymentType === "contado";
    const selectedAcc = isCash ? accounts.find((a) => a.id === selectedAccountId) : undefined;
    let fullNote = description.trim() ? `${note.trim()} (${description.trim()})` : note.trim();
    if (!isCash) {
      fullNote = `${fullNote} [A Crédito / Por Pagar]`;
    }

    start(async () => {
      const r = await createExpense({
        note: fullNote,
        category: category.trim() || "General",
        amount,
        currency,
        accountId: isCash ? (selectedAccountId || undefined) : undefined,
        accountName: isCash && selectedAcc ? selectedAcc.name : undefined,
        reference: isCash && reference.trim() ? reference.trim() : undefined,
      });

      if (r.ok) {
        setNote("");
        setDescription("");
        setCategory("");
        setAmount(0);
        setReference("");
        setPaymentType("contado");
        setOpen(false);
      } else {
        setError(r.error ?? "No se pudo registrar el gasto.");
      }
    });
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-95 transition-all"
      >
        <PlusIcon className="h-4 w-4" />
        <span>+ Nuevo Gasto</span>
      </button>

      {open && (
        <section className="mt-3 space-y-3 rounded-2xl border border-line bg-card p-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h3 className="font-serif text-sm font-bold text-foreground">
              Registrar Nuevo Egreso / Pago
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>

          {/* Tipo de Pago: Contado vs Crédito */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPaymentType("contado")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                paymentType === "contado"
                  ? "border-accent bg-accent-bg text-accent shadow-sm ring-1 ring-accent"
                  : "border-line bg-soft text-muted hover:text-foreground"
              }`}
            >
              Pago de Contado (Débito Inmediato)
            </button>
            <button
              type="button"
              onClick={() => setPaymentType("credito")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                paymentType === "credito"
                  ? "border-accent bg-accent-bg text-accent shadow-sm ring-1 ring-accent"
                  : "border-line bg-soft text-muted hover:text-foreground"
              }`}
            >
              A Crédito / Por Pagar (Sin cuenta)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] text-hint font-medium mb-1">
                Concepto / Título del Gasto *
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ej: Combustible, Materiales de oficina, Servidor..."
                className={inputClass}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] text-hint font-medium mb-1">
                Descripción / Detalle del Pago (Opcional)
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Factura Nº 4920 de proveedor XYZ, servicio de internet..."
                className={inputClass}
              />
            </div>
          </div>

          {/* Cuenta de origen sólo si es de CONTADO */}
          {paymentType === "contado" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-xl border border-accent/20 bg-accent-bg/20 p-3 animate-in fade-in duration-200">
              <div>
                <label className="block text-[11px] text-hint font-medium mb-1">
                  Cuenta de Origen (Desde donde se debita) *
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => {
                    setSelectedAccountId(e.target.value);
                    const acc = accounts.find((a) => a.id === e.target.value);
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

              <div>
                <label className="block text-[11px] text-hint font-medium mb-1">
                  Referencia (Últimos 8 dígitos)
                </label>
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
          ) : (
            <div className="rounded-xl border border-line bg-soft/60 p-3 text-xs text-muted flex items-center justify-between animate-in fade-in duration-200">
              <span>Gasto registrado <strong>A Crédito / Por Pagar</strong>. No se debitará ninguna cuenta inmediatamente.</span>
              <span className="rounded-full bg-pending/10 text-pending px-2 py-0.5 text-[10px] font-semibold">Pendiente de Pago</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] text-hint font-medium mb-1">
                Categoría
              </label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej: Operaciones, Viáticos..."
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[11px] text-hint font-medium mb-1">
                Moneda
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className={inputClass}
              >
                <option value="USD">USD ($)</option>
                <option value="VES">VES (Bs.)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-hint font-medium mb-1">
                Monto *
              </label>
              <MoneyInput
                value={amount}
                onValueChange={setAmount}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue font-medium">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1 border-t border-line">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-line px-3.5 py-1.5 text-xs text-muted hover:bg-soft"
            >
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={!note || amount <= 0 || pending}
              className="rounded-xl bg-accent px-5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40 transition-all"
            >
              {pending ? "Registrando…" : "Registrar Gasto"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
