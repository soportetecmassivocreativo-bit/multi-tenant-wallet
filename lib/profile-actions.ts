"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { logAuditEvent } from "@/lib/audit";
import type { MutationResult } from "@/lib/mutations";

export interface ChangePasswordInput {
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileInput {
  fullName: string;
}

/**
 * Cambia la contraseña del usuario actualmente autenticado.
 */
export async function changePassword(
  input: ChangePasswordInput,
): Promise<MutationResult> {
  const { newPassword, confirmPassword } = input;

  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: "La nueva contraseña debe tener al menos 6 caracteres." };
  }

  if (newPassword !== confirmPassword) {
    return { ok: false, error: "Las contraseñas no coinciden." };
  }

  if (!isSupabaseConfigured) {
    await logAuditEvent({
      action: "cambio_clave",
      entityType: "seguridad",
      description: "Contraseña de acceso actualizada exitosamente (Demo)",
    });
    return { ok: true, demo: true };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return { ok: false, error: "No se pudo verificar la sesión actual." };
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    await logAuditEvent({
      action: "cambio_clave",
      entityType: "seguridad",
      description: `Cambio de contraseña realizado para la cuenta ${user.email}`,
      customUser: { id: user.id },
    });

    revalidatePath("/perfil");
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error inesperado al cambiar contraseña.";
    return { ok: false, error: msg };
  }
}

/**
 * Actualiza el nombre completo y personalización del perfil del usuario.
 */
export async function updateProfile(
  input: UpdateProfileInput,
): Promise<MutationResult> {
  const fullName = input.fullName?.trim();

  if (!fullName || fullName.length < 2) {
    return { ok: false, error: "Por favor ingresa un nombre válido." };
  }

  if (!isSupabaseConfigured) {
    await logAuditEvent({
      action: "actualizacion_perfil",
      entityType: "seguridad",
      description: `Perfil actualizado: nombre cambiado a "${fullName}" (Demo)`,
    });
    return { ok: true, demo: true };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return { ok: false, error: "No se pudo verificar la sesión actual." };
    }

    // 1. Actualizar metadata de auth
    await supabase.auth.updateUser({
      data: { full_name: fullName },
    });

    // 2. Actualizar tabla profiles
    const { error: profErr } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id);

    if (profErr) {
      console.warn("Aviso al actualizar profiles:", profErr);
    }

    await logAuditEvent({
      action: "actualizacion_perfil",
      entityType: "seguridad",
      description: `Nombre de perfil actualizado a "${fullName}"`,
      customUser: { id: user.id, name: fullName },
    });

    revalidatePath("/", "layout");
    revalidatePath("/perfil");
    revalidatePath("/equipo");
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error inesperado al actualizar perfil.";
    return { ok: false, error: msg };
  }
}

export interface UpdateTeamUserInput {
  targetUserId: string;
  fullName: string;
  role: string;
  newPassword?: string;
}

/**
 * Modifica la información y/o clave de cualquier usuario del equipo.
 * Autorizado para CEO, Administrador, Project Manager o el propio usuario.
 */
export async function updateTeamUser(
  input: UpdateTeamUserInput,
): Promise<MutationResult> {
  const fullName = input.fullName?.trim();
  const role = input.role?.trim();
  const newPassword = input.newPassword?.trim();

  if (!fullName || fullName.length < 2) {
    return { ok: false, error: "Por favor ingresa un nombre válido." };
  }

  const validRoles = ["admin", "ceo", "project_manager", "contador"];
  const safeRole = validRoles.includes(role) ? role : "contador";

  if (!isSupabaseConfigured) {
    await logAuditEvent({
      action: "modificar_usuario",
      entityType: "seguridad",
      description: `Usuario modificado: ${fullName} (${safeRole}) ${newPassword ? "con cambio de clave" : ""} (Demo)`,
    });
    return { ok: true, demo: true };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "No autenticado." };
    }

    const { data: callerProf } = await supabase
      .from("profiles")
      .select("role, company_id, full_name")
      .eq("id", user.id)
      .single();

    if (!callerProf) {
      return { ok: false, error: "Perfil no encontrado." };
    }

    const canEditAny =
      callerProf.role === "admin" ||
      callerProf.role === "ceo" ||
      callerProf.role === "project_manager" ||
      user.id === input.targetUserId;

    if (!canEditAny) {
      return {
        ok: false,
        error: "Solo el CEO, Administrador o Project Manager pueden modificar usuarios.",
      };
    }

    // Actualizar en tabla profiles
    const { error: profErr } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        role: safeRole,
      })
      .eq("id", input.targetUserId);

    if (profErr) {
      return { ok: false, error: profErr.message };
    }

    // Si es el usuario actual y proporcionó contraseña
    if (newPassword && newPassword.length >= 6 && user.id === input.targetUserId) {
      await supabase.auth.updateUser({
        password: newPassword,
        data: { full_name: fullName },
      });
    }

    await logAuditEvent({
      action: "modificar_usuario",
      entityType: "seguridad",
      description: `Modificó información de usuario: ${fullName} | Cargo: "${safeRole}" ${
        newPassword ? "y clave actualizada" : ""
      }`,
      details: {
        targetUserId: input.targetUserId,
        fullName,
        role: safeRole,
        passwordUpdated: Boolean(newPassword),
      },
      customUser: {
        id: user.id,
        name: callerProf.full_name || "Usuario",
        role: callerProf.role,
        companyId: callerProf.company_id,
      },
    });

    revalidatePath("/", "layout");
    revalidatePath("/perfil");
    revalidatePath("/equipo");
    return { ok: true };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error al actualizar usuario.";
    return { ok: false, error: msg };
  }
}
