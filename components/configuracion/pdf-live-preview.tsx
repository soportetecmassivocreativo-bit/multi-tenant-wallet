"use client";

import { exportSamplePdf } from "@/lib/pdf-export";
import { DownloadIcon, FileTextIcon } from "@/components/ui/icons";
import type { SystemConfig } from "@/lib/config";

interface PdfLivePreviewProps {
  config: SystemConfig;
}

export function PdfLivePreview({ config }: PdfLivePreviewProps) {
  const primaryColor = config.pdfPrimaryColor || "#2C21FF";
  const paperSize = config.pdfPaperSize || "a4";

  const paperDetails = {
    a4: { label: "Formato A4 Estándar", dims: "210 × 297 mm", ratio: "aspect-[1/1.41]" },
    letter: { label: "Formato Carta (Letter)", dims: "216 × 279 mm", ratio: "aspect-[1/1.29]" },
    legal: { label: "Formato Oficio (Legal)", dims: "216 × 356 mm", ratio: "aspect-[1/1.65]" },
  }[paperSize];

  function handleDownloadSample() {
    exportSamplePdf(config);
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-4 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-serif text-sm font-medium flex items-center gap-1.5">
            <FileTextIcon className="h-4 w-4 text-accent" />
            <span>Vista Previa en Vivo</span>
          </h3>
          <p className="text-[11px] text-muted">{paperDetails.label} · {paperDetails.dims}</p>
        </div>

        <button
          type="button"
          onClick={handleDownloadSample}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent hover:text-white transition-all active:scale-95 shadow-sm"
          title="Generar y abrir PDF de muestra con esta personalización"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          <span>Descargar PDF de Prueba</span>
        </button>
      </div>

      {/* Hoja de papel simulada según tamaño */}
      <div className={`rounded-xl border border-line/80 bg-white p-4 sm:p-5 text-[#14151A] shadow-md space-y-3.5 text-[11px] select-none ${paperDetails.ratio} transition-all`}>
        {/* Encabezado */}
        <div className="rounded-lg bg-[#F5F6FF] p-3 flex items-center justify-between border border-line/40">
          <div className="space-y-1">
            {config.pdfLogoUrl || config.systemLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.pdfLogoUrl || config.systemLogoUrl}
                alt={config.pdfCompanyName}
                className="h-7 w-auto max-w-[140px] object-contain"
              />
            ) : (
              <span className="font-serif text-sm font-bold text-gray-900 block">
                {config.pdfCompanyName}
              </span>
            )}
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
        <div className="pt-1 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-900">
              Reporte Financiero y Contabilizador
            </p>
            <p className="text-[10px] text-gray-500">
              Nomenclatura activa: {config.basePrefix}0001 (hasta {config.codeDigits} dígitos) · {paperDetails.label}
            </p>
          </div>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-[9px] font-mono text-gray-600 uppercase">
            {paperSize}
          </span>
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
          <span className="truncate max-w-[80%]">{config.pdfFooterText || "Massivo Corp · Confidencial · Generado automáticamente por M-Wallet"}</span>
          <span className="shrink-0 font-mono">Pág. 1 / 1</span>
        </div>
      </div>
    </div>
  );
}
