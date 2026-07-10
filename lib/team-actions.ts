"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { MutationResult } from "@/lib/mutations";

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  return {
    supabase,
    userId: user.id,
    companyId: profile.company_id as string,
    role: profile.role as string,
  };
}

/** Invita a un miembro (contador o admin) por correo. Solo admin. */
export async function inviteMember(
  email: string,
  role: string,
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };
  if (ctx.role !== "admin")
    return { ok: false, error: "Solo el administrador puede invitar." };

  const clean = email.trim().toLowerCase();
  if (!clean.includes("@") || clean.length < 5)
    return { ok: false, error: "Correo inválido." };
  const safeRole = role === "admin" ? "admin" : "contador";

  const { error } = await ctx.supabase.from("invitations").insert({
    company_id: ctx.companyId,
    email: clean,
    role: safeRole,
    invited_by: ctx.userId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/equipo");
  return { ok: true };
}

/** Cancela una invitación pendiente. Solo admin. */
export async function cancelInvitation(id: string): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };
  if (ctx.role !== "admin")
    return { ok: false, error: "Solo el administrador puede cancelar." };

  const { error } = await ctx.supabase
    .from("invitations")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/equipo");
  return { ok: true };
}
