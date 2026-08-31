export const dynamic = "force-dynamic";

import Link from "next/link";
import { getAuditLogs } from "@/lib/audit";
import { getCurrentProfile } from "@/lib/data";
import { AuditFeed } from "@/components/auditoria/audit-feed";
import { ShieldCheckIcon } from "@/components/ui/icons";

export default async function AuditoriaPage() {
  const [profile, logs] = await Promise.all([
    getCurrentProfile(),
    getAuditLogs(),
  ]);

  const canView =
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
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-accent-bg text-accent">
          <ShieldCheckIcon className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-serif text-2xl leading-tight tracking-tight">
            Auditoría
          </h1>
          <p className="text-xs text-hint">
            Registro de actividades y movimientos de usuarios
          </p>
        </div>
      </section>

      {canView ? (
        <AuditFeed initialLogs={logs} />
      ) : (
        <div className="rounded-2xl border border-line bg-card p-6 text-center">
          <p className="text-sm text-muted">
            Solo el CEO, Administrador y Project Manager tienen acceso al registro de auditoría de la empresa.
          </p>
        </div>
      )}
    </div>
  );
}
