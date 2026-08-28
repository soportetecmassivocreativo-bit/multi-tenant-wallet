import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { bcvRates as defaultMockRates } from "@/lib/mock-data";

export interface BcvRateResult {
  usd: number;
  eur: number;
  date: string;
  source: string;
}

/**
 * Intenta obtener las tasas directamente desde el portal oficial del BCV (https://www.bcv.org.ve/)
 */
export async function fetchFromBcvOfficial(): Promise<BcvRateResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    if (typeof process !== "undefined" && process.env) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }

    const res = await fetch("https://www.bcv.org.ve/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const html = await res.text();

    const usdMatch = html.match(/id=["']dolar["'][\s\S]*?<strong[^>]*>\s*([\d,.]+)\s*<\/strong>/i);
    const eurMatch = html.match(/id=["']euro["'][\s\S]*?<strong[^>]*>\s*([\d,.]+)\s*<\/strong>/i);
    const dateMatch = html.match(/<span[^>]*class=["'][^"']*date-display-single[^"']*["'][^>]*content=["']([^"']+)["']/i);

    if (!usdMatch || !eurMatch) return null;

    const usd = parseFloat(usdMatch[1].replace(/\./g, "").replace(",", "."));
    const eur = parseFloat(eurMatch[1].replace(/\./g, "").replace(",", "."));
    const date = dateMatch ? dateMatch[1].slice(0, 10) : new Date().toISOString().slice(0, 10);

    if (isNaN(usd) || isNaN(eur) || usd <= 0 || eur <= 0) return null;

    return { usd, eur, date, source: "BCV Oficial (bcv.org.ve)" };
  } catch (err) {
    console.warn("Fallo al consultar bcv.org.ve directamente:", err);
    return null;
  }
}

/**
 * Fallback a la API de contingencia oficial (DolarApi) que replica exactamente el BCV
 */
export async function fetchFromBcvBackup(): Promise<BcvRateResult | null> {
  try {
    const [usdRes, eurRes] = await Promise.all([
      fetch("https://ve.dolarapi.com/v1/dolares/oficial", { cache: "no-store" }),
      fetch("https://ve.dolarapi.com/v1/euros/oficial", { cache: "no-store" }),
    ]);

    if (!usdRes.ok || !eurRes.ok) return null;

    const usdData = await usdRes.json();
    const eurData = await eurRes.json();

    const usd = Number(usdData.promedio);
    const eur = Number(eurData.promedio);
    const date = (usdData.fechaActualizacion || new Date().toISOString()).slice(0, 10);

    if (isNaN(usd) || isNaN(eur) || usd <= 0 || eur <= 0) return null;

    return { usd, eur, date, source: "DolarApi BCV Oficial" };
  } catch (err) {
    console.warn("Fallo al consultar API de contingencia BCV:", err);
    return null;
  }
}

/**
 * Obtiene la tasa actualizada en vivo del BCV con fallback en cascada.
 */
export async function fetchLiveBcvRates(): Promise<BcvRateResult> {
  // 1. Intenta portal oficial
  const official = await fetchFromBcvOfficial();
  if (official) return official;

  // 2. Intenta API de contingencia
  const backup = await fetchFromBcvBackup();
  if (backup) return backup;

  // 3. Fallback por defecto si no hay conexión a internet
  return {
    usd: defaultMockRates.USD,
    eur: defaultMockRates.EUR,
    date: defaultMockRates.date,
    source: "Mock Local",
  };
}

/**
 * Sincroniza y guarda la tasa BCV más reciente en Supabase.
 */
export async function syncAndSaveBcvRates(): Promise<BcvRateResult> {
  const live = await fetchLiveBcvRates();

  if (isSupabaseConfigured && live.usd > 0) {
    try {
      const supabase = await createClient();
      await supabase.from("bcv_rates").upsert(
        {
          rate_date: live.date,
          usd: live.usd,
          eur: live.eur,
        },
        { onConflict: "rate_date" }
      );
    } catch (err) {
      console.error("Error al guardar tasa BCV en Supabase:", err);
    }
  }

  return live;
}
