"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ScoreChip } from "@/components/clientes/score-chip";
import { DeleteButton } from "@/components/ui/delete-button";
import { deleteClient, updateClient } from "@/lib/mutations";
import { formatMoney } from "@/lib/format";
import { SearchIcon, EditIcon, UsersIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { Client } from "@/lib/mock-data";

interface ClientesManagerProps {
  clients: Client[];
  admin: boolean;
}

export function ClientesManager({ clients, admin }: ClientesManagerProps) {
  const [query, setQuery] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [rif, setRif] = useState("");
  const [score, setScore] = useState(80);
  const [termDays, setTermDays] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = clients.filter((c) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.rif || "").toLowerCase().includes(q)
    );
  });

  function startEdit(c: Client) {
    setEditingClient(c);
    setName(c.name);
    setRif(c.rif || "");
    setScore(c.score || 80);
    setTermDays(c.termDays || 0);
    setError(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingClient || !name) return;
    setError(null);

    startTransition(async () => {
      const res = await updateClient(editingClient.id, {
        name,
        rif,
        score,
        termDays,
      });

      if (res.ok) {
        setEditingClient(null);
      } else {
        setError(res.error || "No se pudo actualizar el cliente.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Barra de Búsqueda */}
      <div className="relative">
        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-hint" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente por nombre o RIF..."
          className="w-full rounded-xl border border-line bg-card pl-10 pr-4 py-2 text-xs outline-none focus:border-accent"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card py-10 text-center text-sm text-hint">
          {clients.length === 0
            ? "Aún no hay clientes registrados. Agrega el primero con el botón superior."
            : "No se encontraron clientes con el término de búsqueda."}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-2xl border border-line bg-card p-3.5 hover:bg-soft/30 transition-colors"
            >
              <Link
                href={`/clientes/${c.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 active:scale-[0.99]"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-bg font-serif text-lg text-accent-text">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <ScoreChip score={c.score} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-hint">
                    {c.rif ? `RIF: ${c.rif} · ` : ""}
                    {c.balance > 0 ? (
                      <span className="tnum text-pending font-medium">
                        Debe {formatMoney(c.balance)}
                      </span>
                    ) : (
                      "Al día"
                    )}
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-1">
                {/* Botón Editar Cliente */}
                <button
                  type="button"
                  onClick={() => startEdit(c)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-hint hover:text-foreground hover:bg-soft transition-all"
                  title={`Editar ${c.name}`}
                >
                  <EditIcon className="h-4 w-4" />
                </button>

                {/* Botón Eliminar Cliente */}
                {admin && (
                  <DeleteButton
                    action={deleteClient.bind(null, c.id)}
                    ariaLabel={`Eliminar ${c.name}`}
                  />
                )}

                <Link
                  href={`/clientes/${c.id}`}
                  className="grid h-8 w-8 place-items-center rounded-lg text-hint hover:text-foreground hover:bg-soft"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Modificación de Cliente */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md rounded-3xl border border-line bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-accent" />
                <h3 className="font-serif text-base font-semibold">
                  Modificar Cliente
                </h3>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted block mb-1">Nombre o Razón Social:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-muted block mb-1">RIF / C.I.:</label>
                <input
                  type="text"
                  value={rif}
                  onChange={(e) => setRif(e.target.value)}
                  placeholder="J-12345678-0"
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted block mb-1">Score Crediticio (0-100):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-muted block mb-1">Días de Crédito:</label>
                  <input
                    type="number"
                    min="0"
                    value={termDays}
                    onChange={(e) => setTermDays(Number(e.target.value))}
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue">
                  {error}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                disabled={pending}
                className="rounded-xl border border-line px-4 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-soft"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending || !name}
                className="rounded-xl bg-accent px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-accent/90 disabled:opacity-50"
              >
                {pending ? "Guardando…" : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
