"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-accent placeholder:text-muted disabled:opacity-60";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    if (!email) {
      setError("Escribe tu correo electrónico.");
      setLoading(false);
      return;
    }
    if (!password) {
      setError("Escribe tu contraseña.");
      setLoading(false);
      return;
    }

    try {
      // 1. Intentar a través del intermediario de Vercel (/api/auth/login)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s de espera máxima para Vercel

      let loginSuccessful = false;

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await res.json().catch(() => null);

        if (res.ok && data?.ok) {
          loginSuccessful = true;
          router.push("/dashboard");
          router.refresh();
          return;
        }

        // Si el servidor devolvió error explícito de credenciales inválidas
        if (data?.error && res.status === 401) {
          setError(data.error);
          setLoading(false);
          return;
        }
      } catch {
        // Vercel tardó o se agotó el tiempo
      }

      if (!loginSuccessful) {
        // 2. Conexión directa inmediata para no hacer esperar al usuario
        const supabase = createClient();
        const { error: clientAuthError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (clientAuthError) {
          if (clientAuthError.message === "Invalid login credentials") {
            setError("Correo o contraseña incorrectos.");
          } else if (clientAuthError.message === "Email not confirmed") {
            setError("Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.");
          } else {
            setError(clientAuthError.message);
          }
          setLoading(false);
          return;
        }

        // Éxito inmediato
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Error de conexión. Verifica tus datos e intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl tracking-tight">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-muted">Bienvenido de vuelta.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="correo@empresa.com"
          className={inputClass}
          disabled={loading}
        />
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Contraseña"
          className={inputClass}
          disabled={loading}
        />

        {error && (
          <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue">
            {error}
          </p>
        )}

        {loading && (
          <p className="text-center text-xs text-muted animate-pulse">
            Verificando credenciales con el servidor…
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-accent py-3.5 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-60 transition-opacity"
        >
          {loading ? "Entrando…" : "Entrar"}
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
