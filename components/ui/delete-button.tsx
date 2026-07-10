"use client";

import { useState, useTransition } from "react";
import { TrashIcon } from "@/components/ui/icons";
import type { MutationResult } from "@/lib/mutations";

/**
 * Botón de eliminación con confirmación en dos pasos.
 * Recibe un server action (bind desde el servidor). Muestra el error si falla.
 */
export function DeleteButton({
  action,
  ariaLabel = "Eliminar",
}: {
  action: () => Promise<MutationResult>;
  ariaLabel?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (error) {
    return (
      <button
        onClick={() => setError(null)}
        className="text-[11px] text-overdue"
        title={error}
      >
        {error} · reintentar
      </button>
    );
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2">
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await action();
              if (!r.ok) setError(r.error ?? "No se pudo eliminar");
              setConfirming(false);
            })
          }
          className="rounded-full bg-overdue px-2.5 py-1 text-[11px] font-medium text-white active:scale-95 disabled:opacity-60"
        >
          {pending ? "…" : "Eliminar"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-[11px] text-muted"
        >
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      aria-label={ariaLabel}
      className="grid h-8 w-8 place-items-center rounded-lg text-hint transition-colors hover:text-overdue active:scale-90"
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  );
}
