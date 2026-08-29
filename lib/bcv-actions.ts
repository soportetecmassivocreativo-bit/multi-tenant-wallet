"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { syncAndSaveBcvRates } from "@/lib/bcv";
import type { MutationResult } from "@/lib/mutations";

export interface ManualBcvInput {
  usd: number;
  eur: number;
  date?: string;
}

export interface BcvActionResult extends MutationResult {
  data?: {
    usd: number;
    eur: number;
    date: string;
    source?: string;
  };
}

/**
 * Guarda manualmente las tasas de cambio (USD y EUR) como contingencia.
 */
export async function saveManualBcvRates(
  input: ManualBcvInput,
): Promise<BcvActionResult> {
  const usd = Number(input.usd);
  const eur = Number(input.eur);
  const date = input.date?.trim() || new Date().toISOString().slice(0, 10);

  if (isNaN(usd) || usd <= 0) {
    return { ok: false, error: "La tasa del Dólar debe ser un número mayor a 0." };
  }
  if (isNaN(eur) || eur <= 0) {
    return { ok: false, error: "La tasa del Euro debe ser un número mayor a 0." };
  }

  if (!isSupabaseConfigured) {
    return {
      ok: true,
      demo: true,
      data: { usd, eur, date, source: "Manual" },
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("bcv_rates").upsert(
      {
        rate_date: date,
        usd: usd,
        eur: eur,
      },
      { onConflict: "rate_date" },
    );

    if (error) {
      console.error("Error al guardar tasa manual en Supabase:", error);
      return { ok: false, error: `Error en base de datos: ${error.message}` };
    }

    revalidatePath("/", "layout");
    revalidatePath("/empresas");
    revalidatePath("/dashboard");
    revalidatePath("/cobros/nueva");

    return {
      ok: true,
      data: { usd, eur, date, source: "Manual" },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error inesperado al guardar.";
    return { ok: false, error: msg };
  }
}

/**
 * Sincroniza automáticamente las tasas con el BCV / servicio de contingencia.
 */
export async function syncBcvRates(): Promise<BcvActionResult> {
  try {
    const res = await syncAndSaveBcvRates();
    revalidatePath("/", "layout");
    revalidatePath("/empresas");
    revalidatePath("/dashboard");
    return {
      ok: true,
      data: {
        usd: res.usd,
        eur: res.eur,
        date: res.date,
        source: res.source,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al sincronizar con BCV.";
    return { ok: false, error: msg };
  }
}
