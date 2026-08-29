"use client";

import { useState } from "react";
import type { AuditLogItem } from "@/lib/audit";

interface AuditFeedProps {
  initialLogs: AuditLogItem[];
}

const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "factura", label: "Facturas" },
  { id: "pago", label: "Pagos" },
  { id: "gasto", label: "Gastos" },
  { id: "tasa", label: "Tasas" },
  { id: "seguridad", label: "Seguridad" },
  { id: "equipo", label: "Equipo" },
  { id: "empresa", label: "Empresa" },
];

const ENTITY_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  factura: { label: "Factura", bg: "bg-accent/10", text: "text-accent" },
  pago: { label: "Cobro / Pago", bg: "bg-income/10", text: "text-income" },
  gasto: { label: "Gasto", bg: "bg-overdue/10", text: "text-overdue" },
  tasa: { label: "Tasa BCV", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
  seguridad: { label: "Seguridad", bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300" },
  equipo: { label: "Equipo", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  empresa: { label: "Empresa", bg: "bg-soft", text: "text-muted" },
  cliente: { label: "Cliente", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300" },
};

function formatTimestamp(iso: string) {
  try {
    const d = new Date(iso);
    const dateStr = d.toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "short",
    });
    const timeStr = d.toLocaleTimeString("es-VE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateStr} · ${timeStr}`;
  } catch {
    return iso;
  }
}

import { PdfDownloadButton } from "@/components/ui/pdf-download-button";

export function AuditFeed({ initialLogs }: AuditFeedProps) {
  const [filter, setFilter] = useState("todos");

  const filtered =
    filter === "todos"
      ? initialLogs
      : initialLogs.filter((l) => l.entityType === filter);

  function getPdfReportOptions() {
    return {
      title: "Reporte de Auditoría y Trazabilidad",
      subtitle: `Movimientos registrados: ${filtered.length} | Filtro: ${filter.toUpperCase()}`,
      filename: "Massivo Corp - Reporte de Auditoria",
      kpis: [
        { label: "Total Registros", value: String(filtered.length) },
        { label: "Categoría", value: filter === "todos" ? "Todas" : filter.toUpperCase() },
      ],
      columns: [
        { header: "Fecha / Hora", dataKey: "createdAtFormatted" },
        { header: "Usuario", dataKey: "userName" },
        { header: "Cargo", dataKey: "userRole" },
        { header: "Módulo", dataKey: "entityLabel" },
        { header: "Descripción del Movimiento", dataKey: "description" },
      ],
      data: filtered.map((l) => ({
        createdAtFormatted: formatTimestamp(l.createdAt),
        userName: l.userName || "Usuario",
        userRole: (l.userRole || "admin").toUpperCase(),
        entityLabel: ENTITY_CONFIG[l.entityType]?.label || l.entityType,
        description: l.description || "Sin detalle",
      })),
    };
  }

  return (
    <div className="space-y-4">
      {/* Barra de filtros y botón de descarga PDF */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                filter === f.id
                  ? "bg-accent text-white"
                  : "bg-card border border-line text-muted hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <PdfDownloadButton
          reportOptions={getPdfReportOptions}
          label="Descargar PDF"
        />
      </div>

      {/* Listado de movimientos */}
      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-hint">
            No hay registros de auditoría para este filtro.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((log) => {
              const entity =
                ENTITY_CONFIG[log.entityType] || {
                  label: log.entityType,
                  bg: "bg-soft",
                  text: "text-muted",
                };

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-4 transition-colors hover:bg-soft/40"
                >
                  <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-soft text-xs font-medium text-muted">
                    {(log.userName || "U").charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-medium text-foreground">
                        {log.userName}
                      </span>
                      <span className="rounded-full bg-soft px-1.5 py-0.2 text-[10px] uppercase font-semibold text-muted">
                        {log.userRole}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${entity.bg} ${entity.text}`}
                      >
                        {entity.label}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-foreground/90 leading-relaxed">
                      {log.description}
                    </p>

                    <p className="mt-1 text-[11px] text-hint">
                      {formatTimestamp(log.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
