"use client";

import { PdfDownloadButton } from "@/components/ui/pdf-download-button";
import { formatMoney } from "@/lib/format";

interface ReportePdfButtonProps {
  ingresos: number;
  egresos: number;
  neto: number;
  porCategoria: { category: string; amount: number }[];
}

export function ReportePdfButton({
  ingresos,
  egresos,
  neto,
  porCategoria,
}: ReportePdfButtonProps) {
  function getReportOptions() {
    const currentMonth = new Intl.DateTimeFormat("es-VE", {
      month: "long",
      year: "numeric",
    }).format(new Date());

    return {
      title: `Reporte Financiero · ${currentMonth}`,
      subtitle: `Ingresos vs Egresos del mes en curso`,
      filename: `Massivo Corp - Reporte Financiero ${currentMonth}`,
      kpis: [
        { label: "Ingresos del Mes", value: formatMoney(ingresos) },
        { label: "Egresos del Mes", value: formatMoney(egresos) },
        { label: "Resultado Neto", value: `${neto >= 0 ? "+" : ""}${formatMoney(neto)}` },
        {
          label: "Margen",
          value: ingresos > 0 ? `${Math.round((neto / ingresos) * 100)}%` : "—",
        },
      ],
      columns: [
        { header: "Categoría", dataKey: "category" },
        { header: "Monto Egresado", dataKey: "amount", align: "right" as const },
        { header: "% del Total", dataKey: "pct", align: "center" as const },
      ],
      data:
        porCategoria.length > 0
          ? porCategoria.map((c) => ({
              category: c.category || "General",
              amount: formatMoney(c.amount),
              pct: egresos > 0 ? `${Math.round((c.amount / egresos) * 100)}%` : "—",
            }))
          : [
              {
                category: "Sin gastos registrados este mes",
                amount: "—",
                pct: "—",
              },
            ],
    };
  }

  return <PdfDownloadButton reportOptions={getReportOptions} label="Descargar PDF" />;
}
