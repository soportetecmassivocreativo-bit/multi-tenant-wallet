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
    "Massivo Corp";

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
    (config.pdfProformaContactPhone && !config.pdfProformaContactPhone.includes("0000000"))
      ? config.pdfProformaContactPhone
      : (config.pdfContactPhone && !config.pdfContactPhone.includes("0000000"))
        ? config.pdfContactPhone
        : company?.phone && !company.phone.includes("0000000")
          ? company.phone
          : "+58 412-0979022";

  const email =
    (config.pdfProformaContactEmail && !config.pdfProformaContactEmail.includes("contacto@massivocorp.com") && !config.pdfProformaContactEmail.includes("info@massivocreativo.com"))
      ? config.pdfProformaContactEmail
      : (config.pdfContactEmail && !config.pdfContactEmail.includes("contacto@massivocorp.com") && !config.pdfContactEmail.includes("info@massivocreativo.com"))
        ? config.pdfContactEmail
        : company?.email && !company.email.includes("contacto@massivocorp.com")
          ? company.email
          : "massivoagencia@gmail.com";

  const website = "www.massivocreativo.com";

  const targetAccountId = prof.targetAccountId || config.pdfProformaTargetAccountId;
  let targetAccount = targetAccountId ? accounts.find((a) => a.id === targetAccountId) : null;

  if (!targetAccount && prof.targetAccountName) {
    targetAccount = accounts.find((a) => a.name.toLowerCase().includes(prof.targetAccountName!.toLowerCase())) || null;
  }

  // Priorizar siempre cuenta bancaria con número de cuenta para las Coordenadas Bancarias
  if (!targetAccount || !targetAccount.accountNumber || targetAccount.accountType === "efectivo" || targetAccount.accountType === "zelle") {
    const bankAccount =
      accounts.find((a) => a.accountNumber && a.accountNumber.startsWith("0134")) ||
      accounts.find((a) => (a.accountType === "banco_nacional" || a.accountType === "banco_internacional") && a.accountNumber) ||
      accounts.find((a) => a.id === "cta-1") ||
      accounts[0];
    if (bankAccount) {
      targetAccount = bankAccount;
    }
  }

  const rawHolder = targetAccount?.holderName?.trim();
  const targetHolder =
    (rawHolder &&
     !rawHolder.includes("0000") &&
     rawHolder.toLowerCase() !== "massivo creativo" &&
     rawHolder.toLowerCase() !== "massivo creativo c.a." &&
     rawHolder.toLowerCase() !== "massivo corp" &&
     rawHolder.toLowerCase() !== "custodio de caja principal")
      ? rawHolder
      : "MIRIANNYS GUTIERREZ";

  const rawBank = targetAccount?.bankName?.trim();
  const targetBank =
    (rawBank && !rawBank.includes("0000") && rawBank.toLowerCase() !== "efectivo")
      ? rawBank
      : "Banesco Banco Universal (0134)";

  const rawNumber = targetAccount?.accountNumber?.trim();
  const targetNumber =
    (rawNumber &&
     !rawNumber.includes("0000-00-0000000000") &&
     !rawNumber.includes("Sample") &&
     rawNumber.length > 5)
      ? rawNumber
      : (targetAccount?.phone && !targetAccount.phone.includes("0000000"))
        ? targetAccount.phone
        : "0134-0205-10-2053028252";

  const rawId = targetAccount?.holderId?.trim();
  const targetId =
    (rawId && !rawId.includes("0000000") && rawId !== "J-50000000-0" && rawId !== "J-00000000-0")
      ? rawId
      : (targetAccount as any)?.idNumber || (targetAccount as any)?.taxId || "V-17102452";

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
  const isEligibleForConditions = !isNaN(profNum) ? profNum >= 14 : false;
  const showConditions = isEligibleForConditions && (prof.hasConditions === true || (profNum === 14 && prof.hasConditions !== false));
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
    <div className="proforma-print-wrapper min-h-[100dvh] bg-neutral-100 py-6 px-2 sm:px-4 text-[#14151A]">
      <style>{`
        @media print {
          @page {
            size: ${paperSize === "a4" ? "A4" : paperSize === "legal" ? "legal" : "letter"};
            margin: 8mm 12mm 8mm 12mm !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html, body {
            background-color: #ffffff !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .proforma-print-wrapper {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: 0 !important;
            width: 100% !important;
          }
          .no-print {
            display: none !important;
          }
          .proforma-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 0 !important;
            box-sizing: border-box !important;
            height: ${paperSize === "a4" ? "280mm" : paperSize === "legal" ? "338mm" : "262mm"} !important;
            min-height: ${paperSize === "a4" ? "280mm" : paperSize === "legal" ? "338mm" : "262mm"} !important;
            max-height: ${paperSize === "a4" ? "280mm" : paperSize === "legal" ? "338mm" : "262mm"} !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .proforma-sheet:last-of-type {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .page-break {
            page-break-before: always !important;
            break-before: page !important;
          }
          .proforma-footer {
            margin-top: auto !important;
            width: 100% !important;
            flex-shrink: 0 !important;
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
      <div className="proforma-sheet mx-auto w-full max-w-[760px] bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden flex flex-col justify-between relative text-neutral-900 p-4 sm:p-7 min-h-[900px] mb-8">
        
        {/* 1. CUERPO HOJA 1 */}
        <div className="space-y-3.5 flex-1 flex flex-col justify-start">
          
          {/* 1. ENCABEZADO: BLOQUE AZUL + TITULO PROFORMA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Bloque Azul con Logo y Contacto */}
            <div className="bg-[#0050D8] rounded-xl p-3 sm:p-3.5 text-white flex items-center gap-3.5 sm:gap-5 shadow-sm min-w-[300px]">
              <div className="flex items-center gap-2">
                {/* Logo Massivo "M" */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-m-mark.svg"
                  alt="Massivo Creativo"
                  className="h-8 w-auto brightness-0 invert"
                />
                <div className="leading-none">
                  <span className="block font-sans text-xs font-black tracking-wider uppercase">MASSIVO</span>
                  <span className="block font-sans text-[10px] font-bold tracking-widest uppercase text-blue-200">CREATIVO</span>
                </div>
              </div>

              {/* Píldoras de contacto */}
              <div className="space-y-0.5 text-[10.5px] border-l border-white/20 pl-3.5">
                <div className="flex items-center gap-1.5 opacity-95">
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <span className="truncate">{email}</span>
                </div>
                <div className="flex items-center gap-1.5 opacity-95">
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v.183a1.983 1.983 0 01-.586 1.403 2.012 2.012 0 00-.586 1.414V16a5.986 5.986 0 01-2.993-.807A1.5 1.5 0 017.5 14a2 2 0 00-2-2 2 2 0 01-.892-.211 5.992 5.992 0 01-.276-3.762z" clipRule="evenodd" />
                  </svg>
                  <span className="truncate">{website}</span>
                </div>
              </div>
            </div>

            {/* Título Proforma con Acordeón Cyan */}
            <div className="relative text-right pr-3">
              <span className="absolute -top-2.5 -right-1.5 text-[#00A3FF] text-lg font-bold font-mono">⌝</span>
              <h1 className="font-sans text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
                Proforma
              </h1>
            </div>
          </div>

          {/* 2. REJILLA DE DATOS: EMPRESA VS COORDENADAS BANCARIAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-[11px] leading-snug">
            {/* Columna Izquierda: Datos Emisor */}
            <div className="space-y-1 text-neutral-800">
              <p><strong className="font-bold text-neutral-900">Empresa:</strong> {companyName}</p>
              {companyRif && <p><strong className="font-bold text-neutral-900">RIF:</strong> <span className="font-mono">{companyRif}</span></p>}
              <p><strong className="font-bold text-neutral-900">Teléfono:</strong> {phone}</p>
              <p><strong className="font-bold text-neutral-900">Correo:</strong> {email}</p>
            </div>

            {/* Columna Derecha: Coordenadas Bancarias */}
            <div className="space-y-1 text-neutral-800 sm:text-left">
              <p><strong className="font-bold text-neutral-900">Titular Cuenta:</strong> {targetHolder}</p>
              {targetId && (
                <p><strong className="font-bold text-neutral-900">Cédula / RIF:</strong> <span className="font-mono font-bold">{targetId}</span></p>
              )}
              <p><strong className="font-bold text-neutral-900">Número Cuenta:</strong> <span className="font-mono">{targetNumber}</span></p>
              <p><strong className="font-bold text-neutral-900">Banco:</strong> {targetBank}</p>
            </div>
          </div>

          {/* 3. BARRA DE PROFORMA # Y FECHA */}
          <div className="pt-1 space-y-1.5">
            <div className="flex items-center justify-between text-[11.5px] font-bold text-neutral-900">
              <p>Proforma # <span className="font-mono text-neutral-700 font-normal">#{prof.number}</span></p>
              <p>Fecha: <span className="font-mono text-neutral-700 font-normal">{formatDate(prof.date)}</span></p>
            </div>
            {/* Franja delgada separadora */}
            <div className="h-2 w-full bg-[#E5E7EB] rounded-full" />
          </div>

          {/* 4. FILA DE CLIENTE Y RIF */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-0.5 pb-1.5 border-b border-neutral-200">
            <div>
              <p className="font-bold text-neutral-900 text-[10.5px] uppercase tracking-wider">Empresa Cliente:</p>
              <p className="text-neutral-900 font-bold text-[13px] mt-0.5">{prof.clientName && prof.clientName !== "—" ? prof.clientName : "Cliente General"}</p>
            </div>
            {Boolean(prof.clientRif && prof.clientRif.trim() !== "" && prof.clientRif !== "—" && prof.clientRif !== "J-00000000-0" && prof.clientRif !== "J-0000000-0") && (
              <div className="text-left sm:text-right">
                <p className="font-bold text-neutral-900 text-[10.5px] uppercase tracking-wider">RIF del Cliente:</p>
                <p className="text-neutral-900 font-mono font-bold text-[13px] mt-0.5">{prof.clientRif}</p>
              </div>
            )}
          </div>

          {/* 5. SECCIÓN DE CONCEPTOS / COTIZACIÓN */}
          <div className="space-y-2.5 pt-1">
            {/* Banner / Título de Concepto General del Proyecto */}
            {generalProjectConcept && (
              <div className="rounded-xl bg-neutral-50 border border-neutral-200/90 p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[9.5px] font-black tracking-wider uppercase text-neutral-500 block">
                    Concepto General del Proyecto:
                  </span>
                  <span className="text-xs font-black text-neutral-900 leading-tight">
                    {generalProjectConcept}
                  </span>
                </div>
                <div className="text-[10.5px] font-bold text-neutral-700 bg-neutral-200/70 px-2 py-0.5 rounded-md self-start sm:self-auto shrink-0 font-mono">
                  {prof.items.length} {prof.items.length === 1 ? "Módulo" : "Módulos"}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-[11.5px] font-bold text-neutral-900">
                {generalProjectConcept ? "Desglose de Módulos & Presupuesto:" : "Conceptos y Presupuesto:"}
              </h2>
            </div>

            <div className="w-full">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b-2 border-neutral-300 text-left font-bold text-neutral-800">
                    <th className="py-1.5 pr-3">Descripción del Módulo / Servicio</th>
                    <th className="py-1.5 px-2 text-center w-14">Cant.</th>
                    <th className="py-1.5 px-2 text-right w-24">Precio Unit.</th>
                    <th className="py-1.5 pl-2 text-right w-24">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {prof.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-neutral-400">
                        Conceptos y servicios de la proforma
                      </td>
                    </tr>
                  ) : (
                    prof.items.map((item) => {
                      const cleanDescription = cleanItemDescription(item.description);

                      return (
                        <tr key={item.id} className="text-neutral-800">
                          <td className="py-1.5 pr-3 leading-snug">{cleanDescription || item.description}</td>
                          <td className="py-1.5 px-2 text-center font-mono">{item.qty}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{formatCurrency(item.unitPrice, prof.currency)}</td>
                          <td className="py-1.5 pl-2 text-right font-mono font-semibold">{formatCurrency(item.qty * item.unitPrice, prof.currency)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Observaciones / Notas extra */}
            {extraNotes && (
              <div className="pt-1 text-xs space-y-1">
                <p className="font-bold text-neutral-900 text-[10.5px] uppercase tracking-wider">Notas / Observaciones:</p>
                <div className="whitespace-pre-line text-neutral-700 bg-neutral-50/80 p-2 rounded-xl border border-neutral-200/80 text-[10.5px] leading-relaxed">
                  {extraNotes}
                </div>
              </div>
            )}
          </div>

          {/* 6. RESUMEN DE TOTALES */}
          <div className="pt-2 flex justify-end">
            <div className="w-full sm:w-80 space-y-1 text-right text-[11px]">
              <div className="flex justify-between items-center py-0.5 border-b border-neutral-200">
                <span className="font-bold text-neutral-800 uppercase tracking-wider">PAGADO</span>
                <span className="font-mono font-bold text-neutral-900 whitespace-nowrap">
                  {formatCurrency(prof.paidAmount || 0, prof.currency)}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-1 border-b-2 border-neutral-900">
                <span className="font-black text-neutral-900 text-xs uppercase tracking-wider">TOTAL</span>
                <span className="font-mono font-black text-neutral-900 text-sm whitespace-nowrap">
                  {formatCurrency(prof.total, prof.currency)}
                </span>
              </div>

              {isForeign && (
                <div className="flex justify-between items-center py-1 border-b border-neutral-300 gap-2">
                  <div className="flex flex-col text-left shrink-0">
                    <span className="font-black text-neutral-900 text-[11px] uppercase tracking-wider">TOTAL BS</span>
                    {currentRate > 0 && (
                      <span className="text-[9.5px] text-neutral-500 font-mono whitespace-nowrap">
                        Tasa {prof.vesRateRef || "BCV"}: {currentRate.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} Bs.
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-black text-neutral-900 text-xs whitespace-nowrap shrink-0 text-right">
                    {vesTotalCalculated.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}&nbsp;Bs.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. PIE DE PÁGINA HOJA 1 (AL BORDE INFERIOR EXACTO) */}
        <div className="proforma-footer pt-3 mt-auto border-t border-neutral-200 flex items-center justify-between text-[9.5px] text-neutral-400 shrink-0">
          <span>{config.pdfProformaFooterText || "Massivo Corp · Proforma Oficial · Documento Preliminar"}</span>
          <span className="font-mono font-bold">
            {showConditions && hasAnyCondition ? "Página 1 de 2 · Continúa en Hoja 2 ➔" : "Página 1 de 1"}
          </span>
        </div>

      </div>

      {/* HOJA 2: CONDICIONES COMERCIALES Y DEL PROYECTO (SALTO DE PÁGINA) */}
      {showConditions && hasAnyCondition && (
        <div className="page-break proforma-sheet mx-auto w-full max-w-[760px] bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden flex flex-col justify-between relative text-neutral-900 p-4 sm:p-7 min-h-[900px]">
          
          {/* 1. CUERPO HOJA 2 */}
          <div className="space-y-3.5 flex-1 flex flex-col justify-start">
            
            {/* Header de Segunda Hoja */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-3">
                <div className="bg-[#0050D8] rounded-xl px-3.5 py-2 text-white flex items-center gap-2.5 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo-m-mark.svg"
                    alt="Massivo Creativo"
                    className="h-6 w-auto brightness-0 invert"
                  />
                  <div className="leading-none">
                    <span className="block font-sans text-[10px] font-black tracking-wider uppercase">MASSIVO</span>
                    <span className="block font-sans text-[8.5px] font-bold tracking-widest uppercase text-blue-200">CREATIVO</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-neutral-400 block">DOCUMENTO ANEXO</span>
                  <h2 className="font-sans text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                    Condiciones del Proyecto
                  </h2>
                  <p className="text-[11px] font-mono text-neutral-500 mt-0.5">
                    Proforma #{prof.number} · {prof.clientName || "Cliente"}
                  </p>
                </div>
              </div>

              {/* Banner de términos */}
              <div className="rounded-xl bg-blue-50/80 border border-blue-200/80 p-3">
                <p className="text-[11px] font-bold text-blue-950 uppercase tracking-wider">
                  Términos, Cláusulas y Acuerdos Comerciales
                </p>
                <p className="text-[10.5px] text-blue-800/90 mt-0.5 leading-snug">
                  Las siguientes condiciones rigen la ejecución, entrega, propiedad y términos de pago para los servicios descritos en la Proforma #{prof.number}.
                </p>
              </div>

              {/* Rejilla de 4 Condiciones estructuradas en tarjetas compactas y elegantes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                
                {/* 1. Forma de Pago */}
                {conditions.payment && (
                  <div className="rounded-xl bg-neutral-50 border border-neutral-200/90 p-3 space-y-1 flex flex-col justify-start">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#0050D8] text-[9px] font-black text-white font-mono shrink-0">1</span>
                      <p className="text-[11px] font-bold text-neutral-900 uppercase tracking-wider">Forma de Pago:</p>
                    </div>
                    <p className="text-[10.5px] text-neutral-700 leading-relaxed pt-0.5 whitespace-pre-line">
                      {conditions.payment}
                    </p>
                  </div>
                )}

                {/* 2. Tiempo de Entrega */}
                {conditions.delivery && (
                  <div className="rounded-xl bg-neutral-50 border border-neutral-200/90 p-3 space-y-1 flex flex-col justify-start">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#0050D8] text-[9px] font-black text-white font-mono shrink-0">2</span>
                      <p className="text-[11px] font-bold text-neutral-900 uppercase tracking-wider">Tiempo de Entrega:</p>
                    </div>
                    <p className="text-[10.5px] text-neutral-700 leading-relaxed pt-0.5 whitespace-pre-line">
                      {conditions.delivery}
                    </p>
                  </div>
                )}

                {/* 3. Propiedad Intelectual */}
                {conditions.ip && (
                  <div className="rounded-xl bg-neutral-50 border border-neutral-200/90 p-3 space-y-1 flex flex-col justify-start">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#0050D8] text-[9px] font-black text-white font-mono shrink-0">3</span>
                      <p className="text-[11px] font-bold text-neutral-900 uppercase tracking-wider">Propiedad Intelectual:</p>
                    </div>
                    <p className="text-[10.5px] text-neutral-700 leading-relaxed pt-0.5 whitespace-pre-line">
                      {conditions.ip}
                    </p>
                  </div>
                )}

                {/* 4. Confidencialidad */}
                {conditions.confidentiality && (
                  <div className="rounded-xl bg-neutral-50 border border-neutral-200/90 p-3 space-y-1 flex flex-col justify-start">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#0050D8] text-[9px] font-black text-white font-mono shrink-0">4</span>
                      <p className="text-[11px] font-bold text-neutral-900 uppercase tracking-wider">Confidencialidad:</p>
                    </div>
                    <p className="text-[10.5px] text-neutral-700 leading-relaxed pt-0.5 whitespace-pre-line">
                      {conditions.confidentiality}
                    </p>
                  </div>
                )}

              </div>

              {/* Cláusula de Validez y Tasa */}
              {config.pdfProformaTermsAndConditions && (
                <div className="rounded-xl bg-neutral-50/70 border border-neutral-200/70 p-2.5 text-[10px] text-neutral-600 leading-relaxed">
                  <span className="font-bold text-neutral-800 block mb-0.5">Validez del Presupuesto & Tasa:</span>
                  {config.pdfProformaTermsAndConditions}
                </div>
              )}
            </div>
          </div>

          {/* 2. PIE DE PÁGINA HOJA 2 (AL BORDE INFERIOR EXACTO) */}
          <div className="proforma-footer pt-3 mt-auto border-t border-neutral-200 flex items-center justify-between text-[9.5px] text-neutral-400 shrink-0">
            <span>{config.pdfProformaFooterText || "Massivo Corp · Proforma Oficial · Documento Preliminar"}</span>
            <span className="font-mono font-bold">Página 2 de 2</span>
          </div>

        </div>
      )}
    </div>
  );
}
