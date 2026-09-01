"use client";

import { PdfDownloadButton } from "@/components/ui/pdf-download-button";
import { formatMoney, formatDate } from "@/lib/format";
import type { Proforma, Client } from "@/lib/mock-data";

interface ProformasPdfButtonProps {
  proformas: Proforma[];
  clients: Client[];
  porCobrar: number;
}

export function ProformasPdfButton({
  proformas,
  clients,
  porCobrar,
}: ProformasPdfButtonProps) {
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  function getReportOptions() {
    return {
      title: "Reporte de Proformas & Presupuestos",
      subtitle: `Total proformas: ${proformas.length} | En espera de pago: ${formatMoney(porCobrar)}`,
      filename: "Massivo Corp - Reporte de Proformas",
      kpis: [
        { label: "Total Proformas", value: String(proformas.length) },
        { label: "En Espera / Por Cobrar", value: formatMoney(porCobrar) },
      ],
      columns: [
        { header: "Nº Proforma", dataKey: "number" },
        { header: "Código", dataKey: "code" },
        { header: "Cliente", dataKey: "clientName" },
        { header: "Emisión", dataKey: "date" },
        { header: "Monto Total", dataKey: "total", align: "right" as const },
        { header: "Estado", dataKey: "status", align: "center" as const },
      ],
      data: proformas.map((p) => ({
        number: `#${p.number}`,
        code: p.code || `Mas-Corp-Prof-${String(p.number).padStart(4, "0")}`,
        clientName: clientMap.get(p.clientId) || "—",
        date: formatDate(p.date),
        total: formatMoney(p.total),
        status: p.status.toUpperCase(),
      })),
    };
  }

  return <PdfDownloadButton reportOptions={getReportOptions} label="Descargar PDF" />;
}
