"use client";

import { useState, useTransition } from "react";
import { formatMoney, formatDate } from "@/lib/format";
import { DeleteButton } from "@/components/ui/delete-button";
import { deleteExpense, updateExpense } from "@/lib/mutations";
import { exportExpenseVoucherPdf } from "@/lib/pdf-export";
import { DownloadIcon, SearchIcon, ReceiptIcon, EditIcon } from "@/components/ui/icons";
import { MoneyInput } from "@/components/ui/money-input";
import type { Expense } from "@/lib/mock-data";

interface GastosManagerProps {
  expenses: Expense[];
  admin: boolean;
}

export function GastosManager({ expenses, admin }: GastosManagerProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const [activeExpense, setActiveExpense] = useState<Expense | null>(null);

  // Estado para modal de edición
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editAmount, setEditAmount] = useState(0);
  const [editCategory, setEditCategory] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const categories = Array.from(
    new Set(expenses.map((e) => e.category || "General"))
  );

  const filtered = expenses.filter((e) => {
    const matchesCat =
      selectedCategory === "todas" ||
      (e.category || "General").toLowerCase() === selectedCategory.toLowerCase();
    const q = query.toLowerCase().trim();
    const matchesQuery =
      !q ||
      (e.note || "").toLowerCase().includes(q) ||
      (e.code || "").toLowerCase().includes(q) ||
      (e.category || "").toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  function startEdit(e: Expense) {
    setEditingExpense(e);
    setEditNote(e.note);
    setEditAmount(e.amount);
    setEditCategory(e.category || "General");
    setEditError(null);
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingExpense || editAmount <= 0) return;
    setEditError(null);

    startTransition(async () => {
      const res = await updateExpense(editingExpense.id, {
        note: editNote,
        amount: editAmount,
        category: editCategory || "General",
        currency: (editingExpense as unknown as { currency?: "USD" | "VES" | "EUR" }).currency ?? "USD",
      });

      if (res.ok) {
        setEditingExpense(null);
      } else {
        setEditError(res.error || "No se pudo actualizar el gasto.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Barra de Búsqueda y Filtros de Categoría */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-hint" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por código (ej. Mas-Corp-), concepto o categoría..."
            className="w-full rounded-xl border border-line bg-card pl-10 pr-4 py-2 text-xs outline-none focus:border-accent"
          />
        </div>

        {categories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedCategory("todas")}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                selectedCategory === "todas"
                  ? "bg-accent text-white shadow-sm"
                  : "bg-soft border border-line text-muted hover:text-foreground"
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-accent text-white shadow-sm"
                    : "bg-soft border border-line text-muted hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista del Historial de Gastos */}
      <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm">
        <div className="bg-soft/60 px-4 py-2.5 border-b border-line flex items-center justify-between text-xs font-medium text-muted">
          <span>Historial de Gastos & Comprobantes ({filtered.length})</span>
          <span>Monto & Acciones</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-hint">
            No se encontraron registros de gastos con los filtros actuales.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 p-3.5 hover:bg-soft/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {e.note}
                    </p>
                    <span className="rounded-full bg-soft font-mono px-2 py-0.5 text-[10px] font-semibold text-muted">
                      {e.code || "Mas-Corp-0001"}
                    </span>
                  </div>
                  <p className="text-[11px] text-hint mt-0.5">
                    {e.category} · {formatDate(e.date)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="tnum text-sm font-semibold text-overdue mr-1">
                    − {formatMoney(e.amount)}
                  </span>

                  {/* Botón Ver Detalles */}
                  <button
                    type="button"
                    onClick={() => setActiveExpense(e)}
                    className="rounded-lg border border-line bg-card px-2 py-1 text-[11px] font-medium text-muted hover:text-foreground hover:bg-soft transition-all"
                  >
                    Ver
                  </button>

                  {/* Botón Editar Gasto */}
                  <button
                    type="button"
                    onClick={() => startEdit(e)}
                    className="grid h-7 w-7 place-items-center rounded-lg text-hint hover:text-foreground hover:bg-soft transition-all"
                    title={`Editar ${e.note}`}
                  >
                    <EditIcon className="h-3.5 w-3.5" />
                  </button>

                  {/* Botón Descargar PDF Comprobante */}
                  <button
                    type="button"
                    onClick={() => exportExpenseVoucherPdf(e)}
                    className="inline-flex items-center gap-1 rounded-lg border border-accent/20 bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent hover:text-white transition-all active:scale-95 shadow-sm"
                    title={`Descargar Comprobante PDF de ${e.note}`}
                  >
                    <DownloadIcon className="h-3 w-3" />
                    <span>PDF</span>
                  </button>

                  {/* Botón Eliminar */}
                  <DeleteButton
                    action={deleteExpense.bind(null, e.id)}
                    ariaLabel={`Eliminar ${e.note}`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Edición de Gasto */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md rounded-3xl border border-line bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <EditIcon className="h-5 w-5 text-accent" />
                <h3 className="font-serif text-base font-semibold">
                  Modificar Gasto
                </h3>
              </div>
              <span className="rounded-full bg-soft font-mono px-2.5 py-1 text-xs font-bold text-accent">
                {editingExpense.code || "Mas-Corp-0001"}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted block mb-1">Concepto / Detalle:</label>
                <input
                  type="text"
                  required
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted block mb-1">Monto:</label>
                  <MoneyInput
                    value={editAmount}
                    onValueChange={setEditAmount}
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-muted block mb-1">Categoría:</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
                    placeholder="General, Servicios, etc."
                  />
                </div>
              </div>

              {editError && (
                <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue">
                  {editError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                disabled={pending}
                className="rounded-xl border border-line px-4 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-soft"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending || !editNote || editAmount <= 0}
                className="rounded-xl bg-accent px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-accent/90 disabled:opacity-50"
              >
                {pending ? "Guardando…" : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Detalle de Gasto */}
      {activeExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-line bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <ReceiptIcon className="h-5 w-5 text-overdue" />
                <h3 className="font-serif text-base font-semibold">
                  Comprobante de Egreso
                </h3>
              </div>
              <span className="rounded-full bg-soft font-mono px-2.5 py-1 text-xs font-bold text-accent">
                {activeExpense.code || "Mas-Corp-0001"}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-muted">Concepto / Detalle:</span>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {activeExpense.note}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-muted">Categoría:</span>
                  <p className="font-medium text-foreground">{activeExpense.category}</p>
                </div>
                <div>
                  <span className="text-muted">Fecha de Registro:</span>
                  <p className="font-medium text-foreground">{formatDate(activeExpense.date)}</p>
                </div>
              </div>

              <div className="rounded-xl bg-soft p-3 text-center border border-line">
                <span className="text-[11px] text-muted">Monto Contabilizado</span>
                <p className="text-xl font-bold text-overdue mt-0.5">
                  − {formatMoney(activeExpense.amount)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setActiveExpense(null)}
                className="rounded-xl border border-line px-4 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-soft"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  exportExpenseVoucherPdf(activeExpense);
                  setActiveExpense(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-accent/90"
              >
                <DownloadIcon className="h-3.5 w-3.5" />
                <span>Descargar Comprobante PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
