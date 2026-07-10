"use client";

import { useState } from "react";
import { PlusIcon } from "@/components/ui/icons";
import { formatMoney, formatDate } from "@/lib/format";
import { expenses as seed, type Expense } from "@/lib/mock-data";

const TODAY = "2026-07-10";
let nextId = 100;

const inputClass =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent";

export default function GastosPage() {
  const [items, setItems] = useState<Expense[]>(seed);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState(0);

  const total = items.reduce((s, e) => s + e.amount, 0);

  function add() {
    if (!note || amount <= 0) return;
    setItems((xs) => [
      { id: `g${nextId++}`, category: category || "General", note, amount, date: TODAY },
      ...xs,
    ]);
    setCategory("");
    setNote("");
    setAmount(0);
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl tracking-tight">Gastos</h1>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white active:scale-95"
        >
          <PlusIcon className="h-4 w-4" />
          Nuevo
        </button>
      </header>

      <div className="rounded-2xl bg-soft p-4">
        <p className="text-xs text-muted">Total del mes</p>
        <p className="tnum mt-1 text-2xl font-medium text-overdue">
          {formatMoney(total)}
        </p>
      </div>

      {open && (
        <section className="space-y-2 rounded-2xl border border-line bg-card p-3">
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
          <button
            onClick={add}
            disabled={!note || amount <= 0}
            className="w-full rounded-full bg-accent py-2.5 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-40"
          >
            Registrar gasto
          </button>
        </section>
      )}

      <section>
        {items.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-3 border-t border-line py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px]">{e.note}</p>
              <p className="text-[11px] text-hint">
                {e.category} · {formatDate(e.date)}
              </p>
            </div>
            <span className="tnum text-sm font-medium text-overdue">
              − {formatMoney(e.amount)}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
