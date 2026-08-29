"use client";

import { useState, useTransition } from "react";
import { changePassword } from "@/lib/profile-actions";
import { LockIcon, CheckIcon } from "@/components/ui/icons";

const inputClass =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm outline-none focus:border-accent";

export function PasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);

    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    startTransition(async () => {
      const res = await changePassword({ newPassword, confirmPassword });
      if (res.ok) {
        setMsg("Contraseña actualizada con éxito. Úsala en tu próximo inicio de sesión.");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(res.error || "No se pudo cambiar la contraseña.");
      }
      setTimeout(() => {
        setMsg(null);
        setError(null);
      }, 5000);
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-bg text-accent">
          <LockIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-serif text-[15px] font-medium">Seguridad y Clave</h2>
          <p className="text-xs text-muted">Cambia tu contraseña de acceso a M-Wallet</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 pt-1">
        <div>
          <label className="block text-xs font-medium text-muted">
            Nueva Contraseña
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className={`mt-1 ${inputClass}`}
            required
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted">
            Confirmar Nueva Contraseña
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite la contraseña"
            className={`mt-1 ${inputClass}`}
            required
            minLength={6}
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={pending || !newPassword || !confirmPassword}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 active:scale-95 disabled:opacity-40"
          >
            <CheckIcon className="h-4 w-4" />
            {pending ? "Actualizando…" : "Cambiar contraseña"}
          </button>
        </div>

        {msg && (
          <div className="rounded-lg bg-income/10 px-3 py-2 text-xs text-income animate-fade-in">
            ✓ {msg}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue animate-fade-in">
            ✕ {error}
          </div>
        )}
      </form>
    </section>
  );
}
