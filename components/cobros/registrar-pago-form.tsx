"use client";

import { useState, useTransition } from "react";
import { MoneyInput } from "@/components/ui/money-input";
import { registerPayment } from "@/lib/mutations";
import { formatCurrency, type CurrencyCode } from "@/lib/currency";
import type { CompanyAccount } from "@/lib/cuentas-actions";

const inputClass =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent";

export function RegistrarPagoForm({
  invoiceId,
  currency,
  balance,
  accounts = [],
}: {
  invoiceId: string;
  currency: CurrencyCode;
  balance: number;
  accounts?: CompanyAccount[];
}) {
  const [amount, setAmount] = useState(balance > 0 ? balance : 0);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts.find((a) => a.isDefault || a.currency === currency)?.id || accounts[0]?.id || ""
  );
  const [method, setMethod] = useState("Transferencia Bancaria");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (balance <= 0) {
    return (
      <p className="rounded-2xl bg-income/10 py-3 text-center text-sm font-medium text-income">
        Factura pagada por completo ✓
      </p>
    );
  }

  function submit() {
    if (amount <= 0) return;
    setError(null);

    const selectedAcc = accounts.find((a) => a.id === selectedAccountId);

    start(async () => {
      const r = await registerPayment(invoiceId, {
        amount,
        method,
        accountId: selectedAccountId,
        accountName: selectedAcc ? selectedAcc.name : undefined,
        reference: reference.trim() ? reference.trim() : undefined,
      });

      if (!r.ok) {
        setError(r.error ?? "No se pudo registrar el pago.");
      } else {
        setReference("");
      }
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="font-serif text-sm font-bold text-foreground">Registrar Cobro / Pago</p>
        <span className="text-[11px] font-medium text-hint">
          Pendiente: <strong className="text-pending">{formatCurrency(balance, currency)}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[11px] text-hint font-medium mb-1">
            Cuenta de Destino (Donde entra el dinero) *
          </label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
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
            Método de Pago *
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={inputClass}
          >
            <option value="Transferencia Bancaria">Transferencia Bancaria</option>
            <option value="Pago Móvil">Pago Móvil</option>
            <option value="Zelle">Zelle</option>
            <option value="Efectivo / Caja">Efectivo / Caja</option>
            <option value="Binance USDT">Binance USDT / Cripto</option>
            <option value="Punto de Venta / Tarjeta">Punto de Venta / Tarjeta</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        <div className="sm:col-span-4">
          <label className="block text-[11px] text-hint font-medium mb-1">
            Referencia (Últimos 8 dígitos)
          </label>
          <input
            type="text"
            maxLength={8}
            placeholder="Ej: 84920194"
            value={reference}
            onChange={(e) => setReference(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className={`${inputClass} font-mono`}
          />
        </div>

        <div className="sm:col-span-5">
          <label className="block text-[11px] text-hint font-medium mb-1">
            Monto a Cobrar ({currency}) *
          </label>
          <MoneyInput
            value={amount}
            onValueChange={setAmount}
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-3 flex items-end">
          <button
            onClick={submit}
            disabled={amount <= 0 || pending}
            className="w-full rounded-xl bg-accent py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-95 disabled:opacity-40 transition-all h-[34px]"
          >
            {pending ? "Guardando…" : "Registrar"}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue font-medium">
          {error}
        </p>
      )}
    </section>
  );
}
