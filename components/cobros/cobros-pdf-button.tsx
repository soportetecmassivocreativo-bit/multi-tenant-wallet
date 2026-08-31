"use client";

import { PdfDownloadButton } from "@/components/ui/pdf-download-button";
import { formatMoney, formatDate } from "@/lib/format";
import type { Invoice, Client } from "@/lib/mock-data";

interface CobrosPdfButtonProps {
  invoices: Invoice[];
  clients: Client[];
  porCobrar: number;
  vencidas: number;
}

export function CobrosPdfButton({
  invoices,
  clients,
  porCobrar,
  vencidas,
}: CobrosPdfButtonProps) {
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  function getReportOptions() {
    return {
      title: "Reporte de Facturas y Cuentas por Cobrar",
      subtitle: `Total facturas: ${invoices.length} | Por cobrar: ${formatMoney(porCobrar)} | Vencidas: ${vencidas}`,
      filename: "Massivo Corp - Reporte de Cobros",
      kpis: [
        { label: "Total Facturas", value: String(invoices.length) },
        { label: "Por Cobrar", value: formatMoney(porCobrar) },
        { label: "Vencidas", value: String(vencidas) },
      ],
      columns: [
        { header: "Nº Factura", dataKey: "number" },
        { header: "Cliente", dataKey: "clientName" },
        { header: "Emisión", dataKey: "date" },
        { header: "Fecha Pago", dataKey: "dueDate" },
        { header: "Monto Total", dataKey: "total", align: "right" as const },
        { header: "Estado", dataKey: "status", align: "center" as const },
      ],
      data: invoices.map((i) => ({
        number: `#${i.number}`,
        clientName: clientMap.get(i.clientId) || "—",
        date: formatDate(i.date),
        dueDate: formatDate(i.dueDate),
        total: formatMoney(i.total),
        status: i.status.toUpperCase(),
      })),
    };
  }

  return <PdfDownloadButton reportOptions={getReportOptions} label="Descargar PDF" />;
}
