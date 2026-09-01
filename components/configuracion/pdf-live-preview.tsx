"use client";

import { exportSamplePdf } from "@/lib/pdf-export";
import { DownloadIcon, FileTextIcon } from "@/components/ui/icons";
import type { SystemConfig } from "@/lib/config";
import type { CompanyAccount } from "@/lib/cuentas-actions";

interface PdfLivePreviewProps {
  config: SystemConfig;
  target?: "general" | "facturas" | "proformas";
  accounts?: CompanyAccount[];
}

export function PdfLivePreview({ config, target = "general", accounts = [] }: PdfLivePreviewProps) {
  const isFacturas = target === "facturas";
  const isProformas = target === "proformas";

  const companyName = isFacturas
    ? config.pdfInvoiceCompanyName || config.pdfCompanyName || "Massivo Corp"
    : isProformas
      ? config.pdfProformaCompanyName || config.pdfCompanyName || "Massivo Corp"
      : config.pdfCompanyName || "Massivo Corp";

  const companyRif = isFacturas
    ? config.pdfInvoiceCompanyRif || config.pdfCompanyRif || "J-50000000-0"
    : isProformas
      ? config.pdfProformaCompanyRif || config.pdfCompanyRif || "J-50000000-0"
      : config.pdfCompanyRif || "J-50000000-0";

  const subtitle = isFacturas
    ? config.pdfInvoiceHeaderSubtitle || "Factura Comercial & Comprobante de Cobro"
    : isProformas
      ? config.pdfProformaHeaderSubtitle || "Proforma / Presupuesto Comercial"
      : config.pdfHeaderSubtitle || "Sistema Financiero & Reportes";

  const primaryColor = isFacturas
    ? config.pdfInvoicePrimaryColor || config.brandPrimaryColor || "#2C21FF"
    : isProformas
      ? config.pdfProformaPrimaryColor || config.brandPrimaryColor || "#2C21FF"
      : config.pdfPrimaryColor || config.brandPrimaryColor || "#2C21FF";

  const paperSize = isFacturas
    ? config.pdfInvoicePaperSize || "letter"
    : isProformas
      ? config.pdfProformaPaperSize || "letter"
      : config.pdfPaperSize || "letter";

  const phone = isFacturas
    ? config.pdfInvoiceContactPhone || config.pdfContactPhone || "+58 412-0000000"
    : isProformas
      ? config.pdfProformaContactPhone || config.pdfContactPhone || "+58 412-0000000"
      : config.pdfContactPhone || "+58 412-0000000";

  const email = isFacturas
    ? config.pdfInvoiceContactEmail || config.pdfContactEmail || "contacto@massivocorp.com"
    : isProformas
      ? config.pdfProformaContactEmail || config.pdfContactEmail || "contacto@massivocorp.com"
      : config.pdfContactEmail || "contacto@massivocorp.com";

  const showBcv = isFacturas
    ? config.pdfInvoiceShowBcvRates
    : isProformas
      ? config.pdfProformaShowBcvRates
      : config.pdfShowBcvRates;

  const footer = isFacturas
    ? config.pdfInvoiceFooterText || "Massivo Corp · Factura Oficial"
    : isProformas
      ? config.pdfProformaFooterText || "Massivo Corp · Proforma Preliminar"
      : config.pdfFooterText || "Massivo Corp · Confidencial · M-Wallet";

  const terms = isFacturas
    ? config.pdfInvoiceTermsAndConditions
    : isProformas
      ? config.pdfProformaTermsAndConditions
      : config.pdfTermsAndConditions;

  const showConditions = isFacturas
    ? config.pdfInvoiceShowConditions
    : isProformas
      ? config.pdfProformaShowConditions
      : config.pdfShowConditions;

  const conditions = {
    payment: isFacturas ? config.pdfInvoiceConditionsPayment : config.pdfProformaConditionsPayment,
    delivery: isFacturas ? config.pdfInvoiceConditionsDelivery : config.pdfProformaConditionsDelivery,
    ip: isFacturas ? config.pdfInvoiceConditionsIP : config.pdfProformaConditionsIP,
    confidentiality: isFacturas ? config.pdfInvoiceConditionsConfidentiality : config.pdfProformaConditionsConfidentiality,
  };

  const targetAccountId = isFacturas
    ? config.pdfInvoiceTargetAccountId
    : isProformas
      ? config.pdfProformaTargetAccountId
      : undefined;

  const selectedAccount = accounts.find((a) => a.id === targetAccountId) || accounts[0];

  const paperDetails = {
    a4: { label: "Formato A4 Estándar", dims: "210 × 297 mm", ratio: "aspect-[1/1.41]" },
    letter: { label: "Formato Carta (Letter)", dims: "216 × 279 mm", ratio: "aspect-[1/1.29]" },
    legal: { label: "Formato Oficio (Legal)", dims: "216 × 356 mm", ratio: "aspect-[1/1.65]" },
  }[paperSize as "a4" | "letter" | "legal"] || {
    label: "Formato Carta (Letter)",
    dims: "216 × 279 mm",
    ratio: "aspect-[1/1.29]",
  };

  function handleDownloadSample() {
    exportSamplePdf(config);
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-4 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-serif text-sm font-medium flex items-center gap-1.5">
            <FileTextIcon className="h-4 w-4 text-accent" />
            <span>
              Vista Previa: {isFacturas ? "Plantilla Factura" : isProformas ? "Plantilla Proforma" : "Plantilla General"}
            </span>
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

      {/* Hoja de papel simulada */}
      <div className={`rounded-xl border border-line/80 bg-white p-4 sm:p-5 text-[#14151A] shadow-md space-y-3 text-[11px] select-none ${paperDetails.ratio} transition-all`}>
        {/* Encabezado */}
        <div className="rounded-lg bg-[#F5F6FF] p-3 flex items-center justify-between border border-line/40">
          <div className="space-y-1">
            {config.pdfLogoUrl || config.systemLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.pdfLogoUrl || config.systemLogoUrl}
                alt={companyName}
                className="h-7 w-auto max-w-[140px] object-contain"
              />
            ) : (
              <span className="font-serif text-sm font-bold text-gray-900 block">
                {companyName}
              </span>
            )}
            <p className="text-[10px] text-gray-500">
              {subtitle} · RIF: {companyRif}
            </p>
          </div>
          <div className="text-right text-[9px] text-gray-500 space-y-0.5">
            <p>Emisión: 01 sep. 2026</p>
            {showBcv && (
              <p className="font-medium text-gray-700">
                Tasa Ref. BCV: USD 798,32 Bs. | EUR 926,55 Bs.
              </p>
            )}
            <p>{[phone, email].filter(Boolean).join(" · ")}</p>
          </div>
        </div>

        {/* Título de documento simulado */}
        <div className="pt-1 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-900">
              {isFacturas
                ? "Factura Comercial #1001"
                : isProformas
                  ? "Proforma / Cotización #0001"
                  : "Reporte Financiero y Contabilizador"}
            </p>
            <p className="text-[10px] text-gray-500">
              {isFacturas
                ? `Código: ${config.invoicePrefix || "Mas-Corp-Fact-"}0001`
                : isProformas
                  ? `Código: ${config.proformaPrefix || "Mas-Corp-Prof-"}0001`
                  : `Nomenclatura activa: ${config.basePrefix}0001`}
            </p>
          </div>
          <span
            style={{ backgroundColor: `${primaryColor}1a`, color: primaryColor }}
            className="rounded px-2 py-0.5 text-[9px] font-mono uppercase font-bold"
          >
            {isFacturas ? "Factura" : isProformas ? "Proforma" : "Reporte"}
          </span>
        </div>

        {/* Tabla simulada */}
        <div className="overflow-hidden rounded border border-gray-200">
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr style={{ backgroundColor: primaryColor }} className="text-white font-semibold">
                <th className="px-2 py-1">Código</th>
                <th className="px-2 py-1">Concepto / Descripción</th>
                <th className="px-2 py-1">Estado</th>
                <th className="px-2 py-1 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="bg-white">
                <td className="px-2 py-1 font-mono text-[9px]">
                  {isFacturas
                    ? `${config.invoicePrefix || "Mas-Corp-Fact-"}0001`
                    : isProformas
                      ? `${config.proformaPrefix || "Mas-Corp-Prof-"}0001`
                      : `${config.invoicePrefix || "Mas-Corp-Fact-"}0001`}
                </td>
                <td className="px-2 py-1">Servicios de Consultoría y Desarrollo</td>
                <td className="px-2 py-1 text-emerald-600 font-medium">
                  {isProformas ? "En Espera" : "Pagada"}
                </td>
                <td className="px-2 py-1 text-right font-medium">$ 1.250,00</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cuenta de Pago Destino en el documento */}
        {selectedAccount && (isFacturas || isProformas) && (
          <div className="rounded bg-blue-50/70 p-2 text-[9px] border border-blue-100 text-gray-700 flex items-center justify-between">
            <div>
              <span className="font-bold text-blue-900 block">Cuenta de Pago / Acreditación:</span>
              <p className="font-medium text-gray-800">{selectedAccount.name} ({selectedAccount.bankName || selectedAccount.accountType})</p>
              <p className="text-gray-500 font-mono text-[8.5px]">
                {selectedAccount.accountNumber || selectedAccount.email || selectedAccount.walletAddress || "Coordenadas bancarias asignadas"}
              </p>
            </div>
            <span className="text-[9px] font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
              {selectedAccount.currency}
            </span>
          </div>
        )}

        {/* Bloque de Condiciones Estructuradas */}
        {showConditions && (isFacturas || isProformas) && (
          <div className="rounded-lg bg-gray-50/80 p-2.5 text-gray-800 space-y-1.5 text-[8.5px] border border-gray-200">
            <p className="font-bold text-gray-900 uppercase tracking-wider text-[9px]">Condiciones del Proyecto</p>
            {conditions.payment && (
              <div>
                <p className="text-gray-900 font-semibold">Forma de Pago:</p>
                <p className="text-gray-600 leading-tight line-clamp-2">{conditions.payment}</p>
              </div>
            )}
            {conditions.delivery && (
              <div>
                <p className="text-gray-900 font-semibold">Tiempo de entrega:</p>
                <p className="text-gray-600 leading-tight line-clamp-1">{conditions.delivery}</p>
              </div>
            )}
            {conditions.ip && (
              <div>
                <p className="text-gray-900 font-semibold">Propiedad Intelectual:</p>
                <p className="text-gray-600 leading-tight line-clamp-1">{conditions.ip}</p>
              </div>
            )}
            {conditions.confidentiality && (
              <div>
                <p className="text-gray-900 font-semibold">Confidencialidad:</p>
                <p className="text-gray-600 leading-tight line-clamp-1">{conditions.confidentiality}</p>
              </div>
            )}
          </div>
        )}

        {/* Términos generales */}
        {terms && !showConditions && (
          <div className="rounded bg-gray-50 p-2 text-[9px] text-gray-600 border border-gray-200/60 space-y-0.5">
            <span className="font-bold text-gray-700 block">Términos & Condiciones:</span>
            <p className="line-clamp-2">{terms}</p>
          </div>
        )}

        {/* Pie de página */}
        <div className="pt-2 flex items-center justify-between border-t border-gray-100 text-[8.5px] text-gray-400">
          <span className="truncate max-w-[80%]">{footer}</span>
          <span className="shrink-0 font-mono">Pág. 1 / 1</span>
        </div>
      </div>
    </div>
  );
}
