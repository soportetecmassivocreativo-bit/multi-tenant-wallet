"use client";

import { useState, useEffect, useTransition } from "react";
import { saveSystemConfig } from "@/lib/config-actions";
import { PdfLivePreview } from "@/components/configuracion/pdf-live-preview";
import {
  SettingsIcon,
  CheckIcon,
  ReceiptIcon,
  PayrollIcon,
  RepeatIcon,
  BuildingIcon,
} from "@/components/ui/icons";
import type { SystemConfig } from "@/lib/config";

const BRAND_PALETTES = [
  { label: "Azul Índigo (Massivo)", primary: "#2C21FF", accent: "#3B82F6" },
  { label: "Azul Real Corporativo", primary: "#1E40AF", accent: "#3B82F6" },
  { label: "Violeta Profundo", primary: "#6D28D9", accent: "#8B5CF6" },
  { label: "Verde Esmeralda", primary: "#047857", accent: "#10B981" },
  { label: "Ámbar / Dorado", primary: "#B45309", accent: "#F59E0B" },
  { label: "Rojo Carmesí", primary: "#B91C1C", accent: "#EF4444" },
  { label: "Negro Ejecutivo", primary: "#09090B", accent: "#27272A" },
];

interface ConfiguracionTabsProps {
  initialConfig: SystemConfig;
  canEdit: boolean;
}

export function ConfiguracionTabs({ initialConfig, canEdit }: ConfiguracionTabsProps) {
  const [activeTab, setActiveTab] = useState<"contabilizadores" | "branding" | "pdf">("contabilizadores");
  const [config, setConfig] = useState<SystemConfig>(initialConfig);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  function updateField<K extends keyof SystemConfig>(key: K, value: SystemConfig[K]) {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>, field: "systemLogoUrl" | "pdfLogoUrl") {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convertir a base64 para persistir localmente y en base de datos sin depender de storage
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      updateField(field, base64);
    };
    reader.readAsDataURL(file);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setMsg(null);
    setError(null);

    startTransition(async () => {
      const res = await saveSystemConfig(config);
      if (res.ok) {
        setMsg("¡Configuración y personalización de la empresa guardadas con éxito!");
      } else {
        setError(res.error || "No se pudo guardar la configuración.");
      }
      setTimeout(() => {
        setMsg(null);
        setError(null);
      }, 5000);
    });
  }

  return (
    <div className="space-y-6">
      {/* Selector de pestañas */}
      <div className="flex flex-wrap gap-2 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("contabilizadores")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
            activeTab === "contabilizadores"
              ? "bg-accent text-white shadow-sm font-semibold"
              : "bg-card border border-line text-muted hover:text-foreground"
          }`}
        >
          <SettingsIcon className="h-4 w-4" />
          <span>Contabilizadores & Prefijos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("branding")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
            activeTab === "branding"
              ? "bg-accent text-white shadow-sm font-semibold"
              : "bg-card border border-line text-muted hover:text-foreground"
          }`}
        >
          <BuildingIcon className="h-4 w-4" />
          <span>Logos, Colores & Branding</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pdf")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
            activeTab === "pdf"
              ? "bg-accent text-white shadow-sm font-semibold"
              : "bg-card border border-line text-muted hover:text-foreground"
          }`}
        >
          <ReceiptIcon className="h-4 w-4" />
          <span>Reportes PDF & Membrete</span>
        </button>
      </div>

      {msg && (
        <div className="rounded-xl border border-income/20 bg-income/10 px-3.5 py-2.5 text-xs font-medium text-income flex items-center gap-2">
          <CheckIcon className="h-4 w-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-overdue/20 bg-overdue/10 px-3.5 py-2.5 text-xs font-medium text-overdue">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* PESTAÑA 1: CONTABILIZADORES */}
        {activeTab === "contabilizadores" && (
          <div className="space-y-5">
            <section className="rounded-2xl border border-line bg-card p-4 space-y-4">
              <div>
                <h2 className="font-serif text-[15px] font-medium">Nomenclatura Base de la Empresa</h2>
                <p className="text-xs text-muted">
                  Configura el prefijo de los códigos y la cantidad de ceros de relleno (hasta 4 dígitos).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="mb-1 block text-xs text-muted">Prefijo General</label>
                  <input
                    type="text"
                    value={config.basePrefix}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConfig((prev) => ({
                        ...prev,
                        basePrefix: val,
                        invoicePrefix: val.includes("-") ? `${val}FAC-` : `${val}-FAC-`,
                        expensePrefix: val.includes("-") ? `${val}GAS-` : `${val}-GAS-`,
                        employeePrefix: val.includes("-") ? `${val}NOM-` : `${val}-NOM-`,
                        servicePrefix: val.includes("-") ? `${val}SRV-` : `${val}-SRV-`,
                      }));
                    }}
                    placeholder="Mas-Corp- o MiEmpresa-"
                    className="w-full rounded-xl border border-line bg-soft px-3.5 py-2.5 text-sm font-mono outline-none focus:border-accent"
                  />
                  <p className="mt-1 text-[11px] text-hint">Ejemplo: Mas-Corp- o EmpresaX-</p>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted">
                    Dígitos de relleno con ceros (hasta 4 dígitos)
                  </label>
                  <select
                    value={config.codeDigits}
                    onChange={(e) => updateField("codeDigits", Number(e.target.value))}
                    className="w-full rounded-xl border border-line bg-soft px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                  >
                    <option value={4}>4 dígitos con ceros (ej: 0001)</option>
                    <option value={3}>3 dígitos con ceros (ej: 001)</option>
                    <option value={2}>2 dígitos con ceros (ej: 01)</option>
                    <option value={1}>1 dígito sin relleno (ej: 1)</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Contadores correlativos específicos por módulo */}
            <section className="rounded-2xl border border-line bg-card p-4 space-y-4">
              <h2 className="font-serif text-[15px] font-medium">Contabilizadores Correlativos por Módulo</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Facturas */}
                <div className="rounded-xl border border-line bg-soft/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      <ReceiptIcon className="h-4 w-4 text-accent" /> Facturas & Cobros
                    </span>
                    <span className="font-mono text-xs font-semibold text-accent">
                      {config.invoicePrefix}
                      {String(config.invoiceCounter).padStart(config.codeDigits, "0")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted">Prefijo</label>
                      <input
                        type="text"
                        value={config.invoicePrefix}
                        onChange={(e) => updateField("invoicePrefix", e.target.value)}
                        className="w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted">Próximo Nº</label>
                      <input
                        type="number"
                        min={1}
                        value={config.invoiceCounter}
                        onChange={(e) => updateField("invoiceCounter", Number(e.target.value))}
                        className="w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Gastos */}
                <div className="rounded-xl border border-line bg-soft/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      <ReceiptIcon className="h-4 w-4 text-overdue" /> Gastos & Egresos
                    </span>
                    <span className="font-mono text-xs font-semibold text-overdue">
                      {config.expensePrefix}
                      {String(config.expenseCounter).padStart(config.codeDigits, "0")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted">Prefijo</label>
                      <input
                        type="text"
                        value={config.expensePrefix}
                        onChange={(e) => updateField("expensePrefix", e.target.value)}
                        className="w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted">Próximo Nº</label>
                      <input
                        type="number"
                        min={1}
                        value={config.expenseCounter}
                        onChange={(e) => updateField("expenseCounter", Number(e.target.value))}
                        className="w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Nómina / Empleados */}
                <div className="rounded-xl border border-line bg-soft/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      <PayrollIcon className="h-4 w-4 text-purple-600" /> Nómina (Código Empleado)
                    </span>
                    <span className="font-mono text-xs font-semibold text-purple-600">
                      {config.employeePrefix}
                      {String(config.employeeCounter).padStart(config.codeDigits, "0")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted">Prefijo</label>
                      <input
                        type="text"
                        value={config.employeePrefix}
                        onChange={(e) => updateField("employeePrefix", e.target.value)}
                        className="w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted">Próximo Código</label>
                      <input
                        type="number"
                        min={1}
                        value={config.employeeCounter}
                        onChange={(e) => updateField("employeeCounter", Number(e.target.value))}
                        className="w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Servicios */}
                <div className="rounded-xl border border-line bg-soft/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      <RepeatIcon className="h-4 w-4 text-income" /> Servicios (Código Servicio)
                    </span>
                    <span className="font-mono text-xs font-semibold text-income">
                      {config.servicePrefix}
                      {String(config.serviceCounter).padStart(config.codeDigits, "0")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted">Prefijo</label>
                      <input
                        type="text"
                        value={config.servicePrefix}
                        onChange={(e) => updateField("servicePrefix", e.target.value)}
                        className="w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted">Próximo Código</label>
                      <input
                        type="number"
                        min={1}
                        value={config.serviceCounter}
                        onChange={(e) => updateField("serviceCounter", Number(e.target.value))}
                        className="w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* PESTAÑA 2: LOGOS, COLORES & BRANDING */}
        {activeTab === "branding" && (
          <div className="space-y-5">
            <section className="rounded-2xl border border-line bg-card p-4 space-y-4">
              <div>
                <h2 className="font-serif text-[15px] font-medium">Logotipos Oficiales de la Empresa</h2>
                <p className="text-xs text-muted">
                  Personaliza el logo que aparece en la barra superior del sistema y en las facturas PDF.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                {/* Logo del Sistema */}
                <div className="rounded-xl border border-line bg-soft/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Logo de la Aplicación / Web</label>
                    <span className="text-[10px] text-hint">Header & Sidebar</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-14 w-28 rounded-xl border border-line bg-card grid place-items-center overflow-hidden p-1">
                      {config.systemLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={config.systemLogoUrl} alt="Logo Sistema" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-hint">Sin logo</span>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, "systemLogoUrl")}
                        className="w-full text-xs text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-accent file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-white hover:file:bg-accent/90 cursor-pointer"
                      />
                      <input
                        type="text"
                        placeholder="O pega la URL de la imagen..."
                        value={config.systemLogoUrl}
                        onChange={(e) => updateField("systemLogoUrl", e.target.value)}
                        className="w-full rounded-lg border border-line bg-card px-2.5 py-1 text-xs outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                </div>

                {/* Logo para Facturas PDF */}
                <div className="rounded-xl border border-line bg-soft/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Logo para Facturas & Reportes PDF</label>
                    <span className="text-[10px] text-hint">Membrete Oficial</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-14 w-28 rounded-xl border border-line bg-card grid place-items-center overflow-hidden p-1">
                      {config.pdfLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={config.pdfLogoUrl} alt="Logo PDF" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-hint">Sin logo</span>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, "pdfLogoUrl")}
                        className="w-full text-xs text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-accent file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-white hover:file:bg-accent/90 cursor-pointer"
                      />
                      <input
                        type="text"
                        placeholder="O pega la URL del logo PDF..."
                        value={config.pdfLogoUrl}
                        onChange={(e) => updateField("pdfLogoUrl", e.target.value)}
                        className="w-full rounded-lg border border-line bg-card px-2.5 py-1 text-xs outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Colores y Paleta de la Empresa */}
            <section className="rounded-2xl border border-line bg-card p-4 space-y-4">
              <div>
                <h2 className="font-serif text-[15px] font-medium">Paleta de Colores de la Marca</h2>
                <p className="text-xs text-muted">
                  Define el color corporativo que identifica a esta empresa en sus encabezados, botones y documentos.
                </p>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-2">
                {BRAND_PALETTES.map((pal) => (
                  <button
                    key={pal.label}
                    type="button"
                    onClick={() => {
                      updateField("brandPrimaryColor", pal.primary);
                      updateField("brandAccentColor", pal.accent);
                      updateField("pdfPrimaryColor", pal.primary);
                    }}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-xs transition-all ${
                      config.brandPrimaryColor === pal.primary
                        ? "border-accent bg-accent-bg text-accent font-semibold shadow-sm ring-1 ring-accent"
                        : "border-line bg-soft text-foreground hover:bg-card"
                    }`}
                  >
                    <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: pal.primary }} />
                    <span>{pal.label}</span>
                  </button>
                ))}
              </div>

              {/* Selector personalizado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="mb-1 block text-xs text-muted">Color Primario Hexadecimal</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.brandPrimaryColor || "#2C21FF"}
                      onChange={(e) => {
                        updateField("brandPrimaryColor", e.target.value);
                        updateField("pdfPrimaryColor", e.target.value);
                      }}
                      className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-transparent p-1"
                    />
                    <input
                      type="text"
                      value={config.brandPrimaryColor || "#2C21FF"}
                      onChange={(e) => {
                        updateField("brandPrimaryColor", e.target.value);
                        updateField("pdfPrimaryColor", e.target.value);
                      }}
                      className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs font-mono outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted">Moneda e Impuestos Predeterminados</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={config.defaultCurrency || "USD"}
                      onChange={(e) => updateField("defaultCurrency", e.target.value)}
                      className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs font-medium outline-none focus:border-accent"
                    >
                      <option value="USD">USD ($) Dólares</option>
                      <option value="VES">VES (Bs) Bolívares</option>
                      <option value="EUR">EUR (€) Euros</option>
                    </select>

                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={config.defaultTaxRate || 16}
                        onChange={(e) => updateField("defaultTaxRate", Number(e.target.value))}
                        className="w-full rounded-xl border border-line bg-soft px-3 py-2 text-xs outline-none focus:border-accent"
                      />
                      <span className="absolute right-3 top-2 text-xs text-hint">% IVA</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* PESTAÑA 3: PERSONALIZACIÓN DE PDF & REPORTES */}
        {activeTab === "pdf" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulario de opciones */}
            <div className="space-y-4">
              <section className="rounded-2xl border border-line bg-card p-4 space-y-3.5">
                <h2 className="font-serif text-[15px] font-medium">Membrete y Datos del Reporte</h2>

                <div>
                  <label className="mb-1 block text-xs text-muted">Nombre de la Empresa en PDF</label>
                  <input
                    type="text"
                    value={config.pdfCompanyName}
                    onChange={(e) => updateField("pdfCompanyName", e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3.5 py-2 text-xs outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted">RIF Fiscal</label>
                  <input
                    type="text"
                    value={config.pdfCompanyRif}
                    onChange={(e) => updateField("pdfCompanyRif", e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3.5 py-2 text-xs outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted">Subtítulo / Lema de Encabezado</label>
                  <input
                    type="text"
                    value={config.pdfHeaderSubtitle}
                    onChange={(e) => updateField("pdfHeaderSubtitle", e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3.5 py-2 text-xs outline-none focus:border-accent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-muted">Teléfono de Contacto</label>
                    <input
                      type="text"
                      value={config.pdfContactPhone}
                      onChange={(e) => updateField("pdfContactPhone", e.target.value)}
                      className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted">Correo de Contacto</label>
                    <input
                      type="text"
                      value={config.pdfContactEmail}
                      onChange={(e) => updateField("pdfContactEmail", e.target.value)}
                      className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent"
                    />
                  </div>
                </div>

                {/* Tipo de Hoja / Tamaño de Papel */}
                <div>
                  <label className="mb-1.5 block text-xs text-muted font-medium">
                    Tipo de Hoja / Formato de Papel
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "a4", name: "A4", sub: "210 × 297 mm" },
                      { id: "letter", name: "Carta", sub: "216 × 279 mm" },
                      { id: "legal", name: "Oficio", sub: "216 × 356 mm" },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => updateField("pdfPaperSize", fmt.id as "a4" | "letter" | "legal")}
                        className={`rounded-xl border p-2 text-left transition-all ${
                          (config.pdfPaperSize || "a4") === fmt.id
                            ? "border-accent bg-accent-bg text-accent shadow-sm font-semibold"
                            : "border-line bg-card hover:bg-soft text-foreground"
                        }`}
                      >
                        <p className="text-xs">{fmt.name}</p>
                        <p className="text-[10px] text-muted">{fmt.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Términos y Condiciones */}
                <div>
                  <label className="mb-1 block text-xs text-muted">Términos y Condiciones / Nota Legal</label>
                  <textarea
                    rows={2}
                    value={config.pdfTermsAndConditions || ""}
                    onChange={(e) => updateField("pdfTermsAndConditions", e.target.value)}
                    placeholder="Nota que aparece al pie de la factura..."
                    className="w-full rounded-xl border border-line bg-card px-3.5 py-2 text-xs outline-none focus:border-accent"
                  />
                </div>

                {/* Interruptor BCV */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium">Mostrar tasas oficiales del día (BCV) en el reporte</span>
                  <input
                    type="checkbox"
                    checked={config.pdfShowBcvRates}
                    onChange={(e) => updateField("pdfShowBcvRates", e.target.checked)}
                    className="h-4 w-4 rounded text-accent focus:ring-accent cursor-pointer"
                  />
                </div>

                {/* Pie de página */}
                <div>
                  <label className="mb-1 block text-xs text-muted">Pie de Página / Confidencialidad</label>
                  <textarea
                    rows={2}
                    value={config.pdfFooterText}
                    onChange={(e) => updateField("pdfFooterText", e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3.5 py-2 text-xs outline-none focus:border-accent"
                  />
                </div>
              </section>
            </div>

            {/* Vista previa en vivo */}
            <div className="lg:sticky lg:top-6 self-start">
              <PdfLivePreview config={config} />
            </div>
          </div>
        )}

        {/* Botón de guardado */}
        {canEdit && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white shadow-md hover:opacity-90 disabled:opacity-50 active:scale-95 transition-all"
            >
              {pending ? "Guardando Configuración..." : "Guardar Personalización de la Empresa"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
