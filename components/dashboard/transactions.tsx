"use client";

import { Reveal } from "@/components/ui/reveal";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ClockIcon,
} from "@/components/ui/icons";
import { formatSigned } from "@/lib/format";
import { transactions, type Transaction } from "@/lib/mock-data";

function TxIcon({ kind }: { kind: Transaction["kind"] }) {
  const cls = "h-[17px] w-[17px]";
  if (kind === "cobro")
    return <ArrowDownLeftIcon className={`${cls} text-ink`} />;
  if (kind === "gasto")
    return <ArrowUpRightIcon className={`${cls} text-muted`} />;
  return <ClockIcon className={`${cls} text-pending`} />;
}

function amountClass(kind: Transaction["kind"]) {
  if (kind === "cobro") return "text-ink";
  if (kind === "pendiente") return "text-pending";
  return "text-muted";
}

export function Transactions() {
  const groups = ["Hoy", "Ayer"] as const;

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group}>
          <h2 className="mb-1 font-serif text-[15px]">{group}</h2>
          <Reveal>
            {transactions
              .filter((t) => t.group === group)
              .map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 border-t border-line py-2.5"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-soft">
                    <TxIcon kind={t.kind} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px]">{t.title}</p>
                    <p className="truncate text-[11px] text-hint">{t.subtitle}</p>
                  </div>
                  <span
                    className={`tnum text-sm font-medium ${amountClass(t.kind)}`}
                  >
                    {formatSigned(t.amount)}
                  </span>
                </div>
              ))}
          </Reveal>
        </section>
      ))}
    </div>
  );
}
