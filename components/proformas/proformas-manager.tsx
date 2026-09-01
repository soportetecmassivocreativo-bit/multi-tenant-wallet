"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/cobros/status-badge";
import { DeleteButton } from "@/components/ui/delete-button";
import { deleteProforma, convertProformaToInvoiceAndPay } from "@/lib/mutations";
import { formatMoney, formatDate } from "@/lib/format";
import { formatEntityCode } from "@/lib/config";
import { MoneyInput } from "@/components/ui/money-input";
import {
  InvoiceIcon,
  SearchIcon,
  PlusIcon,
  DownloadIcon,
} from "@/components/ui/icons";
import type { Proforma, Client } from "@/lib/mock-data";
import type { CompanyAccount } from "@/lib/cuentas-actions";
import { getPaymentMethodsForAccount } from "@/lib/cuentas-helpers";

interface ProformasManagerProps {
  proformas: Proforma[];
  clients: Client[];
  accounts?: CompanyAccount[];
  admin: boolean;
}

export function ProformasManager({
  proformas,
  clients,
  accounts = [],
  admin,
}: ProformasManagerProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todas");

  // Modal para Cobrar y Convertir a Factura
  const [payingProforma, setPayingProforma] = useState<Proforma | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payAccountId, setPayAccountId] = useState("");
  const [payMethod, setPayMethod] = useState("Transferencia Bancaria");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payError, setPayError] = useState<string | null>(null);

  const [pending, startTransition] = useTransition();

  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  const filteredProformas = proformas
    .filter((p) => {
      const clientName = clientMap.get(p.clientId) || "";
      const matchesStatus =
        statusFilter === "todas" || p.status === statusFilter;
      const q = query.toLowerCase().trim();
      const matchesQuery =
        !q ||
        String(p.number).toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        clientName.toLowerCase().includes(q) ||
        (p.notes && p.notes.toLowerCase().includes(q));
      return matchesStatus && matchesQuery;
    })
    .sort((a, b) => Number(b.number) - Number(a.number));

  function startPayProforma(p: Proforma) {
    setPayingProforma(p);
    setPayAmount(p.total);
    const initialAcc = accounts[0];
    setPayAccountId(initialAcc?.id || "");
    const methods = getPaymentMethodsForAccount(initialAcc);
    setPayMethod(methods[0] || "Transferencia Bancaria");
    setPayReference("");
    setPayNotes("");
    setPayError(null);
  }

  function handleAccountSelect(accId: string) {
    setPayAccountId(accId);
    const acc = accounts.find((a) => a.id === accId);
    const methods = getPaymentMethodsForAccount(acc);
    setPayMethod(methods[0] || "Transferencia Bancaria");
  }

  function handleConvertSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payingProforma || payAmount <= 0) return;
    setPayError(null);

    const selectedAcc = accounts.find((a) => a.id === payAccountId);
    if (!selectedAcc && accounts.length > 0) {
      setPayError("Por favor selecciona una cuenta para acreditar los fondos.");
      return;
    }

    startTransition(async () => {
      const res = await convertProformaToInvoiceAndPay({
        proformaId: payingProforma.id,
        accountId: payAccountId,
        accountName: selectedAcc ? selectedAcc.name : "Cuenta General",
        paymentMethod: payMethod,
        paymentReference: payReference.trim(),
        notes: payNotes.trim() || undefined,
        amount: payAmount,
      });

      if (res.ok) {
        setPayingProforma(null);
      } else {
        setPayError(res.error || "No se pudo registrar el cobro de la proforma.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Controles de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-hint" />
          <input
            type="text"
            placeholder="Buscar por código (ej. Mas-Corp-Prof-), cliente o descripción..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl border border-line bg-card pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-hint focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(["todas", "pendiente", "pagada"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                statusFilter === st
                  ? "bg-accent text-white shadow-sm"
                  : "bg-card border border-line text-muted hover:text-foreground"
              }`}
            >
              {st === "todas" ? "Todas" : st === "pendiente" ? "En Espera / Pendiente" : "Pagadas / Facturadas"}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Proformas */}
      <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-line flex items-center justify-between bg-soft/20">
          <p className="text-xs font-bold uppercase tracking-wider text-hint">
            Historial de Proformas & Presupuestos ({filteredProformas.length})
          </p>
          <span className="text-xs text-muted">Monto & Acciones</span>
        </div>

        {filteredProformas.length === 0 ? (
          <div className="p-10 text-center text-sm text-hint">
            No se encontraron proformas registradas con los filtros actuales.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {filteredProformas.map((p) => {
              const isPaid = p.status === "pagada";
              return (
                <div
                  key={p.id}
                  className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-soft/40 transition-colors ${
                    !isPaid ? "bg-pending/5 border-l-4 border-l-pending" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/proformas/${p.id}`}
                        className="font-mono text-sm font-bold text-foreground hover:text-accent transition-colors"
                      >
                        #{p.number}
                      </Link>
                      <span className="rounded-full bg-soft font-mono px-2 py-0.5 text-[10px] font-semibold text-muted">
                        {p.code || formatEntityCode("Mas-Corp-Prof-", Number(p.number), 4)}
                      </span>
                      <StatusBadge status={p.status as any} />
                    </div>
                    <p className="truncate text-xs text-hint mt-0.5">
                      {clientMap.get(p.clientId) || "Cliente General"} · Emisión:{" "}
                      {formatDate(p.date)}
                      {p.notes && ` · "${p.notes}"`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-13 sm:pl-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-line">
                    <div className="text-right">
                      <span className={`tnum text-sm font-bold ${!isPaid ? "text-pending" : "text-foreground"}`}>
                        {formatMoney(p.total)}
                      </span>
                      {!isPaid && (
                        <span className="block text-[10px] text-pending font-medium">
                          En espera de pago
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isPaid && (
                        <button
                          type="button"
                          onClick={() => startPayProforma(p)}
                          className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1 text-[11px] font-semibold text-white hover:bg-accent/90 transition-all active:scale-95 shadow-sm"
                          title={`Cobrar y Facturar Proforma #${p.number}`}
                        >
                          <PlusIcon className="h-3 w-3" />
                          <span>Cobrar y Facturar</span>
                        </button>
                      )}

                      <Link
                        href={`/proformas/${p.id}`}
                        className="rounded-lg border border-line bg-card px-2.5 py-1 text-[11px] font-medium text-muted hover:text-foreground hover:bg-soft transition-all"
                      >
                        Ver Detalle
                      </Link>

                      <a
                        href={`/proforma/${p.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-card px-2 py-1 text-[11px] font-medium text-muted hover:text-foreground hover:bg-soft transition-all"
                        title="Ver Comprobante PDF de Proforma"
                      >
                        <DownloadIcon className="h-3.5 w-3.5" />
                        <span>PDF</span>
                      </a>

                      {admin && (
                        <DeleteButton
                          action={deleteProforma.bind(null, p.id)}
                          ariaLabel={`Eliminar proforma #${p.number}`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal para Cobrar Proforma y Convertir a Factura */}
      {payingProforma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Cobrar y Generar Factura
                </h3>
                <p className="text-xs text-hint mt-0.5">
                  Proforma #{payingProforma.number} ({payingProforma.code || `Mas-Corp-Prof-${String(payingProforma.number).padStart(4, "0")}`})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayingProforma(null)}
                className="text-muted hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {payError && (
              <div className="rounded-xl border border-overdue/20 bg-overdue/10 p-3 text-xs font-medium text-overdue">
                {payError}
              </div>
            )}

            <form onSubmit={handleConvertSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">
                  Monto a Acreditar (USD)
                </label>
                <MoneyInput
                  value={payAmount}
                  onChange={setPayAmount}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <p className="text-[11px] text-hint mt-1">
                  Total de la proforma: {formatMoney(payingProforma.total)}
                </p>
              </div>

              {/* Cuenta de acreditación */}
              {accounts.length > 0 && (
                <div>
                  <label className="block text-muted font-medium mb-1">
                    Cuenta de Destino (Acreditación de Fondos)
                  </label>
                  <select
                    value={payAccountId}
                    onChange={(e) => handleAccountSelect(e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.bankName || acc.accountType}) · {acc.currency}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Método de pago dinámico */}
              <div>
                <label className="block text-muted font-medium mb-1">
                  Método de Pago
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {getPaymentMethodsForAccount(
                    accounts.find((a) => a.id === payAccountId) || accounts[0]
                  ).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Referencia */}
              <div>
                <label className="block text-muted font-medium mb-1">
                  Referencia Bancaria / Cripto Hash (Opcional)
                </label>
                <input
                  type="text"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder="Ej: 12345678 o TXID"
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs text-foreground placeholder:text-hint focus:outline-none focus:ring-2 focus:ring-accent font-mono"
                />
              </div>

              {/* Nota opcional */}
              <div>
                <label className="block text-muted font-medium mb-1">
                  Nota / Concepto del Recibo
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Ej: Pago total recibido con éxito"
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs text-foreground placeholder:text-hint focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setPayingProforma(null)}
                  className="rounded-xl border border-line px-4 py-2 font-medium text-muted hover:bg-soft transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending || payAmount <= 0}
                  className="rounded-xl bg-accent px-5 py-2 font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {pending ? "Acreditando..." : "Confirmar Cobro y Facturar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
