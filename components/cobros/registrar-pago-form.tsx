"use client";

import { useState, useTransition } from "react";
import { MoneyInput } from "@/components/ui/money-input";
import { registerPayment } from "@/lib/mutations";
import { formatCurrency, type CurrencyCode } from "@/lib/currency";

const inputClass =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent";

export function RegistrarPagoForm({
  invoiceId,
  currency,
  balance,
}: {
  invoiceId: string;
  currency: CurrencyCode;
  balance: number;
}) {
  const [amount, setAmount] = useState(balance > 0 ? balance : 0);
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
    start(async () => {
      const r = await registerPayment(invoiceId, amount);
      if (!r.ok) setError(r.error ?? "No se pudo registrar el pago.");
    });
  }

  return (
    <section className="space-y-2 rounded-2xl border border-line bg-card p-4">
      <p className="font-serif text-[15px]">Registrar pago</p>
      <div className="flex items-center gap-2">
        <MoneyInput
          value={amount}
          onValueChange={setAmount}
          className={inputClass}
        />
        <button
          onClick={submit}
          disabled={amount <= 0 || pending}
          className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white active:scale-95 disabled:opacity-40"
        >
          {pending ? "…" : "Registrar"}
        </button>
      </div>
      <p className="text-[11px] text-hint">
        Saldo pendiente: {formatCurrency(balance, currency)}
      </p>
      {error && (
        <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue">
          {error}
        </p>
      )}
    </section>
  );
}
