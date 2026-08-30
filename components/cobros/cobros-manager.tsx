"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/cobros/status-badge";
import { DeleteButton } from "@/components/ui/delete-button";
import { deleteInvoice, deletePayment, updateInvoiceStatus } from "@/lib/mutations";
import { formatMoney, formatDate } from "@/lib/format";
import {
  InvoiceIcon,
  CashIcon,
  SearchIcon,
  DownloadIcon,
  EditIcon,
} from "@/components/ui/icons";
import type { Invoice, Client, InvoiceStatus } from "@/lib/mock-data";
import type { Payment } from "@/lib/data";

interface CobrosManagerProps {
  invoices: Invoice[];
  clients: Client[];
  payments: Payment[];
  admin: boolean;
}

export function CobrosManager({
  invoices,
  clients,
  payments,
  admin,
}: CobrosManagerProps) {
  const [tab, setTab] = useState<"facturas" | "historial">("facturas");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todas");

  // Estado para editar estado de factura
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus>("pendiente");
  const [editError, setEditError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const invoiceMap = new Map(invoices.map((i) => [i.id, i]));

  const filteredInvoices = invoices.filter((inv) => {
    const clientName = clientMap.get(inv.clientId) || "";
    const matchesStatus =
      statusFilter === "todas" || inv.status === statusFilter;
    const q = query.toLowerCase().trim();
    const matchesQuery =
      !q ||
      String(inv.number).toLowerCase().includes(q) ||
      clientName.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  function startEdit(inv: Invoice) {
    setEditingInvoice(inv);
    setSelectedStatus(inv.status as InvoiceStatus);
    setEditError(null);
  }

  function handleSaveStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!editingInvoice) return;
    setEditError(null);

    startTransition(async () => {
      const res = await updateInvoiceStatus(editingInvoice.id, selectedStatus);
      if (res.ok) {
        setEditingInvoice(null);
      } else {
        setEditError(res.error || "No se pudo actualizar el estado.");
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
                placeholder="Buscar por Nº de factura o nombre del cliente..."
                className="w-full rounded-xl border border-line bg-card pl-10 pr-4 py-2 text-xs outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {["todas", "pendiente", "pagada", "vencida"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                    statusFilter === st
                      ? "bg-accent text-white shadow-sm"
                      : "bg-soft border border-line text-muted hover:text-foreground"
                  }`}
                >
                  {st}
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
                No se encontraron facturas registradas.
              </div>
            ) : (
              <div className="divide-y divide-line">
                {filteredInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-soft/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/cobros/${inv.id}`}
                          className="font-mono text-sm font-bold text-foreground hover:text-accent transition-colors"
                        >
                          #{inv.number}
                        </Link>
                        <StatusBadge status={inv.status as InvoiceStatus} />
                      </div>
                      <p className="truncate text-xs text-hint mt-0.5">
                        {clientMap.get(inv.clientId) || "Cliente General"} · Emisión:{" "}
                        {formatDate(inv.date)} · Vence: {formatDate(inv.dueDate)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-13 sm:pl-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-line">
                      <span className="tnum text-sm font-bold text-foreground">
                        {formatMoney(inv.total)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/cobros/${inv.id}`}
                          className="rounded-lg border border-line bg-card px-2.5 py-1 text-[11px] font-medium text-muted hover:text-foreground hover:bg-soft transition-all"
                        >
                          Ver
                        </Link>

                        {/* Botón Editar Estado */}
                        <button
                          type="button"
                          onClick={() => startEdit(inv)}
                          className="grid h-7 w-7 place-items-center rounded-lg text-hint hover:text-foreground hover:bg-soft transition-all"
                          title={`Modificar Estado Factura #${inv.number}`}
                        >
                          <EditIcon className="h-3.5 w-3.5" />
                        </button>

                        <Link
                          href={`/factura/${inv.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-accent/20 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent hover:bg-accent hover:text-white transition-all active:scale-95 shadow-sm"
                          title={`Descargar PDF Factura #${inv.number}`}
                        >
                          <DownloadIcon className="h-3 w-3" />
                          <span>PDF</span>
                        </Link>

                        {admin && (
                          <DeleteButton
                            action={deleteInvoice.bind(null, inv.id)}
                            ariaLabel={`Eliminar factura #${inv.number}`}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-soft/40 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {inv ? `Cobro · Factura #${inv.number}` : "Cobro Recibido"}
                          </p>
                          <span className="rounded-full bg-income/10 text-income px-2 py-0.5 text-[10px] font-medium border border-income/20">
                            {p.method || "Transferencia"}
                          </span>
                        </div>
                        <p className="text-xs text-hint mt-0.5">
                          {client} · Fecha: {formatDate(p.paidOn)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="tnum text-sm font-bold text-income mr-1">
                          + {formatMoney(Number(p.amount))}
                        </span>

                        {inv && (
                          <Link
                            href={`/factura/${inv.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-accent/20 bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent hover:text-white transition-all shadow-sm"
                          >
                            <DownloadIcon className="h-3 w-3" />
                            <span>PDF</span>
                          </Link>
                        )}

                        {admin && (
                          <DeleteButton
                            action={deletePayment.bind(null, p.id)}
                            ariaLabel={`Eliminar registro de cobro`}
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

      {/* Modal de Modificación de Estado de Factura */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveStatus}
            className="w-full max-w-md rounded-3xl border border-line bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <EditIcon className="h-5 w-5 text-accent" />
                <h3 className="font-serif text-base font-semibold">
                  Modificar Factura #{editingInvoice.number}
                </h3>
              </div>
              <StatusBadge status={editingInvoice.status as InvoiceStatus} />
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted block mb-1">Cliente:</label>
                <p className="text-sm font-semibold text-foreground">
                  {clientMap.get(editingInvoice.clientId) || "Cliente General"}
                </p>
              </div>

              <div>
                <label className="text-muted block mb-1">Total:</label>
                <p className="text-base font-bold text-accent">
                  {formatMoney(editingInvoice.total)}
                </p>
              </div>

              <div>
                <label className="text-muted block mb-1">Estado de la Factura:</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as InvoiceStatus)}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent capitalize"
                >
                  <option value="pendiente">Pendiente (Por cobrar)</option>
                  <option value="pagada">Pagada (Cobrada)</option>
                  <option value="parcial">Parcial (Abono parcial)</option>
                  <option value="vencida">Vencida</option>
                  <option value="borrador">Borrador</option>
                </select>
              </div>

              {editError && (
                <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue">
                  {editError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                disabled={pending}
                className="rounded-xl border border-line px-4 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-soft"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-accent px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-accent/90 disabled:opacity-50"
              >
                {pending ? "Guardando…" : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
