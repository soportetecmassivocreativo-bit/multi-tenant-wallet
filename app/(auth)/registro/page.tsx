"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthState } from "@/lib/auth-actions";

const inputClass =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-accent";

export default function RegistroPage() {
  const [state, action, pending] = useActionState<AuthState | null, FormData>(
    signUp,
    null,
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl tracking-tight">Crea tu cuenta</h1>
        <p className="mt-1 text-sm text-muted">
          Empieza a gestionar tus finanzas.
        </p>
      </div>

      <form action={action} className="space-y-3">
        <input
          name="company_name"
          type="text"
          required
          placeholder="Nombre de tu empresa"
          className={inputClass}
        />
        <input
          name="full_name"
          type="text"
          placeholder="Tu nombre"
          className={inputClass}
        />
        <input
          name="email"
          type="email"
          required
          placeholder="correo@empresa.com"
          className={inputClass}
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Contraseña (mín. 6)"
          className={inputClass}
        />

        {state?.error && (
          <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue">
            {state.error}
          </p>
        )}
        {state?.message && (
          <p className="rounded-lg bg-income/10 px-3 py-2 text-xs text-income">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-accent py-3.5 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? "Creando…" : "Crear cuenta"}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-accent">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
