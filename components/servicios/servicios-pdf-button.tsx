"use client";

import { PdfDownloadButton } from "@/components/ui/pdf-download-button";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import type { Service } from "@/lib/mock-data";

interface ServiciosPdfButtonProps {
  services: Service[];
}

export function ServiciosPdfButton({ services }: ServiciosPdfButtonProps) {
  function getReportOptions() {
    // Agrupar costo mensual en USD como referencia
    const monthlyTotal = services.reduce((s, sv) => {
      const monthly = sv.cycle === "anual" ? sv.amount / 12 : sv.amount;
      return s + (sv.currency === "USD" ? monthly : 0);
    }, 0);

    return {
      title: "Reporte de Servicios y Suscripciones Recurrentes",
      subtitle: `Total servicios activos: ${services.length} | Costo mensual estimado: ${formatCurrency(monthlyTotal, "USD")}`,
      filename: "Massivo Corp - Reporte de Servicios",
      kpis: [
        { label: "Servicios Activos", value: String(services.length) },
        { label: "Costo Mensual Est.", value: formatCurrency(monthlyTotal, "USD") },
      ],
      columns: [
        { header: "Servicio", dataKey: "name" },
        { header: "Categoría", dataKey: "category" },
        { header: "Ciclo", dataKey: "cycle" },
        { header: "Monto", dataKey: "amount", align: "right" as const },
        { header: "Próx. Cargo", dataKey: "nextChargeDate" },
        { header: "Estado", dataKey: "status", align: "center" as const },
      ],
      data: services.map((s) => ({
        name: s.name || "Sin nombre",
        category: s.category || "General",
        cycle: s.cycle === "anual" ? "Anual" : "Mensual",
        amount: formatCurrency(s.amount, s.currency),
        nextChargeDate: formatDate(s.nextChargeDate),
        status: "Activo",
      })),
    };
  }

  return <PdfDownloadButton reportOptions={getReportOptions} />;
}
