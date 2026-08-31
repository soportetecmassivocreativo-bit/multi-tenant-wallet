"use client";

import { useState, useTransition } from "react";
import {
  addService,
  updateService,
  deleteService,
} from "@/lib/servicios-actions";
import { payService } from "@/lib/accounting-actions";
import { DeleteButton } from "@/components/ui/delete-button";
import { ActionButton } from "@/components/ui/action-button";
import { MoneyInput } from "@/components/ui/money-input";
import {
  PlusIcon,
  EditIcon,
  DownloadIcon,
  RepeatIcon,
  ReceiptIcon,
  SearchIcon,
} from "@/components/ui/icons";
import { formatCurrency, type CurrencyCode } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { exportServiceVoucherPdf } from "@/lib/pdf-export";
import type { Service } from "@/lib/mock-data";

const TODAY = new Date().toISOString().slice(0, 10);

const inputClass =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent";

interface ServicesManagerProps {
  services: Service[];
}

export function ServicesManager({ services }: ServicesManagerProps) {
  const [tab, setTab] = useState<"activos" | "historial">("activos");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [cycle, setCycle] = useState("mensual");
  const [category, setCategory] = useState("");
  const [nextChargeDate, setNextChargeDate] = useState(TODAY);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Servicios mensuales únicamente (NO se suman con los anuales)
  const monthlyServices = services.filter((s) => (s.cycle || "").toLowerCase() !== "anual");
  const annualServices = services.filter((s) => (s.cycle || "").toLowerCase() === "anual");

  const monthlyTotals = monthlyServices.reduce<Record<string, number>>((acc, s) => {
    acc[s.currency] = (acc[s.currency] ?? 0) + s.amount;
    return acc;
  }, {});

  const annualTotals = annualServices.reduce<Record<string, number>>((acc, s) => {
    acc[s.currency] = (acc[s.currency] ?? 0) + s.amount;
    return acc;
  }, {});

  const filteredServices = services.filter((s) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      (s.name || "").toLowerCase().includes(q) ||
      (s.category || "").toLowerCase().includes(q) ||
      (s.code || "").toLowerCase().includes(q)
    );
  });

  function openAdd() {
    setEditId(null);
    setName("");
    setAmount(0);
    setCurrency("USD");
    setCycle("mensual");
    setCategory("");
    setNextChargeDate(TODAY);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(s: Service) {
    setEditId(s.id);
    setName(s.name);
    setAmount(s.amount);
    setCurrency(s.currency);
    setCycle(s.cycle);
    setCategory(s.category);
    setNextChargeDate(s.nextChargeDate);
    setError(null);
    setFormOpen(true);
  }

  function submit() {
    if (!name || amount <= 0) return;
    setError(null);
    const input = { name, amount, currency, cycle, category, nextChargeDate };
    start(async () => {
      const r = editId
        ? await updateService(editId, input)
        : await addService(input);
      if (r.ok) setFormOpen(false);
      else setError(r.error ?? "No se pudo guardar.");
    });
  }

  return (
    <div className="space-y-5">
      {/* Resumen de costos separados */}
      <div className={`grid gap-3 ${annualServices.length > 0 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <p className="text-xs text-muted font-medium">Total Servicios Mensuales</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {Object.keys(monthlyTotals).length === 0 ? (
              <p className="text-lg font-medium text-hint">—</p>
            ) : (
              Object.entries(monthlyTotals).map(([cur, amt]) => (
                <p key={cur} className="tnum text-xl font-bold text-overdue">
                  {formatCurrency(amt, cur as CurrencyCode)}
                </p>
              ))
            )}
          </div>
          <p className="mt-1 text-[11px] text-hint">
            {monthlyServices.length} {monthlyServices.length === 1 ? "servicio mensual activo" : "servicios mensuales activos"} · Facturación mensual
          </p>
        </div>

        {annualServices.length > 0 && (
          <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
            <p className="text-xs text-muted font-medium">Total Servicios Anuales</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {Object.entries(annualTotals).map(([cur, amt]) => (
                <p key={cur} className="tnum text-xl font-bold text-accent">
                  {formatCurrency(amt, cur as CurrencyCode)}
                  <span className="text-xs font-normal text-muted ml-1">/ año</span>
                </p>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-hint">
              {annualServices.length} {annualServices.length === 1 ? "servicio anual activo" : "servicios anuales activos"} · Facturación anual
            </p>
          </div>
        )}
      </div>

      {/* Selector de Pestañas: Servicios Activos / Historial de Pagos */}
      <div className="flex gap-2 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setTab("activos")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
            tab === "activos"
              ? "bg-accent text-white shadow-sm"
              : "bg-card border border-line text-muted hover:text-foreground"
          }`}
        >
          <RepeatIcon className="h-4 w-4" />
          <span>Servicios Activos ({services.length})</span>
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
          <ReceiptIcon className="h-4 w-4" />
          <span>Historial & Comprobantes</span>
        </button>
      </div>

      {/* PESTAÑA 1: SERVICIOS ACTIVOS */}
      {tab === "activos" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-hint" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar servicio por nombre, categoría o código..."
                className="w-full rounded-xl border border-line bg-card pl-10 pr-4 py-2 text-xs outline-none focus:border-accent"
              />
            </div>

            {!formOpen && (
              <button
                onClick={openAdd}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-accent/90 transition-all active:scale-95"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Agregar servicio</span>
              </button>
            )}
          </div>

          {/* Formulario Agregar / Editar */}
          {formOpen && (
            <section className="space-y-3 rounded-2xl border border-line bg-card p-4 shadow-sm animate-in fade-in duration-200">
              <p className="font-serif text-sm font-semibold">
                {editId ? "Editar servicio" : "Nuevo servicio recurrente"}
              </p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del servicio (ej. Claude, Supabase)"
                className={inputClass}
                autoFocus
              />
              <div className="flex gap-2">
                <MoneyInput
                  value={amount}
                  onValueChange={setAmount}
                  placeholder="Monto"
                  className={inputClass}
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="rounded-xl border border-line bg-card px-3 text-sm outline-none"
                >
                  <option value="USD">USD</option>
                  <option value="VES">VES</option>
                  <option value="EUR">EUR</option>
                </select>
                <select
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value)}
                  className="rounded-xl border border-line bg-card px-3 text-sm outline-none"
                >
                  <option value="mensual">Mensual</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Categoría (ej. IA, Hosting, Backend)"
                  className={inputClass}
                />
                <div>
                  <label className="text-[10px] text-muted block mb-0.5">Próximo cobro</label>
                  <input
                    type="date"
                    value={nextChargeDate}
                    onChange={(e) => setNextChargeDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={submit}
                  disabled={!name || amount <= 0 || pending}
                  className="flex-1 rounded-xl bg-accent py-2.5 text-xs font-medium text-white disabled:opacity-40"
                >
                  {pending ? "Guardando…" : "Guardar servicio"}
                </button>
                <button
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-line px-4 py-2.5 text-xs text-muted hover:text-foreground"
                >
                  Cancelar
                </button>
              </div>
            </section>
          )}

          {/* Lista de Servicios */}
          <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm">
            <div className="bg-soft/60 px-4 py-2.5 border-b border-line flex items-center justify-between text-xs font-medium text-muted">
              <span>Catálogo de Servicios ({filteredServices.length})</span>
              <span>Costo & Acciones</span>
            </div>

            {filteredServices.length === 0 ? (
              <div className="py-10 text-center text-sm text-hint">
                No se encontraron servicios registrados.
              </div>
            ) : (
              <div className="divide-y divide-line">
                {filteredServices.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-soft/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-soft font-serif font-bold text-sm text-accent">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">{s.name}</p>
                          <span className="rounded-full bg-soft font-mono px-2 py-0.5 text-[10px] font-semibold text-muted">
                            {s.code || "Mas-Corp-0001"}
                          </span>
                          <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] text-muted capitalize">
                            {s.cycle}
                          </span>
                        </div>
                        <p className="text-xs text-hint mt-0.5">
                          {s.category} · Próximo cobro: {formatDate(s.nextChargeDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-13 sm:pl-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-line">
                      <span className="tnum text-sm font-semibold text-foreground">
                        {formatCurrency(s.amount, s.currency)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* Botón Descargar Comprobante Individual PDF */}
                        <button
                          type="button"
                          onClick={() => exportServiceVoucherPdf(s)}
                          className="inline-flex items-center gap-1 rounded-lg border border-accent/20 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent hover:bg-accent hover:text-white transition-all active:scale-95 shadow-sm"
                          title={`Descargar Comprobante PDF de ${s.name}`}
                        >
                          <DownloadIcon className="h-3 w-3" />
                          <span>PDF</span>
                        </button>

                        <button
                          onClick={() => openEdit(s)}
                          aria-label={`Editar ${s.name}`}
                          className="grid h-7 w-7 place-items-center rounded-lg text-hint hover:text-foreground hover:bg-soft"
                        >
                          <EditIcon className="h-3.5 w-3.5" />
                        </button>

                        <DeleteButton
                          action={() => deleteService(s.id)}
                          ariaLabel={`Eliminar ${s.name}`}
                        />

                        <ActionButton
                          label="Pagar"
                          doneLabel="Pagado"
                          action={() => payService(s.id)}
                          className="px-3 py-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: HISTORIAL DE PAGOS DE SERVICIOS */}
      {tab === "historial" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm">
            <div className="bg-soft/60 px-4 py-2.5 border-b border-line flex items-center justify-between text-xs font-medium text-muted">
              <span>Historial de Pagos & Renovaciones de Servicios</span>
              <span>Comprobante</span>
            </div>

            <div className="divide-y divide-line">
              {services.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-soft/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{s.name}</p>
                      <span className="rounded-full bg-soft font-mono px-2 py-0.5 text-[10px] text-muted">
                        {s.code || "Mas-Corp-0001"}
                      </span>
                      <span className="rounded-full bg-income/10 text-income px-2 py-0.5 text-[10px] font-medium border border-income/20">
                        Activo
                      </span>
                    </div>
                    <p className="text-xs text-hint mt-0.5">
                      Frecuencia: {s.cycle} · {s.category} · Vigencia hasta {formatDate(s.nextChargeDate)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="tnum text-sm font-bold text-foreground">
                      {formatCurrency(s.amount, s.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => exportServiceVoucherPdf(s)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent hover:text-white transition-all active:scale-95 shadow-sm"
                    >
                      <DownloadIcon className="h-3.5 w-3.5" />
                      <span>Comprobante PDF</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
