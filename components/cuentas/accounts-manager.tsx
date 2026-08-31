"use client";

import { useState, useTransition } from "react";
import {
  addCompanyAccount,
  updateCompanyAccount,
  deleteCompanyAccount,
  type CompanyAccount,
  type AccountType,
} from "@/lib/cuentas-actions";
import { DeleteButton } from "@/components/ui/delete-button";
import {
  PlusIcon,
  CheckIcon,
  EditIcon,
  SearchIcon,
  CopyIcon,
  DownloadIcon,
  BankIcon,
  WalletIcon,
  CreditCardIcon,
  BuildingIcon,
} from "@/components/ui/icons";
import { PdfDownloadButton } from "@/components/ui/pdf-download-button";

interface AccountsManagerProps {
  accounts: CompanyAccount[];
}

const inputClass =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent";

export function AccountsManager({ accounts }: AccountsManagerProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("banco_nacional");
  const [currency, setCurrency] = useState<"USD" | "VES" | "EUR" | "USDT">("VES");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [holderId, setHolderId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filteredAccounts = accounts.filter((acc) => {
    const matchesType =
      filterType === "all" ||
      (filterType === "nacional" && (acc.accountType === "banco_nacional" || acc.accountType === "pago_movil")) ||
      (filterType === "internacional" && (acc.accountType === "banco_internacional" || acc.accountType === "zelle")) ||
      (filterType === "crypto" && (acc.accountType === "crypto" || acc.accountType === "billetera_digital")) ||
      (filterType === "efectivo" && acc.accountType === "efectivo");

    const q = query.toLowerCase().trim();
    if (!q) return matchesType;

    const matchesQuery =
      acc.name.toLowerCase().includes(q) ||
      (acc.bankName || "").toLowerCase().includes(q) ||
      (acc.accountNumber || "").toLowerCase().includes(q) ||
      (acc.holderName || "").toLowerCase().includes(q) ||
      (acc.email || "").toLowerCase().includes(q) ||
      (acc.code || "").toLowerCase().includes(q);

    return matchesType && matchesQuery;
  });

  function openAdd() {
    setEditId(null);
    setName("");
    setAccountType("banco_nacional");
    setCurrency("VES");
    setBankName("");
    setAccountNumber("");
    setHolderName("Massivo Creativo C.A.");
    setHolderId("J-50000000-0");
    setEmail("");
    setPhone("");
    setNotes("");
    setIsDefault(false);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(acc: CompanyAccount) {
    setEditId(acc.id);
    setName(acc.name);
    setAccountType(acc.accountType);
    setCurrency(acc.currency);
    setBankName(acc.bankName || "");
    setAccountNumber(acc.accountNumber || "");
    setHolderName(acc.holderName || "");
    setHolderId(acc.holderId || "");
    setEmail(acc.email || "");
    setPhone(acc.phone || "");
    setNotes(acc.notes || "");
    setIsDefault(Boolean(acc.isDefault));
    setError(null);
    setFormOpen(true);
  }

  function submit() {
    if (!name.trim()) {
      setError("El nombre o alias de la cuenta es obligatorio.");
      return;
    }
    setError(null);
    const input = {
      name,
      accountType,
      currency,
      bankName,
      accountNumber,
      holderName,
      holderId,
      email,
      phone,
      notes,
      isDefault,
    };

    start(async () => {
      const res = editId
        ? await updateCompanyAccount(editId, input)
        : await addCompanyAccount(input);

      if (res.ok) {
        setFormOpen(false);
      } else {
        setError(res.error || "No se pudo guardar la cuenta.");
      }
    });
  }

  function copyAccountInfo(acc: CompanyAccount) {
    let text = `🏦 DATOS DE PAGO - ${acc.name.toUpperCase()}\n`;
    text += `Moneda: ${acc.currency}\n`;
    if (acc.bankName) text += `Banco: ${acc.bankName}\n`;
    if (acc.accountNumber) text += `N° Cuenta / Wallet: ${acc.accountNumber}\n`;
    if (acc.holderName) text += `Titular: ${acc.holderName}\n`;
    if (acc.holderId) text += `RIF / Cédula: ${acc.holderId}\n`;
    if (acc.phone) text += `Teléfono / Pago Móvil: ${acc.phone}\n`;
    if (acc.email) text += `Correo / Zelle: ${acc.email}\n`;
    if (acc.notes) text += `Instrucciones: ${acc.notes}\n`;

    navigator.clipboard.writeText(text.trim());
    setCopiedId(acc.id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  function getReportOptions() {
    return {
      title: "Ficha Corporativa de Cuentas Bancarias & Métodos de Pago",
      subtitle: `Total de cuentas activas: ${accounts.filter((a) => a.active).length} | Massivo Creativo`,
      filename: "Massivo Corp - Cuentas Bancarias",
      kpis: [
        { label: "Cuentas Totales", value: String(accounts.length) },
        { label: "Cuentas Activas", value: String(accounts.filter((a) => a.active).length) },
        { label: "Monedas", value: "USD · VES · EUR · USDT" },
      ],
      columns: [
        { header: "Código", dataKey: "code" },
        { header: "Cuenta / Método", dataKey: "name" },
        { header: "Tipo", dataKey: "type" },
        { header: "Moneda", dataKey: "currency", align: "center" as const },
        { header: "Datos de Recepción", dataKey: "details" },
        { header: "Titular", dataKey: "holder" },
      ],
      data: accounts.map((a) => ({
        code: a.code || "—",
        name: a.name,
        type:
          a.accountType === "banco_nacional"
            ? "Banco Nacional"
            : a.accountType === "pago_movil"
            ? "Pago Móvil"
            : a.accountType === "zelle"
            ? "Zelle"
            : a.accountType === "crypto"
            ? "Cripto (USDT)"
            : a.accountType === "efectivo"
            ? "Efectivo"
            : "Internacional",
        currency: a.currency,
        details: a.accountNumber || a.email || a.phone || "En taquilla / Custodio",
        holder: `${a.holderName || ""} ${a.holderId ? `(${a.holderId})` : ""}`.trim() || "—",
      })),
    };
  }

  return (
    <div className="space-y-6">
      {/* Header & Resumen */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <BuildingIcon className="h-6 w-6 text-accent" />
            <span>Cuentas de la Empresa</span>
          </h1>
          <p className="text-xs text-muted mt-1">
            Administra las cuentas bancarias, Pago Móvil, Zelle, wallets cripto y métodos de recepción de cobros.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PdfDownloadButton reportOptions={getReportOptions} />
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 transition-all active:scale-95"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Nueva Cuenta</span>
          </button>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-hint" />
          <input
            type="text"
            placeholder="Buscar por banco, titular, cuenta, Zelle..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl border border-line bg-card pl-10 pr-4 py-2.5 text-xs outline-none focus:border-accent shadow-sm"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: "all", label: "Todas" },
            { id: "nacional", label: "Nacionales (VES)" },
            { id: "internacional", label: "Zelle / USD" },
            { id: "crypto", label: "Cripto / Wallets" },
            { id: "efectivo", label: "Efectivo" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id)}
              className={`rounded-xl px-3.5 py-2 whitespace-nowrap font-medium transition-all ${
                filterType === f.id
                  ? "bg-accent text-white shadow-sm"
                  : "bg-card border border-line text-muted hover:bg-soft hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Cuentas */}
      {filteredAccounts.length === 0 ? (
        <div className="rounded-3xl border border-line bg-card p-12 text-center">
          <p className="text-sm font-medium text-muted">No se encontraron cuentas configuradas.</p>
          <p className="text-xs text-hint mt-1">Haz clic en &quot;Nueva Cuenta&quot; para registrar un banco o método de cobro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAccounts.map((acc) => {
            const isCopied = copiedId === acc.id;

            return (
              <div
                key={acc.id}
                className="relative rounded-2xl border border-line bg-card p-5 shadow-sm hover:border-accent/40 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top bar with badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-bg text-accent shrink-0">
                        {acc.accountType === "banco_nacional" || acc.accountType === "pago_movil" ? (
                          <BankIcon className="h-5 w-5" />
                        ) : acc.accountType === "zelle" || acc.accountType === "banco_internacional" ? (
                          <CreditCardIcon className="h-5 w-5" />
                        ) : (
                          <WalletIcon className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm text-foreground">{acc.name}</h3>
                          {acc.code && (
                            <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-mono font-medium text-hint">
                              {acc.code}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted">{acc.bankName || acc.holderName || "Cuenta Empresa"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="rounded-lg bg-soft px-2.5 py-1 text-xs font-bold text-foreground border border-line">
                        {acc.currency}
                      </span>
                      {acc.isDefault && (
                        <span className="rounded-lg bg-accent/15 text-accent px-2 py-1 text-[10px] font-semibold">
                          Principal
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Account Details Box */}
                  <div className="mt-4 space-y-1.5 rounded-xl bg-soft/60 p-3 text-xs">
                    {acc.accountNumber && (
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-muted">N° Cuenta / Wallet:</span>
                        <span className="font-mono font-medium text-foreground text-[11px] select-all">
                          {acc.accountNumber}
                        </span>
                      </div>
                    )}
                    {acc.holderName && (
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-muted">Titular:</span>
                        <span className="font-medium text-foreground">{acc.holderName}</span>
                      </div>
                    )}
                    {acc.holderId && (
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-muted">RIF / Cédula:</span>
                        <span className="font-mono font-medium text-foreground">{acc.holderId}</span>
                      </div>
                    )}
                    {acc.phone && (
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-muted">Teléfono / Pago Móvil:</span>
                        <span className="font-mono font-medium text-foreground">{acc.phone}</span>
                      </div>
                    )}
                    {acc.email && (
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-muted">Correo / Zelle:</span>
                        <span className="font-medium text-foreground">{acc.email}</span>
                      </div>
                    )}
                    {acc.notes && (
                      <div className="border-t border-line/60 pt-1.5 mt-1 text-[11px] text-hint italic">
                        💡 {acc.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                  <button
                    type="button"
                    onClick={() => copyAccountInfo(acc)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                      isCopied
                        ? "bg-paid/15 text-paid font-semibold"
                        : "bg-soft text-foreground hover:bg-line"
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <CheckIcon className="h-3.5 w-3.5" />
                        <span>¡Datos Copiados!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="h-3.5 w-3.5 text-muted" />
                        <span>Copiar Datos</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(acc)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:text-foreground hover:bg-soft transition-colors"
                      aria-label="Editar cuenta"
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                    <DeleteButton
                      action={deleteCompanyAccount.bind(null, acc.id)}
                      ariaLabel={`Eliminar cuenta ${acc.name}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Agregar / Editar Cuenta */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-line bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="font-serif text-lg font-bold text-foreground">
                {editId ? "Modificar Cuenta Bancaria" : "Registrar Nueva Cuenta"}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-full p-1.5 text-muted hover:bg-soft hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="rounded-xl bg-overdue/10 p-3 text-xs font-medium text-overdue">
                {error}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-hint font-medium mb-1">Nombre / Alias de la Cuenta *</label>
                  <input
                    type="text"
                    placeholder="Ej: Banesco Corriente, Zelle Principal"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-hint font-medium mb-1">Tipo de Método *</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as AccountType)}
                    className={inputClass}
                  >
                    <option value="banco_nacional">Banco Nacional (VES)</option>
                    <option value="pago_movil">Pago Móvil (VES)</option>
                    <option value="zelle">Zelle (USD)</option>
                    <option value="banco_internacional">Banco Internacional (USD/EUR)</option>
                    <option value="crypto">Cripto / Binance USDT</option>
                    <option value="billetera_digital">Billetera Digital (PayPal / Zinli)</option>
                    <option value="efectivo">Caja / Efectivo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-hint font-medium mb-1">Moneda *</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as any)}
                    className={inputClass}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="VES">VES (Bs.)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USDT">USDT (Cripto)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-hint font-medium mb-1">Nombre del Banco / Plataforma</label>
                  <input
                    type="text"
                    placeholder="Ej: Banesco, Mercantil, Facebank, Binance"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-hint font-medium mb-1">Número de Cuenta / Dirección Wallet</label>
                <input
                  type="text"
                  placeholder="Ej: 0134-XXXX-XX-XXXXXXXXXX o Dirección TRC-20"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-hint font-medium mb-1">Titular de la Cuenta</label>
                  <input
                    type="text"
                    placeholder="Nombre o Razón Social"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-hint font-medium mb-1">RIF / Cédula del Titular</label>
                  <input
                    type="text"
                    placeholder="Ej: J-50000000-0 o V-12345678"
                    value={holderId}
                    onChange={(e) => setHolderId(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-hint font-medium mb-1">Correo Electrónico (Zelle / PayPal)</label>
                  <input
                    type="email"
                    placeholder="pagos@massivocreativo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-hint font-medium mb-1">Teléfono (Pago Móvil / Zelle)</label>
                  <input
                    type="text"
                    placeholder="0412-0000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-hint font-medium mb-1">Instrucciones de Pago / Notas para el Cliente</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Enviar comprobante al WhatsApp o memo con número de factura..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-line text-accent focus:ring-accent"
                />
                <label htmlFor="isDefault" className="text-xs text-foreground cursor-pointer select-none">
                  Marcar como cuenta preferente / principal para cobros
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-xl border border-line px-4 py-2 text-xs font-medium text-muted hover:bg-soft transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={submit}
                className="rounded-xl bg-accent px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {pending ? "Guardando..." : editId ? "Guardar Cambios" : "Crear Cuenta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
