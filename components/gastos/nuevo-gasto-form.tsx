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

    const selectedAcc = accounts.find((a) => a.id === selectedAccountId);
    const fullNote = description.trim() ? `${note.trim()} (${description.trim()})` : note.trim();

    start(async () => {
      const r = await createExpense({
        note: fullNote,
        category: category.trim() || "General",
        amount,
        currency,
        accountId: selectedAccountId || undefined,
        accountName: selectedAcc ? selectedAcc.name : undefined,
        reference: reference.trim() ? reference.trim() : undefined,
      });

      if (r.ok) {
        setNote("");
        setDescription("");
        setCategory("");
        setAmount(0);
        setReference("");
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
