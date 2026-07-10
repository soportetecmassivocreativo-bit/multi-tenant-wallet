import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import { ScoreChip } from "@/components/clientes/score-chip";
import { ChevronRightIcon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/format";
import { getClients } from "@/lib/data";

export default async function ClientesPage() {
  const clients = await getClients();
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl tracking-tight">Clientes</h1>
        <span className="text-sm text-muted">{clients.length}</span>
      </header>

      <Reveal className="space-y-2.5">
        {clients.map((c) => (
          <Link
            key={c.id}
            href={`/clientes/${c.id}`}
            className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5 active:scale-[0.99]"
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
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-hint" />
          </Link>
        ))}
      </Reveal>
    </div>
  );
}
