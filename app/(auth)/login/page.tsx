"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

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

    try {
      // Llamada a la API Edge de Vercel (sin cold start, sin límite de 10s)
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Error al iniciar sesión.");
        setLoading(false);
        return;
      }

      // Sesión establecida via cookies — navegamos al dashboard
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Error de conexión. Verifica tu internet e intenta de nuevo.");
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
            Verificando credenciales…
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
