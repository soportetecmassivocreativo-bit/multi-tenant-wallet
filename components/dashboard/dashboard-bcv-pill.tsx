"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { syncBcvRates } from "@/lib/bcv-actions";
import { ArrowPathIcon } from "@/components/ui/icons";

interface DashboardBcvPillProps {
  initialBcv: {
    usd: number;
    eur: number;
    date: string;
  };
}

export function DashboardBcvPill({ initialBcv }: DashboardBcvPillProps) {
  const router = useRouter();
  const [bcv, setBcv] = useState(initialBcv || { usd: 798.326, eur: 926.5531, date: "" });
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSync() {
    setSyncMsg(null);
    startTransition(async () => {
      const res = await syncBcvRates();
      if (res.ok && res.data) {
        setBcv({
          usd: res.data.usd,
          eur: res.data.eur,
          date: res.data.date,
        });
        setSyncMsg("Sincronizado");
        router.refresh();
      } else {
        setSyncMsg("Error al sincronizar");
      }
      setTimeout(() => setSyncMsg(null), 3500);
    });
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl bg-soft p-3 text-xs text-muted border border-line/60">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="font-semibold text-foreground">
          Tasas Oficiales BCV ({formatDate(bcv?.date) || "Hoy"}):
        </span>
        <span>
          $ 1 = <strong className="font-bold text-foreground">{formatCurrency(bcv?.usd || 0, "VES")}</strong>
        </span>
        <span className="text-hint">·</span>
        <span>
          € 1 = <strong className="font-bold text-foreground">{formatCurrency(bcv?.eur || 0, "VES")}</strong>
        </span>
      </div>

      <div className="flex items-center gap-2">
        {syncMsg && (
          <span className="rounded-md bg-income/15 px-1.5 py-0.5 text-[10px] font-semibold text-income animate-in fade-in duration-150">
            ✓ {syncMsg}
          </span>
        )}

        <button
          type="button"
          onClick={handleSync}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-soft hover:border-accent active:scale-95 disabled:opacity-50 transition-all shadow-xs"
          title="Consultar y actualizar tasa oficial del BCV en vivo"
        >
          <ArrowPathIcon className={`h-3 w-3 text-accent ${pending ? "animate-spin" : ""}`} />
          <span>{pending ? "Actualizando…" : "Actualizar BCV"}</span>
        </button>
      </div>
    </div>
  );
}
