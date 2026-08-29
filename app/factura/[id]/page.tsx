import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/factura/print-button";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { getInvoiceDetail, getCompany } from "@/lib/data";

export default async function FacturaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [inv, company] = await Promise.all([
    getInvoiceDetail(id),
    getCompany(),
  ]);
  if (!inv) notFound();
  const isForeign = inv.currency !== "VES";

  return (
    <div className="mx-auto min-h-[100dvh] max-w-[640px] bg-white p-6 text-[#14151A]">
      <div className="no-print mb-5 flex items-center justify-between">
        <Link href={`/cobros/${inv.id}`} className="text-sm text-neutral-500">
          ‹ Volver
        </Link>
        <PrintButton />
      </div>

      {/* Membrete */}
      <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-mwallet.svg"
              alt="Massivo Corp"
              className="h-8 w-auto"
            />
            <span className="font-serif text-lg font-bold text-[#14151A]">
              {company?.name || "Massivo Corp"}
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {company?.name || "Massivo Corp"} · RIF {company?.rif || "J-50000000-0"}
            {company?.address ? ` · ${company.address}` : ""}
          </p>
          {(company?.phone || company?.email) && (
            <p className="text-xs text-neutral-500">
              {[company?.phone, company?.email || "contacto@massivocorp.com"].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-serif text-xl leading-none">
            Factura #{inv.number}
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            Emitida {formatDate(inv.date)}
          </p>
          <p className="text-xs text-neutral-500">
            Vence {formatDate(inv.dueDate)}
          </p>
        </div>
      </div>

      {/* Cliente */}
      <div className="py-4">
        <p className="text-xs text-neutral-500">Cliente</p>
        <p className="font-medium">{inv.clientName}</p>
      </div>

      {/* Conceptos */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
            <th className="py-1 font-normal">Descripción</th>
            <th className="py-1 text-right font-normal">Cant.</th>
            <th className="py-1 text-right font-normal">Precio</th>
            <th className="py-1 text-right font-normal">Total</th>
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
                <td className="py-1.5">{it.description}</td>
                <td className="tnum py-1.5 text-right">{it.qty}</td>
                <td className="tnum py-1.5 text-right">
                  {formatCurrency(it.unitPrice, inv.currency)}
                </td>
                <td className="tnum py-1.5 text-right">
                  {formatCurrency(it.qty * it.unitPrice, inv.currency)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Totales */}
      <div className="ml-auto mt-4 w-full max-w-[280px] space-y-1 text-sm">
        <Row label="Subtotal" value={formatCurrency(inv.subtotal, inv.currency)} />
        {inv.discount > 0 && (
          <Row
            label="Descuento"
            value={`− ${formatCurrency(inv.discount, inv.currency)}`}
          />
        )}
        <Row label="IVA" value={formatCurrency(inv.tax, inv.currency)} />
        <div className="flex justify-between border-t border-neutral-300 pt-1.5 text-base font-medium">
          <span>Total</span>
          <span className="tnum">{formatCurrency(inv.total, inv.currency)}</span>
        </div>
        {isForeign && inv.vesTotal != null && (
          <div className="flex justify-between text-xs text-neutral-500">
            <span>≈ Bolívares (tasa {inv.vesRateRef})</span>
            <span className="tnum">{formatCurrency(inv.vesTotal, "VES")}</span>
          </div>
        )}
      </div>

      <p className="mt-10 text-center text-[11px] text-neutral-400">
        Generado con M-Wallet
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="tnum">{value}</span>
    </div>
  );
}
