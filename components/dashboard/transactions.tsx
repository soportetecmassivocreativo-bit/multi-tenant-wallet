"use client";

import { Reveal } from "@/components/ui/reveal";
import { ArrowDownLeftIcon, ArrowUpRightIcon } from "@/components/ui/icons";
import { formatSigned, formatDate } from "@/lib/format";
import type { Movement } from "@/lib/data";

export function Transactions({ movements }: { movements: Movement[] }) {
  return (
    <div>
      <h2 className="mb-1 font-serif text-[15px]">Movimientos</h2>
      {movements.length === 0 ? (
        <p className="py-8 text-center text-sm text-hint">
          Sin movimientos aún. Registra un cobro o un gasto para empezar.
        </p>
      ) : (
        <Reveal>
          {movements.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 border-t border-line py-2.5"
            >
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-soft">
                {m.kind === "cobro" ? (
                  <ArrowDownLeftIcon className="h-[17px] w-[17px] text-ink" />
                ) : (
                  <ArrowUpRightIcon className="h-[17px] w-[17px] text-muted" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px]">{m.title}</p>
                <p className="truncate text-[11px] text-hint">
                  {m.subtitle ? `${m.subtitle} · ` : ""}
                  {formatDate(m.date)}
                </p>
              </div>
              <span
                className={`tnum text-sm font-medium ${
                  m.kind === "cobro" ? "text-ink" : "text-muted"
                }`}
              >
                {formatSigned(m.amount)}
              </span>
            </div>
          ))}
        </Reveal>
      )}
    </div>
  );
}
