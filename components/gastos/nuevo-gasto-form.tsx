"use client";

import { useState, useTransition } from "react";
import { PlusIcon } from "@/components/ui/icons";
import { createExpense } from "@/lib/mutations";

const inputClass =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent";

export function NuevoGastoForm() {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    if (!note || amount <= 0) return;
    setError(null);
    start(async () => {
      const r = await createExpense({ note, category, amount });
      if (r.ok) {
        setNote("");
        setCategory("");
        setAmount(0);
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
        className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white active:scale-95"
      >
        <PlusIcon className="h-4 w-4" />
        Nuevo gasto
      </button>

      {open && (
        <section className="mt-3 space-y-2 rounded-2xl border border-line bg-card p-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Concepto (ej. Combustible)"
            className={inputClass}
            autoFocus
          />
          <div className="flex gap-2">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoría"
              className={inputClass}
            />
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              placeholder="Monto"
              className={inputClass}
            />
          </div>
          {error && (
            <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue">
              {error}
            </p>
          )}
          <button
            onClick={submit}
            disabled={!note || amount <= 0 || pending}
            className="w-full rounded-full bg-accent py-2.5 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-40"
          >
            {pending ? "Registrando…" : "Registrar gasto"}
          </button>
        </section>
      )}
    </div>
  );
}
