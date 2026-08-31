"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BuildingIcon, ChevronRightIcon, PlusIcon } from "@/components/ui/icons";
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
    description: "Espacio de pruebas aislado",
    isDefault: false,
  },
];

export function SidebarCompaniesAccordion() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [tenants, setTenants] = useState<TenantConfig[]>(DEFAULT_PRESETS);
  const [isOpen, setIsOpen] = useState(true);
  const activeSlug = searchParams.get("empresa") || "massivo";

  useEffect(() => {
    getAdminTenants().then((data) => {
      if (data && data.length > 0) {
        setTenants(data);
      }
    });
  }, []);

  const handleSelectCompany = (slug: string) => {
    document.cookie = `m_wallet_active_config_tenant=${slug}; path=/; max-age=31536000; SameSite=Lax`;
    startTransition(() => {
      router.push(`/configuracion?empresa=${slug}`);
      router.refresh();
    });
  };

  return (
    <div className="mx-1 my-1.5 rounded-xl border border-line bg-card/60 p-2 space-y-1.5 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-2 py-1 text-left"
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Empresas Registradas ({tenants.length})
        </span>
        <ChevronRightIcon
          className={`h-3.5 w-3.5 text-hint transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="space-y-1 pt-1 border-t border-line/60">
          {tenants.map((t) => {
            const isSelected = t.slug === activeSlug;
            return (
              <button
                key={t.slug}
                type="button"
                disabled={isPending}
                onClick={() => handleSelectCompany(t.slug)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-all ${
                  isSelected
                    ? "bg-accent text-white font-semibold shadow-sm"
                    : "text-muted hover:bg-soft hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <BuildingIcon className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-white" : "text-hint"}`} />
                  <span className="truncate">{t.name}</span>
                </div>

                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-mono shrink-0 ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : t.isDefault
                      ? "bg-accent/10 text-accent font-semibold"
                      : "bg-soft text-hint"
                  }`}
                >
                  {t.isDefault ? "Massivo" : t.slug === "demo" ? "Demo" : "Activa"}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => router.push("/admin/empresas")}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-1.5 text-[11px] font-medium text-accent hover:border-accent hover:bg-accent/5 transition-all mt-1"
          >
            <PlusIcon className="h-3 w-3" />
            <span>Crear Otra Empresa</span>
          </button>
        </div>
      )}
    </div>
  );
}
