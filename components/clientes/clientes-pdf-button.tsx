"use client";

import { PdfDownloadButton } from "@/components/ui/pdf-download-button";
import { formatMoney } from "@/lib/format";
import type { Client } from "@/lib/mock-data";

interface ClientesPdfButtonProps {
  clients: Client[];
}

export function ClientesPdfButton({ clients }: ClientesPdfButtonProps) {
  function getReportOptions() {
    const totalDeuda = clients.reduce((s, c) => s + (c.balance ?? 0), 0);
    return {
      title: "Reporte de Clientes",
      subtitle: `Total clientes: ${clients.length} | Deuda pendiente acumulada: ${formatMoney(totalDeuda)}`,
      filename: "Massivo Corp - Reporte de Clientes",
      kpis: [
        { label: "Total Clientes", value: String(clients.length) },
        { label: "Deuda Pendiente", value: formatMoney(totalDeuda) },
      ],
      columns: [
        { header: "Cliente", dataKey: "name" },
        { header: "RIF", dataKey: "rif" },
        { header: "Score", dataKey: "score", align: "center" as const },
        { header: "Crédito (días)", dataKey: "termDays", align: "center" as const },
        { header: "Balance Pendiente", dataKey: "balance", align: "right" as const },
        { header: "Estado", dataKey: "status", align: "center" as const },
      ],
      data: clients.map((c) => ({
        name: c.name || "—",
        rif: c.rif || "—",
        score: String(c.score ?? 0),
        termDays: c.termDays > 0 ? `${c.termDays} días` : "Contado",
        balance: c.balance > 0 ? `Debe ${formatMoney(c.balance)}` : "Al día",
        status: c.balance > 0 ? "⚠ Pendiente" : "✓ Al día",
      })),
    };
  }

  return <PdfDownloadButton reportOptions={getReportOptions} />;
}
