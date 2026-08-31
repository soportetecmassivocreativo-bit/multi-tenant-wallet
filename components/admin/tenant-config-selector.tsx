"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BuildingIcon, ChevronRightIcon } from "@/components/ui/icons";
import { getAdminTenants } from "@/lib/tenant-admin-actions";
import type { TenantConfig } from "@/lib/supabase/tenants-config";

const DEFAULT_PRESETS: TenantConfig[] = [
  {
    slug: "massivo",
    name: "Massivo Creativo",
    supabaseUrl: "https://fguxdeqqwwtrbizqnguv.supabase.co",
    supabaseAnonKey: "sb_publishable_l565KUwsXphFZSpmXGWpAg_wrJYLP_r",
    description: "Entorno Principal Corporativo",
    isDefault: true,
  },
  {
    slug: "demo",
    name: "Empresa Demo Multi-Tenant",
    supabaseUrl: "https://fguxdeqqwwtrbizqnguv.supabase.co",
    supabaseAnonKey: "sb_publishable_l565KUwsXphFZSpmXGWpAg_wrJYLP_r",
    description: "Espacio de pruebas",
    isDefault: false,
  },
];

interface TenantConfigSelectorProps {
  initialTenants?: TenantConfig[];
  activeSlug?: string;
  variant?: "sidebar" | "page";
}

export function TenantConfigSelector({
  initialTenants,
  activeSlug: propActiveSlug,
  variant = "sidebar",
}: TenantConfigSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [tenants, setTenants] = useState<TenantConfig[]>(
    initialTenants && initialTenants.length > 0 ? initialTenants : DEFAULT_PRESETS
  );
  const [selectedSlug, setSelectedSlug] = useState<string>(
    propActiveSlug || searchParams.get("empresa") || "massivo"
  );

  useEffect(() => {
    getAdminTenants().then((data) => {
      if (data && data.length > 0) {
        setTenants(data);
      }
    });
  }, []);

  const handleSelect = (newSlug: string) => {
    setSelectedSlug(newSlug);
    // Guardar cookie de tenant activo para configuración
    document.cookie = `m_wallet_active_config_tenant=${newSlug}; path=/; max-age=31536000; SameSite=Lax`;
    
    startTransition(() => {
      // Actualizar la URL agregando ?empresa=slug para refrescar los datos del Server Component
      const url = new URL(window.location.href);
      url.searchParams.set("empresa", newSlug);
      router.push(url.pathname + "?" + url.searchParams.toString());
      router.refresh();
    });
  };

  const activeTenant = tenants.find((t) => t.slug === selectedSlug) || tenants[0] || {
    slug: "massivo",
    name: "Massivo Creativo",
  };

  if (variant === "page") {
    return (
      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-bg text-accent">
              <BuildingIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-semibold text-foreground">Empresa a Configurar</p>
              <p className="text-[11px] text-hint">
                Personalizando nomenclaturas y prefijos de:{" "}
                <span className="font-semibold text-accent">{activeTenant.name}</span>
              </p>
            </div>
          </div>
          <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-accent">
            {activeTenant.slug}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {tenants.map((t) => {
            const isCurrent = t.slug === selectedSlug;
            return (
              <button
                key={t.slug}
                type="button"
                disabled={isPending}
                onClick={() => handleSelect(t.slug)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                  isCurrent
                    ? "bg-accent text-white shadow-sm font-semibold ring-2 ring-accent/30"
                    : "border border-line bg-soft text-muted hover:text-foreground hover:bg-card"
                }`}
              >
                <BuildingIcon className={`h-3.5 w-3.5 ${isCurrent ? "text-white" : "text-hint"}`} />
                <span>{t.name}</span>
                {t.isDefault && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded ${
                    isCurrent ? "bg-white/20 text-white" : "bg-soft text-hint"
                  }`}>
                    Principal
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Variant Sidebar
  return (
    <div className="mx-3 my-2 rounded-xl border border-line bg-soft/60 p-2.5 space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-hint">
          Empresa Activa
        </span>
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Conectado" />
      </div>

      <div className="relative">
        <select
          value={selectedSlug}
          disabled={isPending}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full appearance-none rounded-lg border border-line bg-card py-1.5 pl-2.5 pr-7 text-xs font-semibold text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer truncate"
        >
          {tenants.map((t) => (
            <option key={t.slug} value={t.slug} className="py-1">
              {t.name} ({t.slug})
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-hint">
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-90" />
        </div>
      </div>

      <p className="text-[10px] text-hint px-1 truncate">
        Configurando: <strong className="text-foreground">{activeTenant.name}</strong>
      </p>
    </div>
  );
}
