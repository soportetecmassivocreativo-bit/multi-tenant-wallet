"use client";

import { PdfDownloadButton } from "@/components/ui/pdf-download-button";
import { formatMoney, formatDate } from "@/lib/format";
import type { Expense } from "@/lib/mock-data";

interface GastosPdfButtonProps {
  expenses: Expense[];
  total: number;
}

export function GastosPdfButton({ expenses, total }: GastosPdfButtonProps) {
  function getReportOptions() {
    return {
      title: "Reporte de Gastos y Egresos",
      subtitle: `Total registrado: ${formatMoney(total)} | ${expenses.length} gasto(s)`,
      filename: "Massivo Corp - Reporte de Gastos",
      kpis: [
        { label: "Total Egresos", value: formatMoney(total) },
        { label: "Nº Gastos", value: String(expenses.length) },
      ],
      columns: [
        { header: "Fecha", dataKey: "date" },
        { header: "Descripción", dataKey: "note" },
        { header: "Categoría", dataKey: "category" },
        { header: "Monto", dataKey: "amount", align: "right" as const },
      ],
      data: expenses.map((e) => ({
        date: formatDate(e.date),
        note: e.note || "Sin descripción",
        category: e.category || "General",
        amount: `− ${formatMoney(e.amount)}`,
      })),
    };
  }

  return <PdfDownloadButton reportOptions={getReportOptions} />;
}
