"use client";

import { useState, useTransition } from "react";
import { saveSystemConfig } from "@/lib/config-actions";
import { PdfLivePreview } from "@/components/configuracion/pdf-live-preview";
import { SettingsIcon, CheckIcon, ReceiptIcon, PayrollIcon, RepeatIcon } from "@/components/ui/icons";
import type { SystemConfig } from "@/lib/config";

const COLOR_PRESETS = [
  { label: "Azul Índigo (Oficial)", value: "#2C21FF" },
  { label: "Violeta Profundo", value: "#4F46E5" },
  { label: "Azul Océano", value: "#0284C7" },
  { label: "Verde Esmeralda", value: "#059669" },
  { label: "Ámbar Corporativo", value: "#D97706" },
  { label: "Negro Ejecutivo", value: "#18181B" },
];

interface ConfiguracionTabsProps {
  initialConfig: SystemConfig;
  canEdit: boolean;
}

export function ConfiguracionTabs({ initialConfig, canEdit }: ConfiguracionTabsProps) {
  const [activeTab, setActiveTab] = useState<"contabilizadores" | "pdf">("contabilizadores");
  const [config, setConfig] = useState<SystemConfig>(initialConfig);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateField<K extends keyof SystemConfig>(key: K, value: SystemConfig[K]) {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setMsg(null);
    setError(null);

    startTransition(async () => {
      const res = await saveSystemConfig(config);
      if (res.ok) {
        setMsg("Configuración guardada y aplicada a todo el sistema.");
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
      <div className="flex gap-2 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("contabilizadores")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
            activeTab === "contabilizadores"
              ? "bg-accent text-white shadow-sm"
              : "bg-card border border-line text-muted hover:text-foreground"
          }`}
        >
          <SettingsIcon className="h-4 w-4" />
          <span>Contabilizadores Mas-Corp-</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pdf")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
            activeTab === "pdf"
              ? "bg-accent text-white shadow-sm"
              : "bg-card border border-line text-muted hover:text-foreground"
          }`}
        >
          <ReceiptIcon className="h-4 w-4" />
          <span>Personalización PDF & Vista Previa</span>
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
                <h2 className="font-serif text-[15px] font-medium">Nomenclatura Base del Sistema</h2>
                <p className="text-xs text-muted">
                  Configura el prefijo corporativo y los ceros de relleno (hasta 4 dígitos) para correlativos.
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
                        invoicePrefix: val,
                        expensePrefix: val,
                        employeePrefix: val,
                        servicePrefix: val,
                      }));
                    }}
                    placeholder="Mas-Corp-"
                    className="w-full rounded-xl border border-line bg-soft px-3.5 py-2.5 text-sm font-mono outline-none focus:border-accent"
                  />
                  <p className="mt-1 text-[11px] text-hint">Ejemplo: Mas-Corp-</p>
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
                    <option value={4}>4 dígitos con ceros (ej: Mas-Corp-0001)</option>
                    <option value={3}>3 dígitos con ceros (ej: Mas-Corp-001)</option>
                    <option value={2}>2 dígitos con ceros (ej: Mas-Corp-01)</option>
                    <option value={1}>1 dígito sin relleno (ej: Mas-Corp-1)</option>
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

        {/* PESTAÑA 2: PERSONALIZACIÓN DE PDF */}
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

                {/* Color Primario */}
                <div>
                  <label className="mb-1.5 block text-xs text-muted">Color de Encabezados y Tablas</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {COLOR_PRESETS.map((col) => (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => updateField("pdfPrimaryColor", col.value)}
                        className={`h-7 w-7 rounded-full border-2 transition-all ${
                          config.pdfPrimaryColor === col.value
                            ? "border-foreground scale-110 shadow-md"
                            : "border-transparent opacity-80 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: col.value }}
                        title={col.label}
                      />
                    ))}
                    <input
                      type="color"
                      value={config.pdfPrimaryColor}
                      onChange={(e) => updateField("pdfPrimaryColor", e.target.value)}
                      className="h-7 w-8 cursor-pointer rounded border border-line bg-transparent"
                    />
                  </div>
                </div>

                {/* Interruptor BCV */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium">Mostrar tasas oficiales del día (BCV)</span>
                  <input
                    type="checkbox"
                    checked={config.pdfShowBcvRates}
                    onChange={(e) => updateField("pdfShowBcvRates", e.target.checked)}
                    className="h-4 w-4 rounded text-accent focus:ring-accent"
                  />
                </div>

                {/* Pie de página legal */}
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
              {pending ? "Guardando Configuración..." : "Guardar Toda la Configuración"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
