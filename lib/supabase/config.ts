function cleanUrl(url: string | undefined): string {
  if (!url) return "";
  let cleaned = url.trim();
  const match = cleaned.match(/https?:\/\/[^\s)\]]+/);
  if (match) {
    cleaned = match[0];
  }
  return cleaned.replace(/\/$/, "");
}

function cleanKey(key: string | undefined): string {
  if (!key) return "";
  return key.trim().replace(/^["']|["']$/g, "");
}

export const SUPABASE_URL = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = cleanKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/**
 * true cuando hay credenciales válidas de Supabase.
 * Si es false, la app funciona en "modo demo" con datos mock.
 */
export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20;

