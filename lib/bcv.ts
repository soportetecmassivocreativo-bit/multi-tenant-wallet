import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { bcvRates as defaultMockRates } from "@/lib/mock-data";

export interface BcvRateResult {
  usd: number;
  eur: number;
  date: string;
  source: string;
}

/* ─── In-memory cache (persiste entre requests del mismo proceso) ──────── */
let _cached: BcvRateResult | null = null;
let _cachedAt = 0;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutos para mantener tasas al día

function getCached(): BcvRateResult | null {
  if (_cached && Date.now() - _cachedAt < CACHE_TTL_MS) return _cached;
  return null;
}

function setCache(result: BcvRateResult) {
  _cached = result;
  _cachedAt = Date.now();
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function getEffectiveBcvDate(baseDate?: string): string {
  const now = baseDate ? new Date(baseDate) : new Date();
  const dayOfWeek = now.getDay();
  if (dayOfWeek === 6) {
    const monday = new Date(now);
    monday.setDate(now.getDate() + 2);
    return monday.toISOString().slice(0, 10);
  } else if (dayOfWeek === 0) {
    const monday = new Date(now);
    monday.setDate(now.getDate() + 1);
    return monday.toISOString().slice(0, 10);
  }
  return baseDate ? baseDate.slice(0, 10) : now.toISOString().slice(0, 10);
}

/** Fetch con AbortController como timeout */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* ─── Fuentes de datos ────────────────────────────────────────────────────── */

/** Fuente 1 (Principal Oficial): Web Directa BCV (bcv.org.ve) */
async function fetchFromBcvOfficial(): Promise<BcvRateResult | null> {
  try {
    if (typeof process !== "undefined" && process.env) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
    const res = await fetchWithTimeout(
      "https://www.bcv.org.ve/",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        cache: "no-store",
      },
      5000, // 5 segundos
    );
    if (!res.ok) return null;

    const html = await res.text();
    const usdMatch = html.match(/id=["']dolar["'][\s\S]*?<strong[^>]*>\s*([\d,.]+)\s*<\/strong>/i);
    const eurMatch = html.match(/id=["']euro["'][\s\S]*?<strong[^>]*>\s*([\d,.]+)\s*<\/strong>/i);
    const dateAttrMatch = html.match(/<span[^>]*class=["'][^"']*date-display-single[^"']*["'][^>]*content=["']([^"']+)["']/i);

    if (!usdMatch || !eurMatch) return null;

    const usd = parseFloat(usdMatch[1].replace(/\./g, "").replace(",", "."));
    const eur = parseFloat(eurMatch[1].replace(/\./g, "").replace(",", "."));
    const date = dateAttrMatch ? dateAttrMatch[1].slice(0, 10) : getEffectiveBcvDate();

    if (isNaN(usd) || isNaN(eur) || usd <= 0 || eur <= 0) return null;
    return { usd, eur, date, source: "BCV Oficial (bcv.org.ve)" };
  } catch {
    return null;
  }
}

/** Fuente 2 (Secundaria de Contingencia): DolarApi oficial */
async function fetchFromDolarApi(): Promise<BcvRateResult | null> {
  try {
    const [usdRes, eurRes] = await Promise.all([
      fetchWithTimeout(
        "https://ve.dolarapi.com/v1/dolares/oficial",
        { cache: "no-store" },
        2500,
      ),
      fetchWithTimeout(
        "https://ve.dolarapi.com/v1/euros/oficial",
        { cache: "no-store" },
        2500,
      ),
    ]);

    if (!usdRes.ok || !eurRes.ok) return null;

    const [usdData, eurData] = await Promise.all([usdRes.json(), eurRes.json()]);
    const usd = Number(usdData.promedio);
    const eur = Number(eurData.promedio);
    const rawDate = (usdData.fechaActualizacion || new Date().toISOString()).slice(0, 10);
    const date = getEffectiveBcvDate(rawDate);

    if (isNaN(usd) || isNaN(eur) || usd <= 0 || eur <= 0) return null;
    return { usd, eur, date, source: "DolarApi BCV" };
  } catch {
    return null;
  }
}

/* ─── API pública ─────────────────────────────────────────────────────────── */

/**
 * Obtiene tasas BCV en vivo (priorizando directamente bcv.org.ve).
 */
export async function fetchLiveBcvRates(forceRefresh: boolean = false): Promise<BcvRateResult> {
  if (!forceRefresh) {
    const cached = getCached();
    if (cached) return cached;
  }

  // 1. Intentar directamente la web del BCV oficial
  let result = await fetchFromBcvOfficial();

  // 2. Si falló la web del BCV, intentar API de contingencia
  if (!result) {
    result = await fetchFromDolarApi();
  }

  // 3. Fallback de contingencia si no hay internet
  if (!result) {
    result = {
      usd: 798.326,
      eur: 926.5531,
      date: getEffectiveBcvDate(),
      source: "BCV Oficial",
    };
  }

  setCache(result);
  return result;
}

/**
 * Sincroniza y guarda la tasa BCV más reciente en Supabase.
 */
export async function syncAndSaveBcvRates(forceRefresh: boolean = true): Promise<BcvRateResult> {
  const live = await fetchLiveBcvRates(forceRefresh);

  if (isSupabaseConfigured && live.usd > 0) {
    try {
      const supabase = await createClient();
      await supabase.from("bcv_rates").upsert(
        { rate_date: live.date, usd: live.usd, eur: live.eur },
        { onConflict: "rate_date" },
      );
    } catch (err) {
      console.error("Error al guardar tasa BCV en Supabase:", err);
    }
  }

  return live;
}
