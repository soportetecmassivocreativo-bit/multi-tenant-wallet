export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/factura/print-button";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
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

  const companyName = config.pdfInvoiceCompanyName || config.pdfCompanyName || company?.name || "Massivo Creativo C.A.";
  const companyRif = config.pdfInvoiceCompanyRif || config.pdfCompanyRif || company?.rif || "J-50000000-0";
  const phone = config.pdfInvoiceContactPhone || config.pdfContactPhone || company?.phone || "+58 412-0000000";
  const email = config.pdfInvoiceContactEmail || config.pdfContactEmail || company?.email || "info@massivocreativo.com";
  const website = "www.massivocreativo.com";

  const targetAccountId = inv.targetAccountId || config.pdfInvoiceTargetAccountId;
  const targetAccount = accounts.find((a) => a.id === targetAccountId) || (inv.targetAccountName ? { name: inv.targetAccountName } : accounts[0]);

  const targetHolder = targetAccount?.holderName || targetAccount?.name || companyName;
  const targetBank = targetAccount?.bankName || targetAccount?.name || "Banesco";
  const targetNumber = targetAccount?.accountNumber || targetAccount?.phone || "0134-0000-00-0000000000";
  const targetId = targetAccount?.idNumber || targetAccount?.taxId || companyRif;

  const currentRate = inv.vesRate || bcv.usd || 390.40;
  const rateFormatted = currentRate.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  const isForeign = inv.currency !== "VES";
  const vesTotalCalculated = inv.vesTotal ?? (inv.total * currentRate);
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
              <p><strong className="font-bold text-neutral-900">Teléfono:</strong> {phone}</p>
              <p><strong className="font-bold text-neutral-900">Correo:</strong> {email}</p>
            </div>

            {/* Columna Derecha: Coordenadas Bancarias */}
            <div className="space-y-1.5 text-neutral-800 sm:text-left">
              <p><strong className="font-bold text-neutral-900">Titular Cuenta:</strong> {targetHolder}</p>
              <p><strong className="font-bold text-neutral-900">Número Cuenta:</strong> <span className="font-mono">{targetNumber}</span></p>
              <p><strong className="font-bold text-neutral-900">Banco:</strong> {targetBank}</p>
              {showRif && targetId && (
                <p><strong className="font-bold text-neutral-900">Cedula de identidad:</strong> <span className="font-mono">{targetId}</span></p>
              )}
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
          {showRif ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 pb-2 border-b border-neutral-200">
              <div>
                <p className="font-bold text-neutral-900">Empresa Cliente:</p>
                <p className="text-neutral-700 truncate">{inv.clientName}</p>
              </div>
              <div>
                <p className="font-bold text-neutral-900">RIF:</p>
                <p className="text-neutral-700 font-mono">{inv.clientRif || "J-00000000-0"}</p>
              </div>
              <div>
                <p className="font-bold text-neutral-900">La suma de:</p>
                <p className="text-neutral-700 font-semibold">{formatCurrency(inv.total, inv.currency)}</p>
              </div>
              <div>
                <p className="font-bold text-neutral-900">Tasa:</p>
                <p className="text-neutral-700 font-mono font-medium">{rateFormatted} Bs.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 pb-2 border-b border-neutral-200">
              <div>
                <p className="font-bold text-neutral-900">Empresa Cliente:</p>
                <p className="text-neutral-700 truncate font-semibold">{inv.clientName}</p>
              </div>
              <div>
                <p className="font-bold text-neutral-900">La suma de:</p>
                <p className="text-neutral-700 font-semibold">{formatCurrency(inv.total, inv.currency)}</p>
              </div>
              <div>
                <p className="font-bold text-neutral-900">Tasa:</p>
                <p className="text-neutral-700 font-mono font-medium">{rateFormatted} Bs.</p>
              </div>
            </div>
          )}

          {/* 5. SECCIÓN DE CONCEPTOS DE LA FACTURA */}
          <div className="space-y-2 pt-2">
            <h2 className="text-xs font-bold text-neutral-900">Concepto de la factura:</h2>

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
                      const cleanDescription = (item.description || "")
                        .replace(/\[\[.*?\]\]/g, "")
                        .replace(/\[Cuenta Prevista:.*?\]/gi, "")
                        .replace(/\[Cuenta:.*?\]/gi, "")
                        .trim();

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
                <span className="font-mono font-bold text-neutral-900">
                  {formatCurrency(inv.paidTotal || 0, inv.currency)}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-1.5 border-b-2 border-neutral-900">
                <span className="font-black text-neutral-900 text-sm uppercase tracking-wider">TOTAL</span>
                <span className="font-mono font-black text-neutral-900 text-base">
                  {formatCurrency(inv.total, inv.currency)}
                </span>
              </div>

              {isForeign && (
                <div className="flex justify-between items-center py-1.5 border-b border-neutral-300">
                  <span className="font-black text-neutral-900 text-xs uppercase tracking-wider">TOTAL BS</span>
                  <span className="font-mono font-black text-neutral-900 text-sm">
                    {vesTotalCalculated.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
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

        {/* 8. FOOTER CYAN CON REDES SOCIALES */}
        <footer className="w-full bg-[#00A3FF] text-white py-3 px-6 flex items-center justify-center gap-3 text-xs font-semibold shadow-inner">
          <div className="flex items-center gap-2">
            {/* Iconos Sociales */}
            <span className="inline-flex items-center gap-1.5 opacity-90 text-[11px]">
              <span>📷</span>
              <span>📘</span>
              <span>✖</span>
              <span>💬</span>
            </span>
            <span className="font-bold tracking-wide">@massivocreativo</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
