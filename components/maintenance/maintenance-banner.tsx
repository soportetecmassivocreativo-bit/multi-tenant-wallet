"use client";

import { useState, useTransition } from "react";
import { toggleMaintenanceMode } from "@/lib/maintenance-actions";

interface MaintenanceBannerProps {
  message?: string;
  updatedAt?: string;
}

export function MaintenanceBanner({ message, updatedAt }: MaintenanceBannerProps) {
  const [closed, setClosed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (closed) return null;

  function handleDeactivate() {
    startTransition(async () => {
      await toggleMaintenanceMode(false);
    });
  }

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-800 dark:text-amber-200 px-4 py-2.5 text-xs">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <strong className="font-bold uppercase tracking-wider text-[11px] bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
              🛠️ MODO MANTENIMIENTO ACTIVO
            </strong>
            <span className="text-muted">
              El acceso público está restringido. Solo los administradores pueden operar.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleDeactivate}
            disabled={pending}
            className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1 text-[11px] shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            {pending ? "Desactivando..." : "Desactivar Mantenimiento"}
          </button>
          <button
            type="button"
            onClick={() => setClosed(true)}
            className="p-1 rounded text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
            title="Ocultar aviso temporalmente"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
