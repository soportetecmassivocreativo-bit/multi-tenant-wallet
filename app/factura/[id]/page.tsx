export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/factura/print-button";
import { formatCurrency } from "@/lib/currency";
import { formatDate, cleanConceptAndNotes, cleanItemDescription } from "@/lib/format";
import { getInvoiceDetail, getCompany, getBcvRates } from "@/lib/data";
import { getSystemConfig } from "@/lib/config-actions";
import { getCompanyAccounts } from "@/lib/cuentas-actions";

export default async function FacturaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [inv, company, config, accounts, bcv] = await Promise.all([
    getInvoiceDetail(id),
    getCompany(),
    getSystemConfig(),
    getCompanyAccounts(),
    getBcvRates(),
  ]);
  if (!inv) notFound();

  const companyName = config.pdfInvoiceCompanyName || config.pdfCompanyName || company?.name || "Massivo Corp";
  const rawCompanyRif = config.pdfInvoiceCompanyRif || config.pdfCompanyRif || company?.rif || "";
  const companyRif =
    rawCompanyRif && rawCompanyRif !== "J-50000000-0" && rawCompanyRif !== "J-00000000-0"
      ? rawCompanyRif
      : "";
  const phone =
    (config.pdfInvoiceContactPhone && !config.pdfInvoiceContactPhone.includes("0000000"))
      ? config.pdfInvoiceContactPhone
      : (config.pdfContactPhone && !config.pdfContactPhone.includes("0000000"))
        ? config.pdfContactPhone
        : company?.phone && !company.phone.includes("0000000")
          ? company.phone
          : "+58 412-0979022";

  const email =
    (config.pdfInvoiceContactEmail && !config.pdfInvoiceContactEmail.includes("contacto@massivocorp.com") && !config.pdfInvoiceContactEmail.includes("info@massivocreativo.com"))
      ? config.pdfInvoiceContactEmail
      : (config.pdfContactEmail && !config.pdfContactEmail.includes("contacto@massivocorp.com") && !config.pdfContactEmail.includes("info@massivocreativo.com"))
        ? config.pdfContactEmail
        : company?.email && !company.email.includes("contacto@massivocorp.com")
          ? company.email
          : "massivoagencia@gmail.com";
  const website = "www.massivocreativo.com";

  const targetAccountId = inv.targetAccountId || config.pdfInvoiceTargetAccountId;
  let targetAccount = targetAccountId ? accounts.find((a) => a.id === targetAccountId) : null;

  if (!targetAccount && inv.targetAccountName) {
    targetAccount = accounts.find((a) => a.name.toLowerCase().includes(inv.targetAccountName!.toLowerCase())) || null;
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

  const rateRefLabel = (inv.vesRateRef || "").includes("EUR") ? "EUR" : "USD";
  const defaultBcvRate = rateRefLabel === "EUR" ? bcv.eur : bcv.usd;
  const currentRate = inv.vesRate || defaultBcvRate || (rateRefLabel === "EUR" ? 450 : 390.40);
  const rateFormatted = currentRate.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  const isForeign = inv.currency !== "VES";
  const vesTotalCalculated = (inv.vesRate && inv.vesRate > 0)
    ? (inv.total * inv.vesRate)
    : (inv.vesTotal ?? (inv.total * currentRate));
  const parsedNotes = cleanConceptAndNotes(inv.notes);
  const generalProjectConcept = parsedNotes.title;
  const extraNotes = parsedNotes.notes;

  const paperSize = config.pdfInvoicePaperSize || "letter";
  const showRif = config.pdfInvoiceShowRif ?? false;

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
          .invoice-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            min-height: 100vh !important;
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      {/* Controles de Navegación */}
      <div className="no-print mx-auto mb-4 flex max-w-[760px] items-center justify-between px-2">
        <Link
          href={`/cobros/${inv.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-black transition-colors"
        >
          ‹ Volver al Sistema
        </Link>
        <div className="flex items-center gap-3">
          <PrintButton />
        </div>
      </div>

      {/* HOJA DE FACTURA OFICIAL */}
      <div className="invoice-sheet mx-auto w-full max-w-[760px] bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden flex flex-col justify-between relative text-neutral-900 min-h-[1050px]">
        
        {/* CONTENIDO PRINCIPAL */}
        <div className="p-8 sm:p-10 space-y-6 flex-1">
          
          {/* 1. ENCABEZADO: BLOQUE AZUL + TITULO FACTURA */}
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

            {/* Título Factura con Acordeón Cyan */}
            <div className="relative text-right pr-4">
              <span className="absolute -top-3 -right-2 text-[#00A3FF] text-xl font-bold font-mono">⌝</span>
              <h1 className="font-sans text-4xl sm:text-5xl font-black text-neutral-900 tracking-tight">
                Factura
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

          {/* 3. BARRA DE FACTURA # Y FECHA */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-neutral-900">
              <p>Factura # <span className="font-mono text-neutral-700 font-normal">#{inv.number}</span></p>
              <p>Fecha: <span className="font-mono text-neutral-700 font-normal">{formatDate(inv.date)}</span></p>
            </div>
            {/* Franja gris separadora */}
            <div className="h-6 w-full bg-[#E5E7EB] rounded-sm" />
          </div>

          {/* 4. FILA DE CLIENTE, RIF, LA SUMA DE, TASA */}
          {(() => {
            const hasClientRif = Boolean(
              inv.clientRif &&
              inv.clientRif.trim() !== "" &&
              inv.clientRif !== "—" &&
              inv.clientRif !== "J-00000000-0" &&
              inv.clientRif !== "J-0000000-0"
            );

            return (
              <div className={`grid ${hasClientRif ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"} gap-3 text-xs pt-1 pb-2 border-b border-neutral-200`}>
                <div>
                  <p className="font-bold text-neutral-900 text-[11px] uppercase tracking-wider">Empresa Cliente:</p>
                  <p className="text-neutral-900 font-bold text-sm truncate mt-0.5">{inv.clientName && inv.clientName !== "—" ? inv.clientName : "Cliente General"}</p>
                </div>
                {hasClientRif && (
                  <div>
                    <p className="font-bold text-neutral-900 text-[11px] uppercase tracking-wider">RIF del Cliente:</p>
                    <p className="text-neutral-900 font-mono font-bold text-sm mt-0.5">{inv.clientRif}</p>
                  </div>
                )}
                <div>
                  <p className="font-bold text-neutral-900 text-[11px] uppercase tracking-wider">La suma de:</p>
                  <p className="text-neutral-900 font-bold text-sm mt-0.5">{formatCurrency(inv.total, inv.currency)}</p>
                </div>
                <div>
                  <p className="font-bold text-neutral-900 text-[11px] uppercase tracking-wider">Tasa:</p>
                  <p className="text-neutral-900 font-mono font-bold text-sm mt-0.5">{rateFormatted} Bs.</p>
                </div>
              </div>
            );
          })()}

          {/* 5. SECCIÓN DE CONCEPTOS DE LA FACTURA */}
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
                  {inv.items.length} {inv.items.length === 1 ? "Módulo" : "Módulos"}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-neutral-900">
                {generalProjectConcept ? "Desglose Modular & Presupuesto:" : "Concepto de la factura:"}
              </h2>
            </div>

            <div className="w-full">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-neutral-300 text-left font-bold text-neutral-800">
                    <th className="py-2 pr-4">Descripción del Servicio / Producto</th>
                    <th className="py-2 px-2 text-center w-16">Cant.</th>
                    <th className="py-2 px-2 text-right w-24">Precio Unit.</th>
                    <th className="py-2 pl-2 text-right w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {inv.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-neutral-400">
                        Servicios y conceptos comerciales facturados
                      </td>
                    </tr>
                  ) : (
                    inv.items.map((item) => {
                      const cleanDescription = cleanItemDescription(item.description);

                      return (
                        <tr key={item.id} className="text-neutral-800">
                          <td className="py-3 pr-4 leading-relaxed">{cleanDescription || item.description}</td>
                          <td className="py-3 px-2 text-center font-mono">{item.qty}</td>
                          <td className="py-3 px-2 text-right font-mono">{formatCurrency(item.unitPrice, inv.currency)}</td>
                          <td className="py-3 pl-2 text-right font-mono font-semibold">{formatCurrency(item.qty * item.unitPrice, inv.currency)}</td>
                        </tr>
                      );
                    })
                  )}
                  {/* Líneas complementarias de relleno si hay pocos items */}
                  {inv.items.length < 3 && (
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

          {/* 6. BLOQUE INFERIOR: POLÍTICA DE REEMBOLSO + RESUMEN DE PAGO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 items-end">
            
            {/* Cuadro de Política de Reembolso con corchetes Cyan */}
            <div className="relative p-4 bg-white border border-neutral-200/80 rounded-xl space-y-1.5">
              <span className="absolute -top-2 -left-2 text-[#00A3FF] text-base font-bold font-mono">⌜</span>
              <span className="absolute -bottom-2 -right-2 text-[#00A3FF] text-base font-bold font-mono">⌟</span>
              
              <p className="text-[11px] font-bold text-neutral-900">Política de Reembolso:</p>
              <p className="text-[10px] text-neutral-600 leading-relaxed">
                Debido a la naturaleza personalizada de los servicios que se ofrecen, no se realizan reembolsos. En caso de que el cliente no esté satisfecho con los servicios prestados, se podrán realizar modificaciones o ajustes para alcanzar la satisfacción del cliente.
              </p>
            </div>

            {/* Resumen PAGADO, TOTAL y TOTAL BS */}
            <div className="space-y-1.5 sm:pl-8 text-right text-xs">
              <div className="flex justify-between items-center py-1 border-b border-neutral-200">
                <span className="font-bold text-neutral-800 uppercase tracking-wider">PAGADO</span>
                <span className="font-mono font-bold text-neutral-900 whitespace-nowrap">
                  {formatCurrency(inv.paidTotal || 0, inv.currency)}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-1.5 border-b-2 border-neutral-900">
                <span className="font-black text-neutral-900 text-sm uppercase tracking-wider">TOTAL</span>
                <span className="font-mono font-black text-neutral-900 text-base whitespace-nowrap">
                  {formatCurrency(inv.total, inv.currency)}
                </span>
              </div>

              {isForeign && (
                <div className="flex justify-between items-center py-1.5 border-b border-neutral-300 gap-2">
                  <div className="flex flex-col text-left shrink-0">
                    <span className="font-black text-neutral-900 text-xs uppercase tracking-wider">TOTAL BS</span>
                    {currentRate > 0 && (
                      <span className="text-[10px] text-neutral-500 font-mono whitespace-nowrap">
                        Tasa {inv.vesRateRef || "BCV"}: {currentRate.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} Bs.
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-black text-neutral-900 text-sm whitespace-nowrap shrink-0 text-right">
                    {vesTotalCalculated.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}&nbsp;Bs.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 7. MENSAJE FINAL DE AGRADECIMIENTO */}
          <div className="pt-6 pb-2 text-center">
            <h3 className="font-sans text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
              ¡Gracias por elegirnos!
            </h3>
          </div>

        </div>

      </div>
    </div>
  );
}
