import Link from "next/link";
import { getCurrentProfile } from "@/lib/data";
import { getSystemConfig } from "@/lib/config-actions";
import { ConfiguracionTabs } from "@/components/configuracion/configuracion-tabs";
import { SettingsIcon } from "@/components/ui/icons";

export default async function ConfiguracionPage() {
  const [profile, config] = await Promise.all([
    getCurrentProfile(),
    getSystemConfig(),
  ]);

  const canEdit =
    profile?.role === "admin" ||
    profile?.role === "ceo" ||
    profile?.role === "project_manager";

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/mas" className="text-sm text-muted active:scale-95">
          ‹ Más
        </Link>
      </header>

      <section className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-accent-bg text-accent font-serif text-2xl font-medium">
          <SettingsIcon className="h-8 w-8" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-serif text-2xl leading-tight tracking-tight">
            Configuración
          </h1>
          <p className="text-xs text-hint">
            Personalización de reportes PDF y contabilizadores Mas-Corp-
          </p>
        </div>
      </section>

      <ConfiguracionTabs initialConfig={config} canEdit={canEdit} />
    </div>
  );
}
