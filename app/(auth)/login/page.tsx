"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signIn, type AuthState } from "@/lib/auth-actions";

const inputClass =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-accent placeholder:text-muted";

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState | null, FormData>(
    signIn,
    null,
  );
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    setSubmitted(true);
    // Si hay error previo, reseteamos el spinner
    if (state?.error) setSubmitted(false);
  }

  const isLoading = pending || (submitted && !state?.error);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl tracking-tight">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-muted">Bienvenido de vuelta.</p>
      </div>

      <form action={action} onSubmit={handleSubmit} className="space-y-3">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="correo@empresa.com"
          className={inputClass}
          disabled={isLoading}
        />
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Contraseña"
          className={inputClass}
          disabled={isLoading}
        />

        {state?.error && (
          <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue">
            {state.error}
          </p>
        )}

        {isLoading && (
          <p className="text-center text-xs text-muted animate-pulse">
            Conectando con el servidor, por favor espera…
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-accent py-3.5 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-60 transition-opacity"
        >
          {isLoading ? "Verificando…" : "Entrar"}
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
