"use client";

import { PdfDownloadButton } from "@/components/ui/pdf-download-button";
import { formatCurrency } from "@/lib/currency";
import type { Employee } from "@/lib/mock-data";

interface NominaPdfButtonProps {
  employees: Employee[];
}

export function NominaPdfButton({ employees }: NominaPdfButtonProps) {
  function getReportOptions() {
    const totalUSD = employees
      .filter((e) => e.currency === "USD")
      .reduce((s, e) => s + e.salary, 0);
    const totalEUR = employees
      .filter((e) => e.currency === "EUR")
      .reduce((s, e) => s + e.salary, 0);

    const kpis = [
      { label: "Total Empleados", value: String(employees.length) },
      { label: "Total USD (quincenal)", value: formatCurrency(totalUSD, "USD") },
    ];
    if (totalEUR > 0) {
      kpis.push({ label: "Total EUR (quincenal)", value: formatCurrency(totalEUR, "EUR") });
    }

    return {
      title: "Reporte de Nómina",
      subtitle: `Quincenal · 15 y último · Total empleados: ${employees.length}`,
      filename: "Massivo Corp - Reporte de Nomina",
      kpis,
      columns: [
        { header: "Código", dataKey: "code" },
        { header: "Empleado", dataKey: "name" },
        { header: "Cédula", dataKey: "idNumber", align: "center" as const },
        { header: "Cargo", dataKey: "role" },
        { header: "Banco / Coordenadas", dataKey: "bank" },
        { header: "Moneda", dataKey: "currency", align: "center" as const },
        { header: "Salario (quincenal)", dataKey: "salary", align: "right" as const },
        { header: "Salario (mensual)", dataKey: "monthly", align: "right" as const },
      ],
      data: employees.map((e) => ({
        code: e.code || "—",
        name: e.name || "Sin nombre",
        idNumber: e.idNumber || "—",
        role: e.role || "Sin cargo",
        bank: [e.bankName, e.accountType, e.accountNumber].filter(Boolean).join(" · ") || "—",
        currency: e.currency,
        salary: formatCurrency(e.salary, e.currency),
        monthly: formatCurrency(e.salary * 2, e.currency),
      })),
    };
  }

  return <PdfDownloadButton reportOptions={getReportOptions} />;
}
