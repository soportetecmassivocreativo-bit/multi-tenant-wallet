"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { saveManualBcvRates, syncBcvRates } from "@/lib/bcv-actions";
import { ArrowPathIcon, CheckIcon } from "@/components/ui/icons";

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
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualUsd, setManualUsd] = useState(initialBcv.usd.toString());
  const [manualEur, setManualEur] = useState(initialBcv.eur.toString());
  const [manualDate, setManualDate] = useState(
    initialBcv.date || new Date().toISOString().slice(0, 10),
  );
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sincronización automática con BCV
  function handleSync() {
    setStatusMsg(null);
    setErrorMsg(null);
    startTransition(async () => {
      const res = await syncBcvRates();
      if (res.ok && res.data) {
        setBcv({
          usd: res.data.usd,
          eur: res.data.eur,
          date: res.data.date,
        });
        setManualUsd(res.data.usd.toString());
        setManualEur(res.data.eur.toString());
        setManualDate(res.data.date);
        setStatusMsg(`Sincronizado con ${res.data.source || "BCV"}`);
        router.refresh();
      } else {
        setErrorMsg(res.error || "No se pudo sincronizar automáticamente.");
      }
      setTimeout(() => {
        setStatusMsg(null);
        setErrorMsg(null);
      }, 5000);
    });
  }

  // Guardado manual
  function handleSaveManual(e: React.FormEvent) {
    e.preventDefault();
    setStatusMsg(null);
    setErrorMsg(null);

    const parsedUsd = parseFloat(manualUsd.replace(",", "."));
    const parsedEur = parseFloat(manualEur.replace(",", "."));

    if (isNaN(parsedUsd) || parsedUsd <= 0) {
      setErrorMsg("Ingresa una tasa de Dólar válida.");
      return;
    }
    if (isNaN(parsedEur) || parsedEur <= 0) {
      setErrorMsg("Ingresa una tasa de Euro válida.");
      return;
    }

    startTransition(async () => {
      const res = await saveManualBcvRates({
        usd: parsedUsd,
        eur: parsedEur,
        date: manualDate,
      });

      if (res.ok && res.data) {
        setBcv({
          usd: res.data.usd,
          eur: res.data.eur,
          date: res.data.date,
        });
        setStatusMsg("Tasa de cambio manual guardada correctamente");
        setIsManualOpen(false);
        router.refresh();
      } else {
        setErrorMsg(res.error || "Error al guardar las tasas.");
      }

      setTimeout(() => {
        setStatusMsg(null);
        setErrorMsg(null);
      }, 5000);
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-serif text-[15px] font-medium">Tasas de Cambio (BCV)</p>
          <p className="text-xs text-muted">
            Vigencia: <span className="font-medium text-foreground">{formatDate(bcv.date)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsManualOpen(!isManualOpen)}
            className="rounded-lg border border-line bg-soft px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground active:scale-95"
          >
            {isManualOpen ? "Cerrar edición" : "Ajuste manual"}
          </button>

          <button
            type="button"
            onClick={handleSync}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/20 active:scale-95 disabled:opacity-50"
            title="Consultar portal oficial BCV o réplica"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
            {isPending ? "Sincronizando…" : "Sincronizar"}
          </button>
        </div>
      </div>

      {/* Vista de tasas activas */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="rounded-xl bg-soft p-3">
          <p className="text-xs text-muted">Dólar Oficial (USD)</p>
          <p className="mt-0.5 font-serif text-lg font-medium text-foreground">
            {formatCurrency(bcv.usd, "VES")}
          </p>
          <p className="text-[11px] text-hint">Bs. por cada $1</p>
        </div>

        <div className="rounded-xl bg-soft p-3">
          <p className="text-xs text-muted">Euro Oficial (EUR)</p>
          <p className="mt-0.5 font-serif text-lg font-medium text-foreground">
            {formatCurrency(bcv.eur, "VES")}
          </p>
          <p className="text-[11px] text-hint">Bs. por cada €1</p>
        </div>
      </div>

      {/* Formulario de contingencia / Ajuste Manual */}
      {isManualOpen && (
        <form
          onSubmit={handleSaveManual}
          className="mt-3 space-y-3 rounded-xl border border-accent/20 bg-accent-bg/40 p-3.5 animate-fade-in"
        >
          <div>
            <p className="text-xs font-medium text-accent-text">
              Ajuste manual de contingencia
            </p>
            <p className="text-[11px] text-muted">
              Ingresa los valores manualmente si la página del BCV está caída o inaccesible.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div>
              <label className="block text-[11px] font-medium text-muted">
                Tasa Dólar (USD en Bs.)
              </label>
              <input
                type="text"
                value={manualUsd}
                onChange={(e) => setManualUsd(e.target.value)}
                placeholder="Ej: 52.40"
                className="mt-1 w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted">
                Tasa Euro (EUR en Bs.)
              </label>
              <input
                type="text"
                value={manualEur}
                onChange={(e) => setManualEur(e.target.value)}
                placeholder="Ej: 56.80"
                className="mt-1 w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted">
                Fecha de vigencia
              </label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsManualOpen(false)}
              className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:bg-card active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              <CheckIcon className="h-3.5 w-3.5" />
              {isPending ? "Guardando…" : "Guardar tasas"}
            </button>
          </div>
        </form>
      )}

      {/* Mensajes de estado */}
      {statusMsg && (
        <div className="rounded-lg bg-income/10 px-3 py-2 text-xs font-medium text-income animate-fade-in">
          ✓ {statusMsg}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg bg-overdue/10 px-3 py-2 text-xs font-medium text-overdue animate-fade-in">
          ✕ {errorMsg}
        </div>
      )}
    </section>
  );
}
