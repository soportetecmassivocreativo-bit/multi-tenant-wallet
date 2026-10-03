"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatMoney, formatDate } from "@/lib/format";
import { formatCurrency, type CurrencyCode } from "@/lib/currency";
import { ReportePdfButton } from "./reporte-pdf-button";
import {
  type DeferredCardClosure,
  type DeferredCharge,
  type DeferredAbono,
  executeDeferredCardClosure,
  deleteDeferredCardClosure,
} from "@/lib/gastos-especiales-actions";
import { exportCardClosurePdf } from "@/lib/pdf-export";
import {
  DownloadIcon,
  SearchIcon,
  TrashIcon,
  CheckIcon,
  ReceiptIcon,
  PlusIcon,
} from "@/components/ui/icons";

interface ReportesViewProps {
  report: {
    ingresos: number;
    egresos: number;
    neto: number;
    hasData: boolean;
    porCategoria: { category: string; amount: number }[];
  };
  closures: DeferredCardClosure[];
  activeCardLimit: number;
  activeCharges: DeferredCharge[];
  activeAbonos: DeferredAbono[];
  bcv?: { usd: number; eur: number; date?: string };
  admin: boolean;
}

function Bar({
  label,
  amount,
  max,
  color,
}: {
  label: string;
  amount: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((amount / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className={`tnum font-medium ${color}`}>
          {formatMoney(amount)}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-soft">
        <div
          className={`h-full rounded-full ${color === "text-income" ? "bg-income" : "bg-overdue"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ReportesView({
  report: r,
  closures,
  activeCardLimit,
  activeCharges,
  activeAbonos,
  bcv,
  admin,
}: ReportesViewProps) {
  const [tab, setTab] = useState<"general" | "tarjeta_jm">("general");
  const [closureSearch, setClosureSearch] = useState("");
  const [selectedClosure, setSelectedClosure] = useState<DeferredCardClosure | null>(null);

  // Form states para ejecutar cierre desde reportes
  const [openExecuteClosure, setOpenExecuteClosure] = useState(false);
  const now = new Date();
  const defaultPeriodName = `${now.toLocaleDateString("es-VE", { month: "long" })} ${now.getFullYear()}`;
  const [closurePeriod, setClosurePeriod] = useState(
    defaultPeriodName.charAt(0).toUpperCase() + defaultPeriodName.slice(1)
  );
  const [closureNotes, setClosureNotes] = useState("");
  const [autoDownloadPdf, setAutoDownloadPdf] = useState(true);
  const [closureError, setClosureError] = useState("");

  const [isPending, startTransition] = useTransition();

  const maxBar = Math.max(r.ingresos, r.egresos, 1);
  const maxCat = Math.max(...r.porCategoria.map((c) => c.amount), 1);

  // Cálculos del ciclo activo actual de la tarjeta
  const activeChargesTotal = activeCharges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const activeAbonosTotal = activeAbonos.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const activeSaldoNeto = Math.max(0, activeCardLimit - activeAbonosTotal);

  const filteredClosures = closures.filter((c) => {
    if (!closureSearch.trim()) return true;
    const q = closureSearch.toLowerCase().trim();
    return (
      c.period.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.notes && c.notes.toLowerCase().includes(q))
    );
  });

  function handleExecuteClosure(e: React.FormEvent) {
    e.preventDefault();
    if (!closurePeriod.trim()) {
      setClosureError("Indica el nombre o mes del periodo a cerrar.");
      return;
    }
    setClosureError("");

    startTransition(async () => {
      const res = await executeDeferredCardClosure({
        period: closurePeriod,
        notes: closureNotes,
        resetLimitTo: 0,
      });

      if (res.ok && res.closure) {
        if (autoDownloadPdf) {
          exportCardClosurePdf(res.closure, bcv);
        }
        setOpenExecuteClosure(false);
        setClosureNotes("");
      } else {
        setClosureError(res.error || "No se pudo procesar el cierre mensual.");
      }
    });
  }

  function handleDeleteClosure(id: string) {
    if (!confirm("¿Deseas eliminar este registro histórico de cierre?")) return;
    startTransition(async () => {
      await deleteDeferredCardClosure(id);
    });
  }

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/mas" className="text-xs text-muted hover:text-foreground active:scale-95 transition-colors">
              ‹ Más
            </Link>
          </div>
          <h1 className="font-serif text-2xl tracking-tight">Centro de Reportes & Cierres</h1>
          <p className="mt-0.5 text-xs text-muted">
            Reportes financieros consolidados, cierres mensuales y comprobantes oficiales
          </p>
        </div>

        {tab === "general" && (
          <ReportePdfButton
            ingresos={r.ingresos}
            egresos={r.egresos}
            neto={r.neto}
            porCategoria={r.porCategoria}
          />
        )}

        {tab === "tarjeta_jm" && (
          <button
            type="button"
            onClick={() => setOpenExecuteClosure(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-accent/90 active:scale-95 transition-all self-start sm:self-auto"
          >
            <CheckIcon className="h-3.5 w-3.5" />
            <span>+ Cerrar Mes de Tarjeta</span>
          </button>
        )}
      </header>

      {/* Selector de Pestañas de Reportes */}
      <div className="flex items-center gap-2 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setTab("general")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            tab === "general"
              ? "bg-accent text-white shadow-sm"
              : "bg-card border border-line text-muted hover:text-foreground hover:bg-soft"
          }`}
        >
          <span>📊 Reporte Financiero General</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("tarjeta_jm")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            tab === "tarjeta_jm"
              ? "bg-accent text-white shadow-sm"
              : "bg-card border border-line text-muted hover:text-foreground hover:bg-soft"
          }`}
        >
          <span>💳 Cierres Tarjeta José Miguel</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
              tab === "tarjeta_jm" ? "bg-white/20 text-white" : "bg-soft text-muted font-bold"
            }`}
          >
            {closures.length}
          </span>
        </button>
      </div>

      {/* VISTA 1: REPORTE FINANCIERO GENERAL */}
      {tab === "general" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {!r.hasData ? (
            <div className="rounded-2xl border border-line bg-card p-10 text-center text-sm text-hint">
              Aún no hay datos este mes. Registra cobros y gastos para ver tu reporte financiero.
            </div>
          ) : (
            <>
              <section className="rounded-3xl border border-line bg-soft p-5 shadow-xs">
                <p className="text-xs text-muted font-medium">Resultado Neto del Mes</p>
                <p
                  className={`tnum mt-1 text-3xl font-bold font-mono ${
                    r.neto >= 0 ? "text-income" : "text-overdue"
                  }`}
                >
                  {formatMoney(r.neto)}
                </p>
                <p className="mt-1 text-[11px] text-hint">
                  Ingresos cobrados − Egresos operativos · Cifras en moneda base (USD)
                </p>
              </section>

              <section className="space-y-4 rounded-3xl border border-line bg-card p-5 shadow-xs">
                <h3 className="font-serif text-sm font-bold text-foreground">Flujo Mensual</h3>
                <Bar
                  label="Ingresos Cobrados"
                  amount={r.ingresos}
                  max={maxBar}
                  color="text-income"
                />
                <Bar
                  label="Egresos Realizados"
                  amount={r.egresos}
                  max={maxBar}
                  color="text-overdue"
                />
              </section>

              <section className="rounded-3xl border border-line bg-card p-5 shadow-xs space-y-4">
                <h3 className="font-serif text-sm font-bold text-foreground">
                  Egresos por Categoría
                </h3>
                {r.porCategoria.length === 0 ? (
                  <p className="py-4 text-center text-xs text-hint">Sin gastos este mes.</p>
                ) : (
                  <div className="space-y-3">
                    {r.porCategoria.map((c) => (
                      <div key={c.category}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{c.category}</span>
                          <span className="tnum font-bold text-muted font-mono">
                            {formatMoney(c.amount)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-soft">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{
                              width: `${Math.round((c.amount / maxCat) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {/* VISTA 2: CIERRES MENSUALES DE TARJETA JOSE MIGUEL */}
      {tab === "tarjeta_jm" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Tarjeta de Estado del Ciclo Activo Actual */}
          <section className="rounded-3xl border border-line bg-card p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
              <div>
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider bg-accent/10 px-2 py-0.5 rounded-md">
                  Ciclo en Curso
                </span>
                <h3 className="font-serif text-base font-bold text-foreground mt-1">
                  Estado Activo de la Tarjeta José Miguel
                </h3>
                <p className="text-xs text-muted">
                  Valores pendientes del periodo actual antes de ejecutar el próximo cierre mensual.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpenExecuteClosure(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-accent/90 active:scale-95 transition-all self-start sm:self-auto"
              >
                <CheckIcon className="h-3.5 w-3.5" />
                <span>Cerrar Mes & Reiniciar a $0</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-line bg-soft/40 p-3">
                <p className="text-[11px] text-muted font-medium">Deuda Base</p>
                <p className="tnum mt-1 text-lg font-bold text-foreground font-mono">
                  {formatCurrency(activeCardLimit, "USD")}
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-soft/40 p-3">
                <p className="text-[11px] text-muted font-medium">Consumos</p>
                <p className="tnum mt-1 text-lg font-bold text-foreground font-mono">
                  {formatCurrency(activeChargesTotal, "USD")}
                </p>
                <span className="text-[10px] text-hint">{activeCharges.length} cargo(s)</span>
              </div>

              <div className="rounded-2xl border border-line bg-soft/40 p-3">
                <p className="text-[11px] text-muted font-medium">Abonos Pagados</p>
                <p className="tnum mt-1 text-lg font-bold text-income font-mono">
                  − {formatCurrency(activeAbonosTotal, "USD")}
                </p>
                <span className="text-[10px] text-hint">{activeAbonos.length} abono(s)</span>
              </div>

              <div className="rounded-2xl border border-pending/40 bg-pending/10 p-3">
                <p className="text-[11px] text-pending font-bold">Deuda Pendiente</p>
                <p className="tnum mt-1 text-lg font-bold text-pending font-mono">
                  {formatCurrency(activeSaldoNeto, "USD")}
                </p>
                <span className="text-[10px] text-muted">Saldo por liquidar</span>
              </div>
            </div>
          </section>

          {/* Modal / Formulario para Ejecutar Cierre */}
          {openExecuteClosure && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
              <form
                onSubmit={handleExecuteClosure}
                className="w-full max-w-lg rounded-3xl border border-line bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
              >
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h3 className="font-serif text-base font-bold text-foreground flex items-center gap-2">
                      <span>🔒</span> Cierre Mensual de Tarjeta José Miguel
                    </h3>
                    <p className="text-xs text-hint">
                      Genera el acta/reporte de cierre y reinicia el ciclo activo a $0.00
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenExecuteClosure(false)}
                    className="text-xs text-muted hover:text-foreground font-bold px-2 py-1 rounded-lg hover:bg-soft"
                  >
                    ✕
                  </button>
                </div>

                {/* Resumen del Cierre */}
                <div className="rounded-2xl border border-accent/20 bg-accent/5 p-3.5 space-y-2 text-xs">
                  <p className="font-bold text-foreground">Resumen financiero del periodo a cerrar:</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex justify-between border-b border-line/40 pb-1">
                      <span className="text-muted">Deuda Base Inicial:</span>
                      <strong className="font-mono">{formatCurrency(activeCardLimit, "USD")}</strong>
                    </div>
                    <div className="flex justify-between border-b border-line/40 pb-1">
                      <span className="text-muted">Consumos ({activeCharges.length}):</span>
                      <strong className="font-mono">{formatCurrency(activeChargesTotal, "USD")}</strong>
                    </div>
                    <div className="flex justify-between border-b border-line/40 pb-1">
                      <span className="text-muted">Abonos Pagados ({activeAbonos.length}):</span>
                      <strong className="font-mono text-income">− {formatCurrency(activeAbonosTotal, "USD")}</strong>
                    </div>
                    <div className="flex justify-between border-b border-line/40 pb-1">
                      <span className="text-pending font-semibold">Saldo Liquidado:</span>
                      <strong className="font-mono text-pending">{formatCurrency(activeSaldoNeto, "USD")}</strong>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Nombre / Mes del Periodo *
                    </label>
                    <input
                      type="text"
                      value={closurePeriod}
                      onChange={(e) => setClosurePeriod(e.target.value)}
                      placeholder="Ej. Septiembre 2026"
                      className="w-full rounded-xl border border-line bg-card px-3.5 py-2 text-xs outline-none focus:border-accent font-semibold"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Notas / Observaciones del Cierre (Opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={closureNotes}
                      onChange={(e) => setClosureNotes(e.target.value)}
                      placeholder="Ej. Liquidado conforme acuerdo mensual, cargos diferidos conciliados..."
                      className="w-full rounded-xl border border-line bg-card px-3.5 py-2 text-xs outline-none focus:border-accent resize-none"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoDownloadPdf}
                      onChange={(e) => setAutoDownloadPdf(e.target.checked)}
                      className="rounded border-line text-accent focus:ring-accent"
                    />
                    <span>Generar y previsualizar Acta Oficial PDF automáticamente</span>
                  </label>
                </div>

                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] text-amber-700 dark:text-amber-400">
                  ⚠️ <strong>Importante:</strong> Al confirmar, este periodo quedará archivado permanentemente en el historial de reportes y la tarjeta de José Miguel empezará desde <strong>$0.00 USD</strong>.
                </div>

                {closureError && (
                  <p className="text-xs text-rose-500 font-medium">{closureError}</p>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setOpenExecuteClosure(false)}
                    className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-muted hover:bg-soft"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-accent/90 disabled:opacity-50 active:scale-95 transition-all"
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                    <span>{isPending ? "Procesando Cierre..." : "Confirmar Cierre & Reiniciar a $0"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Historial de Cierres Mensuales Archivados */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-base font-bold text-foreground">
                  Historial de Cierres Mensuales Archivados
                </h3>
                <p className="text-xs text-muted">
                  Actas, snapshots de consumos/abonos y reportes PDF de periodos cerrados
                </p>
              </div>

              {closures.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                  <input
                    type="text"
                    placeholder="Buscar cierre por periodo o código..."
                    value={closureSearch}
                    onChange={(e) => setClosureSearch(e.target.value)}
                    className="w-full rounded-xl border border-line bg-card pl-9 pr-3 py-1.5 text-xs outline-none focus:border-accent"
                  />
                </div>
              )}
            </div>

            {filteredClosures.length === 0 ? (
              <div className="rounded-3xl border border-line bg-card p-10 text-center space-y-2">
                <div className="text-3xl">🔒</div>
                <h4 className="font-serif text-sm font-bold text-foreground">
                  No hay cierres mensuales archivados aún
                </h4>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  Cuando finalice el mes, presiona el botón <strong>&quot;Cerrar Mes de Tarjeta&quot;</strong> para generar tu primer acta y archivar el reporte oficial.
                </p>
                <button
                  type="button"
                  onClick={() => setOpenExecuteClosure(true)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-accent/90"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  <span>Realizar Primer Cierre Mensual</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClosures.map((closure) => (
                  <div
                    key={closure.id}
                    className="rounded-2xl border border-line bg-card p-4 shadow-xs hover:border-accent/40 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line/60 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-mono font-bold text-accent">
                          {closure.code}
                        </span>
                        <h4 className="font-serif text-sm font-bold text-foreground">
                          {closure.period}
                        </h4>
                        <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] text-muted">
                          Cerrado el {formatDate(closure.closedAt.slice(0, 10))}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => exportCardClosurePdf(closure, bcv)}
                          className="inline-flex items-center gap-1 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent hover:bg-accent/20 active:scale-95 transition-all"
                          title="Descargar Acta PDF"
                        >
                          <DownloadIcon className="h-3.5 w-3.5" />
                          <span>Descargar PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedClosure(closure)}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-semibold text-muted hover:text-foreground hover:bg-soft transition-all"
                        >
                          <span>Ver Detalle</span>
                        </button>

                        {admin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteClosure(closure.id)}
                            className="p-1 text-hint hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors"
                            title="Eliminar registro de cierre"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-soft/40 p-2.5 rounded-xl">
                        <span className="text-[10px] text-muted block">Deuda Base Inicial</span>
                        <strong className="font-mono text-foreground">{formatCurrency(closure.initialDebt, "USD")}</strong>
                      </div>
                      <div className="bg-soft/40 p-2.5 rounded-xl">
                        <span className="text-[10px] text-muted block">Consumos ({closure.charges?.length || 0})</span>
                        <strong className="font-mono text-foreground">{formatCurrency(closure.totalCharges, "USD")}</strong>
                      </div>
                      <div className="bg-soft/40 p-2.5 rounded-xl">
                        <span className="text-[10px] text-muted block">Abonos ({closure.abonos?.length || 0})</span>
                        <strong className="font-mono text-income">− {formatCurrency(closure.totalAbonos, "USD")}</strong>
                      </div>
                      <div className="bg-pending/10 border border-pending/20 p-2.5 rounded-xl">
                        <span className="text-[10px] text-pending font-semibold block">Saldo Final Liquidado</span>
                        <strong className="font-mono text-pending">{formatCurrency(closure.finalBalance, "USD")}</strong>
                      </div>
                    </div>

                    {closure.notes && (
                      <p className="text-[11px] text-hint italic bg-soft/20 p-2 rounded-lg">
                        &quot;{closure.notes}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal de Detalle Completo de Cierre Seleccionado */}
          {selectedClosure && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-line bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <span className="rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-mono font-bold text-accent">
                      {selectedClosure.code}
                    </span>
                    <h3 className="font-serif text-base font-bold text-foreground mt-1">
                      Detalle de Cierre · {selectedClosure.period}
                    </h3>
                    <p className="text-xs text-hint">
                      Cerrado el {formatDate(selectedClosure.closedAt.slice(0, 10))}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => exportCardClosurePdf(selectedClosure, bcv)}
                      className="inline-flex items-center gap-1 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-accent/90"
                    >
                      <DownloadIcon className="h-3.5 w-3.5" />
                      <span>PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedClosure(null)}
                      className="text-xs text-muted hover:text-foreground font-bold px-2 py-1 rounded-lg hover:bg-soft"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Resumen */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-soft/40 p-2.5 rounded-xl">
                    <span className="text-[10px] text-muted block">Deuda Base</span>
                    <strong className="font-mono">{formatCurrency(selectedClosure.initialDebt, "USD")}</strong>
                  </div>
                  <div className="bg-soft/40 p-2.5 rounded-xl">
                    <span className="text-[10px] text-muted block">Total Consumos</span>
                    <strong className="font-mono">{formatCurrency(selectedClosure.totalCharges, "USD")}</strong>
                  </div>
                  <div className="bg-soft/40 p-2.5 rounded-xl">
                    <span className="text-[10px] text-muted block">Total Abonos</span>
                    <strong className="font-mono text-income">− {formatCurrency(selectedClosure.totalAbonos, "USD")}</strong>
                  </div>
                  <div className="bg-pending/10 border border-pending/20 p-2.5 rounded-xl">
                    <span className="text-[10px] text-pending font-semibold block">Saldo Final</span>
                    <strong className="font-mono text-pending">{formatCurrency(selectedClosure.finalBalance, "USD")}</strong>
                  </div>
                </div>

                {/* Tabla de Cargos */}
                <div className="space-y-2">
                  <h4 className="font-serif text-xs font-bold text-foreground">
                    📋 Consumos Archivados ({selectedClosure.charges?.length || 0})
                  </h4>
                  {(!selectedClosure.charges || selectedClosure.charges.length === 0) ? (
                    <p className="text-[11px] text-hint italic">No hubo consumos en este ciclo.</p>
                  ) : (
                    <div className="rounded-xl border border-line overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-soft text-[10px] font-bold text-muted uppercase">
                          <tr>
                            <th className="p-2">Fecha</th>
                            <th className="p-2">Concepto</th>
                            <th className="p-2">Categoría</th>
                            <th className="p-2 text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {selectedClosure.charges.map((c, i) => (
                            <tr key={c.id || i} className="hover:bg-soft/30">
                              <td className="p-2 text-[11px] text-hint">{c.chargedOn}</td>
                              <td className="p-2 font-medium">{c.description}</td>
                              <td className="p-2 text-[11px] text-muted">{c.category}</td>
                              <td className="p-2 text-right font-mono font-bold">
                                {formatCurrency(c.amount, c.currency || "USD")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Tabla de Abonos */}
                <div className="space-y-2">
                  <h4 className="font-serif text-xs font-bold text-foreground">
                    💸 Abonos & Pagos Archivados ({selectedClosure.abonos?.length || 0})
                  </h4>
                  {(!selectedClosure.abonos || selectedClosure.abonos.length === 0) ? (
                    <p className="text-[11px] text-hint italic">No hubo abonos registrados en este ciclo.</p>
                  ) : (
                    <div className="rounded-xl border border-line overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-soft text-[10px] font-bold text-muted uppercase">
                          <tr>
                            <th className="p-2">Fecha</th>
                            <th className="p-2">Concepto</th>
                            <th className="p-2">Cuenta / Ref</th>
                            <th className="p-2 text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {selectedClosure.abonos.map((a, i) => (
                            <tr key={a.id || i} className="hover:bg-soft/30">
                              <td className="p-2 text-[11px] text-hint">{a.paidOn}</td>
                              <td className="p-2 font-medium">{a.description}</td>
                              <td className="p-2 text-[11px] text-muted">
                                {a.paidFrom} {a.reference ? `· Ref: ${a.reference}` : ""}
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-income">
                                − {formatCurrency(a.amount, a.currency || "USD")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setSelectedClosure(null)}
                    className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-muted hover:bg-soft"
                  >
                    Cerrar Vista
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
