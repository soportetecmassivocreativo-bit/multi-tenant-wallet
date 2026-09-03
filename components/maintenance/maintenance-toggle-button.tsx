"use client";

import { useState, useTransition } from "react";
import { toggleMaintenanceMode } from "@/lib/maintenance-actions";

interface MaintenanceToggleButtonProps {
  isMaintenanceActive: boolean;
  currentMessage?: string;
}

export function MaintenanceToggleButton({
  isMaintenanceActive,
  currentMessage,
}: MaintenanceToggleButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState(
    currentMessage ||
      "Estamos realizando labores de mantenimiento programado, optimización y actualización en la plataforma. El acceso estará restablecido en breve."
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleToggle(targetState: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await toggleMaintenanceMode(targetState, message);
      if (res.ok) {
        setModalOpen(false);
      } else {
        setError(res.error || "No se pudo cambiar el estado de mantenimiento.");
      }
    });
  }

  return (
    <>
      <div className="rounded-2xl border border-line bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-sm font-bold text-foreground">
                Modo Mantenimiento del Sistema Multi-Tenant
              </h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isMaintenanceActive
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                }`}
              >
                {isMaintenanceActive ? "🔴 En Mantenimiento" : "🟢 Sistema Operativo"}
              </span>
            </div>
            <p className="text-xs text-muted">
              {isMaintenanceActive
                ? "El acceso general está bloqueado para usuarios estándar y clientes. Solo los administradores pueden acceder."
                : "La plataforma está disponible y operando con normalidad para todas las empresas y usuarios."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isMaintenanceActive) {
                handleToggle(false);
              } else {
                setModalOpen(true);
              }
            }}
            disabled={pending}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 ${
              isMaintenanceActive
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-amber-600 hover:bg-amber-700 text-white"
            }`}
          >
            <span>🛠️</span>
            <span>
              {pending
                ? "Procesando..."
                : isMaintenanceActive
                ? "Desactivar Mantenimiento"
                : "Activar Mantenimiento"}
            </span>
          </button>
        </div>
      </div>

      {/* Modal de confirmación para Activar Mantenimiento */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl space-y-4">
            <div className="border-b border-line pb-3 flex items-start justify-between">
              <div>
                <h3 className="font-serif text-base font-bold text-foreground flex items-center gap-2">
                  <span>🛠️</span> Activar Modo Mantenimiento
                </h3>
                <p className="text-xs text-hint mt-0.5">
                  El sistema se cerrará para usuarios estándar
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-hint hover:text-foreground hover:bg-soft"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                <p className="font-bold">⚠️ Atención:</p>
                <p className="mt-0.5">
                  Al activar este modo, los usuarios no administradores verán la pantalla de mantenimiento.
                  Como administrador, tú podrás seguir navegando y desactivarlo cuando finalices.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted">
                  Mensaje público para los usuarios
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe el motivo del mantenimiento..."
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent resize-none"
                />
              </div>

              {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-line bg-soft px-4 py-2 text-xs font-semibold text-muted hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleToggle(true)}
                disabled={pending}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {pending ? "Activando..." : "Confirmar y Activar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
