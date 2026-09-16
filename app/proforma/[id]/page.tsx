export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/factura/print-button";
import { formatCurrency } from "@/lib/currency";
import { formatDate, cleanConceptAndNotes, cleanItemDescription } from "@/lib/format";
import { getProformaDetail, getBcvRates, getCompany } from "@/lib/data";
import { getSystemConfig } from "@/lib/config-actions";
import { getCompanyAccounts } from "@/lib/cuentas-actions";

export default async function ProformaPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [prof, company, config, accounts, bcv] = await Promise.all([
    getProformaDetail(id),
    getCompany(),
    getSystemConfig(),
    getCompanyAccounts(),
    getBcvRates(),
  ]);
  if (!prof) notFound();

  const companyName =
    config.pdfProformaCompanyName ||
    config.pdfCompanyName ||
    company?.name ||
    "Massivo Creativo C.A.";

  const rawCompanyRif =
    config.pdfProformaCompanyRif ||
    config.pdfCompanyRif ||
    company?.rif ||
    "";
  const companyRif =
    rawCompanyRif && rawCompanyRif !== "J-50000000-0" && rawCompanyRif !== "J-00000000-0"
      ? rawCompanyRif
      : "";

  const phone =
    (config.pdfProformaContactPhone && config.pdfProformaContactPhone !== "+58 412-0000000")
      ? config.pdfProformaContactPhone
      : (config.pdfContactPhone && config.pdfContactPhone !== "+58 412-0000000")
        ? config.pdfContactPhone
        : company?.phone || config.pdfProformaContactPhone || config.pdfContactPhone || "+58 412-0000000";

  const email =
    (config.pdfProformaContactEmail && config.pdfProformaContactEmail !== "contacto@massivocorp.com" && config.pdfProformaContactEmail !== "info@massivocreativo.com")
      ? config.pdfProformaContactEmail
      : (config.pdfContactEmail && config.pdfContactEmail !== "contacto@massivocorp.com" && config.pdfContactEmail !== "info@massivocreativo.com")
        ? config.pdfContactEmail
        : company?.email || config.pdfProformaContactEmail || config.pdfContactEmail || "info@massivocreativo.com";

  const website = "www.massivocreativo.com";

  const targetAccountId = prof.targetAccountId || config.pdfProformaTargetAccountId;
  const targetAccount = accounts.find((a) => a.id === targetAccountId) || (prof.targetAccountName ? { name: prof.targetAccountName } : accounts[0]);

  const targetHolder = targetAccount?.holderName || targetAccount?.name || companyName;
  const targetBank = targetAccount?.bankName || targetAccount?.name || "Banesco";
  const targetNumber = targetAccount?.accountNumber || targetAccount?.phone || "0134-0000-00-0000000000";
  const targetId = targetAccount?.holderId || (targetAccount as any)?.idNumber || (targetAccount as any)?.taxId || "";

  const rateRefLabel = (prof.vesRateRef || "").includes("EUR") ? "EUR" : "USD";
  const defaultBcvRate = rateRefLabel === "EUR" ? bcv.eur : bcv.usd;
  const currentRate = prof.vesRate || defaultBcvRate || (rateRefLabel === "EUR" ? 450 : 390.40);
  const isForeign = prof.currency !== "VES";
  const vesTotalCalculated = (prof.vesRate && prof.vesRate > 0)
    ? (prof.total * prof.vesRate)
    : (prof.vesTotal ?? (prof.total * currentRate));
  const parsedNotes = cleanConceptAndNotes(prof.notes);
  const generalProjectConcept = parsedNotes.title;
  const extraNotes = parsedNotes.notes;

  const profNum = Number(prof.number);
  const isEligibleForConditions = !isNaN(profNum) ? profNum >= 14 : true;
  const showConditions = isEligibleForConditions && prof.hasConditions !== false && (config.pdfProformaShowConditions ?? true);
  const conditions = {
    payment: prof.conditions?.payment || config.pdfProformaConditionsPayment || "Se requiere un anticipo del 50% del precio total al inicio del proyecto. El 50% restante se pagará al finalizar el proyecto y a satisfacción del cliente.",
    delivery: prof.conditions?.delivery || config.pdfProformaConditionsDelivery || "El proyecto se entregará en un plazo de 2 semanas aproximadamente, a partir de la recepción del anticipo y la información completa por parte del cliente.",
    ip: prof.conditions?.ip || config.pdfProformaConditionsIP || "La propiedad intelectual de todos los elementos del proyecto, incluyendo el código fuente, el diseño gráfico, los contenidos y la marca, corresponderá al cliente.",
    confidentiality: prof.conditions?.confidentiality || config.pdfProformaConditionsConfidentiality || "Todas las partes se comprometen a mantener la confidencialidad de toda la información relacionada con el proyecto.",
  };
  const hasAnyCondition = Boolean(
    conditions.payment || conditions.delivery || conditions.ip || conditions.confidentiality
  );

  const paperSize = config.pdfProformaPaperSize || "letter";
  const showRif = config.pdfProformaShowRif ?? false;

  return (
    <div className="min-h-[100dvh] bg-neutral-100 py-6 px-2 sm:px-4 text-[#14151A]">
      <style>{`
        @media print {
          @page {
            size: ${paperSize === "a4" ? "A4" : paperSize === "legal" ? "legal" : "letter"};
            margin: 0;
          }
          body {
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .proforma-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            min-height: 100vh !important;
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .page-break {
            page-break-before: always !important;
            break-before: page !important;
          }
        }
      `}</style>

      {/* Controles de Navegación */}
      <div className="no-print mx-auto mb-4 flex max-w-[760px] items-center justify-between px-2">
        <Link
          href={`/proformas/${prof.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-black transition-colors"
        >
          ‹ Volver al Sistema
        </Link>
        <div className="flex items-center gap-3">
          <PrintButton />
        </div>
      </div>

      {/* HOJA 1: COTIZACIÓN, CONCEPTOS Y TOTALES */}
      <div className="proforma-sheet mx-auto w-full max-w-[760px] bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden flex flex-col justify-between relative text-neutral-900 min-h-[1050px] mb-8">
        
        {/* CONTENIDO PRINCIPAL HOJA 1 */}
        <div className="p-8 sm:p-10 space-y-6 flex-1 flex flex-col justify-between">
          
          <div className="space-y-6">
            {/* 1. ENCABEZADO: BLOQUE AZUL + TITULO PROFORMA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              {/* Bloque Azul con Logo y Contacto */}
              <div className="bg-[#0050D8] rounded-xl p-4 sm:p-5 text-white flex items-center gap-4 sm:gap-6 shadow-sm min-w-[310px]">
                <div className="flex items-center gap-2.5">
                  {/* Logo Massivo "M" */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo-m-mark.svg"
                    alt="Massivo Creativo"
                    className="h-10 w-auto brightness-0 invert"
                  />
                  <div className="leading-none">
                    <span className="block font-sans text-xs font-black tracking-wider uppercase">MASSIVO</span>
                    <span className="block font-sans text-[11px] font-bold tracking-widest uppercase text-blue-200">CREATIVO</span>
                  </div>
                </div>

                {/* Píldoras de contacto */}
                <div className="space-y-1 text-[11px] border-l border-white/20 pl-4">
                  <div className="flex items-center gap-1.5 opacity-95">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <span className="truncate">{email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-95">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v.183a1.983 1.983 0 01-.586 1.403 2.012 2.012 0 00-.586 1.414V16a5.986 5.986 0 01-2.993-.807A1.5 1.5 0 017.5 14a2 2 0 00-2-2 2 2 0 01-.892-.211 5.992 5.992 0 01-.276-3.762z" clipRule="evenodd" />
                    </svg>
                    <span className="truncate">{website}</span>
                  </div>
                </div>
              </div>

              {/* Título Proforma con Acordeón Cyan */}
              <div className="relative text-right pr-4">
                <span className="absolute -top-3 -right-2 text-[#00A3FF] text-xl font-bold font-mono">⌝</span>
                <h1 className="font-sans text-4xl sm:text-5xl font-black text-neutral-900 tracking-tight">
                  Proforma
                </h1>
              </div>
            </div>

            {/* 2. REJILLA DE DATOS: EMPRESA VS COORDENADAS BANCARIAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 text-xs">
              {/* Columna Izquierda: Datos Emisor */}
              <div className="space-y-1.5 text-neutral-800">
                <p><strong className="font-bold text-neutral-900">Empresa:</strong> {companyName}</p>
                {companyRif && <p><strong className="font-bold text-neutral-900">RIF:</strong> <span className="font-mono">{companyRif}</span></p>}
                <p><strong className="font-bold text-neutral-900">Teléfono:</strong> {phone}</p>
                <p><strong className="font-bold text-neutral-900">Correo:</strong> {email}</p>
              </div>

              {/* Columna Derecha: Coordenadas Bancarias */}
              <div className="space-y-1.5 text-neutral-800 sm:text-left">
                <p><strong className="font-bold text-neutral-900">Titular Cuenta:</strong> {targetHolder}</p>
                {targetId && (
                  <p><strong className="font-bold text-neutral-900">Cédula / RIF:</strong> <span className="font-mono font-bold">{targetId}</span></p>
                )}
                <p><strong className="font-bold text-neutral-900">Número Cuenta:</strong> <span className="font-mono">{targetNumber}</span></p>
                <p><strong className="font-bold text-neutral-900">Banco:</strong> {targetBank}</p>
              </div>
            </div>

            {/* 3. BARRA DE PROFORMA # Y FECHA */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-900">
                <p>Proforma # <span className="font-mono text-neutral-700 font-normal">#{prof.number}</span></p>
                <p>Fecha: <span className="font-mono text-neutral-700 font-normal">{formatDate(prof.date)}</span></p>
              </div>
              {/* Franja gris separadora */}
              <div className="h-6 w-full bg-[#E5E7EB] rounded-sm" />
            </div>

            {/* 4. FILA DE CLIENTE Y RIF */}
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-1 pb-2 border-b border-neutral-200">
              <div>
                <p className="font-bold text-neutral-900 text-[11px] uppercase tracking-wider">Empresa Cliente:</p>
                <p className="text-neutral-900 font-bold text-sm mt-0.5">{prof.clientName && prof.clientName !== "—" ? prof.clientName : "Cliente General"}</p>
              </div>
              {Boolean(prof.clientRif && prof.clientRif.trim() !== "" && prof.clientRif !== "—" && prof.clientRif !== "J-00000000-0" && prof.clientRif !== "J-0000000-0") && (
                <div className="text-left sm:text-right">
                  <p className="font-bold text-neutral-900 text-[11px] uppercase tracking-wider">RIF del Cliente:</p>
                  <p className="text-neutral-900 font-mono font-bold text-sm mt-0.5">{prof.clientRif}</p>
                </div>
              )}
            </div>

            {/* 5. SECCIÓN DE CONCEPTOS / COTIZACIÓN */}
            <div className="space-y-3 pt-2">
              {/* Banner / Título de Concepto General del Proyecto */}
              {generalProjectConcept && (
                <div className="rounded-xl bg-neutral-50 border border-neutral-200/90 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black tracking-wider uppercase text-neutral-500 block">
                      Concepto General del Proyecto:
                    </span>
                    <span className="text-sm font-black text-neutral-900 leading-tight">
                      {generalProjectConcept}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-neutral-700 bg-neutral-200/70 px-2.5 py-1 rounded-md self-start sm:self-auto shrink-0 font-mono">
                    {prof.items.length} {prof.items.length === 1 ? "Módulo" : "Módulos"}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-neutral-900">
                  {generalProjectConcept ? "Desglose de Módulos & Presupuesto:" : "Conceptos y Presupuesto:"}
                </h2>
              </div>

              <div className="w-full">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b-2 border-neutral-300 text-left font-bold text-neutral-800">
                      <th className="py-2 pr-4">Descripción del Módulo / Servicio</th>
                      <th className="py-2 px-2 text-center w-16">Cant.</th>
                      <th className="py-2 px-2 text-right w-24">Precio Unit.</th>
                      <th className="py-2 pl-2 text-right w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {prof.items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-neutral-400">
                          Conceptos y servicios de la proforma
                        </td>
                      </tr>
                    ) : (
                      prof.items.map((item) => {
                        const cleanDescription = cleanItemDescription(item.description);

                        return (
                          <tr key={item.id} className="text-neutral-800">
                            <td className="py-3 pr-4 leading-relaxed">{cleanDescription || item.description}</td>
                            <td className="py-3 px-2 text-center font-mono">{item.qty}</td>
                            <td className="py-3 px-2 text-right font-mono">{formatCurrency(item.unitPrice, prof.currency)}</td>
                            <td className="py-3 pl-2 text-right font-mono font-semibold">{formatCurrency(item.qty * item.unitPrice, prof.currency)}</td>
                          </tr>
                        );
                      })
                    )}
                    {/* Líneas complementarias de relleno si hay pocos items */}
                    {prof.items.length < 4 && (
                      <>
                        <tr className="border-b border-neutral-100 h-8"><td colSpan={4}></td></tr>
                        <tr className="border-b border-neutral-100 h-8"><td colSpan={4}></td></tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Observaciones / Notas extra */}
              {extraNotes && (
                <div className="pt-2 text-xs space-y-1">
                  <p className="font-bold text-neutral-900 text-[11px] uppercase tracking-wider">Notas / Observaciones:</p>
                  <div className="whitespace-pre-line text-neutral-700 bg-neutral-50/80 p-3 rounded-xl border border-neutral-200/80 text-[11px] leading-relaxed">
                    {extraNotes}
                  </div>
                </div>
              )}
            </div>

            {/* 6. RESUMEN DE TOTALES */}
            <div className="pt-4 flex justify-end">
              <div className="w-full sm:w-64 space-y-1.5 text-right text-xs">
                <div className="flex justify-between items-center py-1 border-b border-neutral-200">
                  <span className="font-bold text-neutral-800 uppercase tracking-wider">PAGADO</span>
                  <span className="font-mono font-bold text-neutral-900">
                    {formatCurrency(prof.paidAmount || 0, prof.currency)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-1.5 border-b-2 border-neutral-900">
                  <span className="font-black text-neutral-900 text-sm uppercase tracking-wider">TOTAL</span>
                  <span className="font-mono font-black text-neutral-900 text-base">
                    {formatCurrency(prof.total, prof.currency)}
                  </span>
                </div>

                {isForeign && (
                  <div className="flex justify-between items-center py-1.5 border-b border-neutral-300">
                    <div className="flex flex-col text-left">
                      <span className="font-black text-neutral-900 text-xs uppercase tracking-wider">TOTAL BS</span>
                      {currentRate > 0 && (
                        <span className="text-[10px] text-neutral-500 font-mono">
                          Tasa {prof.vesRateRef || "BCV"}: {currentRate.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} Bs.
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-black text-neutral-900 text-sm">
                      {vesTotalCalculated.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pie de Página Hoja 1 */}
          <div className="pt-6 border-t border-neutral-200 flex items-center justify-between text-[10px] text-neutral-400">
            <span>{config.pdfProformaFooterText || "Massivo Corp · Proforma Oficial · Documento Preliminar"}</span>
            <span className="font-mono font-bold">
              {showConditions && hasAnyCondition ? "Página 1 de 2 · Continúa en Hoja 2 ➔" : "Página 1 de 1"}
            </span>
          </div>

        </div>

      </div>

      {/* HOJA 2: CONDICIONES COMERCIALES Y DEL PROYECTO (SALTO DE PÁGINA) */}
      {showConditions && hasAnyCondition && (
        <div className="page-break proforma-sheet mx-auto w-full max-w-[760px] bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden flex flex-col justify-between relative text-neutral-900 min-h-[1050px]">
          
          <div className="p-8 sm:p-10 space-y-6 flex-1 flex flex-col justify-between">
            
            {/* Header de Segunda Hoja */}
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
                <div className="bg-[#0050D8] rounded-xl px-4 py-2.5 text-white flex items-center gap-3 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo-m-mark.svg"
                    alt="Massivo Creativo"
                    className="h-7 w-auto brightness-0 invert"
                  />
                  <div className="leading-none">
                    <span className="block font-sans text-[11px] font-black tracking-wider uppercase">MASSIVO</span>
                    <span className="block font-sans text-[9px] font-bold tracking-widest uppercase text-blue-200">CREATIVO</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">DOCUMENTO ANEXO</span>
                  <h2 className="font-sans text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                    Condiciones del Proyecto
                  </h2>
                  <p className="text-xs font-mono text-neutral-500 mt-0.5">
                    Proforma #{prof.number} · {prof.clientName || "Cliente"}
                  </p>
                </div>
              </div>

              {/* Banner de términos */}
              <div className="rounded-xl bg-blue-50/80 border border-blue-200/80 p-4">
                <p className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                  Términos, Cláusulas y Acuerdos Comerciales
                </p>
                <p className="text-[11px] text-blue-800/90 mt-1 leading-relaxed">
                  Las siguientes condiciones rigen la ejecución, entrega, propiedad y términos de pago para los servicios descritos en la Proforma #{prof.number}.
                </p>
              </div>

              {/* Rejilla de 4 Condiciones estructuradas en tarjetas amplias y elegantes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                
                {/* 1. Forma de Pago */}
                {conditions.payment && (
                  <div className="rounded-xl bg-neutral-50 border border-neutral-200/90 p-4 space-y-1.5 flex flex-col justify-start">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0050D8] text-[10px] font-black text-white font-mono shrink-0">1</span>
                      <p className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Forma de Pago:</p>
                    </div>
                    <p className="text-xs text-neutral-700 leading-relaxed pt-1 whitespace-pre-line">
                      {conditions.payment}
                    </p>
                  </div>
                )}

                {/* 2. Tiempo de Entrega */}
                {conditions.delivery && (
                  <div className="rounded-xl bg-neutral-50 border border-neutral-200/90 p-4 space-y-1.5 flex flex-col justify-start">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0050D8] text-[10px] font-black text-white font-mono shrink-0">2</span>
                      <p className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Tiempo de Entrega:</p>
                    </div>
                    <p className="text-xs text-neutral-700 leading-relaxed pt-1 whitespace-pre-line">
                      {conditions.delivery}
                    </p>
                  </div>
                )}

                {/* 3. Propiedad Intelectual */}
                {conditions.ip && (
                  <div className="rounded-xl bg-neutral-50 border border-neutral-200/90 p-4 space-y-1.5 flex flex-col justify-start">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0050D8] text-[10px] font-black text-white font-mono shrink-0">3</span>
                      <p className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Propiedad Intelectual:</p>
                    </div>
                    <p className="text-xs text-neutral-700 leading-relaxed pt-1 whitespace-pre-line">
                      {conditions.ip}
                    </p>
                  </div>
                )}

                {/* 4. Confidencialidad */}
                {conditions.confidentiality && (
                  <div className="rounded-xl bg-neutral-50 border border-neutral-200/90 p-4 space-y-1.5 flex flex-col justify-start">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0050D8] text-[10px] font-black text-white font-mono shrink-0">4</span>
                      <p className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Confidencialidad:</p>
                    </div>
                    <p className="text-xs text-neutral-700 leading-relaxed pt-1 whitespace-pre-line">
                      {conditions.confidentiality}
                    </p>
                  </div>
                )}

              </div>

              {/* Cláusula de Validez y Tasa */}
              {config.pdfProformaTermsAndConditions && (
                <div className="rounded-xl bg-neutral-50/70 border border-neutral-200/70 p-3.5 text-[11px] text-neutral-600 leading-relaxed">
                  <span className="font-bold text-neutral-800 block mb-0.5">Validez del Presupuesto & Tasa:</span>
                  {config.pdfProformaTermsAndConditions}
                </div>
              )}
            </div>

            {/* Pie de página Hoja 2 */}
            <div className="pt-6 border-t border-neutral-200 flex items-center justify-between text-[10px] text-neutral-400">
              <span>{config.pdfProformaFooterText || "Massivo Corp · Proforma Oficial · Documento Preliminar"}</span>
              <span className="font-mono font-bold">Página 2 de 2</span>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
