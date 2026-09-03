"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isAdmin, getCurrentProfile } from "@/lib/data";
import { logAuditEvent } from "@/lib/audit";
import type { MutationResult } from "@/lib/mutations";

const MAINTENANCE_COOKIE_NAME = "m_wallet_maintenance_mode";

export interface MaintenanceStatus {
  active: boolean;
  message: string;
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_MAINTENANCE_MESSAGE =
  "Estamos realizando labores de mantenimiento programado, optimización y actualización en la plataforma. El acceso estará restablecido en breve.";

/**
 * Obtiene el estado actual del modo mantenimiento.
 */
export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(MAINTENANCE_COOKIE_NAME)?.value;

  if (!raw) {
    return {
      active: false,
      message: DEFAULT_MAINTENANCE_MESSAGE,
    };
  }

  try {
    const data = JSON.parse(decodeURIComponent(raw));
    return {
      active: Boolean(data.active),
      message: data.message || DEFAULT_MAINTENANCE_MESSAGE,
      updatedAt: data.updatedAt,
      updatedBy: data.updatedBy,
    };
  } catch {
    return {
      active: raw === "true",
      message: DEFAULT_MAINTENANCE_MESSAGE,
    };
  }
}

/**
 * Activa o desactiva el modo mantenimiento del sistema.
 * Solo permitido para administradores (admin, ceo, project_manager).
 */
export async function toggleMaintenanceMode(
  active: boolean,
  customMessage?: string
): Promise<MutationResult & { active?: boolean }> {
  const authorized = await isAdmin();
  if (!authorized) {
    return {
      ok: false,
      error: "Solo los administradores tienen permiso para modificar el estado de mantenimiento.",
    };
  }

  const profile = await getCurrentProfile();
  const cookieStore = await cookies();

  const payload: MaintenanceStatus = {
    active,
    message: customMessage?.trim() || DEFAULT_MAINTENANCE_MESSAGE,
    updatedAt: new Date().toISOString(),
    updatedBy: profile?.role ? profile.role.toUpperCase() : "ADMIN",
  };

  if (active) {
    cookieStore.set(MAINTENANCE_COOKIE_NAME, encodeURIComponent(JSON.stringify(payload)), {
      maxAge: 60 * 60 * 24 * 365, // 1 año
      path: "/",
      sameSite: "lax",
    });
  } else {
    cookieStore.delete(MAINTENANCE_COOKIE_NAME);
  }

  await logAuditEvent({
    action: active ? "mantenimiento_activado" : "mantenimiento_desactivado",
    entityType: "sistema",
    description: active
      ? "Activó el modo mantenimiento del sistema (Acceso exclusivo Administrador)"
      : "Desactivó el modo mantenimiento. Sistema 100% operativo para todos los usuarios.",
    details: payload as unknown as Record<string, unknown>,
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/empresas");
  revalidatePath("/empresas");
  revalidatePath("/configuracion");
  revalidatePath("/dashboard");

  return { ok: true, active };
}
