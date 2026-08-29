"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/lib/profile-actions";
import { UserIcon, CheckIcon } from "@/components/ui/icons";

interface ProfileFormProps {
  initialName: string;
  email: string;
  role: string;
}

const inputClass =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm outline-none focus:border-accent";

export function ProfileForm({ initialName, email, role }: ProfileFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialName);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);

    startTransition(async () => {
      const res = await updateProfile({ fullName });
      if (res.ok) {
        setMsg("Información de perfil actualizada con éxito.");
        router.refresh();
      } else {
        setError(res.error || "No se pudo actualizar el perfil.");
      }
      setTimeout(() => {
        setMsg(null);
        setError(null);
      }, 4000);
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-bg text-accent">
          <UserIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-serif text-[15px] font-medium">Datos Personales</h2>
          <p className="text-xs text-muted">Personaliza cómo apareces en el sistema</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 pt-1">
        <div>
          <label className="block text-xs font-medium text-muted">
            Nombre Completo
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ej: Miguel Mujica"
            className={`mt-1 ${inputClass}`}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted">
            Correo Electrónico (Cuenta)
          </label>
          <input
            type="email"
            value={email}
            disabled
            className={`mt-1 ${inputClass} opacity-60 cursor-not-allowed`}
          />
          <p className="mt-1 text-[11px] text-hint">
            El correo de acceso no puede ser modificado directamente.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted">
            Rol en la Empresa
          </label>
          <input
            type="text"
            value={role.toUpperCase()}
            disabled
            className={`mt-1 ${inputClass} opacity-60 cursor-not-allowed font-medium`}
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={pending || fullName === initialName}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 active:scale-95 disabled:opacity-40"
          >
            <CheckIcon className="h-4 w-4" />
            {pending ? "Guardando…" : "Guardar cambios"}
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
