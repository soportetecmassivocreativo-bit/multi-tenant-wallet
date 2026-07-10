"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SearchIcon } from "@/components/ui/icons";
import { formatMoney, formatDate } from "@/lib/format";
import type { Client, Invoice, Expense } from "@/lib/mock-data";

const suggestions = ["Factura", "Cliente", "Combustible", "Nómina"];

type Result =
  | { type: "Cliente"; id: string; title: string; sub: string; href: string }
  | { type: "Factura"; id: string; title: string; sub: string; amount: number; href: string }
  | { type: "Gasto"; id: string; title: string; sub: string; amount: number };

export function SearchClient({
  clients,
  invoices,
  expenses,
}: {
  clients: Client[];
  invoices: Invoice[];
  expenses: Expense[];
}) {
  const [q, setQ] = useState("");
  const nameById = useMemo(
    () => new Map(clients.map((c) => [c.id, c.name])),
    [clients],
  );

  const results = useMemo<Result[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const out: Result[] = [];

    for (const c of clients) {
      if (
        c.name.toLowerCase().includes(term) ||
        (c.rif ?? "").toLowerCase().includes(term)
      ) {
        out.push({
          type: "Cliente",
          id: c.id,
          title: c.name,
          sub: c.balance > 0 ? `Debe ${formatMoney(c.balance)}` : "Al día",
          href: `/clientes/${c.id}`,
        });
      }
    }
    for (const inv of invoices) {
      const client = nameById.get(inv.clientId) ?? "";
      if (
        String(inv.number).includes(term) ||
        client.toLowerCase().includes(term)
      ) {
        out.push({
          type: "Factura",
          id: inv.id,
          title: `#${inv.number} · ${client}`,
          sub: `${inv.status} · vence ${formatDate(inv.dueDate)}`,
          amount: inv.total,
          href: `/cobros/${inv.id}`,
        });
      }
    }
    for (const e of expenses) {
      if (
        e.note.toLowerCase().includes(term) ||
        e.category.toLowerCase().includes(term)
      ) {
        out.push({
          type: "Gasto",
          id: e.id,
          title: e.note,
          sub: `${e.category} · ${formatDate(e.date)}`,
          amount: -e.amount,
        });
      }
    }
    return out;
  }, [q, clients, invoices, expenses, nameById]);

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-2xl tracking-tight">Buscar</h1>

      <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-card px-4 py-3">
        <SearchIcon className="h-[18px] w-[18px] text-hint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Clientes, facturas, gastos…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-hint"
          autoFocus
        />
      </div>

      {!q && (
        <div className="space-y-3">
          <p className="text-xs text-hint">Sugerencias</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setQ(s)}
                className="rounded-full border border-line px-3 py-1.5 text-xs text-muted active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {q && results.length === 0 && (
        <p className="pt-6 text-center text-sm text-hint">
          Sin resultados para “{q}”.
        </p>
      )}

      {results.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-hint">
            {results.length} resultado{results.length > 1 ? "s" : ""}
          </p>
          {results.map((r) => {
            const body = (
              <>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] text-muted">
                      {r.type}
                    </span>
                    <p className="truncate text-[13px]">{r.title}</p>
                  </div>
                  <p className="truncate text-[11px] text-hint">{r.sub}</p>
                </div>
                {"amount" in r && (
                  <span className="tnum text-sm font-medium">
                    {formatMoney(Math.abs(r.amount))}
                  </span>
                )}
              </>
            );
            return "href" in r ? (
              <Link
                key={r.type + r.id}
                href={r.href}
                className="flex items-center gap-3 border-t border-line py-2.5 active:bg-soft"
              >
                {body}
              </Link>
            ) : (
              <div
                key={r.type + r.id}
                className="flex items-center gap-3 border-t border-line py-2.5"
              >
                {body}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
