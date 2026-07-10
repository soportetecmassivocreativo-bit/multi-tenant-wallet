import Link from "next/link";
import { InviteForm } from "@/components/equipo/invite-form";
import { DeleteButton } from "@/components/ui/delete-button";
import { cancelInvitation } from "@/lib/team-actions";
import { getTeam, getInvitations, getCurrentProfile } from "@/lib/data";

function RoleBadge({ role }: { role: string }) {
  const admin = role === "admin";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
        admin ? "bg-accent-bg text-accent-text" : "bg-income/10 text-income"
      }`}
    >
      {admin ? "Administrador" : "Contador"}
    </span>
  );
}

export default async function EquipoPage() {
  const [profile, team, invitations] = await Promise.all([
    getCurrentProfile(),
    getTeam(),
    getInvitations(),
  ]);
  const admin = profile?.role === "admin";

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/mas" className="text-sm text-muted active:scale-95">
          ‹ Más
        </Link>
      </header>

      <div>
        <h1 className="font-serif text-2xl tracking-tight">Equipo</h1>
        <p className="mt-1 text-sm text-muted">
          Invita a tu contador para que gestione las finanzas contigo.
        </p>
      </div>

      {admin && <InviteForm />}

      {/* Miembros */}
      <section>
        <h2 className="mb-1 font-serif text-[15px]">Miembros</h2>
        {team.map((m) => (
          <div
            key={m.userId}
            className="flex items-center gap-3 border-t border-line py-3"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-accent-bg font-serif text-accent-text">
              {(m.name || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">
                {m.name || "Sin nombre"}
                {m.userId === profile?.userId && (
                  <span className="text-hint"> · tú</span>
                )}
              </p>
            </div>
            <RoleBadge role={m.role} />
          </div>
        ))}
      </section>

      {/* Invitaciones pendientes */}
      {invitations.length > 0 && (
        <section>
          <h2 className="mb-1 font-serif text-[15px]">Invitaciones pendientes</h2>
          {invitations.map((i) => (
            <div
              key={i.id}
              className="flex items-center gap-3 border-t border-line py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px]">{i.email}</p>
                <p className="text-[11px] text-hint">
                  Debe registrarse con este correo
                </p>
              </div>
              <RoleBadge role={i.role} />
              {admin && (
                <DeleteButton
                  action={cancelInvitation.bind(null, i.id)}
                  ariaLabel={`Cancelar invitación de ${i.email}`}
                />
              )}
            </div>
          ))}
        </section>
      )}

      {!admin && (
        <p className="text-center text-xs text-hint">
          Solo el administrador puede invitar o gestionar el equipo.
        </p>
      )}
    </div>
  );
}
