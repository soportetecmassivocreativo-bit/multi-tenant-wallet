export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/cobros/status-badge";
import { DeleteButton } from "@/components/ui/delete-button";
import { deleteProforma } from "@/lib/mutations";
import { formatCurrency } from "@/lib/currency";
import { formatDate, cleanConceptAndNotes, cleanItemDescription } from "@/lib/format";
import { getProformaDetail, isAdmin } from "@/lib/data";
import { getCompanyAccounts } from "@/lib/cuentas-actions";
import { getSystemConfig } from "@/lib/config-actions";
import { DEFAULT_SYSTEM_CONFIG } from "@/lib/config";
import { ProformasManager } from "@/components/proformas/proformas-manager";

export default async function ProformaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [prof, admin, accounts, config] = await Promise.all([
    getProformaDetail(id),
    isAdmin(),
    getCompanyAccounts(),
    getSystemConfig(),
  ]);
  if (!prof) notFound();

  const isForeign = prof.currency !== "VES";
  const paidVal = Number(prof.paidTotal || prof.paidAmount) || 0;
  const isPartial = prof.status === "parcial" || (paidVal > 0 && paidVal < prof.total);
  const isPaid = prof.status === "pagada" || (paidVal >= prof.total && prof.total > 0);
  const remainingBalance = Math.max(0, prof.total - paidVal);

  const parsedNotes = cleanConceptAndNotes(prof.notes);
  const generalProjectConcept = parsedNotes.title;
  const extraNotes = parsedNotes.notes;

  const profNum = Number(prof.number);
  const isEligibleForConditions = !isNaN(profNum) ? profNum >= 14 : false;
  const showConditions = prof.hasConditions !== undefined
    ? Boolean(prof.hasConditions)
    : (isEligibleForConditions && (prof.hasConditions === true || (profNum === 14 && prof.hasConditions !== false)));
  const conditions = {
    payment: prof.conditions?.payment || config.pdfProformaConditionsPayment || DEFAULT_SYSTEM_CONFIG.pdfProformaConditionsPayment,
    delivery: prof.conditions?.delivery || config.pdfProformaConditionsDelivery || DEFAULT_SYSTEM_CONFIG.pdfProformaConditionsDelivery,
    ip: prof.conditions?.ip || config.pdfProformaConditionsIP || DEFAULT_SYSTEM_CONFIG.pdfProformaConditionsIP,
    confidentiality: prof.conditions?.confidentiality || config.pdfProformaConditionsConfidentiality || DEFAULT_SYSTEM_CONFIG.pdfProformaConditionsConfidentiality,
  };
  const hasAnyCondition = Boolean(
    conditions.payment || conditions.delivery || conditions.ip || conditions.confidentiality
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="flex items-center justify-between">
        <Link href="/proformas" className="text-sm text-muted active:scale-95">
          ‹ Proformas
        </Link>
        <div className="flex items-center gap-3">
          <a
            href={`/proforma/${prof.id}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-accent active:scale-95 hover:bg-soft"
          >
            Ver PDF
          </a>
          {admin && (
            <DeleteButton
              action={deleteProforma.bind(null, prof.id)}
              ariaLabel={`Eliminar proforma #${prof.number}`}
            />
          )}
        </div>
      </header>

      <section>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-2xl tracking-tight">
                Proforma #{prof.number}
              </h1>
              {prof.code && (
                <span className="rounded-full bg-soft font-mono px-2.5 py-1 text-xs font-bold text-accent">
                  {prof.code}
                </span>
              )}
            </div>
            <p className="text-sm text-muted mt-0.5">{prof.clientName}</p>
          </div>
          <StatusBadge status={prof.status as any} />
        </div>
        <p className="mt-1 text-xs text-hint">
          Emitida {formatDate(prof.date)}
          {prof.validUntil && ` · Válida hasta: ${formatDate(prof.validUntil)}`}
        </p>
      </section>

      {/* Conceptos + totales */}
      <section className="rounded-2xl border border-line bg-card p-4 space-y-3">
        {generalProjectConcept && (
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent block">
              Concepto General del Proyecto / Título Principal
            </span>
            <p className="font-semibold text-sm text-foreground mt-0.5">
              {generalProjectConcept}
            </p>
          </div>
        )}

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-hint mb-3">
            Desglose Modular / Conceptos Cotizados
          </h3>
          {prof.items.length === 0 ? (
            <p className="text-sm text-hint">Sin conceptos.</p>
          ) : (
            prof.items.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between py-1.5 text-sm border-b border-line/40 last:border-0"
              >
                <span className="min-w-0 flex-1 truncate">
                  {it.qty} × {it.description}
                </span>
                <span className="tnum ml-3 font-medium">
                  {formatCurrency(it.qty * it.unitPrice, prof.currency)}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
          <Row label="Subtotal" value={formatCurrency(prof.subtotal, prof.currency)} />
          {prof.discount > 0 && (
            <Row
              label="Descuento"
              value={`− ${formatCurrency(prof.discount, prof.currency)}`}
            />
          )}
          {prof.tax > 0 && (
            <Row
              label="IVA"
              value={`+ ${formatCurrency(prof.tax, prof.currency)}`}
            />
          )}
          <Row
            label="Total Proforma"
            value={formatCurrency(prof.total, prof.currency)}
            strong
          />
          {isForeign && prof.vesTotal && (
            <Row
              label={`Equivalente en Bs. (Tasa ${prof.vesRateRef || "BCV"})`}
              value={formatCurrency(prof.vesTotal, "VES")}
              hint
            />
          )}
        </div>

        {extraNotes && (
          <div className="mt-4 rounded-xl bg-soft/40 p-3.5 border border-line/60">
            <p className="text-[11px] font-bold text-muted uppercase">Notas / Observaciones:</p>
            <p className="text-xs text-foreground mt-1 whitespace-pre-line">{extraNotes}</p>
          </div>
        )}

        {showConditions && hasAnyCondition && (
          <div className="mt-4 rounded-xl bg-soft/30 p-4 border border-line/70 space-y-3">
            <p className="text-[11px] font-bold text-foreground uppercase tracking-wider border-b border-line/40 pb-1.5">
              Condiciones del Proyecto
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {conditions.payment && (
                <div>
                  <span className="font-semibold text-foreground text-[11px] block">Forma de Pago:</span>
                  <span className="text-muted leading-relaxed text-[11px]">{conditions.payment}</span>
                </div>
              )}
              {conditions.delivery && (
                <div>
                  <span className="font-semibold text-foreground text-[11px] block">Tiempo de Entrega:</span>
                  <span className="text-muted leading-relaxed text-[11px]">{conditions.delivery}</span>
                </div>
              )}
              {conditions.ip && (
                <div>
                  <span className="font-semibold text-foreground text-[11px] block">Propiedad Intelectual:</span>
                  <span className="text-muted leading-relaxed text-[11px]">{conditions.ip}</span>
                </div>
              )}
              {conditions.confidentiality && (
                <div>
                  <span className="font-semibold text-foreground text-[11px] block">Confidencialidad:</span>
                  <span className="text-muted leading-relaxed text-[11px]">{conditions.confidentiality}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Historial de Pagos & Abonos */}
      {prof.payments && prof.payments.length > 0 && (
        <section className="rounded-2xl border border-line bg-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div>
              <h2 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                Historial de Pagos & Abonos ({prof.payments.length})
              </h2>
              <p className="text-[11px] text-muted">
                Registro de abonos recibidos y aplicados a esta proforma
              </p>
            </div>
            <StatusBadge status={prof.status as any} />
          </div>

          <div className="divide-y divide-line/60">
            {prof.payments.map((p, idx) => (
              <div key={p.id || idx} className="flex items-center justify-between py-2 text-xs">
                <div>
                  <span className="font-medium text-foreground">
                    Abono #{idx + 1} · {formatDate(p.paidOn)}
                  </span>
                  <span className="text-muted ml-2">
                    · {p.method || "Abono / Pago"}
                  </span>
                </div>
                <span className="tnum font-bold text-income">
                  + {formatCurrency(p.amount, prof.currency)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-line flex items-center justify-between text-xs">
            <span className="text-muted font-medium">
              Total Abonado: <strong className="text-income">{formatCurrency(paidVal, prof.currency)}</strong>
            </span>
            <span className="font-medium text-pending">
              Saldo Pendiente: <strong>{formatCurrency(remainingBalance, prof.currency)}</strong>
            </span>
          </div>
        </section>
      )}

      {/* Acciones de Cobro y Factura */}
      <section className="rounded-2xl border border-line bg-card p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-hint">
          Estado & Disposición de Fondos
        </h3>

        {isPaid ? (
          <div className="rounded-xl bg-income/10 border border-income/20 p-4 text-xs font-medium text-income flex items-center justify-between">
            <div>
              <p className="font-bold">✓ Proforma Cobrada y Acreditada (100% Pagada)</p>
              <p className="text-[11px] text-muted mt-0.5">
                Esta proforma ya fue liquidada en su totalidad y convertida en factura oficial.
              </p>
            </div>
            {prof.invoiceId && (
              <Link
                href={`/cobros/${prof.invoiceId}`}
                className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-accent/90"
              >
                Ver Factura Generada
              </Link>
            )}
          </div>
        ) : isPartial ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-accent/10 border border-accent/20 p-4 text-xs font-medium text-accent flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-bold">⚠️ Proforma Parcialmente Pagada</p>
                <p className="text-[11px] text-muted mt-0.5">
                  Se ha registrado un abono de {formatCurrency(paidVal, prof.currency)}. Saldo restante: <strong>{formatCurrency(remainingBalance, prof.currency)}</strong>.
                </p>
              </div>
              {prof.invoiceId && (
                <Link
                  href={`/cobros/${prof.invoiceId}`}
                  className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 whitespace-nowrap self-start sm:self-auto"
                >
                  Ver Factura de Cobro
                </Link>
              )}
            </div>

            <ProformasManager
              proformas={[
                {
                  id: prof.id,
                  number: String(prof.number),
                  code: prof.code,
                  clientId: prof.clientId,
                  date: prof.date,
                  total: prof.total,
                  currency: prof.currency,
                  status: prof.status,
                  notes: prof.notes,
                  paidAmount: paidVal,
                  invoiceId: prof.invoiceId,
                  targetAccountId: prof.targetAccountId,
                  targetAccountName: prof.targetAccountName,
                },
              ]}
              clients={[{ id: prof.clientId, name: prof.clientName, rif: "", score: 100, termDays: 0, balance: 0 }]}
              accounts={accounts}
              admin={admin}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted">
              Esta proforma se encuentra en espera de pago. Al recibir el comprobante del cliente, puedes proceder al cobro para acreditar el dinero en las cuentas de la empresa y emitir la factura legal.
            </p>
            <ProformasManager
              proformas={[
                {
                  id: prof.id,
                  number: String(prof.number),
                  code: prof.code,
                  clientId: prof.clientId,
                  date: prof.date,
                  total: prof.total,
                  currency: prof.currency,
                  status: prof.status,
                  notes: prof.notes,
                },
              ]}
              clients={[{ id: prof.clientId, name: prof.clientName, rif: "", score: 100, termDays: 0, balance: 0 }]}
              accounts={accounts}
              admin={admin}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  hint,
}: {
  label: string;
  value: string;
  strong?: boolean;
  hint?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        strong ? "text-base font-bold text-foreground" : ""
      } ${hint ? "text-xs text-hint" : ""}`}
    >
      <span>{label}</span>
      <span className="tnum font-mono">{value}</span>
    </div>
  );
}
