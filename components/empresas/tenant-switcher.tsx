"use client";

import { useState } from "react";
import { BuildingIcon, CheckIcon } from "@/components/ui/icons";
import type { TenantConfig } from "@/lib/supabase/tenants-config";
import { TENANT_COOKIE_NAME } from "@/lib/supabase/tenants-config";

interface TenantSwitcherProps {
  tenants: TenantConfig[];
  activeTenantSlug: string;
}

export function TenantSwitcher({ tenants, activeTenantSlug }: TenantSwitcherProps) {
  const [selectedSlug, setSelectedSlug] = useState(activeTenantSlug);
  const [switching, setSwitching] = useState(false);
  const [showConfigHelp, setShowConfigHelp] = useState(false);

  const activeTenant = tenants.find((t) => t.slug === selectedSlug) || tenants[0];

  function handleSwitch(slug: string) {
    setSelectedSlug(slug);
    setSwitching(true);

    // Guardar cookie de tenant
    document.cookie = `${TENANT_COOKIE_NAME}=${encodeURIComponent(slug)}; path=/; max-age=${
      60 * 60 * 24 * 365
    }; SameSite=Lax`;

    // Recargar página para refrescar datos con el nuevo Supabase Client
    window.location.href = `/empresas?tenant=${slug}`;
  }

  return (
    <div className="rounded-3xl border border-line bg-card p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BuildingIcon className="h-5 w-5 text-accent" />
            <h2 className="font-serif text-lg font-bold text-foreground">
              Entornos & Bases de Datos por Empresa (Multi-Tenant)
            </h2>
          </div>
          <p className="text-xs text-hint mt-0.5">
            Cada empresa opera con su propia base de datos independiente y aislada en Supabase.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowConfigHelp((v) => !v)}
          className="rounded-xl border border-line bg-soft px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground transition-all"
        >
          {showConfigHelp ? "Ocultar Ayuda" : "⚙️ ¿Cómo agregar empresas?"}
        </button>
      </div>

      {/* Lista de Tenants disponibles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tenants.map((t) => {
          const isActive = t.slug === activeTenant?.slug;
          return (
            <div
              key={t.slug}
              onClick={() => !isActive && !switching && handleSwitch(t.slug)}
              className={`rounded-2xl border p-4 transition-all cursor-pointer relative ${
                isActive
                  ? "border-accent bg-accent/5 ring-1 ring-accent/20 shadow-sm"
                  : "border-line bg-card hover:bg-soft/40"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {t.name}
                    </span>
                    {t.isDefault && (
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                        Principal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-hint mt-0.5 font-mono">
                    slug: <strong>{t.slug}</strong>
                  </p>
                </div>

                {isActive && (
                  <div className="flex items-center gap-1 rounded-full bg-income/10 px-2.5 py-1 text-xs font-bold text-income">
                    <CheckIcon className="h-3.5 w-3.5" />
                    <span>Activo</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between text-[11px]">
                <span className="text-muted font-mono truncate max-w-[220px]" title={t.supabaseUrl}>
                  {t.supabaseUrl ? t.supabaseUrl.replace("https://", "") : "Supabase Default"}
                </span>
                {!isActive && (
                  <span className="text-accent font-medium hover:underline">
                    Cambiar a esta DB →
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ayuda de Configuración */}
      {showConfigHelp && (
        <div className="rounded-2xl bg-soft/80 border border-line p-4 text-xs space-y-2.5 animate-in fade-in duration-200">
          <p className="font-semibold text-foreground">
            📌 Cómo configurar nuevas empresas con bases de datos independientes:
          </p>
          <p className="text-muted">
            1. <strong>Por Subdominio:</strong> Cualquier petición a <code>empresaA.m-wallet-gamma.vercel.app</code> o <code>empresaA.localhost:3000</code> detecta automáticamente el tenant <code>empresaA</code>.
          </p>
          <p className="text-muted">
            2. <strong>Variable de Entorno en Vercel (<code>TENANTS_CONFIG</code>):</strong> Agrega un arreglo JSON con las credenciales de cada cliente:
          </p>
          <pre className="rounded-xl bg-card border border-line p-3 font-mono text-[11px] overflow-x-auto text-accent-text">
{`[
  {
    "slug": "empresa-norte",
    "name": "Corporación Norte C.A.",
    "supabaseUrl": "https://xyz-norte.supabase.co",
    "supabaseAnonKey": "sb_publishable_..."
  },
  {
    "slug": "empresa-sur",
    "name": "Servicios Sur S.A.",
    "supabaseUrl": "https://abc-sur.supabase.co",
    "supabaseAnonKey": "sb_publishable_..."
  }
]`}
          </pre>
        </div>
      )}
    </div>
  );
}
