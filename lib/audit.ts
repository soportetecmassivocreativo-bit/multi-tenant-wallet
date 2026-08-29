import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface AuditLogItem {
  id: string;
  companyId?: string;
  userId?: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface LogAuditParams {
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  details?: Record<string, unknown>;
  customUser?: {
    id?: string;
    name?: string;
    role?: string;
    companyId?: string;
  };
}

// Registro en memoria de ejemplo para modo demo o fallback
const mockAuditLogs: AuditLogItem[] = [
  {
    id: "log-1",
    userName: "Miguel Mujica",
    userRole: "ceo",
    action: "actualizar_tasa",
    entityType: "tasa",
    description: "Actualizó las tasas de cambio de contingencia (USD / EUR)",
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "log-2",
    userName: "Miguel Mujica",
    userRole: "ceo",
    action: "invitar_miembro",
    entityType: "equipo",
    description: "Configuró permisos y roles para el equipo de trabajo",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "log-3",
    userName: "Sistema",
    userRole: "admin",
    action: "inicio_sistema",
    entityType: "seguridad",
    description: "Inicialización del sistema de gestión financiera M-Wallet",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

/**
 * Registra una acción de auditoría de forma no bloqueante y segura.
 */
export async function logAuditEvent(params: LogAuditParams): Promise<void> {
  if (!isSupabaseConfigured) {
    mockAuditLogs.unshift({
      id: `log-${Date.now()}`,
      userName: params.customUser?.name || "Miguel Mujica",
      userRole: params.customUser?.role || "ceo",
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      description: params.description,
      details: params.details,
      createdAt: new Date().toISOString(),
    });
    return;
  }

  try {
    const supabase = await createClient();
    let userId = params.customUser?.id;
    let userName = params.customUser?.name;
    let userRole = params.customUser?.role;
    let companyId = params.customUser?.companyId;

    if (!userId || !companyId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, role, company_id")
          .eq("id", user.id)
          .single();
        if (prof) {
          userName = prof.full_name || user.email?.split("@")[0] || "Usuario";
          userRole = prof.role || "admin";
          companyId = prof.company_id;
        }
      }
    }

    if (!companyId) return;

    await supabase.from("audit_logs").insert({
      company_id: companyId,
      user_id: userId,
      user_name: userName || "Usuario",
      user_role: userRole || "admin",
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      description: params.description,
      details: params.details ?? {},
    });
  } catch (err) {
    console.warn("No se pudo registrar log de auditoría:", err);
  }
}

/**
 * Obtiene el historial de auditoría de la empresa.
 */
export async function getAuditLogs(filterType?: string): Promise<AuditLogItem[]> {
  if (!isSupabaseConfigured) {
    if (!filterType || filterType === "todos") return mockAuditLogs;
    return mockAuditLogs.filter((l) => l.entityType === filterType);
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return mockAuditLogs;

    const { data: prof } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!prof) return mockAuditLogs;

    let query = supabase
      .from("audit_logs")
      .select("id, user_name, user_role, action, entity_type, entity_id, description, details, created_at")
      .eq("company_id", prof.company_id)
      .order("created_at", { ascending: false })
      .limit(60);

    if (filterType && filterType !== "todos") {
      query = query.eq("entity_type", filterType);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Aviso al consultar audit_logs en Supabase:", error.message);
      return mockAuditLogs;
    }

    return (data ?? []).map((d) => ({
      id: d.id,
      userName: d.user_name,
      userRole: d.user_role,
      action: d.action,
      entityType: d.entity_type,
      entityId: d.entity_id,
      description: d.description,
      details: d.details as Record<string, unknown>,
      createdAt: d.created_at,
    }));
  } catch {
    return mockAuditLogs;
  }
}
