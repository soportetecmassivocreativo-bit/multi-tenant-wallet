"use client";

import { useState, useTransition } from "react";
import { PlusIcon } from "@/components/ui/icons";
import { MoneyInput } from "@/components/ui/money-input";
import { createExpense } from "@/lib/mutations";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency";
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

interface NuevoGastoFormProps {
  accounts?: CompanyAccount[];
}

export function NuevoGastoForm({ accounts = [] }: NuevoGastoFormProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Operaciones");
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [creditDays, setCreditDays] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts.find((a) => a.isDefault || a.currency === "USD")?.id || accounts[0]?.id || ""
  );
  const [paymentMethod, setPaymentMethod] = useState("Transferencia Bancaria");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const isCash = creditDays === 0;

  function submit() {
    if (!note.trim() || amount <= 0) {
      setError("El concepto y el monto son obligatorios.");
      return;
    }
    setError(null);

    let fullNote = description.trim() ? `${note.trim()} (${description.trim()})` : note.trim();
    if (!isCash) {
      fullNote = `${fullNote} [A Crédito ${creditDays} días / Por Pagar]`;
    }

    start(async () => {
      const r = await createExpense({
        note: fullNote,
        category: category.trim() || "General",
        amount,
        currency,
        accountId: isCash ? (selectedAccountId || undefined) : undefined,
        accountName: isCash && selectedAccount ? selectedAccount.name : undefined,
        reference: isCash && reference.trim() ? reference.trim() : undefined,
      });

      if (r.ok) {
        setNote("");
        setDescription("");
        setAmount(0);
        setReference("");
        setCreditDays(0);
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
        <section className="mt-4 space-y-4 rounded-3xl border border-line bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h3 className="font-serif text-lg font-bold text-foreground">
                Registrar Nuevo Gasto / Egreso
              </h3>
              <p className="text-xs text-hint">Asienta compras, pagos de servicios o gastos operativos</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-muted hover:text-foreground font-medium px-2 py-1 rounded-lg hover:bg-soft"
            >
              Cancelar
            </button>
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
          </div>

          {/* Fila 2: Concepto del Gasto (Recuadro idéntico a Nueva Factura) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">
                Descripción / Concepto del Gasto *
              </label>
              <span className="text-[10px] text-hint font-medium">Detalle del egreso o servicio</span>
            </div>

            <div className="rounded-2xl border border-line bg-card p-4 shadow-sm space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">
                  Concepto / Detalle del Gasto *
                </label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Escribe aquí el concepto o servicio (Ej: Combustible, Materiales de oficina, Servidor AWS...)"
                  className="w-full rounded-xl border border-line bg-soft px-3.5 py-2.5 text-sm font-medium outline-none focus:border-accent focus:bg-card focus:ring-1 focus:ring-accent transition-all"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted">
                    Monto {CURRENCIES[currency].symbol} *
                  </label>
                  <MoneyInput
                    value={amount}
                    onValueChange={setAmount}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-line bg-page px-3.5 py-2 text-sm outline-none focus:border-accent font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted">
                    Detalle Adicional / Proveedor (Opcional)
                  </label>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ej: Factura Nº 4920 de proveedor XYZ"
                    className="w-full rounded-xl border border-line bg-page px-3.5 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
              </div>
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
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-muted hover:bg-soft"
            >
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={!note || amount <= 0 || pending}
              className="rounded-xl bg-accent px-6 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40 transition-all"
            >
              {pending ? "Registrando…" : "Registrar Gasto"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

