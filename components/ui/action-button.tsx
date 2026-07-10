"use client";

import { useState, useTransition } from "react";
import { CheckIcon } from "@/components/ui/icons";
import type { ActionResult } from "@/lib/accounting-actions";

/**
 * Botón que ejecuta un server action (bind desde el servidor) y muestra
 * un estado de "hecho". Persiste en Supabase cuando está configurado.
 */
export function ActionButton({
  label,
  doneLabel,
  action,
  className,
}: {
  label: string;
  doneLabel: string;
  action: () => Promise<ActionResult>;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <span
        className={`inline-flex items-center justify-center gap-1.5 rounded-full bg-income/10 py-2 text-sm font-medium text-income ${className ?? ""}`}
      >
        <CheckIcon className="h-4 w-4" />
        {doneLabel}
      </span>
    );
  }

  return (
    <button
      disabled={pending}
      onClick={() => start(async () => {
        await action();
        setDone(true);
      })}
      className={`rounded-full bg-accent py-2 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-60 ${className ?? ""}`}
    >
      {pending ? "Procesando…" : label}
    </button>
  );
}
