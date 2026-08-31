"use client";

import { useState, useTransition } from "react";
import {
  BuildingIcon,
  SearchIcon,
  PlusIcon,
  CheckIcon,
  EditIcon,
  TrashIcon,
} from "@/components/ui/icons";
import type { TenantConfig } from "@/lib/supabase/tenants-config";
import { TENANT_COOKIE_NAME } from "@/lib/supabase/tenants-config";
import {
  createAdminTenant,
  updateAdminTenant,
  deleteAdminTenant,
  testSupabaseConnection,
} from "@/lib/tenant-admin-actions";

interface TenantsMasterManagerProps {
  tenants: TenantConfig[];
  activeTenantSlug: string;
}

export function TenantsMasterManager({
  tenants,
  activeTenantSlug,
}: TenantsMasterManagerProps) {
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantConfig | null>(null);
  const [connectionStatuses, setConnectionStatuses] = useState<
    Record<string, { ok: boolean; message: string; latencyMs: number } | "testing">
  >({});
  const [pending, startTransition] = useTransition();

  // Form State para Crear
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newAnonKey, setNewAnonKey] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newRif, setNewRif] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [modalTestStatus, setModalTestStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [testingModal, setTestingModal] = useState(false);

  // Form State para Editar
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editAnonKey, setEditAnonKey] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.slug.toLowerCase().includes(query.toLowerCase()) ||
      (t.supabaseUrl && t.supabaseUrl.toLowerCase().includes(query.toLowerCase()))
  );

  function handleAutoSlug(name: string) {
    setNewName(name);
    if (!newSlug || newSlug === slugify(newName)) {
      setNewSlug(slugify(name));
    }
  }

  function slugify(text: string) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function handleTestConnection(slug: string, url: string, key: string) {
    setConnectionStatuses((prev) => ({ ...prev, [slug]: "testing" }));
    const res = await testSupabaseConnection(url, key);
    setConnectionStatuses((prev) => ({ ...prev, [slug]: res }));
  }

  async function handleTestModalConnection(url: string, key: string) {
    if (!url || !key) {
      setModalTestStatus({
        ok: false,
        message: "Ingresa la URL y la Anon Key para probar.",
      });
      return;
    }
    setTestingModal(true);
    setModalTestStatus(null);
    const res = await testSupabaseConnection(url, key);
    setTestingModal(false);
    setModalTestStatus({ ok: res.ok, message: res.message });
  }

  function handleOpenTenant(slug: string) {
    document.cookie = `${TENANT_COOKIE_NAME}=${encodeURIComponent(slug)}; path=/; max-age=${
      60 * 60 * 24 * 365
    }; SameSite=Lax`;
    window.location.href = `/dashboard?tenant=${slug}`;
  }

  function startEdit(t: TenantConfig) {
    setEditingTenant(t);
    setEditName(t.name);
    setEditUrl(t.supabaseUrl);
    setEditAnonKey(t.supabaseAnonKey);
    setEditDesc(t.description || "");
    setEditError(null);
  }

  function handleSaveCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    startTransition(async () => {
      const res = await createAdminTenant({
        name: newName,
        slug: newSlug,
        supabaseUrl: newUrl,
        supabaseAnonKey: newAnonKey,
        adminEmail: newAdminEmail,
        rif: newRif,
        description: newDesc,
      });

      if (res.ok) {
        setIsCreating(false);
        setNewName("");
        setNewSlug("");
        setNewUrl("");
        setNewAnonKey("");
        setNewAdminEmail("");
        setNewRif("");
        setNewDesc("");
        setModalTestStatus(null);
      } else {
        setCreateError(res.error || "No se pudo crear la empresa.");
      }
    });
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTenant) return;
    setEditError(null);

    startTransition(async () => {
      const res = await updateAdminTenant(editingTenant.slug, {
        name: editName,
        supabaseUrl: editUrl,
        supabaseAnonKey: editAnonKey,
        description: editDesc,
      });

      if (res.ok) {
        setEditingTenant(null);
      } else {
        setEditError(res.error || "No se pudo actualizar la empresa.");
      }
    });
  }

  function handleDelete(slug: string, name: string) {
    if (!confirm(`¿Estás seguro de eliminar la empresa "${name}"? Sus datos en Supabase permanecerán intactos pero no estará visible en el panel.`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteAdminTenant(slug);
      if (!res.ok) {
        alert(res.error || "No se pudo eliminar.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Barra Superior de Control */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-hint" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre de empresa, slug o base de datos..."
            className="w-full rounded-2xl border border-line bg-card pl-10 pr-4 py-2.5 text-xs outline-none focus:border-accent shadow-sm"
          />
        </div>

        <button
          onClick={() => {
            setIsCreating(true);
            setCreateError(null);
            setModalTestStatus(null);
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-accent px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-accent/90 active:scale-95 transition-all"
        >
          <PlusIcon className="h-4 w-4" />
          <span>+ Nueva Empresa</span>
        </button>
      </div>

      {/* Grid de Empresas Registradas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((t) => {
          const isActive = t.slug === activeTenantSlug;
          const status = connectionStatuses[t.slug];

          return (
            <div
              key={t.slug}
              className={`rounded-3xl border p-5 transition-all space-y-3.5 ${
                isActive
                  ? "border-accent bg-accent/[0.03] ring-1 ring-accent/30 shadow-md"
                  : "border-line bg-card shadow-sm hover:border-line/80"
              }`}
            >
              {/* Encabezado de la Tarjeta */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-soft text-accent">
                    <BuildingIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-base font-bold text-foreground truncate max-w-[200px]">
                        {t.name}
                      </h3>
                      {t.isDefault && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-hint font-mono mt-0.5">
                      slug: <strong className="text-foreground">{t.slug}</strong>
                    </p>
                  </div>
                </div>

                {isActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-income/10 px-2.5 py-1 text-xs font-bold text-income shrink-0">
                    <CheckIcon className="h-3 w-3" />
                    Activa
                  </span>
                )}
              </div>

              {/* Datos de Conexión Supabase */}
              <div className="rounded-2xl bg-soft/60 border border-line p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-muted">
                  <span>Supabase Host:</span>
                  <span className="font-mono text-[11px] text-foreground truncate max-w-[200px]" title={t.supabaseUrl}>
                    {t.supabaseUrl.replace("https://", "")}
                  </span>
                </div>

                <div className="flex items-center justify-between text-muted">
                  <span>Anon Key:</span>
                  <span className="font-mono text-[10px] text-hint">
                    {t.supabaseAnonKey.slice(0, 12)}••••••••{t.supabaseAnonKey.slice(-6)}
                  </span>
                </div>

                {/* Resultado de prueba de conexión */}
                {status && (
                  <div className="pt-1.5 border-t border-line/60">
                    {status === "testing" ? (
                      <p className="text-[11px] text-accent animate-pulse font-medium">
                        ⏳ Probando conexión en vivo con Supabase...
                      </p>
                    ) : status.ok ? (
                      <p className="text-[11px] text-income font-medium">
                        ✓ {status.message}
                      </p>
                    ) : (
                      <p className="text-[11px] text-overdue font-medium">
                        ✕ {status.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-between pt-1 gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTestConnection(t.slug, t.supabaseUrl, t.supabaseAnonKey)}
                    className="rounded-xl border border-line bg-card px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-soft transition-all"
                    title="Probar si la base de datos de Supabase responde"
                  >
                    ⚡ Test DB
                  </button>

                  <button
                    type="button"
                    onClick={() => startEdit(t)}
                    className="rounded-xl border border-line bg-card p-1.5 text-muted hover:text-foreground hover:bg-soft transition-all"
                    title="Modificar configuración de la empresa"
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>

                  {!t.isDefault && t.slug !== "massivo" && (
                    <button
                      type="button"
                      onClick={() => handleDelete(t.slug, t.name)}
                      className="rounded-xl border border-overdue/20 bg-overdue/5 p-1.5 text-overdue hover:bg-overdue hover:text-white transition-all"
                      title="Eliminar empresa"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenTenant(t.slug)}
                  className="rounded-xl bg-accent px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-95 transition-all"
                >
                  🌐 Abrir Entorno
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Crear Nueva Empresa */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveCreate}
            className="w-full max-w-lg rounded-3xl border border-line bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <BuildingIcon className="h-5 w-5 text-accent" />
                <h3 className="font-serif text-base font-bold">
                  Registrar Nueva Empresa Multi-Tenant
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-xs text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted block mb-1 font-medium">Nombre de la Empresa *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => handleAutoSlug(e.target.value)}
                  placeholder="Ej. Corporación Norte C.A."
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-muted block mb-1 font-medium">Slug / Subdominio *</label>
                  <input
                    type="text"
                    required
                    value={newSlug}
                    onChange={(e) => setNewSlug(slugify(e.target.value))}
                    placeholder="ej. corporacion-norte"
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent font-mono"
                  />
                  <p className="text-[10px] text-hint mt-0.5 font-mono">
                    URL: {newSlug || "slug"}.m-wallet-gamma.vercel.app
                  </p>
                </div>

                <div>
                  <label className="text-muted block mb-1 font-medium">RIF / Identificador Fiscal</label>
                  <input
                    type="text"
                    value={newRif}
                    onChange={(e) => setNewRif(e.target.value)}
                    placeholder="Ej. J-40000000-0"
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="text-muted block mb-1 font-medium">Correo de Administrador</label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@empresa.com"
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-muted block mb-1 font-medium">Supabase Project URL *</label>
                <input
                  type="url"
                  required
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent font-mono"
                />
              </div>

              <div>
                <label className="text-muted block mb-1 font-medium">Supabase Anon Key *</label>
                <textarea
                  required
                  rows={2}
                  value={newAnonKey}
                  onChange={(e) => setNewAnonKey(e.target.value)}
                  placeholder="sb_publishable_... o eyJhbGciOi..."
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent font-mono resize-none"
                />
              </div>

              <div>
                <label className="text-muted block mb-1 font-medium">Descripción o Notas</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Ej. Sucursal Valencia / Clientes Mayoristas"
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent"
                />
              </div>

              {/* Botón de prueba de conexión dentro del modal */}
              <div className="rounded-xl bg-soft/80 border border-line p-2.5 flex items-center justify-between">
                <span className="text-[11px] text-muted">¿Verificar credenciales antes de guardar?</span>
                <button
                  type="button"
                  disabled={testingModal || !newUrl || !newAnonKey}
                  onClick={() => handleTestModalConnection(newUrl, newAnonKey)}
                  className="rounded-lg bg-card border border-line px-3 py-1 text-[11px] font-semibold text-foreground hover:bg-soft active:scale-95 disabled:opacity-50"
                >
                  {testingModal ? "Probando…" : "⚡ Test Conexión"}
                </button>
              </div>

              {modalTestStatus && (
                <p
                  className={`rounded-lg px-3 py-2 text-xs font-medium ${
                    modalTestStatus.ok
                      ? "bg-income/10 text-income"
                      : "bg-overdue/10 text-overdue"
                  }`}
                >
                  {modalTestStatus.ok ? "✓ " : "✕ "}
                  {modalTestStatus.message}
                </p>
              )}

              {createError && (
                <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue font-medium">
                  {createError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                disabled={pending}
                className="rounded-xl border border-line px-4 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-soft"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending || !newName || !newSlug || !newUrl || !newAnonKey}
                className="rounded-xl bg-accent px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-95 disabled:opacity-50"
              >
                {pending ? "Guardando…" : "Crear Empresa"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Editar Empresa */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-lg rounded-3xl border border-line bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <EditIcon className="h-5 w-5 text-accent" />
                <h3 className="font-serif text-base font-bold">
                  Modificar Empresa: {editingTenant.name}
                </h3>
              </div>
              <span className="rounded-full bg-soft font-mono px-2.5 py-1 text-xs font-bold text-accent">
                {editingTenant.slug}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted block mb-1 font-medium">Nombre de la Empresa *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-muted block mb-1 font-medium">Supabase Project URL *</label>
                <input
                  type="url"
                  required
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent font-mono"
                />
              </div>

              <div>
                <label className="text-muted block mb-1 font-medium">Supabase Anon Key *</label>
                <textarea
                  required
                  rows={2}
                  value={editAnonKey}
                  onChange={(e) => setEditAnonKey(e.target.value)}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent font-mono resize-none"
                />
              </div>

              <div>
                <label className="text-muted block mb-1 font-medium">Descripción</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent"
                />
              </div>

              {editError && (
                <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue font-medium">
                  {editError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setEditingTenant(null)}
                disabled={pending}
                className="rounded-xl border border-line px-4 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-soft"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending || !editName || !editUrl || !editAnonKey}
                className="rounded-xl bg-accent px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-95 disabled:opacity-50"
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
