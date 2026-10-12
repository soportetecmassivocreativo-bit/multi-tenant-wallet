import { NextResponse } from "next/server";
import { cleanupCardDataInSupabase } from "@/lib/gastos-especiales-actions";

/**
 * GET /api/cleanup-card-data
 * 
 * Ruta de mantenimiento ONE-TIME para corregir el estado de Supabase:
 * - Elimina filas duplicadas de tarjeta_jm_deuda_base
 * - Elimina filas erróneas de tarjeta_jm_consumo
 * - Inserta los 2 abonos reales ($220 + $96) para corregir el balance del dashboard
 * 
 * Solo ejecutar cuando el usuario esté autenticado.
 */
export async function GET() {
  try {
    const result = await cleanupCardDataInSupabase();
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("Error en cleanup-card-data:", error);
    return NextResponse.json(
      { ok: false, message: String(error) },
      { status: 500 }
    );
  }
}
