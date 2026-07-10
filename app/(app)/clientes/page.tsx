import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import { ScoreChip } from "@/components/clientes/score-chip";
import { NuevoClienteForm } from "@/components/clientes/nuevo-cliente-form";
import { DeleteButton } from "@/components/ui/delete-button";
import { ChevronRightIcon } from "@/components/ui/icons";
import { deleteClient } from "@/lib/mutations";
import { formatMoney } from "@/lib/format";
import { getClients, isAdmin } from "@/lib/data";

export default async function ClientesPage() {
  const [clients, admin] = await Promise.all([getClients(), isAdmin()]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl tracking-tight">Clientes</h1>
        <NuevoClienteForm />
      </header>

      {clients.length === 0 ? (
        <p className="py-8 text-center text-sm text-hint">
          Aún no hay clientes. Agrega el primero.
        </p>
      ) : (
        <Reveal className="space-y-2.5">
          {clients.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-2xl border border-line bg-card p-3.5"
            >
              <Link
                href={`/clientes/${c.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 active:scale-[0.99]"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-bg font-serif text-lg text-accent-text">
                  {c.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <ScoreChip score={c.score} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-hint">
                    {c.balance > 0 ? (
                      <span className="tnum text-pending">
                        Debe {formatMoney(c.balance)}
                      </span>
                    ) : (
                      "Al día"
                    )}
                  </p>
                </div>
              </Link>
              {admin ? (
                <DeleteButton
                  action={deleteClient.bind(null, c.id)}
                  ariaLabel={`Eliminar ${c.name}`}
                />
              ) : (
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-hint" />
              )}
            </div>
          ))}
        </Reveal>
      )}
    </div>
  );
}
