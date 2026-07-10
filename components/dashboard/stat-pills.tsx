import { formatMoney } from "@/lib/format";

/** Chips de estado bajo el gráfico (por cobrar / vencidas / cobrado). */
export function StatPills({
  porCobrar,
  vencidas,
  cobradoMes,
}: {
  porCobrar: number;
  vencidas: number;
  cobradoMes: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full bg-accent-bg px-3 py-1.5 text-xs font-medium text-accent-text">
        Por cobrar · <span className="tnum">{formatMoney(porCobrar)}</span>
      </span>
      <span className="rounded-full border border-line px-3 py-1.5 text-xs text-muted">
        Vencidas · {vencidas}
      </span>
      <span className="rounded-full border border-line px-3 py-1.5 text-xs text-muted">
        Cobrado (mes) · <span className="tnum">{formatMoney(cobradoMes)}</span>
      </span>
    </div>
  );
}
