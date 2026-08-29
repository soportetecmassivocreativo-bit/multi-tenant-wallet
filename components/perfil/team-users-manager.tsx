"use client";

import { useState, useTransition } from "react";
import { updateTeamUser } from "@/lib/profile-actions";
import { UserIcon, EditIcon, CheckIcon, LockIcon } from "@/components/ui/icons";
import type { TeamMember } from "@/lib/data";

const ROLE_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  ceo: { label: "CEO", bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300" },
  admin: { label: "Administrador", bg: "bg-accent-bg", text: "text-accent-text" },
  project_manager: { label: "Project Manager", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  contador: { label: "Contador", bg: "bg-income/10", text: "text-income" },
};

interface TeamUsersManagerProps {
  team: TeamMember[];
  currentUserId: string;
  canManageAll: boolean;
}

export function TeamUsersManager({
  team,
  currentUserId,
  canManageAll,
}: TeamUsersManagerProps) {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("contador");
  const [editPassword, setEditPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startEditing(m: TeamMember) {
    setEditingUserId(m.userId);
    setEditName(m.name || "");
    setEditRole(m.role || "contador");
    setEditPassword("");
    setMsg(null);
    setError(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUserId) return;
    setMsg(null);
    setError(null);

    if (editName.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres.");
      return;
    }

    if (editPassword && editPassword.length < 6) {
      setError("La nueva clave debe tener al menos 6 caracteres.");
      return;
    }

    startTransition(async () => {
      const res = await updateTeamUser({
        targetUserId: editingUserId,
        fullName: editName,
        role: editRole,
        newPassword: editPassword || undefined,
      });

      if (res.ok) {
        setMsg("Información de usuario y clave actualizadas exitosamente.");
        setEditingUserId(null);
        setEditPassword("");
      } else {
        setError(res.error || "No se pudo actualizar el usuario.");
      }
      setTimeout(() => {
        setMsg(null);
        setError(null);
      }, 5000);
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-bg text-accent">
            <UserIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-[15px] font-medium">Gestión de Usuarios y Claves</h2>
            <p className="text-xs text-muted">
              {canManageAll
                ? "El CEO, Administrador y Project Manager pueden modificar los datos y claves de todos los usuarios"
                : "Listado de integrantes de tu organización"}
            </p>
          </div>
        </div>
      </div>

      {msg && (
        <div className="rounded-xl border border-income/20 bg-income/10 px-3.5 py-2.5 text-xs font-medium text-income flex items-center gap-2">
          <CheckIcon className="h-4 w-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-overdue/20 bg-overdue/10 px-3.5 py-2.5 text-xs font-medium text-overdue">
          {error}
        </div>
      )}

      {/* Lista de usuarios del equipo */}
      <div className="space-y-2 pt-1">
        {team.map((m) => {
          const isSelected = editingUserId === m.userId;
          const isCurrentUser = m.userId === currentUserId;
          const roleCfg = ROLE_LABELS[m.role] || {
            label: m.role,
            bg: "bg-soft",
            text: "text-muted",
          };

          return (
            <div
              key={m.userId}
              className={`rounded-xl border transition-all ${
                isSelected
                  ? "border-accent bg-accent/5 p-3.5"
                  : "border-line bg-soft/40 p-3 hover:bg-soft"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-bg font-serif text-accent font-medium text-sm">
                    {(m.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {m.name || "Usuario"}
                      {isCurrentUser && <span className="text-hint text-xs"> (Tú)</span>}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleCfg.bg} ${roleCfg.text}`}
                      >
                        {roleCfg.label}
                      </span>
                    </div>
                  </div>
                </div>

                {(canManageAll || isCurrentUser) && (
                  <button
                    type="button"
                    onClick={() => (isSelected ? setEditingUserId(null) : startEditing(m))}
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-soft active:scale-95 transition-all shadow-sm"
                  >
                    <EditIcon className="h-3 w-3 text-muted" />
                    <span>{isSelected ? "Cerrar" : "Modificar"}</span>
                  </button>
                )}
              </div>

              {/* Formulario de edición desplegado */}
              {isSelected && (
                <form onSubmit={handleSave} className="mt-3.5 space-y-3 border-t border-line/60 pt-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted">Nombre Completo</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent"
                    />
                  </div>

                  {canManageAll && (
                    <div>
                      <label className="mb-1 block text-xs text-muted">Cargo / Rol</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent"
                      >
                        <option value="ceo">CEO</option>
                        <option value="admin">Administrador</option>
                        <option value="project_manager">Project Manager</option>
                        <option value="contador">Contador</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-xs text-muted">
                      Nueva Clave / Contraseña (opcional)
                    </label>
                    <input
                      type="password"
                      placeholder="Dejar en blanco si no deseas cambiarla"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs outline-none focus:border-accent"
                    />
                    <p className="mt-1 text-[11px] text-hint">
                      Mínimo 6 caracteres.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingUserId(null)}
                      className="rounded-xl border border-line px-3 py-1.5 text-xs text-muted hover:bg-card active:scale-95"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={pending}
                      className="rounded-xl bg-accent px-3.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 active:scale-95"
                    >
                      {pending ? "Guardando..." : "Guardar Cambios"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
