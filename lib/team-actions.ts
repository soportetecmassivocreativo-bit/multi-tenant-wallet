"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { logAuditEvent } from "@/lib/audit";
import type { MutationResult } from "@/lib/mutations";

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role, full_name")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  return {
    supabase,
    userId: user.id,
    userName: profile.full_name || "Usuario",
    companyId: profile.company_id as string,
    role: profile.role as string,
  };
}

/** Invita a un miembro (contador, CEO, PM, admin) por correo. Solo admin/CEO. */
export async function inviteMember(
  email: string,
  role: string,
): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };
  if (ctx.role !== "admin" && ctx.role !== "ceo")
    return { ok: false, error: "Solo el administrador o CEO puede invitar." };

  const clean = email.trim().toLowerCase();
  if (!clean.includes("@") || clean.length < 5)
    return { ok: false, error: "Correo inválido." };
  const validRoles = ["admin", "ceo", "project_manager", "contador"];
  const safeRole = validRoles.includes(role) ? role : "contador";

  const { error } = await ctx.supabase.from("invitations").insert({
    company_id: ctx.companyId,
    email: clean,
    role: safeRole,
    invited_by: ctx.userId,
  });
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    action: "invitar_miembro",
    entityType: "equipo",
    description: `Invitación enviada a ${clean} con cargo "${safeRole}"`,
    details: { email: clean, role: safeRole },
    customUser: {
      id: ctx.userId,
      name: ctx.userName,
      role: ctx.role,
      companyId: ctx.companyId,
    },
  });

  revalidatePath("/equipo");
  return { ok: true };
}

/** Cancela una invitación pendiente. Solo admin o CEO. */
export async function cancelInvitation(id: string): Promise<MutationResult> {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  const ctx = await getContext();
  if (!ctx) return { ok: false, error: "No autenticado." };
  if (ctx.role !== "admin" && ctx.role !== "ceo")
    return { ok: false, error: "Solo el administrador o CEO puede cancelar." };

  const { error } = await ctx.supabase
    .from("invitations")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    action: "cancelar_invitacion",
    entityType: "equipo",
    entityId: id,
    description: `Canceló la invitación pendiente (ID: ${id})`,
    customUser: {
      id: ctx.userId,
      name: ctx.userName,
      role: ctx.role,
      companyId: ctx.companyId,
    },
  });

  revalidatePath("/equipo");
  return { ok: true };
}
