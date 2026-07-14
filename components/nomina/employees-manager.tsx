"use client";

import { useState, useTransition } from "react";
import {
  addEmployee,
  updateEmployee,
  deactivateEmployee,
  payPayroll,
  payEmployee,
} from "@/lib/nomina-actions";
import { DeleteButton } from "@/components/ui/delete-button";
import { ActionButton } from "@/components/ui/action-button";
import { MoneyInput } from "@/components/ui/money-input";
import { PlusIcon, CheckIcon, EditIcon } from "@/components/ui/icons";
import { formatCurrency, CURRENCIES, type CurrencyCode } from "@/lib/currency";
import type { Employee } from "@/lib/mock-data";

const inputClass =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent";

export function EmployeesManager({ employees }: { employees: Employee[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [pending, start] = useTransition();

  const totals = employees.reduce<Record<string, number>>((acc, e) => {
    acc[e.currency] = (acc[e.currency] ?? 0) + e.salary;
    return acc;
  }, {});

  function openAdd() {
    setEditId(null);
    setName("");
    setRole("");
    setSalary(0);
    setCurrency("USD");
    setError(null);
    setFormOpen(true);
  }
  function openEdit(e: Employee) {
    setEditId(e.id);
    setName(e.name);
    setRole(e.role);
    setSalary(e.salary);
    setCurrency(e.currency);
    setError(null);
    setFormOpen(true);
  }
  function submit() {
    if (!name || salary <= 0) return;
    setError(null);
    const input = { fullName: name, role, salary, currency };
    start(async () => {
      const r = editId
        ? await updateEmployee(editId, input)
        : await addEmployee(input);
      if (r.ok) setFormOpen(false);
      else setError(r.error ?? "No se pudo guardar.");
    });
  }
  function pay() {
    setError(null);
    start(async () => {
      const r = await payPayroll();
      if (r.ok) setPaid(true);
      else setError(r.error ?? "No se pudo pagar la nómina.");
    });
  }

  return (
    <div className="space-y-5">
      {/* Total por moneda */}
      <div className="rounded-2xl bg-soft p-4">
        <p className="text-xs text-muted">Nómina por quincena</p>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {Object.keys(totals).length === 0 ? (
            <p className="text-lg font-medium text-hint">—</p>
          ) : (
            Object.entries(totals).map(([cur, amt]) => (
              <p key={cur} className="tnum text-xl font-medium">
                {formatCurrency(amt, cur as CurrencyCode)}
              </p>
            ))
          )}
        </div>
        <p className="mt-1 text-[11px] text-hint">
          {employees.length} empleados · 15 y último
        </p>
      </div>

      {/* Agregar / editar */}
      {formOpen ? (
        <section className="space-y-2 rounded-2xl border border-line bg-card p-3">
          <p className="font-serif text-[15px]">
            {editId ? "Editar empleado" : "Nuevo empleado"}
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre"
            className={inputClass}
            autoFocus
          />
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Cargo"
            className={inputClass}
          />
          <div className="flex gap-2">
            <MoneyInput
              value={salary}
              onValueChange={setSalary}
              placeholder="Salario/quincena"
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
          {error && (
            <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={!name || salary <= 0 || pending}
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
          Agregar empleado
        </button>
      )}

      {/* Lista */}
      <section>
        <h2 className="mb-1 font-serif text-[15px]">Empleados</h2>
        {employees.map((e) => (
          <div key={e.id} className="border-t border-line py-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-bg font-serif text-accent-text">
                {(e.name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{e.name}</p>
                <p className="text-[11px] text-hint">{e.role}</p>
              </div>
              <span className="tnum text-sm font-medium">
                {formatCurrency(e.salary, e.currency)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => openEdit(e)}
                aria-label={`Editar ${e.name}`}
                className="grid h-8 w-8 place-items-center rounded-lg text-hint active:scale-90 hover:text-accent"
              >
                <EditIcon className="h-4 w-4" />
              </button>
              <DeleteButton
                action={() => deactivateEmployee(e.id)}
                ariaLabel={`Quitar ${e.name}`}
              />
              <ActionButton
                label="Pagar"
                doneLabel="Pagado"
                action={() => payEmployee(e.id)}
                className="px-4"
              />
            </div>
          </div>
        ))}
      </section>

      {/* Pagar nómina */}
      {paid ? (
        <p className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-income/10 py-3.5 text-sm font-medium text-income">
          <CheckIcon className="h-4 w-4" /> Nómina pagada · registrada en gastos
        </p>
      ) : (
        <button
          onClick={pay}
          disabled={employees.length === 0 || pending}
          className="w-full rounded-full bg-accent py-3.5 text-sm font-medium text-white shadow-[0_8px_20px_rgba(59,91,219,0.35)] active:scale-[0.98] disabled:opacity-40"
        >
          {pending ? "Procesando…" : "Pagar toda la nómina"}
        </button>
      )}
    </div>
  );
}
