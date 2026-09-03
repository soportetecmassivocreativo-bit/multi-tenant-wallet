export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/factura/print-button";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { getProformaDetail, getBcvRates } from "@/lib/data";
import { getSystemConfig } from "@/lib/config-actions";
import { getCompanyAccounts } from "@/lib/cuentas-actions";

export default async function ProformaPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [prof, config, accounts, bcv] = await Promise.all([
    getProformaDetail(id),
    getSystemConfig(),
    getCompanyAccounts(),
    getBcvRates(),
  ]);
  if (!prof) notFound();
  const isForeign = prof.currency !== "VES";

  const companyName = config.pdfProformaCompanyName || config.pdfCompanyName || "Massivo Corp";
  const companyRif = config.pdfProformaCompanyRif || config.pdfCompanyRif || "J-50000000-0";
  const subtitle = config.pdfProformaHeaderSubtitle || "Proforma / Presupuesto Comercial";
  const phone = config.pdfProformaContactPhone || config.pdfContactPhone || "+58 412-0000000";
  const email = config.pdfProformaContactEmail || config.pdfContactEmail || "contacto@massivocorp.com";
  const terms = config.pdfProformaTermsAndConditions || "Esta proforma / cotización tiene una validez de 15 días continuos.";
  const footer = config.pdfProformaFooterText || "Massivo Corp · Proforma Preliminar · No válida como factura fiscal";

  const primaryColor = config.pdfProformaPrimaryColor || config.brandPrimaryColor || "#2C21FF";
  const paperSize = config.pdfProformaPaperSize || config.pdfPaperSize || "letter";
  const templateUrl = config.pdfProformaTemplateUrl || config.pdfGeneralTemplateUrl;

  const targetAccountId = prof.targetAccountId || config.pdfProformaTargetAccountId;
  const targetAccount = accounts.find((a) => a.id === targetAccountId) || (prof.targetAccountName ? { name: prof.targetAccountName } : null);

  const showConditions = prof.hasConditions ?? config.pdfProformaShowConditions ?? true;
  const conditions = prof.conditions || {
    payment: config.pdfProformaConditionsPayment,
    delivery: config.pdfProformaConditionsDelivery,
    ip: config.pdfProformaConditionsIP,
    confidentiality: config.pdfProformaConditionsConfidentiality,
  };

  const usdRateFormatted = (prof.vesRate || bcv.usd).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  const eurRateFormatted = (bcv.eur || (prof.vesRate ? prof.vesRate * 1.16 : 926.5531)).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  return (
    <div
      style={{
        backgroundImage: templateUrl ? `url("${templateUrl}")` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      className="mx-auto min-h-[100dvh] max-w-[680px] bg-white p-6 text-[#14151A] relative"
    >
      <style>{`
        @media print {
          @page {
            size: ${paperSize === "a4" ? "A4" : paperSize === "legal" ? "legal" : "letter"};
            margin: 8mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      <div className="no-print mb-5 flex items-center justify-between">
        <Link href={`/proformas/${prof.id}`} className="text-sm text-neutral-500 hover:text-black">
          ‹ Volver al Sistema
        </Link>
        <PrintButton />
      </div>

      {/* Membrete Proforma */}
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
                src="/logo-massivo-creativo.png"
                alt={companyName}
                className="h-8 w-auto object-contain"
              />
            )}
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
          {(config.pdfProformaShowBcvRates ?? true) && config.pdfProformaBcvCurrency !== "none" && (
            <p className="text-[10px] text-neutral-600 font-medium mt-1">
              {config.pdfProformaBcvCurrency === "eur"
                ? `Tasa Ref. BCV: EUR ${eurRateFormatted} Bs.`
                : config.pdfProformaBcvCurrency === "both"
                  ? `Tasa Ref. BCV: USD ${usdRateFormatted} Bs. | EUR ${eurRateFormatted} Bs.`
                  : `Tasa Ref. BCV: USD ${usdRateFormatted} Bs.`}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <span
            style={{ backgroundColor: `${primaryColor}1a`, color: primaryColor }}
            className="inline-block rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-1"
          >
            Proforma / Cotización
          </span>
          <p className="font-serif text-xl leading-none font-bold">
            #{prof.number}
          </p>
          {prof.code && (
            <p className="font-mono text-xs font-semibold text-neutral-600 mt-1">
              {prof.code}
            </p>
          )}
          <p className="mt-1 text-xs text-neutral-500">
            Emisión: {formatDate(prof.date)}
          </p>
          {prof.validUntil && (
            <p className="text-xs text-neutral-500">
              Válida hasta: {formatDate(prof.validUntil)}
            </p>
          )}
        </div>
      </div>

      {/* Cliente y Cuenta Prevista */}
      <div className="py-4 border-b border-neutral-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Destinatario / Cliente</p>
          <p className="text-base font-bold text-neutral-900 mt-0.5">{prof.clientName}</p>
        </div>
        {targetAccount && (
          <div
            style={{ backgroundColor: `${primaryColor}0d`, borderColor: `${primaryColor}26` }}
            className="sm:text-right rounded-lg p-2.5 border"
          >
            <p style={{ color: primaryColor }} className="text-[10px] uppercase tracking-wider font-bold">Cuenta de Pago / Anticipo</p>
            <p className="text-xs font-bold text-neutral-900 mt-0.5">{targetAccount.name}</p>
            {"bankName" in targetAccount && targetAccount.bankName && (
              <p className="text-[11px] text-neutral-700 font-mono">
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
          {prof.items.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-3 text-neutral-400">
                Sin conceptos cotizados.
              </td>
            </tr>
          ) : (
            prof.items.map((it) => (
              <tr key={it.id} className="border-b border-neutral-100">
                <td className="py-2 text-neutral-800">{it.description}</td>
                <td className="tnum py-2 text-right font-mono">{it.qty}</td>
                <td className="tnum py-2 text-right font-mono">
                  {formatCurrency(it.unitPrice, prof.currency)}
                </td>
                <td className="tnum py-2 text-right font-mono font-medium">
                  {formatCurrency(it.qty * it.unitPrice, prof.currency)}
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
          <span className="font-mono">{formatCurrency(prof.subtotal, prof.currency)}</span>
        </div>
        {prof.discount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Descuento</span>
            <span className="font-mono">− {formatCurrency(prof.discount, prof.currency)}</span>
          </div>
        )}
        {prof.tax > 0 && (
          <div className="flex justify-between text-neutral-500">
            <span>IVA</span>
            <span className="font-mono">+{formatCurrency(prof.tax, prof.currency)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-bold text-neutral-900">
          <span>Total Cotizado</span>
          <span className="font-mono">{formatCurrency(prof.total, prof.currency)}</span>
        </div>
        {isForeign && prof.vesTotal && (
          <div className="flex justify-between text-xs text-neutral-500 pt-1">
            <span>Equivalente en Bs. (Tasa {prof.vesRateRef || "BCV"})</span>
            <span className="font-mono">{formatCurrency(prof.vesTotal, "VES")}</span>
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

      {/* Términos y Notas de la Proforma */}
      {(!showConditions || prof.notes) && (
        <div className="mt-4 rounded-xl bg-neutral-50 p-3.5 border border-neutral-200/80 text-xs text-neutral-600 space-y-2">
          <p className="font-bold text-neutral-700 uppercase tracking-wide text-[10px]">Términos Generales</p>
          <p>{terms}</p>
          {prof.notes && <p className="pt-1 border-t border-neutral-200"><strong>Notas específicas:</strong> {prof.notes}</p>}
        </div>
      )}

      <p className="mt-6 text-center text-[10px] text-neutral-400">
        {footer}
      </p>
    </div>
  );
}
