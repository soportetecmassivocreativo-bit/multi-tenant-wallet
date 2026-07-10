"use client";

import { useState, useTransition } from "react";
import { MoneyInput } from "@/components/ui/money-input";
import { updateCompany } from "@/lib/company-actions";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency";
import type { Company } from "@/lib/data";

const inputClass =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60";

export function CompanyForm({
  company,
  canEdit,
}: {
  company: Company;
  canEdit: boolean;
}) {
  const [name, setName] = useState(company.name);
  const [rif, setRif] = useState(company.rif);
  const [currency, setCurrency] = useState<CurrencyCode>(
    (company.defaultCurrency as CurrencyCode) || "USD",
  );
  const [taxPct, setTaxPct] = useState(Math.round(company.defaultTaxRate * 100));
  const [address, setAddress] = useState(company.address);
  const [phone, setPhone] = useState(company.phone);
  const [email, setEmail] = useState(company.email);
  const [logoUrl, setLogoUrl] = useState(company.logoUrl);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    setSaved(false);
    start(async () => {
      const r = await updateCompany({
        name,
        rif,
        defaultCurrency: currency,
        defaultTaxRate: taxPct / 100,
        address,
        phone,
        email,
        logoUrl,
      });
      if (r.ok) setSaved(true);
      else setError(r.error ?? "No se pudo guardar.");
    });
  }

  return (
    <div className="space-y-3">
      <Field label="Nombre">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canEdit}
          className={inputClass}
        />
      </Field>
      <Field label="RIF">
        <input
          value={rif}
          onChange={(e) => setRif(e.target.value)}
          disabled={!canEdit}
          className={inputClass}
        />
      </Field>
      <div className="flex gap-2">
        <Field label="Moneda por defecto" className="flex-1">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            disabled={!canEdit}
            className={inputClass}
          >
            {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => (
              <option key={c} value={c}>
                {CURRENCIES[c].symbol} {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="IVA por defecto %" className="w-32">
          <MoneyInput
            value={taxPct}
            onValueChange={setTaxPct}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Dirección">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={!canEdit}
          placeholder="Opcional"
          className={inputClass}
        />
      </Field>
      <div className="flex gap-2">
        <Field label="Teléfono" className="flex-1">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={!canEdit}
            placeholder="Opcional"
            className={inputClass}
          />
        </Field>
        <Field label="Correo" className="flex-1">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!canEdit}
            placeholder="Opcional"
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="URL del logo (para el PDF)">
        <input
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          disabled={!canEdit}
          placeholder="https://… (opcional)"
          className={inputClass}
        />
      </Field>

      {error && (
        <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-lg bg-income/10 px-3 py-2 text-xs text-income">
          Cambios guardados.
        </p>
      )}

      {canEdit ? (
        <button
          onClick={submit}
          disabled={pending}
          className="w-full rounded-full bg-accent py-3 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-40"
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      ) : (
        <p className="text-center text-xs text-hint">
          Solo el administrador puede editar la empresa.
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <label className="text-[11px] text-muted">{label}</label>
      {children}
    </div>
  );
}
