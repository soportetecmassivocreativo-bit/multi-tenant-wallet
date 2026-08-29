"use client";

import type { SystemConfig } from "@/lib/config";

interface PdfLivePreviewProps {
  config: SystemConfig;
}

export function PdfLivePreview({ config }: PdfLivePreviewProps) {
  const primaryColor = config.pdfPrimaryColor || "#2C21FF";

  return (
    <div className="rounded-2xl border border-line bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-sm font-medium">Vista Previa en Vivo (PDF)</h3>
        <span className="rounded-full bg-soft px-2.5 py-0.5 text-[10px] text-muted">
          Formato A4 Estándar
        </span>
      </div>

      {/* Hoja A4 simulada */}
      <div className="rounded-xl border border-line/80 bg-white p-4 text-[#14151A] shadow-inner space-y-3 text-[11px] select-none">
        {/* Encabezado */}
        <div className="rounded-lg bg-[#F5F6FF] p-3 flex items-center justify-between border border-line/40">
          <div className="space-y-0.5">
            <p
              className="text-xs font-bold tracking-tight"
              style={{ color: primaryColor }}
            >
              M-WALLET
            </p>
            <p className="text-sm font-bold text-gray-900 leading-tight">
              {config.pdfCompanyName || "Massivo Corp"}
            </p>
            <p className="text-[10px] text-gray-500">
              {config.pdfHeaderSubtitle || "Sistema Financiero & Facturación"} · RIF:{" "}
              {config.pdfCompanyRif || "J-50000000-0"}
            </p>
          </div>
          <div className="text-right text-[9px] text-gray-500 space-y-0.5">
            <p>Emisión: 29 ago. 2026</p>
            {config.pdfShowBcvRates && (
              <p className="font-medium text-gray-700">
                Tasa Ref. BCV: USD 794,99 Bs. | EUR 922,69 Bs.
              </p>
            )}
            <p>{[config.pdfContactPhone, config.pdfContactEmail].filter(Boolean).join(" · ")}</p>
          </div>
        </div>

        {/* Título de reporte de ejemplo */}
        <div className="pt-1">
          <p className="text-xs font-bold text-gray-900">
            Reporte Financiero y Contabilizador
          </p>
          <p className="text-[10px] text-gray-500">
            Nomenclatura activa: {config.basePrefix}0001 (hasta {config.codeDigits} dígitos)
          </p>
        </div>

        {/* Tarjetas KPI de ejemplo */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded border border-gray-200 bg-[#F8F9FC] p-1.5">
            <p className="text-[9px] text-gray-500">Factura Siguiente</p>
            <p className="text-xs font-bold text-gray-800">
              {config.invoicePrefix}
              {String(config.invoiceCounter).padStart(config.codeDigits, "0")}
            </p>
          </div>
          <div className="rounded border border-gray-200 bg-[#F8F9FC] p-1.5">
            <p className="text-[9px] text-gray-500">Gasto Siguiente</p>
            <p className="text-xs font-bold text-gray-800">
              {config.expensePrefix}
              {String(config.expenseCounter).padStart(config.codeDigits, "0")}
            </p>
          </div>
          <div className="rounded border border-gray-200 bg-[#F8F9FC] p-1.5">
            <p className="text-[9px] text-gray-500">Nómina / Empleado</p>
            <p className="text-xs font-bold text-gray-800">
              {config.employeePrefix}
              {String(config.employeeCounter).padStart(config.codeDigits, "0")}
            </p>
          </div>
        </div>

        {/* Tabla simulada con el color primario seleccionado */}
        <div className="overflow-hidden rounded border border-gray-200">
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr style={{ backgroundColor: primaryColor }} className="text-white font-semibold">
                <th className="px-2 py-1">Código</th>
                <th className="px-2 py-1">Concepto / Módulo</th>
                <th className="px-2 py-1">Estado</th>
                <th className="px-2 py-1 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="bg-white">
                <td className="px-2 py-1 font-mono text-[9px]">
                  {config.invoicePrefix}
                  {String(config.invoiceCounter).padStart(config.codeDigits, "0")}
                </td>
                <td className="px-2 py-1">Facturación a Cliente Corporativo</td>
                <td className="px-2 py-1 text-emerald-600 font-medium">Pagada</td>
                <td className="px-2 py-1 text-right font-medium">$ 1.250,00</td>
              </tr>
              <tr className="bg-[#F8F9FE]">
                <td className="px-2 py-1 font-mono text-[9px]">
                  {config.servicePrefix}
                  {String(config.serviceCounter).padStart(config.codeDigits, "0")}
                </td>
                <td className="px-2 py-1">Suscripción Servidor Cloud</td>
                <td className="px-2 py-1 text-blue-600 font-medium">Recurrente</td>
                <td className="px-2 py-1 text-right font-medium">$ 45,00</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pie de página */}
        <div className="pt-2 flex items-center justify-between border-t border-gray-100 text-[8.5px] text-gray-400">
          <span>{config.pdfFooterText || "Massivo Corp · Confidencial · Generado automáticamente por M-Wallet"}</span>
          <span>Página 1 de 1</span>
        </div>
      </div>
    </div>
  );
}
