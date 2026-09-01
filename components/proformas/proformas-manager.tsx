"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/cobros/status-badge";
import { DeleteButton } from "@/components/ui/delete-button";
import { deleteProforma, convertProformaToInvoiceAndPay, updateProforma } from "@/lib/mutations";
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

  // Menú de 3 puntos activo
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Modal para Cobrar y Convertir a Factura
  const [payingProforma, setPayingProforma] = useState<Proforma | null>(null);
  const [payType, setPayType] = useState<"completo" | "parcial">("completo");
  const [payAmount, setPayAmount] = useState(0);
  const [payAccountId, setPayAccountId] = useState("");
  const [payMethod, setPayMethod] = useState("Transferencia Bancaria");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payError, setPayError] = useState<string | null>(null);

  // Modal para Editar Proforma
  const [editingProforma, setEditingProforma] = useState<Proforma | null>(null);
  const [editClientId, setEditClientId] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [pending, startTransition] = useTransition();

  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

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

  const filteredProformas = proformas
    .filter((p) => {
      const clientName = clientMap.get(p.clientId) || "";
      let matchesStatus = true;
      if (statusFilter === "pendiente") {
        matchesStatus = p.status === "pendiente";
      } else if (statusFilter === "parcial") {
        matchesStatus = (p.paidAmount !== undefined && p.paidAmount > 0 && p.paidAmount < p.total) || p.status === "aprobada";
      } else if (statusFilter === "pagada") {
        matchesStatus = p.status === "pagada";
      }

      const q = query.toLowerCase().trim();
      const matchesQuery =
        !q ||
        String(p.number).toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        clientName.toLowerCase().includes(q) ||
        (p.notes && p.notes.toLowerCase().includes(q)) ||
        (p.targetAccountName && p.targetAccountName.toLowerCase().includes(q));
      return matchesStatus && matchesQuery;
    })
    .sort((a, b) => Number(b.number) - Number(a.number));

  function startPayProforma(p: Proforma) {
    setOpenMenuId(null);
    setPayingProforma(p);
    setPayType("completo");
    setPayAmount(p.total);

    // Pre-cargar cuenta prevista si existe
    const targetAcc = accounts.find((a) => a.id === p.targetAccountId) || accounts[0];
    setPayAccountId(targetAcc?.id || "");
    const methods = getPaymentMethodsForAccount(targetAcc);
    setPayMethod(methods[0] || "Transferencia Bancaria");
    setPayReference("");
    setPayNotes("");
    setPayError(null);
  }

  function startEditProforma(p: Proforma) {
    setOpenMenuId(null);
    setEditingProforma(p);
    setEditClientId(p.clientId);
    setEditNotes(p.notes || "");
    setEditAccountId(p.targetAccountId || accounts[0]?.id || "");
    setEditError(null);
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
        isPartial: payType === "parcial",
      });

      if (res.ok) {
        setPayingProforma(null);
      } else {
        setPayError(res.error || "No se pudo registrar el cobro de la proforma.");
      }
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProforma) return;
    setEditError(null);

    const selectedAcc = accounts.find((a) => a.id === editAccountId);

    startTransition(async () => {
      const res = await updateProforma({
        id: editingProforma.id,
        clientId: editClientId,
        notes: editNotes.trim() || undefined,
        targetAccountId: editAccountId,
        targetAccountName: selectedAcc ? `${selectedAcc.name} (${selectedAcc.bankName || selectedAcc.accountType})` : undefined,
      });

      if (res.ok) {
        setEditingProforma(null);
      } else {
        setEditError(res.error || "No se pudo actualizar la proforma.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Controles de Búsqueda y Filtros de Pago */}
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

        {/* Filtros: Todas | Pendientes | Parciales | Completas */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "todas", label: "Todas" },
            { id: "pendiente", label: "Pendientes (En espera)" },
            { id: "parcial", label: "Parciales (Abonos)" },
            { id: "pagada", label: "Completas (Pagadas 100%)" },
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
              const hasExpectedAccount = Boolean(p.targetAccountName || p.targetAccountId);
              const isMenuOpen = openMenuId === p.id;

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
                      {p.targetAccountName && ` · 🏦 Prevista: ${p.targetAccountName}`}
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

                    {/* MENÚ DE 3 PUNTOS HORIZONTALES (···) */}
                    <div className="relative actions-menu-container">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(isMenuOpen ? null : p.id);
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
                              onClick={() => startPayProforma(p)}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-accent hover:bg-accent/10 transition-colors"
                            >
                              <PlusIcon className="h-4 w-4" />
                              <span>Marcar como Pagada</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => startEditProforma(p)}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-muted hover:text-foreground hover:bg-soft transition-colors"
                          >
                            <span>✏️ Editar Proforma</span>
                          </button>

                          <Link
                            href={`/proformas/${p.id}`}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-muted hover:text-foreground hover:bg-soft transition-colors"
                          >
                            <span>👁️ Ver Detalle</span>
                          </Link>

                          <a
                            href={`/proforma/${p.id}`}
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
                                action={deleteProforma.bind(null, p.id)}
                                ariaLabel={`Eliminar proforma #${p.number}`}
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
              {/* Tipo de Pago: Completo vs Parcial */}
              <div>
                <label className="block text-muted font-medium mb-1.5">
                  Tipo de Cobro / Cancelación
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPayType("completo");
                      setPayAmount(payingProforma.total);
                    }}
                    className={`rounded-xl border p-2 text-center transition-all ${
                      payType === "completo"
                        ? "border-accent bg-accent text-white font-bold shadow-sm"
                        : "border-line bg-card text-muted hover:bg-soft"
                    }`}
                  >
                    Pago Completo (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPayType("parcial");
                      setPayAmount(payingProforma.total / 2);
                    }}
                    className={`rounded-xl border p-2 text-center transition-all ${
                      payType === "parcial"
                        ? "border-accent bg-accent text-white font-bold shadow-sm"
                        : "border-line bg-card text-muted hover:bg-soft"
                    }`}
                  >
                    Abono Parcial (Anticipo)
                  </button>
                </div>
              </div>

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

              {/* Validador de Cuenta: Cuenta prevista vs Confirmada */}
              {accounts.length > 0 && (
                <div className="rounded-xl border border-line bg-soft/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Cuenta de Acreditación
                    </label>
                    {payingProforma.targetAccountName && (
                      <span className="text-[10px] text-accent font-medium">
                        Prevista en cotización
                      </span>
                    )}
                  </div>
                  {payingProforma.targetAccountName && (
                    <p className="text-[11px] text-muted">
                      Cuenta planificada: <strong>{payingProforma.targetAccountName}</strong>. Si el pago se recibió allí, confírmala; o selecciona la cuenta real donde ingresó el dinero:
                    </p>
                  )}
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
                  placeholder="Ej: Anticipo 50% recibido con éxito"
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

      {/* Modal para Editar Proforma */}
      {editingProforma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Editar Proforma #{editingProforma.number}
                </h3>
                <p className="text-xs text-hint mt-0.5">
                  Modifica cliente, cuenta prevista o notas de la cotización
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProforma(null)}
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

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
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

              {accounts.length > 0 && (
                <div>
                  <label className="block text-muted font-medium mb-1">
                    Cuenta Prevista para Recibir Fondos
                  </label>
                  <select
                    value={editAccountId}
                    onChange={(e) => setEditAccountId(e.target.value)}
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

              <div>
                <label className="block text-muted font-medium mb-1">
                  Notas / Descripción
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Detalles de la cotización..."
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setEditingProforma(null)}
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
