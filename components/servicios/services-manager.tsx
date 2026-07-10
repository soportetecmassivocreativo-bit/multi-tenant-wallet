"use client";

import { useState, useTransition } from "react";
import {
  addService,
  updateService,
  deactivateService,
} from "@/lib/servicios-actions";
import { payService } from "@/lib/accounting-actions";
import { DeleteButton } from "@/components/ui/delete-button";
import { ActionButton } from "@/components/ui/action-button";
import { PlusIcon, EditIcon } from "@/components/ui/icons";
import { formatCurrency, CURRENCIES, type CurrencyCode } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import type { Service } from "@/lib/mock-data";

const TODAY = "2026-07-10";

const inputClass =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent";

export function ServicesManager({ services }: { services: Service[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [cycle, setCycle] = useState("mensual");
  const [category, setCategory] = useState("");
  const [nextChargeDate, setNextChargeDate] = useState(TODAY);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Costo mensual por moneda (los anuales prorrateados).
  const totals = services.reduce<Record<string, number>>((acc, s) => {
    const monthly = s.cycle === "anual" ? s.amount / 12 : s.amount;
    acc[s.currency] = (acc[s.currency] ?? 0) + monthly;
    return acc;
  }, {});

  function openAdd() {
    setEditId(null);
    setName("");
    setAmount(0);
    setCurrency("USD");
    setCycle("mensual");
    setCategory("");
    setNextChargeDate(TODAY);
    setError(null);
    setFormOpen(true);
  }
  function openEdit(s: Service) {
    setEditId(s.id);
    setName(s.name);
    setAmount(s.amount);
    setCurrency(s.currency);
    setCycle(s.cycle);
    setCategory(s.category);
    setNextChargeDate(s.nextChargeDate);
    setError(null);
    setFormOpen(true);
  }
  function submit() {
    if (!name || amount <= 0) return;
    setError(null);
    const input = { name, amount, currency, cycle, category, nextChargeDate };
    start(async () => {
      const r = editId
        ? await updateService(editId, input)
        : await addService(input);
      if (r.ok) setFormOpen(false);
      else setError(r.error ?? "No se pudo guardar.");
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-soft p-4">
        <p className="text-xs text-muted">Costo mensual estimado</p>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {Object.keys(totals).length === 0 ? (
            <p className="text-lg font-medium text-hint">—</p>
          ) : (
            Object.entries(totals).map(([cur, amt]) => (
              <p key={cur} className="tnum text-xl font-medium text-overdue">
                {formatCurrency(amt, cur as CurrencyCode)}
              </p>
            ))
          )}
        </div>
        <p className="mt-1 text-[11px] text-hint">
          {services.length} servicios · contabilizados como egresos
        </p>
      </div>

      {formOpen ? (
        <section className="space-y-2 rounded-2xl border border-line bg-card p-3">
          <p className="font-serif text-[15px]">
            {editId ? "Editar servicio" : "Nuevo servicio"}
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre (ej. Claude)"
            className={inputClass}
            autoFocus
          />
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              placeholder="Monto"
              className={inputClass}
            />
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
          <div className="flex gap-2">
            <select
              value={cycle}
              onChange={(e) => setCycle(e.target.value)}
              className={inputClass}
            >
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </select>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoría"
              className={inputClass}
            />
          </div>
          <label className="block text-[11px] text-muted">Próximo cobro</label>
          <input
            type="date"
            value={nextChargeDate}
            onChange={(e) => setNextChargeDate(e.target.value)}
            className={inputClass}
          />
          {error && (
            <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={!name || amount <= 0 || pending}
              className="flex-1 rounded-full bg-accent py-2.5 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-40"
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
            <button
              onClick={() => setFormOpen(false)}
              className="rounded-full border border-line px-4 py-2.5 text-sm text-muted"
            >
              Cancelar
            </button>
          </div>
        </section>
      ) : (
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-accent active:scale-95"
        >
          <PlusIcon className="h-4 w-4" />
          Agregar servicio
        </button>
      )}

      <div className="space-y-2.5">
        {services.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl border border-line bg-card p-3.5"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-soft font-serif text-sm">
                {s.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] text-muted">
                    {s.cycle}
                  </span>
                </div>
                <p className="text-[11px] text-hint">
                  {s.category} · próximo {formatDate(s.nextChargeDate)}
                </p>
              </div>
              <span className="tnum text-sm font-medium">
                {formatCurrency(s.amount, s.currency)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-end gap-2 border-t border-line pt-2">
              <button
                onClick={() => openEdit(s)}
                aria-label={`Editar ${s.name}`}
                className="grid h-8 w-8 place-items-center rounded-lg text-hint active:scale-90 hover:text-accent"
              >
                <EditIcon className="h-4 w-4" />
              </button>
              <DeleteButton
                action={() => deactivateService(s.id)}
                ariaLabel={`Quitar ${s.name}`}
              />
              <ActionButton
                label="Pagar"
                doneLabel="Pagado"
                action={() => payService(s.id)}
                className="px-4"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
