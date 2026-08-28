"use client";

import { useState, useTransition } from "react";
import { UserPlusIcon } from "@/components/ui/icons";
import { inviteMember } from "@/lib/team-actions";

const inputClass =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent";

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("contador");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    if (!email) return;
    setError(null);
    setMsg(null);
    start(async () => {
      const r = await inviteMember(email, role);
      if (r.ok) {
        setMsg(
          `Invitación creada. ${email} debe registrarse en la app con ese mismo correo.`,
        );
        setEmail("");
      } else {
        setError(r.error ?? "No se pudo crear la invitación.");
      }
    });
  }

  return (
    <section className="space-y-2 rounded-2xl border border-line bg-card p-4">
      <p className="font-serif text-[15px]">Invitar a alguien</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="correo@ejemplo.com"
        className={inputClass}
      />
      <div className="flex gap-2">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={inputClass}
        >
          <option value="admin">Administrador</option>
          <option value="ceo">CEO</option>
          <option value="project_manager">Project Manager</option>
          <option value="contador">Contador</option>
        </select>
        <button
          onClick={submit}
          disabled={!email || pending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white active:scale-95 disabled:opacity-40"
        >
          <UserPlusIcon className="h-4 w-4" />
          {pending ? "…" : "Invitar"}
        </button>
      </div>
      {error && (
        <p className="rounded-lg bg-overdue/10 px-3 py-2 text-xs text-overdue">
          {error}
        </p>
      )}
      {msg && (
        <p className="rounded-lg bg-income/10 px-3 py-2 text-xs text-income">
          {msg}
        </p>
      )}
    </section>
  );
}
