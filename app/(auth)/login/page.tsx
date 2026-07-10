"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type AuthState } from "@/lib/auth-actions";

const inputClass =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-accent";

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState | null, FormData>(
    signIn,
    null,
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl tracking-tight">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-muted">Bienvenido de vuelta.</p>
      </div>

      <form action={action} className="space-y-3">
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
          placeholder="Contraseña"
          className={inputClass}
        />

        {state?.error && (
          <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-accent py-3.5 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-accent">
          Regístrate
        </Link>
      </p>
    </div>
  );
}
