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
  const isForeign = inv.currency !== "VES";

  const companyName = config.pdfInvoiceCompanyName || config.pdfCompanyName || company?.name || "Massivo Corp";
  const companyRif = config.pdfInvoiceCompanyRif || config.pdfCompanyRif || company?.rif || "J-50000000-0";
  const subtitle = config.pdfInvoiceHeaderSubtitle || "Factura Comercial & Comprobante de Cobro";
  const phone = config.pdfInvoiceContactPhone || config.pdfContactPhone || company?.phone || "+58 412-0000000";
  const email = config.pdfInvoiceContactEmail || config.pdfContactEmail || company?.email || "contacto@massivocorp.com";
  const footer = config.pdfInvoiceFooterText || "Massivo Corp · Factura Oficial · Generado con M-Wallet";

  const targetAccount = accounts.find((a) => a.id === inv.targetAccountId) || (inv.targetAccountName ? { name: inv.targetAccountName } : null);

  const showConditions = inv.hasConditions ?? config.pdfInvoiceShowConditions ?? false;
  const conditions = inv.conditions || {
    payment: config.pdfInvoiceConditionsPayment,
    delivery: config.pdfInvoiceConditionsDelivery,
    ip: config.pdfInvoiceConditionsIP,
    confidentiality: config.pdfInvoiceConditionsConfidentiality,
  };

  const usdRateFormatted = (inv.vesRate || bcv.usd).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  const eurRateFormatted = (bcv.eur || (inv.vesRate ? inv.vesRate * 1.16 : 926.5531)).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  return (
    <div className="mx-auto min-h-[100dvh] max-w-[680px] bg-white p-6 text-[#14151A]">
      <div className="no-print mb-5 flex items-center justify-between">
        <Link href={`/cobros/${inv.id}`} className="text-sm text-neutral-500 hover:text-black">
          ‹ Volver al Sistema
        </Link>
        <PrintButton />
      </div>

      {/* Membrete */}
      <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            {config.pdfLogoUrl || config.systemLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.pdfLogoUrl || config.systemLogoUrl}
                alt={companyName}
                className="h-9 w-auto max-w-[160px] object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/logo-m-mark.svg"
                alt={companyName}
                className="h-7 w-auto"
              />
            )}
            <span className="font-serif text-lg font-bold text-[#14151A]">
              {companyName}
            </span>
          </div>
          <p className="text-xs font-bold text-neutral-800">
            {companyName} · RIF {companyRif}
          </p>
          <p className="text-[11px] text-neutral-500">
            {subtitle}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            {[phone, email].filter(Boolean).join(" · ")}
          </p>
          {(config.pdfInvoiceShowBcvRates ?? true) && config.pdfInvoiceBcvCurrency !== "none" && (
            <p className="text-[10px] text-neutral-600 font-medium mt-1">
              {config.pdfInvoiceBcvCurrency === "eur"
                ? `Tasa Ref. BCV: EUR ${eurRateFormatted} Bs.`
                : config.pdfInvoiceBcvCurrency === "both"
                  ? `Tasa Ref. BCV: USD ${usdRateFormatted} Bs. | EUR ${eurRateFormatted} Bs.`
                  : `Tasa Ref. BCV: USD ${usdRateFormatted} Bs.`}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <span className="inline-block rounded-md bg-blue-100 text-blue-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-1">
            Factura Comercial
          </span>
          <p className="font-serif text-xl leading-none font-bold">
            #{inv.number}
          </p>
          {inv.code && (
            <p className="font-mono text-xs font-semibold text-neutral-600 mt-1">
              {inv.code}
            </p>
          )}
          <p className="mt-1 text-xs text-neutral-500">
            Emitida {formatDate(inv.date)}
          </p>
        </div>
      </div>

      {/* Cliente y Cuenta */}
      <div className="py-4 border-b border-neutral-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Cliente</p>
          <p className="text-base font-bold text-neutral-900 mt-0.5">{inv.clientName}</p>
        </div>
        {targetAccount && (
          <div className="sm:text-right rounded-lg bg-blue-50/70 p-2.5 border border-blue-100">
            <p className="text-[10px] text-blue-900 uppercase tracking-wider font-bold">Cuenta de Pago / Acreditación</p>
            <p className="text-xs font-bold text-blue-950 mt-0.5">{targetAccount.name}</p>
            {"bankName" in targetAccount && targetAccount.bankName && (
              <p className="text-[11px] text-blue-800 font-mono">
                {targetAccount.bankName} {targetAccount.accountNumber ? `· ${targetAccount.accountNumber}` : ""}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Conceptos */}
      <table className="w-full text-sm mt-3">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
            <th className="py-2 font-semibold">Descripción</th>
            <th className="py-2 text-right font-semibold">Cant.</th>
            <th className="py-2 text-right font-semibold">Precio</th>
            <th className="py-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-3 text-neutral-400">
                Sin conceptos.
              </td>
            </tr>
          ) : (
            inv.items.map((it) => (
              <tr key={it.id} className="border-b border-neutral-100">
                <td className="py-2 text-neutral-800">{it.description}</td>
                <td className="tnum py-2 text-right font-mono">{it.qty}</td>
                <td className="tnum py-2 text-right font-mono">
                  {formatCurrency(it.unitPrice, inv.currency)}
                </td>
                <td className="tnum py-2 text-right font-mono font-medium">
                  {formatCurrency(it.qty * it.unitPrice, inv.currency)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Totales */}
      <div className="mt-4 space-y-1.5 border-t border-neutral-200 pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-500">Subtotal</span>
          <span className="font-mono">{formatCurrency(inv.subtotal, inv.currency)}</span>
        </div>
        {inv.discount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Descuento</span>
            <span className="font-mono">− {formatCurrency(inv.discount, inv.currency)}</span>
          </div>
        )}
        {inv.tax > 0 && (
          <div className="flex justify-between text-neutral-500">
            <span>IVA</span>
            <span className="font-mono">+{formatCurrency(inv.tax, inv.currency)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-bold text-neutral-900">
          <span>Total</span>
          <span className="font-mono">{formatCurrency(inv.total, inv.currency)}</span>
        </div>
        {isForeign && inv.vesTotal != null && (
          <div className="flex justify-between text-xs text-neutral-500 pt-1">
            <span>Equivalente en Bs. (Tasa {inv.vesRateRef || "BCV"})</span>
            <span className="font-mono">{formatCurrency(inv.vesTotal, "VES")}</span>
          </div>
        )}
      </div>

      {/* BLOQUE DE CONDICIONES ESTRUCTURADAS DEL PROYECTO */}
      {showConditions && (
        <div className="mt-6 rounded-xl bg-neutral-50/80 p-4 text-neutral-800 space-y-2.5 text-xs border border-neutral-200">
          <p className="font-bold text-neutral-900 uppercase tracking-wider text-[11px]">Condiciones del Proyecto</p>
          {conditions.payment && (
            <div>
              <p className="text-neutral-900 font-semibold">1. Forma de Pago:</p>
              <p className="text-neutral-600 leading-relaxed text-[11px]">{conditions.payment}</p>
            </div>
          )}
          {conditions.delivery && (
            <div>
              <p className="text-neutral-900 font-semibold">2. Tiempo de entrega:</p>
              <p className="text-neutral-600 leading-relaxed text-[11px]">{conditions.delivery}</p>
            </div>
          )}
          {conditions.ip && (
            <div>
              <p className="text-neutral-900 font-semibold">3. Propiedad Intelectual:</p>
              <p className="text-neutral-600 leading-relaxed text-[11px]">{conditions.ip}</p>
            </div>
          )}
          {conditions.confidentiality && (
            <div>
              <p className="text-neutral-900 font-semibold">4. Confidencialidad:</p>
              <p className="text-neutral-600 leading-relaxed text-[11px]">{conditions.confidentiality}</p>
            </div>
          )}
        </div>
      )}

      <p className="mt-10 text-center text-[10px] text-neutral-400">
        {footer}
      </p>
    </div>
  );
}
