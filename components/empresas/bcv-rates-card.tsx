"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";

interface BcvRatesCardProps {
  initialBcv: {
    usd: number;
    eur: number;
    date: string;
  };
}

export function BcvRatesCard({ initialBcv }: BcvRatesCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bcv, setBcv] = useState(initialBcv);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  async function handleSync() {
    setStatusMsg(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/bcv/sync", { method: "POST" });
        const data = await res.json();
        if (data.success) {
          setBcv({
            usd: data.usd,
            eur: data.eur,
            date: data.date,
          });
          setStatusMsg(`Sincronizado con ${data.source}`);
          router.refresh();
        } else {
          setStatusMsg("No se pudo actualizar");
        }
      } catch {
        setStatusMsg("Error de conexión con el BCV");
      }
      setTimeout(() => setStatusMsg(null), 4000);
    });
  }

  return (
    <section className="rounded-2xl bg-soft p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">Tasas BCV · {formatDate(bcv.date)}</p>
        <button
          onClick={handleSync}
          disabled={isPending}
          className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
        >
          {isPending ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      <p className="mt-1 text-sm">
        Dólar{" "}
        <span className="tnum font-medium">
          {formatCurrency(bcv.usd, "VES")}
        </span>{" "}
        / $ · Euro{" "}
        <span className="tnum font-medium">
          {formatCurrency(bcv.eur, "VES")}
        </span>{" "}
        / €
      </p>

      {statusMsg && (
        <p className="mt-2 text-[11px] text-hint animate-fade-in">
          ✓ {statusMsg}
        </p>
      )}
    </section>
  );
}
