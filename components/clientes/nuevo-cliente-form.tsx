"use client";

import { useState, useTransition } from "react";
import { PlusIcon } from "@/components/ui/icons";
import { addClient } from "@/lib/mutations";

const inputClass =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent";

const termOptions = [
  { label: "Contado", days: 0 },
  { label: "15 días", days: 15 },
  { label: "30 días", days: 30 },
  { label: "60 días", days: 60 },
];

export function NuevoClienteForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rif, setRif] = useState("");
  const [termDays, setTermDays] = useState(0);
  const [score, setScore] = useState(80);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    if (!name) return;
    setError(null);
    start(async () => {
      const r = await addClient({ name, rif, termDays, score });
      if (r.ok) {
        setName("");
        setRif("");
        setTermDays(0);
        setScore(80);
        setOpen(false);
      } else {
        setError(r.error ?? "No se pudo crear el cliente.");
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
        Nuevo
      </button>

      {open && (
        <section className="mt-3 space-y-3 rounded-2xl border border-line bg-card p-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del cliente"
            className={inputClass}
            autoFocus
          />
          <div className="flex gap-2">
            <input
              value={rif}
              onChange={(e) => setRif(e.target.value)}
              placeholder="RIF (opcional)"
              className={inputClass}
            />
            <select
              value={termDays}
              onChange={(e) => setTermDays(Number(e.target.value))}
              className={inputClass}
            >
              {termOptions.map((t) => (
                <option key={t.days} value={t.days}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Score */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted">
                Score de pago
                <span className="ml-1 text-hint">(0–100)</span>
              </label>
              <span className="tnum text-sm font-medium text-accent">
                {score}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full accent-[color:var(--accent)]"
            />
            <p className="text-[11px] leading-snug text-hint">
              Qué tan puntual paga este cliente. Se usa para{" "}
              <span className="text-muted">predecir cuándo cobrarás</span> sus
              facturas. Alto = paga a tiempo. Empieza en 80 si no estás seguro.
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue">
              {error}
            </p>
          )}
          <button
            onClick={submit}
            disabled={!name || pending}
            className="w-full rounded-full bg-accent py-2.5 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-40"
          >
            {pending ? "Guardando…" : "Guardar cliente"}
          </button>
        </section>
      )}
    </div>
  );
}
