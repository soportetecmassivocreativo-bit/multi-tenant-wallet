"use client";

import { useState, useTransition } from "react";
import {
  addEmployee,
  updateEmployee,
  deleteEmployee,
  payPayroll,
  payEmployee,
} from "@/lib/nomina-actions";
import { DeleteButton } from "@/components/ui/delete-button";
import { ActionButton } from "@/components/ui/action-button";
import { MoneyInput } from "@/components/ui/money-input";
import {
  PlusIcon,
  CheckIcon,
  EditIcon,
  DownloadIcon,
  UsersIcon,
  PayrollIcon,
  SearchIcon,
} from "@/components/ui/icons";
import { formatCurrency, type CurrencyCode } from "@/lib/currency";
import { formatDate, formatMoney } from "@/lib/format";
import { exportPayrollReceiptPdf } from "@/lib/pdf-export";
import type { Employee, PayrollPeriod } from "@/lib/mock-data";

const inputClass =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent";

const POPULAR_BANKS = [
  "Banesco",
  "Banco de Venezuela",
  "Mercantil",
  "BBVA Provincial",
  "Banco Nacional de Crédito (BNC)",
  "Bancamiga",
  "Bancaribe",
  "Banco Exterior",
  "Banco Plaza",
  "Zelle",
  "Binance Pay",
  "Efectivo",
  "Otro",
];

const ACCOUNT_TYPES = [
  "Pago Móvil",
  "Cuenta Corriente",
  "Cuenta Ahorro",
  "Zelle",
  "Binance / USDT",
  "Efectivo en Mano",
];

interface EmployeesManagerProps {
  employees: Employee[];
  payrollPeriods?: PayrollPeriod[];
}

export function EmployeesManager({
  employees,
  payrollPeriods = [],
}: EmployeesManagerProps) {
  const [tab, setTab] = useState<"empleados" | "historial">("empleados");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [bankName, setBankName] = useState("");
  const [accountType, setAccountType] = useState("Pago Móvil");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankNotes, setBankNotes] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [pending, start] = useTransition();

  const totals = employees.reduce<Record<string, number>>((acc, e) => {
    acc[e.currency] = (acc[e.currency] ?? 0) + e.salary;
    return acc;
  }, {});

  const filteredEmployees = employees
    .filter((e) => {
      const q = query.toLowerCase().trim();
      if (!q) return true;
      return (
        (e.name || "").toLowerCase().includes(q) ||
        (e.role || "").toLowerCase().includes(q) ||
        (e.code || "").toLowerCase().includes(q) ||
        (e.idNumber || "").toLowerCase().includes(q) ||
        (e.bankName || "").toLowerCase().includes(q) ||
        (e.accountNumber || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true }));

  function copyToClipboard(id: string, text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  }

  function openAdd() {
    setEditId(null);
    setName("");
    setIdNumber("");
    setRole("");
    setSalary(0);
    setCurrency("USD");
    setBankName("");
    setAccountType("Pago Móvil");
    setAccountNumber("");
    setBankNotes("");
    setError(null);
    setFormOpen(true);
  }

  function openEdit(e: Employee) {
    setEditId(e.id);
    setName(e.name);
    setIdNumber(e.idNumber || "");
    setRole(e.role);
    setSalary(e.salary);
    setCurrency(e.currency);
    setBankName(e.bankName || "");
    setAccountType(e.accountType || "Pago Móvil");
    setAccountNumber(e.accountNumber || "");
    setBankNotes(e.bankNotes || "");
    setError(null);
    setFormOpen(true);
  }

  function submit() {
    if (!name || salary <= 0) return;
    setError(null);
    const input = {
      fullName: name,
      role,
      salary,
      currency,
      idNumber: idNumber.trim() || undefined,
      bankName: bankName.trim() || undefined,
      accountType: accountType.trim() || undefined,
      accountNumber: accountNumber.trim() || undefined,
      bankNotes: bankNotes.trim() || undefined,
    };
    start(async () => {
      const r = editId
        ? await updateEmployee(editId, input)
        : await addEmployee(input);
      if (r.ok) setFormOpen(false);
      else setError(r.error ?? "No se pudo guardar.");
    });
  }

  function pay() {
    setError(null);
    start(async () => {
      const r = await payPayroll();
      if (r.ok) setPaid(true);
      else setError(r.error ?? "No se pudo pagar la nómina.");
    });
  }

  return (
    <div className="space-y-5">
      {/* Total por moneda */}
      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <p className="text-xs text-muted font-medium">Presupuesto Nómina Quincenal</p>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {Object.keys(totals).length === 0 ? (
            <p className="text-lg font-medium text-hint">—</p>
          ) : (
            Object.entries(totals).map(([cur, amt]) => (
              <p key={cur} className="tnum text-xl font-bold text-foreground">
                {formatCurrency(amt, cur as CurrencyCode)}
              </p>
            ))
          )}
        </div>
        <p className="mt-1 text-[11px] text-hint">
          {employees.length} empleados activos · Frecuencia 15 y último
        </p>
      </div>

      {/* Selector de Pestañas: Empleados / Historial */}
      <div className="flex gap-2 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setTab("empleados")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
            tab === "empleados"
              ? "bg-accent text-white shadow-sm"
              : "bg-card border border-line text-muted hover:text-foreground"
          }`}
        >
          <UsersIcon className="h-4 w-4" />
          <span>Empleados ({employees.length})</span>
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
          <PayrollIcon className="h-4 w-4" />
          <span>Historial de Pagos & Recibos</span>
        </button>
      </div>

      {/* PESTAÑA 1: EMPLEADOS ACTIVOS */}
      {tab === "empleados" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-hint" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar empleado por nombre, cédula, cargo o banco..."
                className="w-full rounded-xl border border-line bg-card pl-10 pr-4 py-2 text-xs outline-none focus:border-accent"
              />
            </div>

            {!formOpen && (
              <button
                onClick={openAdd}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-accent/90 transition-all active:scale-95"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Agregar empleado</span>
              </button>
            )}
          </div>

          {/* Formulario Agregar / Editar */}
          {formOpen && (
            <section className="space-y-4 rounded-2xl border border-line bg-card p-5 shadow-lg animate-in fade-in duration-200">
              <div className="border-b border-line pb-2">
                <h3 className="font-serif text-sm font-bold text-foreground">
                  {editId ? "Editar Información del Trabajador" : "Registrar Nuevo Trabajador"}
                </h3>
                <p className="text-[11px] text-hint">
                  Completa los datos personales, cédula y coordenadas bancarias para la dispersión de nómina
                </p>
              </div>

              {/* Fila 1: Nombre y Cédula */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-muted">Nombre y Apellido *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Ana María Reyes"
                    className={inputClass}
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted">Cédula de Identidad *</label>
                  <input
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="Ej: V-19.452.890"
                    className={`${inputClass} font-mono`}
                  />
                </div>
              </div>

              {/* Fila 2: Cargo, Salario Quincenal y Moneda */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted">Cargo / Rol en la Empresa</label>
                  <input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ej: Diseñadora UI/UX, Desarrollador..."
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted">Salario Quincenal *</label>
                  <MoneyInput
                    value={salary}
                    onValueChange={setSalary}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted">Moneda de Pago</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className={inputClass}
                  >
                    <option value="USD">USD ($ Dólar)</option>
                    <option value="VES">VES (Bs. Bolívares)</option>
                    <option value="EUR">EUR (€ Euro)</option>
                  </select>
                </div>
              </div>

              {/* Fila 3: Sección Datos Bancarios & Pago de Nómina */}
              <div className="rounded-xl border border-line bg-soft/40 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span>🏦 Coordenadas Bancarias & Vía de Pago</span>
                  </label>
                  <span className="text-[10px] text-hint font-medium">Para transferencias o Pago Móvil</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted">Banco / Plataforma</label>
                    <input
                      list="bank-suggestions"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Ej: Banesco, Venezuela, Zelle..."
                      className={inputClass}
                    />
                    <datalist id="bank-suggestions">
                      {POPULAR_BANKS.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted">Tipo de Cuenta / Método</label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Selecciona tipo...</option>
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted">
                      {accountType === "Pago Móvil"
                        ? "Teléfono Pago Móvil"
                        : accountType === "Zelle"
                          ? "Correo o Teléfono Zelle"
                          : "Nº de Cuenta (20 dígitos)"}
                    </label>
                    <input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder={
                        accountType === "Pago Móvil"
                          ? "Ej: 0414-1234567"
                          : accountType === "Zelle"
                            ? "Ej: pagos@empresa.com"
                            : "Ej: 0134-0123-45-0001234567"
                      }
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted">Titular / Observaciones de Pago (Opcional)</label>
                  <input
                    value={bankNotes}
                    onChange={(e) => setBankNotes(e.target.value)}
                    placeholder="Ej: Cuenta a nombre de familiar XYZ / C.I. distinta..."
                    className={inputClass}
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-xl bg-overdue/10 px-3.5 py-2 text-xs text-overdue font-medium">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-line">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-line px-4 py-2 text-xs text-muted hover:text-foreground font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={submit}
                  disabled={!name || salary <= 0 || pending}
                  className="rounded-xl bg-accent px-6 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-95 disabled:opacity-40 transition-all"
                >
                  {pending ? "Guardando…" : editId ? "Actualizar Trabajador" : "Registrar Trabajador"}
                </button>
              </div>
            </section>
          )}

          {/* Lista de Empleados */}
          <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm">
            <div className="bg-soft/60 px-4 py-2.5 border-b border-line flex items-center justify-between text-xs font-medium text-muted">
              <span>Nómina de Empleados ({filteredEmployees.length})</span>
              <span>Salario Quincenal</span>
            </div>

            {filteredEmployees.length === 0 ? (
              <div className="py-10 text-center text-sm text-hint">
                No se encontraron empleados registrados.
              </div>
            ) : (
              <div className="divide-y divide-line">
                {filteredEmployees.map((e) => (
                  <div key={e.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-soft/40 transition-colors">
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-bg font-serif font-bold text-accent text-base">
                        {(e.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold text-foreground">{e.name}</p>
                          <span className="rounded-md bg-soft font-mono px-2 py-0.5 text-[10px] font-semibold text-muted">
                            {e.code || "Mas-Corp-0001"}
                          </span>
                          {e.idNumber && (
                            <span className="rounded-md bg-accent-bg/80 border border-accent/20 font-mono px-2 py-0.5 text-[10px] font-semibold text-accent">
                              CI: {e.idNumber}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-hint font-medium">{e.role || "Sin cargo especificado"}</p>

                        {/* Coordenadas Bancarias */}
                        {(e.bankName || e.accountNumber) && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-soft border border-line/80 px-2 py-0.5 text-[11px] font-mono text-muted">
                              <span>{e.accountType === "Pago Móvil" ? "📱" : e.bankName === "Zelle" ? "⚡" : "🏦"}</span>
                              <strong className="text-foreground">{e.bankName || "Banco"}</strong>
                              {e.accountType && <span className="text-hint">({e.accountType})</span>}
                              {e.accountNumber && (
                                <span className="text-foreground font-bold">· {e.accountNumber}</span>
                              )}
                            </span>

                            {e.accountNumber && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(e.id, `${e.idNumber ? `CI: ${e.idNumber} · ` : ""}${e.bankName ? `${e.bankName} · ` : ""}${e.accountNumber}`)}
                                className="text-[10px] text-accent hover:underline font-medium px-1.5 py-0.5 rounded bg-card border border-line"
                                title="Copiar datos bancarios"
                              >
                                {copiedId === e.id ? "✓ Copiado" : "Copiar datos"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-14 sm:pl-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-line">
                      <div className="text-left sm:text-right">
                        <span className="tnum text-sm font-bold text-foreground block">
                          {formatCurrency(e.salary, e.currency)}
                        </span>
                        <span className="text-[10px] text-hint">quincenal</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Botón Descargar Recibo Individual PDF */}
                        <button
                          type="button"
                          onClick={() => exportPayrollReceiptPdf(e)}
                          className="inline-flex items-center gap-1 rounded-lg border border-accent/20 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent hover:bg-accent hover:text-white transition-all active:scale-95 shadow-sm"
                          title={`Descargar Recibo de Pago PDF para ${e.name}`}
                        >
                          <DownloadIcon className="h-3 w-3" />
                          <span>Recibo PDF</span>
                        </button>

                        <button
                          onClick={() => openEdit(e)}
                          aria-label={`Editar ${e.name}`}
                          className="grid h-7 w-7 place-items-center rounded-lg text-hint hover:text-foreground hover:bg-soft"
                        >
                          <EditIcon className="h-3.5 w-3.5" />
                        </button>

                        <DeleteButton
                          action={() => deleteEmployee(e.id)}
                          ariaLabel={`Eliminar ${e.name}`}
                        />

                        <ActionButton
                          label="Pagar"
                          doneLabel="Pagado"
                          action={() => payEmployee(e.id)}
                          className="px-3 py-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botón Pagar Nómina Completa */}
          {paid ? (
            <p className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-income/10 py-3.5 text-sm font-semibold text-income border border-income/20">
              <CheckIcon className="h-4 w-4" /> Nómina pagada y registrada en egresos
            </p>
          ) : (
            <button
              onClick={pay}
              disabled={employees.length === 0 || pending}
              className="w-full rounded-2xl bg-accent py-3.5 text-sm font-semibold text-white shadow-md hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40 transition-all"
            >
              {pending ? "Procesando pagos…" : "Pagar toda la nómina quincenal"}
            </button>
          )}
        </div>
      )}

      {/* PESTAÑA 2: HISTORIAL DE PAGOS DE NÓMINA */}
      {tab === "historial" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm">
            <div className="bg-soft/60 px-4 py-2.5 border-b border-line flex items-center justify-between text-xs font-medium text-muted">
              <span>Historial de Períodos & Quincenas Liquidadas</span>
              <span>Total & Recibo</span>
            </div>

            {payrollPeriods.length === 0 ? (
              <div className="py-10 text-center text-sm text-hint">
                Aún no hay períodos de nómina registrados.
              </div>
            ) : (
              <div className="divide-y divide-line">
                {payrollPeriods.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-soft/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          Quincena {p.label}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            p.status === "pagada"
                              ? "bg-income/10 text-income border border-income/20"
                              : "bg-pending/10 text-pending border border-pending/20"
                          }`}
                        >
                          {p.status === "pagada" ? "Liquidada" : "Pendiente"}
                        </span>
                      </div>
                      <p className="text-xs text-hint mt-0.5">
                        Fecha de pago: {formatDate(p.payDate)} · {p.startDate} al {p.endDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="tnum text-sm font-bold text-foreground">
                        {formatMoney(p.total)}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          exportPayrollReceiptPdf({
                            id: p.id,
                            code: "Mas-Corp-NOM-LQD",
                            name: `Nómina General (${p.label})`,
                            role: "Personal General",
                            salary: p.total,
                            currency: "USD",
                            payDate: p.payDate,
                            period: p.label,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent hover:text-white transition-all active:scale-95 shadow-sm"
                      >
                        <DownloadIcon className="h-3.5 w-3.5" />
                        <span>Recibo PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
