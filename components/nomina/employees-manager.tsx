"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  addEmployee,
  updateEmployee,
  deleteEmployee,
  payPayroll,
  payEmployee,
  approvePayrollExpense,
  type PayPayrollOptions,
} from "@/lib/nomina-actions";
import { DeleteButton } from "@/components/ui/delete-button";
import { MoneyInput } from "@/components/ui/money-input";
import {
  PlusIcon,
  CheckIcon,
  EditIcon,
  DownloadIcon,
  UsersIcon,
  PayrollIcon,
  SearchIcon,
  ReceiptIcon,
} from "@/components/ui/icons";
import { formatCurrency, type CurrencyCode } from "@/lib/currency";
import { formatDate, formatMoney } from "@/lib/format";
import { exportPayrollReceiptPdf } from "@/lib/pdf-export";
import type { Employee, PayrollPeriod, Expense } from "@/lib/mock-data";
import type { CompanyAccount } from "@/lib/cuentas-actions";
import { getExpenseBreakdown } from "@/lib/cuentas-helpers";

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
  payrollExpenses?: Expense[];
  accounts?: CompanyAccount[];
}

export function EmployeesManager({
  employees,
  payrollPeriods = [],
  payrollExpenses = [],
  accounts = [],
}: EmployeesManagerProps) {
  const [tab, setTab] = useState<"empleados" | "historial">("empleados");
  const [query, setQuery] = useState("");
  const [histQuery, setHistQuery] = useState("");
  const [histFilterWorker, setHistFilterWorker] = useState<string>("todos");
  const [histFilterStatus, setHistFilterStatus] = useState<"todos" | "aprobado" | "pendiente">("todos");

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

  const [payingTarget, setPayingTarget] = useState<Employee | "all" | null>(null);
  const [payAccountId, setPayAccountId] = useState(accounts[0]?.id || "");
  const [payStatus, setPayStatus] = useState<"pagado" | "pendiente">("pagado");
  const [payReference, setPayReference] = useState("");
  const [payPeriodLabel, setPayPeriodLabel] = useState(
    `${new Date().getDate() <= 15 ? "1ra Quincena" : "2da Quincena"} ${new Date().toLocaleDateString("es-VE", { month: "long", year: "numeric" })}`
  );
  const [payNotes, setPayNotes] = useState("");
  const [payModalError, setPayModalError] = useState<string | null>(null);

  const [approvingExpense, setApprovingExpense] = useState<Expense | null>(null);
  const [approveAccountId, setApproveAccountId] = useState(accounts[0]?.id || "");
  const [approveReference, setApproveReference] = useState("");
  const [approveNotes, setApproveNotes] = useState("");
  const [approveError, setApproveError] = useState<string | null>(null);

  const [pending, start] = useTransition();

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

  const processedPayrollExpenses = payrollExpenses.map((exp) => {
    const breakdown = getExpenseBreakdown(exp);
    const rawNote = exp.note || "";
    const isPending = breakdown.isPending;

    const matchedEmployee = employees.find(
      (emp) =>
        (exp.refId && emp.id === exp.refId) ||
        rawNote.toLowerCase().includes(emp.name.toLowerCase())
    );

    const metaMatch = rawNote.match(/\[(.*?)\]$/);
    let detailsText = "";
    let refNum = "";
    let accountName = "";

    if (metaMatch) {
      detailsText = metaMatch[1];
      const refMatch = detailsText.match(/Ref:\s*([^\s·]+)/i);
      if (refMatch) refNum = refMatch[1];
      const accFound = accounts.find((a) =>
        detailsText.toLowerCase().includes(a.name.toLowerCase())
      );
      if (accFound) accountName = accFound.name;
    }

    const cleanConcept = rawNote.replace(/\s*\[.*?\]$/, "").replace(/^Nómina\s*·\s*/i, "").trim();

    return {
      ...exp,
      matchedEmployee,
      isPending,
      cleanConcept,
      detailsText,
      refNum,
      accountName,
      statusLabel: isPending ? "Pendiente en Gastos" : "Pagado y Aprobado",
    };
  });

  const filteredHistory = processedPayrollExpenses.filter((item) => {
    if (histFilterWorker === "general") {
      if (item.matchedEmployee) return false;
    } else if (histFilterWorker !== "todos") {
      if (!item.matchedEmployee || item.matchedEmployee.id !== histFilterWorker) return false;
    }

    if (histFilterStatus === "aprobado" && item.isPending) return false;
    if (histFilterStatus === "pendiente" && !item.isPending) return false;

    const q = histQuery.toLowerCase().trim();
    if (q) {
      const matchText =
        (item.code || "").toLowerCase().includes(q) ||
        (item.note || "").toLowerCase().includes(q) ||
        (item.matchedEmployee?.name || "").toLowerCase().includes(q) ||
        (item.matchedEmployee?.idNumber || "").toLowerCase().includes(q) ||
        (item.detailsText || "").toLowerCase().includes(q) ||
        (item.refNum || "").toLowerCase().includes(q);
      if (!matchText) return false;
    }

    return true;
  });

  const totalHistoryPaid = processedPayrollExpenses
    .filter((i) => !i.isPending)
    .reduce((s, i) => s + i.amount, 0);

  const totalHistoryPending = processedPayrollExpenses
    .filter((i) => i.isPending)
    .reduce((s, i) => s + i.amount, 0);

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

  function openPayModal(target: Employee | "all") {
    setPayingTarget(target);
    setPayAccountId(accounts[0]?.id || "");
    setPayStatus("pagado");
    setPayReference("");
    setPayNotes("");
    setPayModalError(null);
  }

  function handleConfirmPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payingTarget) return;
    setPayModalError(null);

    const selectedAcc = accounts.find((a) => a.id === payAccountId);
    const options: PayPayrollOptions = {
      accountId: payAccountId || undefined,
      accountName: selectedAcc?.name || undefined,
      reference: payReference.trim() || undefined,
      periodLabel: payPeriodLabel.trim() || undefined,
      notes: payNotes.trim() || undefined,
      status: payStatus,
    };

    start(async () => {
      let r;
      if (payingTarget === "all") {
        r = await payPayroll(options);
      } else {
        r = await payEmployee(payingTarget.id, options);
      }

      if (r.ok) {
        setPayingTarget(null);
        setTab("historial");
      } else {
        setPayModalError(r.error || "No se pudo procesar el pago de nómina.");
      }
    });
  }

  function openApproveModal(exp: Expense) {
    setApprovingExpense(exp);
    setApproveAccountId(accounts[0]?.id || "");
    setApproveReference("");
    setApproveNotes("");
    setApproveError(null);
  }

  function handleConfirmApprove(e: React.FormEvent) {
    e.preventDefault();
    if (!approvingExpense) return;
    setApproveError(null);

    const selectedAcc = accounts.find((a) => a.id === approveAccountId);

    start(async () => {
      const r = await approvePayrollExpense(approvingExpense.id, {
        accountName: selectedAcc?.name,
        reference: approveReference.trim() || undefined,
        notes: approveNotes.trim() || undefined,
      });

      if (r.ok) {
        setApprovingExpense(null);
      } else {
        setApproveError(r.error || "No se pudo aprobar el pago.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setTab("empleados")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
            tab === "empleados"
              ? "bg-accent text-white shadow-sm"
              : "bg-card border border-line text-muted hover:text-foreground"
          }`}
        >
          <UsersIcon className="h-4 w-4" />
          <span>Plantilla de Trabajadores ({employees.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("historial")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
            tab === "historial"
              ? "bg-accent text-white shadow-sm"
              : "bg-card border border-line text-muted hover:text-foreground"
          }`}
        >
          <PayrollIcon className="h-4 w-4" />
          <span>Historial de Pagos & Liquidaciones ({processedPayrollExpenses.length})</span>
        </button>
      </div>

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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openPayModal("all")}
                  disabled={employees.length === 0 || pending}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-40"
                >
                  <CheckIcon className="h-4 w-4" />
                  <span>Pagar Toda la Nómina</span>
                </button>

                <button
                  onClick={openAdd}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 transition-all active:scale-95"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Agregar Empleado</span>
                </button>
              </div>
            )}
          </div>

          {formOpen && (
            <section className="space-y-4 rounded-2xl border border-line bg-card p-5 shadow-lg animate-in fade-in duration-200">
              <div className="border-b border-line pb-2">
                <h3 className="font-serif text-sm font-bold text-foreground">
                  {editId ? "Editar Información del Trabajador" : "Registrar Nuevo Trabajador"}
                </h3>
              </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted">Cargo / Rol</label>
                  <input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ej: Diseñadora..."
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted">Salario Quincenal *</label>
                  <MoneyInput
                    value={salary}
                    onChange={setSalary}
                    currency={currency}
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
                    <option value="USD">USD ($)</option>
                    <option value="VES">VES (Bs)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-soft/30 p-3.5 space-y-3">
                <p className="text-xs font-bold text-foreground">Coordenadas Bancarias</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted">Banco / Plataforma</label>
                    <input
                      list="popular-banks"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Ej: Banesco..."
                      className={inputClass}
                    />
                    <datalist id="popular-banks">
                      {POPULAR_BANKS.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted">Tipo de Cuenta</label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      className={inputClass}
                    >
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted">Número / Teléfono / Correo</label>
                    <input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="0134-... / 0414-..."
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted">Notas / Titular</label>
                  <input
                    value={bankNotes}
                    onChange={(e) => setBankNotes(e.target.value)}
                    placeholder="Ej: Cuenta a nombre de un tercero..."
                    className={inputClass}
                  />
                </div>
              </div>

              {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-line bg-soft px-4 py-2 text-xs font-semibold text-muted hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!name || salary <= 0 || pending}
                  className="rounded-xl bg-accent px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 disabled:opacity-40"
                >
                  {pending ? "Guardando…" : editId ? "Guardar Cambios" : "Registrar Empleado"}
                </button>
              </div>
            </section>
          )}

          <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm">
            <div className="bg-soft/60 px-4 py-2.5 border-b border-line flex items-center justify-between text-xs font-semibold text-muted">
              <span>Trabajador & Datos Bancarios</span>
              <span>Salario Quincenal & Acciones</span>
            </div>

            {filteredEmployees.length === 0 ? (
              <div className="py-12 text-center text-sm text-hint">
                {query ? "No se encontraron empleados coincidentes." : "No hay empleados registrados."}
              </div>
            ) : (
              <div className="divide-y divide-line">
                {filteredEmployees.map((e) => (
                  <div
                    key={e.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-soft/40 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                          {e.code || "Mas-Corp-Nom"}
                        </span>
                        <p className="text-sm font-bold text-foreground">{e.name}</p>
                        {e.idNumber && (
                          <span className="font-mono text-[11px] font-semibold text-neutral-600 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded border border-line">
                            CI: {e.idNumber}
                          </span>
                        )}
                        <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] text-muted">
                          {e.role || "Personal"}
                        </span>
                      </div>
                      {(e.bankName || e.accountNumber) && (
                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-neutral-600">
                          <span className="font-semibold text-neutral-800">
                            🏦 {e.bankName || "Banco"} ({e.accountType || "Cuenta"}):
                          </span>
                          <span className="font-mono font-medium text-neutral-900 bg-soft px-2 py-0.5 rounded border border-line">
                            {e.accountNumber || "—"}
                          </span>
                          {e.accountNumber && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(e.id, `${e.name} - ${e.idNumber || ""} - ${e.bankName || ""} - ${e.accountNumber}`)}
                              className="text-[10px] font-semibold text-accent hover:underline active:scale-95"
                            >
                              {copiedId === e.id ? "✓ Copiado" : "Copiar datos"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
                      <div className="text-left sm:text-right">
                        <p className="tnum text-base font-bold text-foreground">
                          {formatCurrency(e.salary, e.currency)}
                        </p>
                        <p className="text-[10px] text-hint">quincenal</p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            exportPayrollReceiptPdf({
                              id: e.id,
                              code: e.code,
                              name: e.name,
                              role: e.role,
                              salary: e.salary,
                              currency: e.currency,
                              idNumber: e.idNumber,
                              bankName: e.bankName,
                              accountType: e.accountType,
                              accountNumber: e.accountNumber,
                              payDate: new Date().toISOString().slice(0, 10),
                            })
                          }
                          title="Descargar Recibo Individual PDF"
                          className="inline-flex items-center gap-1 rounded-xl border border-line bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-soft transition-all shadow-2xs"
                        >
                          <DownloadIcon className="h-3.5 w-3.5 text-accent" />
                          <span>Recibo</span>
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
                        <button
                          type="button"
                          onClick={() => openPayModal(e)}
                          className="inline-flex items-center gap-1 rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/90 transition-all shadow-sm active:scale-95"
                        >
                          Pagar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "historial" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
              <p className="text-xs text-muted font-medium">Total Liquidado & Aprobado</p>
              <p className="tnum text-xl font-bold text-income mt-1">
                {formatMoney(totalHistoryPaid)}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
              <p className="text-xs text-muted font-medium">Pendiente por Aprobar</p>
              <p className="tnum text-xl font-bold text-pending mt-1">
                {formatMoney(totalHistoryPending)}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
              <p className="text-xs text-muted font-medium">Total Pagos en Historial</p>
              <p className="tnum text-xl font-bold text-foreground mt-1">
                {processedPayrollExpenses.length}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-hint" />
              <input
                type="text"
                value={histQuery}
                onChange={(e) => setHistQuery(e.target.value)}
                placeholder="Buscar por código, trabajador, banco o referencia..."
                className="w-full rounded-xl border border-line bg-card pl-10 pr-4 py-2 text-xs outline-none focus:border-accent"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={histFilterWorker}
                onChange={(e) => setHistFilterWorker(e.target.value)}
                className="rounded-xl border border-line bg-card px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-accent"
              >
                <option value="todos">Todos los Trabajadores</option>
                <option value="general">Liquidaciones Generales</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.code || "Nom"})
                  </option>
                ))}
              </select>
              <select
                value={histFilterStatus}
                onChange={(e) => setHistFilterStatus(e.target.value as any)}
                className="rounded-xl border border-line bg-card px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-accent"
              >
                <option value="todos">Todos los Estados</option>
                <option value="aprobado">🟢 Pagados y Aprobados</option>
                <option value="pendiente">🟡 Pendientes en Gastos</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm">
            <div className="bg-soft/60 px-4 py-2.5 border-b border-line flex items-center justify-between text-xs font-semibold text-muted">
              <span>Registro de Pago / Trabajador</span>
              <span>Monto, Estado en Gastos & Recibo</span>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="py-12 text-center text-sm text-hint space-y-1">
                <p>No se encontraron pagos de nómina con los filtros seleccionados.</p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-soft/40 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-muted bg-soft px-2 py-0.5 rounded border border-line">
                          {item.code || "Gasto"}
                        </span>
                        <p className="text-sm font-bold text-foreground">
                          {item.matchedEmployee?.name || item.cleanConcept || "Liquidación de Nómina"}
                        </p>
                        <span className="text-xs text-hint">
                          · {formatDate(item.date)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
                      <div className="text-left sm:text-right">
                        <p className="tnum text-base font-bold text-foreground">
                          {formatMoney(item.amount)}
                        </p>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            item.isPending
                              ? "bg-pending/10 text-pending border border-pending/20"
                              : "bg-income/10 text-income border border-income/20"
                          }`}
                        >
                          {item.statusLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            exportPayrollReceiptPdf({
                              id: item.id,
                              code: item.code,
                              name: item.matchedEmployee?.name || item.cleanConcept || "Liquidación General de Nómina",
                              role: item.matchedEmployee?.role || "Personal",
                              salary: item.amount,
                              currency: item.currency || "USD",
                              idNumber: item.matchedEmployee?.idNumber,
                              bankName: item.matchedEmployee?.bankName || item.accountName,
                              accountType: item.matchedEmployee?.accountType,
                              accountNumber: item.matchedEmployee?.accountNumber || item.refNum,
                              payDate: item.date,
                              period: item.detailsText || "Liquidación Quincenal",
                            })
                          }
                          title="Descargar Comprobante / Recibo PDF"
                          className="inline-flex items-center gap-1 rounded-xl border border-line bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-soft transition-all shadow-2xs"
                        >
                          <DownloadIcon className="h-3.5 w-3.5 text-accent" />
                          <span>Recibo</span>
                        </button>
                        <Link
                          href="/gastos"
                          title="Ver en el módulo de Gastos"
                          className="inline-flex items-center gap-1 rounded-xl border border-line bg-card px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-soft transition-all"
                        >
                          <ReceiptIcon className="h-3.5 w-3.5" />
                          <span>Gastos</span>
                        </Link>
                        {item.isPending && (
                          <button
                            type="button"
                            onClick={() => openApproveModal(item)}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                          >
                            <CheckIcon className="h-3.5 w-3.5" />
                            <span>Aprobar</span>
                          </button>
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

      {payingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-card p-6 shadow-2xl space-y-4">
            <div className="border-b border-line pb-3 flex items-start justify-between">
              <div>
                <h3 className="font-serif text-base font-bold text-foreground">
                  {payingTarget === "all"
                    ? "Liquidar Toda la Nómina Quincenal"
                    : `Dispersar Pago a ${payingTarget.name}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPayingTarget(null)}
                className="rounded-lg p-1 text-hint hover:text-foreground hover:bg-soft"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted">Cuenta de Origen de los Fondos *</label>
                <select
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-accent"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.bankName || acc.accountType}) · {acc.currency}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted">Estado del Registro de Egreso</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayStatus("pagado")}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      payStatus === "pagado"
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-semibold shadow-sm"
                        : "border-line bg-card text-muted hover:bg-soft"
                    }`}
                  >
                    <p className="text-xs">🟢 Pagado & Aprobado</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayStatus("pendiente")}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      payStatus === "pendiente"
                        ? "border-amber-600 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-semibold shadow-sm"
                        : "border-line bg-card text-muted hover:bg-soft"
                    }`}
                  >
                    <p className="text-xs">🟡 Enviar a Gastos</p>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Referencia (Opcional)</label>
                  <input
                    type="text"
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    placeholder="Ej: 489218"
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-mono outline-none focus:border-accent"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Período / Quincena</label>
                  <input
                    type="text"
                    value={payPeriodLabel}
                    onChange={(e) => setPayPeriodLabel(e.target.value)}
                    placeholder="Ej: 1ra Quincena"
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent"
                  />
                </div>
              </div>

              {payModalError && (
                <p className="text-xs text-rose-500 font-semibold">{payModalError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setPayingTarget(null)}
                  className="rounded-xl border border-line bg-soft px-4 py-2 text-xs font-semibold text-muted hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-accent px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 disabled:opacity-40"
                >
                  {pending ? "Procesando pago..." : "Confirmar y Registrar Pago"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {approvingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl space-y-4">
            <div className="border-b border-line pb-3 flex items-start justify-between">
              <div>
                <h3 className="font-serif text-base font-bold text-foreground">
                  Aprobar Pago de Nómina
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApprovingExpense(null)}
                className="rounded-lg p-1 text-hint hover:text-foreground hover:bg-soft"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmApprove} className="space-y-4">
              {accounts.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Cuenta desde donde se pagó *</label>
                  <select
                    value={approveAccountId}
                    onChange={(e) => setApproveAccountId(e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-accent"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.bankName || acc.accountType}) · {acc.currency}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted">Referencia Bancaria / Comprobante</label>
                <input
                  type="text"
                  value={approveReference}
                  onChange={(e) => setApproveReference(e.target.value)}
                  placeholder="Ej: 9481923"
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs font-mono outline-none focus:border-accent"
                />
              </div>

              {approveError && (
                <p className="text-xs text-rose-500 font-semibold">{approveError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setApprovingExpense(null)}
                  className="rounded-xl border border-line bg-soft px-4 py-2 text-xs font-semibold text-muted hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"
                >
                  {pending ? "Aprobando..." : "Confirmar y Aprobar Pago"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
