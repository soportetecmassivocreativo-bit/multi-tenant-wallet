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
 * Calcula la fecha de vigencia para fines de semana (sábado/domingo → lunes próximo).
 */
function getEffectiveBcvDate(baseDate?: string): string {
  const now = baseDate ? new Date(baseDate) : new Date();
  const dayOfWeek = now.getDay(); // 0 = Domingo, 6 = Sábado

  if (dayOfWeek === 6) {
    // Sábado -> avanzar 2 días al lunes
    const monday = new Date(now);
    monday.setDate(now.getDate() + 2);
    return monday.toISOString().slice(0, 10);
  } else if (dayOfWeek === 0) {
    // Domingo -> avanzar 1 día al lunes
    const monday = new Date(now);
    monday.setDate(now.getDate() + 1);
    return monday.toISOString().slice(0, 10);
  }

  return baseDate ? baseDate.slice(0, 10) : now.toISOString().slice(0, 10);
}

/**
 * Obtiene las tasas oficiales directamente desde el portal del BCV (https://www.bcv.org.ve/)
 * con la Fecha Valor oficial de vigencia (incluyendo fines de semana).
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
    const dateAttrMatch = html.match(/<span[^>]*class=["'][^"']*date-display-single[^"']*["'][^>]*content=["']([^"']+)["']/i);

    if (!usdMatch || !eurMatch) return null;

    const usd = parseFloat(usdMatch[1].replace(/\./g, "").replace(",", "."));
    const eur = parseFloat(eurMatch[1].replace(/\./g, "").replace(",", "."));
    
    // Obtiene la fecha exacta del atributo content (ej: 2026-08-31) o calcula la vigencia
    let date = dateAttrMatch ? dateAttrMatch[1].slice(0, 10) : "";
    if (!date) {
      date = getEffectiveBcvDate();
    }

    if (isNaN(usd) || isNaN(eur) || usd <= 0 || eur <= 0) return null;

    return { usd, eur, date, source: "BCV Oficial (bcv.org.ve)" };
  } catch (err) {
    console.warn("Fallo al consultar bcv.org.ve directamente:", err);
    return null;
  }
}

/**
 * Fallback a la API de contingencia (DolarApi)
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
    
    // Ajustar fecha para fines de semana si DolarApi devuelve la fecha del viernes
    const rawDate = (usdData.fechaActualizacion || new Date().toISOString()).slice(0, 10);
    const date = getEffectiveBcvDate(rawDate);

    if (isNaN(usd) || isNaN(eur) || usd <= 0 || eur <= 0) return null;

    return { usd, eur, date, source: "DolarApi BCV Oficial" };
  } catch (err) {
    console.warn("Fallo al consultar API de contingencia BCV:", err);
    return null;
  }
}

/**
 * Obtiene la tasa actualizada en vivo del BCV.
 * Prioriza el portal oficial para obtener siempre la Fecha Valor de vigencia exacta.
 */
export async function fetchLiveBcvRates(): Promise<BcvRateResult> {
  // 1. Intenta primero el portal oficial de bcv.org.ve para obtener la Fecha Valor real
  const official = await fetchFromBcvOfficial();
  if (official) return official;

  // 2. Si bcv.org.ve no responde, usa la réplica de contingencia
  const backup = await fetchFromBcvBackup();
  if (backup) return backup;

  // 3. Fallback por defecto
  return {
    usd: defaultMockRates.USD,
    eur: defaultMockRates.EUR,
    date: getEffectiveBcvDate(),
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
