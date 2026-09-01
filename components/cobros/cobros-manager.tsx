"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/cobros/status-badge";
import { DeleteButton } from "@/components/ui/delete-button";
import { deleteInvoice, deletePayment, updateInvoiceStatus, registerPayment, updateInvoice } from "@/lib/mutations";
import { formatMoney, formatDate } from "@/lib/format";
import { formatEntityCode } from "@/lib/config";
import { MoneyInput } from "@/components/ui/money-input";
import {
  InvoiceIcon,
  CashIcon,
  SearchIcon,
  DownloadIcon,
  PlusIcon,
} from "@/components/ui/icons";
import type { Invoice, Client, InvoiceStatus } from "@/lib/mock-data";
import type { Payment } from "@/lib/data";
import type { CompanyAccount } from "@/lib/cuentas-actions";
import { getPaymentMethodsForAccount } from "@/lib/cuentas-helpers";

interface CobrosManagerProps {
  invoices: Invoice[];
  clients: Client[];
  payments: Payment[];
  accounts?: CompanyAccount[];
  admin: boolean;
}

export function CobrosManager({
  invoices,
  clients,
  payments,
  accounts = [],
  admin,
}: CobrosManagerProps) {
  const [tab, setTab] = useState<"facturas" | "historial">("facturas");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todas");

  // Menú de 3 puntos activo
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Estado para modal de Cobrar / Abonar Factura
  const [abonoInvoice, setAbonoInvoice] = useState<Invoice | null>(null);
  const [abonoType, setAbonoType] = useState<"completo" | "parcial">("completo");
  const [abonoAmount, setAbonoAmount] = useState(0);
  const [abonoAccountId, setAbonoAccountId] = useState("");
  const [abonoMethod, setAbonoMethod] = useState("Transferencia Bancaria");
  const [abonoReference, setAbonoReference] = useState("");
  const [abonoDescription, setAbonoDescription] = useState("");
  const [abonoError, setAbonoError] = useState<string | null>(null);

  // Estado para modal de Editar Factura
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editClientId, setEditClientId] = useState("");
  const [editStatus, setEditStatus] = useState<InvoiceStatus>("pendiente");
  const [editNote, setEditNote] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [pending, startTransition] = useTransition();

  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const invoiceMap = new Map(invoices.map((i) => [i.id, i]));

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".actions-menu-container")) {
        setOpenMenuId(null);
      }
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  function getInvoiceBalance(inv: Invoice) {
    const paid = payments
      .filter((p) => p.invoiceId === inv.id)
      .reduce((s, p) => s + Number(p.amount), 0);
    return Math.max(0, inv.total - paid);
  }

  function getInvoicePaidTotal(inv: Invoice) {
    return payments
      .filter((p) => p.invoiceId === inv.id)
      .reduce((s, p) => s + Number(p.amount), 0);
  }

  const filteredInvoices = invoices
    .filter((inv) => {
      const clientName = clientMap.get(inv.clientId) || "";
      const balance = getInvoiceBalance(inv);
      const paidTotal = getInvoicePaidTotal(inv);

      let matchesStatus = true;
      if (statusFilter === "pendiente") {
        matchesStatus = inv.status === "pendiente" || (balance > 0 && paidTotal === 0);
      } else if (statusFilter === "parcial") {
        matchesStatus = (paidTotal > 0 && balance > 0) || inv.status === "parcial";
      } else if (statusFilter === "pagada") {
        matchesStatus = inv.status === "pagada" || (balance === 0 && inv.total > 0);
      }

      const q = query.toLowerCase().trim();
      const matchesQuery =
        !q ||
        String(inv.number).toLowerCase().includes(q) ||
        (inv.code && inv.code.toLowerCase().includes(q)) ||
        clientName.toLowerCase().includes(q) ||
        (inv.targetAccountName && inv.targetAccountName.toLowerCase().includes(q));
      return matchesStatus && matchesQuery;
    })
    .sort((a, b) => Number(b.number) - Number(a.number));

  function startPay(inv: Invoice) {
    setOpenMenuId(null);
    setAbonoInvoice(inv);
    const bal = getInvoiceBalance(inv);
    setAbonoType("completo");
    setAbonoAmount(bal > 0 ? bal : inv.total);

    // Si la factura tiene cuenta prevista de proforma o asignada, seleccionarla
    const targetAcc = accounts.find((a) => a.id === inv.targetAccountId) || accounts[0];
    setAbonoAccountId(targetAcc?.id || "");
    const methods = getPaymentMethodsForAccount(targetAcc);
    setAbonoMethod(methods[0] || "Transferencia Bancaria");
    setAbonoReference("");
    setAbonoDescription("");
    setAbonoError(null);
  }

  function startEdit(inv: Invoice) {
    setOpenMenuId(null);
    setEditingInvoice(inv);
    setEditClientId(inv.clientId);
    setEditStatus(inv.status as InvoiceStatus);
    setEditNote(inv.notes || "");
    setEditError(null);
  }

  function handleAccountSelect(accId: string) {
    setAbonoAccountId(accId);
    const acc = accounts.find((a) => a.id === accId);
    const methods = getPaymentMethodsForAccount(acc);
    setAbonoMethod(methods[0] || "Transferencia Bancaria");
  }

  function handleSaveAbono(e: React.FormEvent) {
    e.preventDefault();
    if (!abonoInvoice || abonoAmount <= 0) return;
    setAbonoError(null);

    const selectedAcc = accounts.find((a) => a.id === abonoAccountId);

    startTransition(async () => {
      const res = await registerPayment(abonoInvoice.id, {
        amount: abonoAmount,
        method: abonoMethod,
        accountId: abonoAccountId || undefined,
        accountName: selectedAcc ? selectedAcc.name : undefined,
        reference: abonoReference.trim() ? abonoReference.trim() : undefined,
        description: abonoDescription.trim() ? abonoDescription.trim() : undefined,
      });

      if (res.ok) {
        setAbonoInvoice(null);
      } else {
        setAbonoError(res.error || "No se pudo registrar el cobro.");
      }
    });
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingInvoice) return;
    setEditError(null);

    startTransition(async () => {
      const res = await updateInvoice({
        id: editingInvoice.id,
        clientId: editClientId,
        note: editNote.trim() || undefined,
        status: editStatus,
      });

      if (res.ok) {
        setEditingInvoice(null);
      } else {
        setEditError(res.error || "No se pudo actualizar la factura.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Selector de Pestañas */}
      <div className="flex gap-2 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setTab("facturas")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
            tab === "facturas"
              ? "bg-accent text-white shadow-sm"
              : "bg-card border border-line text-muted hover:text-foreground"
          }`}
        >
          <InvoiceIcon className="h-4 w-4" />
          <span>Facturas Emitidas ({invoices.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("historial")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
            tab === "historial"
              ? "bg-accent text-white shadow-sm"
              : "bg-card border border-line text-muted hover:text-foreground"
          }`}
        >
          <CashIcon className="h-4 w-4" />
          <span>Historial de Cobros Recibidos ({payments.length})</span>
        </button>
      </div>

      {/* PESTAÑA 1: FACTURAS EMITIDAS */}
      {tab === "facturas" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-hint" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por Nº de factura, código o nombre del cliente..."
                className="w-full rounded-xl border border-line bg-card pl-10 pr-4 py-2 text-xs outline-none focus:border-accent"
              />
            </div>

            {/* Filtros: Todas | Pendientes | Parciales | Completas */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "todas", label: "Todas" },
                { id: "pendiente", label: "Pendientes" },
                { id: "parcial", label: "Parciales (Abonos)" },
                { id: "pagada", label: "Completas (Pagadas)" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                    statusFilter === st.id
                      ? "bg-accent text-white shadow-sm"
                      : "bg-card border border-line text-muted hover:text-foreground"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm">
            <div className="bg-soft/60 px-4 py-2.5 border-b border-line flex items-center justify-between text-xs font-medium text-muted">
              <span>Facturas ({filteredInvoices.length})</span>
              <span>Total & Acciones</span>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="py-10 text-center text-sm text-hint">
                No se encontraron facturas registradas con los filtros actuales.
              </div>
            ) : (
              <div className="divide-y divide-line">
                {filteredInvoices.map((inv) => {
                  const bal = getInvoiceBalance(inv);
                  const isPaid = inv.status === "pagada" || bal === 0;
                  const isMenuOpen = openMenuId === inv.id;

                  return (
                    <div
                      key={inv.id}
                      className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-soft/40 transition-colors ${
                        !isPaid ? "bg-pending/5 border-l-4 border-l-pending" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/cobros/${inv.id}`}
                            className="font-mono text-sm font-bold text-foreground hover:text-accent transition-colors"
                          >
                            #{inv.number}
                          </Link>
                          <span className="rounded-full bg-soft font-mono px-2 py-0.5 text-[10px] font-semibold text-muted">
                            {inv.code || formatEntityCode("Mas-Corp-Fact-", Number(inv.number), 4)}
                          </span>
                          <StatusBadge status={inv.status as InvoiceStatus} />
                        </div>
                        <p className="truncate text-xs text-hint mt-0.5">
                          {clientMap.get(inv.clientId) || "Cliente General"} · Emisión:{" "}
                          {formatDate(inv.date)}
                          {inv.targetAccountName && ` · 🏦 Acreditar en: ${inv.targetAccountName}`}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pl-13 sm:pl-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-line">
                        <div className="text-right">
                          <span className="tnum text-sm font-bold text-foreground">
                            {formatMoney(inv.total)}
                          </span>
                          {bal > 0 && bal < inv.total && (
                            <span className="block text-[10px] text-pending font-medium">
                              Resta: {formatMoney(bal)}
                            </span>
                          )}
                        </div>

                        {/* MENÚ DE 3 PUNTOS HORIZONTALES (···) */}
                        <div className="relative actions-menu-container">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(isMenuOpen ? null : inv.id);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-card text-muted hover:text-foreground hover:bg-soft transition-all active:scale-95 shadow-xs"
                            title="Opciones y Acciones"
                          >
                            <span className="font-bold tracking-widest text-sm leading-none">···</span>
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 top-10 z-40 w-52 rounded-2xl border border-line bg-card p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 space-y-0.5 text-xs">
                              {!isPaid && (
                                <button
                                  type="button"
                                  onClick={() => startPay(inv)}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-accent hover:bg-accent/10 transition-colors"
                                >
                                  <PlusIcon className="h-4 w-4" />
                                  <span>Marcar como Pagada / Abonar</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => startEdit(inv)}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-muted hover:text-foreground hover:bg-soft transition-colors"
                              >
                                <span>✏️ Editar Factura</span>
                              </button>

                              <Link
                                href={`/cobros/${inv.id}`}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-muted hover:text-foreground hover:bg-soft transition-colors"
                              >
                                <span>👁️ Ver Detalle</span>
                              </Link>

                              <a
                                href={`/factura/${inv.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-muted hover:text-foreground hover:bg-soft transition-colors"
                              >
                                <DownloadIcon className="h-3.5 w-3.5" />
                                <span>Descargar / Ver PDF</span>
                              </a>

                              {admin && (
                                <div className="border-t border-line pt-1 mt-1">
                                  <DeleteButton
                                    action={deleteInvoice.bind(null, inv.id)}
                                    ariaLabel={`Eliminar factura #${inv.number}`}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: HISTORIAL DE COBROS RECIBIDOS */}
      {tab === "historial" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm">
            <div className="bg-soft/60 px-4 py-2.5 border-b border-line flex items-center justify-between text-xs font-medium text-muted">
              <span>Historial de Pagos Recibidos ({payments.length})</span>
              <span>Monto & Acciones</span>
            </div>

            {payments.length === 0 ? (
              <div className="py-10 text-center text-sm text-hint">
                Aún no hay cobros registrados en la base de datos.
              </div>
            ) : (
              <div className="divide-y divide-line">
                {payments.map((p) => {
                  const inv = p.invoiceId ? invoiceMap.get(p.invoiceId) : null;
                  const client = inv ? clientMap.get(inv.clientId) : "Cliente";

                  return (
                    <div
                      key={p.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-soft/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {inv ? (
                            <Link
                              href={`/cobros/${inv.id}`}
                              className="font-mono text-sm font-bold text-accent hover:underline"
                            >
                              Factura #{inv.number}
                            </Link>
                          ) : (
                            <span className="font-mono text-sm font-bold text-foreground">
                              Cobro Directo
                            </span>
                          )}
                          <span className="rounded-full bg-income/10 px-2 py-0.5 text-[10px] font-semibold text-income">
                            {p.method}
                          </span>
                        </div>
                        <p className="truncate text-xs text-hint mt-0.5">
                          {client} · Fecha: {formatDate(p.date)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pl-13 sm:pl-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-line">
                        <span className="tnum text-sm font-bold text-income">
                          +{formatMoney(p.amount)}
                        </span>

                        {admin && (
                          <DeleteButton
                            action={deletePayment.bind(null, p.id)}
                            ariaLabel={`Eliminar pago de ${formatMoney(p.amount)}`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para Abonar / Marcar como Pagada */}
      {abonoInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Marcar como Pagada / Abonar
                </h3>
                <p className="text-xs text-hint mt-0.5">
                  Factura #{abonoInvoice.number} ({clientMap.get(abonoInvoice.clientId) || "Cliente"})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAbonoInvoice(null)}
                className="text-muted hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {abonoError && (
              <div className="rounded-xl border border-overdue/20 bg-overdue/10 p-3 text-xs font-medium text-overdue">
                {abonoError}
              </div>
            )}

            <form onSubmit={handleSaveAbono} className="space-y-4 text-xs">
              {/* Opción Pago Completo vs Parcial */}
              <div>
                <label className="block text-muted font-medium mb-1.5">
                  Modalidad de Pago
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAbonoType("completo");
                      const bal = getInvoiceBalance(abonoInvoice);
                      setAbonoAmount(bal > 0 ? bal : abonoInvoice.total);
                    }}
                    className={`rounded-xl border p-2 text-center transition-all ${
                      abonoType === "completo"
                        ? "border-accent bg-accent text-white font-bold shadow-sm"
                        : "border-line bg-card text-muted hover:bg-soft"
                    }`}
                  >
                    Pago Completo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAbonoType("parcial");
                      const bal = getInvoiceBalance(abonoInvoice);
                      setAbonoAmount(bal > 0 ? bal / 2 : abonoInvoice.total / 2);
                    }}
                    className={`rounded-xl border p-2 text-center transition-all ${
                      abonoType === "parcial"
                        ? "border-accent bg-accent text-white font-bold shadow-sm"
                        : "border-line bg-card text-muted hover:bg-soft"
                    }`}
                  >
                    Abono Parcial
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">
                  Monto a Acreditar (USD)
                </label>
                <MoneyInput
                  value={abonoAmount}
                  onChange={setAbonoAmount}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <p className="text-[11px] text-hint mt-1">
                  Saldo pendiente de la factura: {formatMoney(getInvoiceBalance(abonoInvoice))}
                </p>
              </div>

              {/* Validador de Cuenta */}
              {accounts.length > 0 && (
                <div className="rounded-xl border border-line bg-soft/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Cuenta donde ingresaron los fondos
                    </label>
                    {abonoInvoice.targetAccountName && (
                      <span className="text-[10px] text-accent font-medium">
                        Cuenta asignada
                      </span>
                    )}
                  </div>
                  {abonoInvoice.targetAccountName && (
                    <p className="text-[11px] text-muted">
                      Cuenta prevista: <strong>{abonoInvoice.targetAccountName}</strong>. Confírmala o selecciona la cuenta real:
                    </p>
                  )}
                  <select
                    value={abonoAccountId}
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

              {/* Método de pago */}
              <div>
                <label className="block text-muted font-medium mb-1">
                  Método de Pago
                </label>
                <select
                  value={abonoMethod}
                  onChange={(e) => setAbonoMethod(e.target.value)}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {getPaymentMethodsForAccount(
                    accounts.find((a) => a.id === abonoAccountId) || accounts[0]
                  ).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">
                  Referencia Bancaria / Cripto Hash (Opcional)
                </label>
                <input
                  type="text"
                  value={abonoReference}
                  onChange={(e) => setAbonoReference(e.target.value)}
                  placeholder="Ej: 987654321"
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs text-foreground placeholder:text-hint focus:outline-none focus:ring-2 focus:ring-accent font-mono"
                />
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">
                  Descripción / Nota (Opcional)
                </label>
                <input
                  type="text"
                  value={abonoDescription}
                  onChange={(e) => setAbonoDescription(e.target.value)}
                  placeholder="Ej: Cancelación total de servicios"
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs text-foreground placeholder:text-hint focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setAbonoInvoice(null)}
                  className="rounded-xl border border-line px-4 py-2 font-medium text-muted hover:bg-soft transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending || abonoAmount <= 0}
                  className="rounded-xl bg-accent px-5 py-2 font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {pending ? "Acreditando..." : "Confirmar y Acreditar Fondos"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Editar Factura */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Editar Factura #{editingInvoice.number}
                </h3>
                <p className="text-xs text-hint mt-0.5">
                  Modifica cliente, estado o notas de la factura
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                className="text-muted hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="rounded-xl border border-overdue/20 bg-overdue/10 p-3 text-xs font-medium text-overdue">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Cliente</label>
                <select
                  value={editClientId}
                  onChange={(e) => setEditClientId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.rif})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Estado</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as InvoiceStatus)}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="pendiente">Pendiente (Por Cobrar)</option>
                  <option value="parcial">Abono Parcial</option>
                  <option value="pagada">Pagada (Cobrada 100%)</option>
                  <option value="anulada">Anulada</option>
                </select>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">
                  Notas / Términos
                </label>
                <textarea
                  rows={3}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Detalles de la factura..."
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="rounded-xl border border-line px-4 py-2 font-medium text-muted hover:bg-soft transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-accent px-5 py-2 font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {pending ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
